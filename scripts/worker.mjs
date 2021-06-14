import { TextlintKernel } from "@textlint/kernel";
import TextPlugin from "@textlint/textlint-plugin-text";
import { moduleInterop } from "@textlint/module-interop";
import JsYaml from "js-yaml";
import regexpStringMatcher from "@textlint/regexp-string-matcher";
// @ts-ignore
import TextlintFilterRuleAllowlist from "textlint-filter-rule-allowlist";
// @ts-ignore
import TextlintRuleJaNoInappropriateWords from "textlint-rule-ja-no-inappropriate-words";
// @ts-ignore
import TextlintRuleNoHosoKinshiYogo from "textlint-rule-no-hoso-kinshi-yogo";
import kuromojin from "kuromojin";
// @ts-ignore
import analyze from "negaposi-analyzer-ja";
import path from "path";
import fsStream from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kernel = new TextlintKernel();
/**
 * textlintでのチェック
 * @param {import("./types/output.ts").LineTweet} tweet
 * @returns {Promise<import(("./detect.ts").CheckResult>}
 */
const textlint = (tweet) => {
    return kernel.lintText(tweet.text, {
        ext: ".txt",
        filePath: tweet.id + ".txt",
        plugins: [{
            pluginId: "text",
            plugin: moduleInterop(TextPlugin),
            options: true
        }],
        filterRules: [
            {
                ruleId: "textlint-filter-rule-allowlist",
                rule: moduleInterop(TextlintFilterRuleAllowlist),
                options: {
                    allowlistConfigPaths: [
                        path.resolve(__dirname, "../allow.yaml")
                    ]
                }
            }
        ],
        rules: [
            {
                ruleId: "textlint-rule-ja-no-inappropriate-words",
                rule: moduleInterop(TextlintRuleJaNoInappropriateWords)
            },
            {
                ruleId: "textlint-rule-no-hoso-kinshi-yogo",
                rule: moduleInterop(TextlintRuleNoHosoKinshiYogo)
            }
        ]
    }).then(result => {
        if (result.messages.length > 0) {
            return {
                ok: false,
                message: result.messages.map(message => `${message.ruleId}: ${message.message}`)
            };
        }
        return {
            ok: true
        };
    });
};
/**
 * @param {import("./types/output.ts").LineTweet} tweet
 * @returns {Promise<import(("./detect.ts").CheckResult>}
 */
const checkNegaposi = async (tweet) => {
    if (!tweet.text) {
        return {
            ok: true
        };
    }
    const tokens = await kuromojin.tokenize(tweet.text).catch(error => {
        process.env.DEBUG && console.log("tokenize error", tweet, error);
        return [];
    });
    const score = analyze(tokens, {
        // 辞書にない単語のスコア
        unknownWordRank: 0,
        // ポジティブな単語に対する補正値(スコアに乗算)
        positiveCorrections: 1,
        // ネガティブな単語に対する補正値(スコアに乗算)
        negativeCorrections: 1
    });
    if (score < -0.3) {
        return {
            ok: false,
            score,
            message: "感情極性値が0.3未満"
        };
    }
    return {
        ok: true,
        score
    };
};

const ALLOW_LIST = (() => {
    try {
        const yaml = fsStream.readFileSync(path.join(__dirname, "../allow.yaml"), "utf-8");
        const allowList = JsYaml.loadAll(yaml);
        if (!Array.isArray(allowList)) {
            console.log(new Error("disallow.yml should be an array"));
        }
        return allowList[0];
    } catch {
        return [];
    }
})();
const DISALLOW_LIST = (() => {
    try {
        const yaml = fsStream.readFileSync(path.join(__dirname, "../disallow.yaml"), "utf-8");
        const disallowList = JsYaml.loadAll(yaml);
        if (!Array.isArray(disallowList)) {
            console.log(new Error("disallow.yml should be an array"));
        }
        return disallowList[0];
    } catch {
        return [];
    }
})();
/**
 * @param {import("./types/output.ts").LineTweet} tweet
 * @returns {Promise<import(("./detect.ts").CheckResult>}
 */
const checkDisallow = async (tweet) => {
    if (DISALLOW_LIST.length === 0) {
        return {
            ok: true
        };
    }
    const matches = regexpStringMatcher.matchPatterns(tweet.text, DISALLOW_LIST);
    // remove allowed words
    const matchesWithoutAllowed = matches.filter(match => {
        return regexpStringMatcher.matchPatterns(match.match, ALLOW_LIST).length === 0;
    });
    if (matchesWithoutAllowed.length > 0) {
        return {
            ok: false,
            message: `NGワードの 「${matchesWithoutAllowed.map(match => match.match).join("」,「")}」 が含まれています`
        };
    }
    return {
        ok: true
    };
};

/**
 * @param {LineTweet} tweet
 * @returns {Promise<CheckResult[]>}
 */
const check = async (tweet) => {
    return Promise.all([
        checkNegaposi(tweet),
        checkDisallow(tweet),
        textlint(tweet)
    ]);
};
export default check;
