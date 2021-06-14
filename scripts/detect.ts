import fsStream from "fs";
import path from "path";
import split2 from "split2";
import * as url from "url";
import { fileURLToPath } from "url";
import ora from "ora";
import PQueue from "p-queue";
// @ts-ignore
import { Piscina } from "piscina";
import { LineTweet } from "./types/output";
import fs from "fs/promises";
import dayjs from "dayjs";
import JsYaml from "js-yaml";
import os from "os";
import meow from "meow";

export const cli = meow(
    `
    Usage
      $ yarn detect
 
    Options
      --fromDate    [String] from Date string.
      --toDate      [String] from to string.

    Examples
      # ALl
      $ yarn detect
      # 2015-01-01 ~ Now
      $ yarn detect --fromDate 2015-01-01
      # 2015-01-01 ~ 2016-01-01
      $ yarn detect --fromDate 2015-01-01 --toDate 2016-01-01

`,
    {
        importMeta: import.meta,
        flags: {
            fromDate: {
                type: "string"
            },
            toDate: {
                type: "string"
            }
        },
        autoHelp: true,
        autoVersion: true
    }
);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");
export type CheckResult = {
    ok: boolean;
    message: string;
    data: any;
};

export type ToDeleteTweetLine = {
    id: string;
    timestamp: number;
    text: string;
    reason: string;
};

export const getDeletedTweetsSet = async (deletedTweetsFilePath: string): Promise<Set<string>> => {
    return new Promise<Set<string>>(async (resolve, reject) => {
        if (!fsStream.existsSync(deletedTweetsFilePath)) {
            return reject(new Error("No file"));
        }
        const deletedStream = fsStream
            .createReadStream(deletedTweetsFilePath, {
                encoding: "utf-8"
            })
            .pipe(split2())
            .on("error", reject);
        const deletedSet = new Set<string>();
        for await (const id of deletedStream) {
            deletedSet.add(id as string);
        }
        resolve(deletedSet);
    }).catch((_) => {
        return new Set<string>();
    });
};

const ALLOW_ID_SET: Set<string> = (() => {
    try {
        const yaml = fsStream.readFileSync(path.join(__dirname, "../allow-id.yaml"), "utf-8");
        const allowIdList = JsYaml.loadAll(yaml);
        if (!Array.isArray(allowIdList)) {
            console.log(new Error("disallow.yaml should be an array"));
        }
        return new Set<string>(...allowIdList[0]);
    } catch {
        return new Set<string>();
    }
})();

export async function detect({
    tweetsJsonFilePath,
    deletedTweetsJsonFilePath,
    fromDate,
    toDate
}: {
    fromDate: Date;
    toDate: Date;
    tweetsJsonFilePath: string;
    deletedTweetsJsonFilePath: string;
}) {
    const inputStream = fsStream.createReadStream(tweetsJsonFilePath, {
        encoding: "utf-8"
    });
    const lineStream = inputStream.pipe(split2());

    let totalCount = 0;
    let processCount = 0;
    let skippedCount = 0;
    let ngCount = 0;
    const queue = new PQueue({
        concurrency: os.cpus().length
    });
    const addedSet = new Set<string>();

    const fromDateTimeStamp = fromDate.getTime();
    const toDateTimeStamp = toDate.getTime();
    console.log(`Searching tweets: ${fromDate} ~ ${toDate} `);
    const spinner = ora("Loading").start();
    queue.on("next", () => {
        spinner.text = `Process: ${processCount + skippedCount}/${totalCount} NG: ${ngCount} Skip: ${skippedCount}`;
    });
    const piscina = new Piscina({
        filename: new URL("./worker.mjs", import.meta.url).href,
        maxQueue: "auto"
    });
    const deletedTweetsSet = await getDeletedTweetsSet(deletedTweetsJsonFilePath);
    const willDeleteTweets: ToDeleteTweetLine[] = [];
    for await (const line of lineStream) {
        totalCount++;
        queue.add(async () => {
            const tweet: LineTweet = JSON.parse(line);
            if (ALLOW_ID_SET.has(tweet.id)) {
                return skippedCount++; // allow tweet id
            }
            if (tweet.timestamp < fromDateTimeStamp || tweet.timestamp > toDateTimeStamp) {
                return skippedCount++;
            }
            if (deletedTweetsSet.has(tweet.id)) {
                return skippedCount++; // already deleted
            }
            return piscina
                .run(tweet)
                .then((results: CheckResult[]) => {
                    processCount++;
                    const badResults = results.filter((result) => !result.ok);
                    if (badResults.length !== 0) {
                        if (addedSet.has(tweet.id)) {
                            return; // already added
                        }
                        ngCount++;
                        willDeleteTweets.push({
                            ...tweet,
                            reason: badResults.map((result) => result.message).join(", ")
                        });
                        addedSet.add(tweet.id);
                    }
                })
                .catch((error) => {
                    console.log("Skip: Error on the tweet", tweet, error);
                    skippedCount++;
                });
        });
    }
    await queue.onIdle();
    spinner.succeed(`Complete:${totalCount} NG: ${ngCount} Skip: ${skippedCount}`);
    await fs.writeFile(
        path.join(dataDir, "will-delete-tweets.json"),
        willDeleteTweets.map((line) => JSON.stringify(line)).join("\n"),
        "utf-8"
    );
}

const selfScriptFilePath = url.fileURLToPath(import.meta.url);
if (process.argv[1] === selfScriptFilePath) {
    const tweetsJsonFilePath = path.join(dataDir, "tweets.json");
    const deletedTweetsJsonFilePath = path.join(dataDir, "deleted-tweets.txt");
    const fromDate = cli.flags.fromDate ? dayjs(cli.flags.fromDate, "YYYY-MM-DD").toDate() : dayjs(0).toDate();
    const toDate = cli.flags.toDate ? dayjs(cli.flags.toDate, "YYYY-MM-DD").toDate() : dayjs().toDate();
    detect({
        fromDate,
        toDate,
        tweetsJsonFilePath: tweetsJsonFilePath,
        deletedTweetsJsonFilePath: deletedTweetsJsonFilePath
    }).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
