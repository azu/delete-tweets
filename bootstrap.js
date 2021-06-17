import fs from "fs";
import fsP from "fs/promises";
import * as url from "url";
import * as path from "path";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await fsP.mkdir(path.join(__dirname, "twitter-archives"), {
    recursive: true
});
// .env.example → .eng
if (!fs.existsSync(path.join(__dirname, ".env"))) {
    await fsP.copyFile(path.join(__dirname, ".env.example"), path.join(__dirname, ".env"));
}
// allow.yaml
if (!fs.existsSync(path.join(__dirname, "allow.yaml"))) {
    await fsP.writeFile(
        path.join(__dirname, "allow.yaml"),
        `
# 誤検知を無視する許可リスト
- So
- SO
- エディター
- 工夫 # "こうふ" だけど "くふう" と区別ができない
- フォーカス
- 子供
- ダークソウル
`,
        "utf-8"
    );
}
// disallow.yaml
if (!fs.existsSync(path.join(__dirname, "disallow.yaml"))) {
    await fsP.writeFile(
        path.join(__dirname, "disallow.yaml"),
        `
# 不許可リスト
- /[亜-熙ぁ-んァ-ヶ]w+(\\s|$)/ # これはwww みたいなやつ
- /(?<!く)ださい/
- /これだけ知って(おけ|れば)/
- 嘘つき
- ぼったくり
`,
        "utf-8"
    );
}
