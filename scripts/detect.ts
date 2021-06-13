import fsStream from "fs";
import path from "path";
import split2 from "split2";
import * as url from "url";
import { fileURLToPath } from "url";
// @ts-ignore
import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";
import ora from "ora";
import PQueue from "p-queue";
// @ts-ignore
import { Piscina } from "piscina";
import { LineTweet } from "./types/output";
import fs from "fs/promises";
import dayjs from "dayjs";

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

// 3年前以前のデータが対象
const TARGET_BEFORE_DATE_TIMESTAMP = dayjs().subtract(3, "year");
export async function detect(tweetsJsonFilePath: string) {
    const inputStream = fsStream.createReadStream(tweetsJsonFilePath, {
        encoding: "utf-8"
    });
    const lineStream = inputStream.pipe(split2());

    let totalCount = 0;
    let processCount = 0;
    let ngCount = 0;
    const queue = new PQueue({
        concurrency: 16
    });
    const spinner = ora("Loading").start();
    const addedSet = new Set<string>();
    queue.on("next", () => {
        spinner.text = `Process: ${processCount}/${totalCount} NG: ${ngCount}`;
    });
    const piscina = new Piscina({
        filename: new URL("./worker.mjs", import.meta.url).href,
        maxQueue: "auto"
    });
    const willDeleteTweets: ToDeleteTweetLine[] = [];
    for await (const line of lineStream) {
        totalCount++;
        queue.add(async () => {
            const tweet: LineTweet = JSON.parse(line);
            if (dayjs(tweet.timestamp).isAfter(TARGET_BEFORE_DATE_TIMESTAMP)) {
                return;
            }
            return piscina.run(tweet).then((results: CheckResult[]) => {
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
            });
        });
    }
    await queue.onIdle();
    spinner.succeed("Complete:" + processCount + " NG: " + ngCount);
    await fs.writeFile(
        path.join(dataDir, "will-delete-tweets.json"),
        willDeleteTweets.map((line) => JSON.stringify(line)).join("\n"),
        "utf-8"
    );
}

const selfScriptFilePath = url.fileURLToPath(import.meta.url);
if (process.argv[1] === selfScriptFilePath) {
    const tweetsJsonFilePath = path.join(dataDir, "tweets.json");
    detect(tweetsJsonFilePath).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
