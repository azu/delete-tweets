import fsStream from "fs";
import path from "path";
import split2 from "split2";
import * as url from "url";
import ora from "ora";
import PQueue from "p-queue";
// @ts-ignore
import { Piscina } from "piscina";
import fs from "fs/promises";
import { TwitterApi } from "twitter-api-v2";

import { config } from "dotenv";
import type { ToDeleteTweetLine } from "./detect";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "../data");
config();

export const appendDeletedTweetId = (deletedTweetsFilePath: string, tweetId: string) => {
    return fs.appendFile(deletedTweetsFilePath, tweetId + "\n", "utf-8");
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

const waitFor = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export async function deleteTweets(tweetsJsonFilePath: string, deletedTweetsFilePath: string) {
    const client = new TwitterApi({
        appKey: process.env.TWITTER_APP_KEY!,
        appSecret: process.env.TWITTER_APP_SECRET!,
        accessToken: process.env.TWITTER_ACCESS_TOKEN!,
        accessSecret: process.env.TWITTER_ACCESS_SECRET!
    });
    const deleteTweet = async (tweet: ToDeleteTweetLine) => {
        try {
            await client.v2.delete(tweet.id);
        } catch (error: any) {
            if (error.code === 404) {
                return; // already deleted
            }
            console.log("Fail to delete", tweet);
            console.log("Rate Limit? Please wait 2~3 hours");
            console.log(`Or, if it is already deleted, please add ${tweet.id} to deleted-tweets.txt`);
            throw error;
        }
    };
    const deletedTweetsSet = await getDeletedTweetsSet(deletedTweetsFilePath);
    const lineStream = fsStream
        .createReadStream(tweetsJsonFilePath, {
            encoding: "utf-8"
        })
        .pipe(split2());
    let totalCount = 0;
    let processCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const queue = new PQueue({
        concurrency: 1
    });
    const spinner = ora("Loading").start();
    queue.on("next", () => {
        spinner.text = `Delete: ${processCount}/${totalCount} Skip: ${skippedCount}`;
    });
    for await (const line of lineStream) {
        totalCount++;
        queue.add(async () => {
            if (errorCount > 3) {
                console.log("Error counts is over 3. Stop deleting...");
                process.exit(1); // force stop
                return;
            }
            try {
                const tweet: ToDeleteTweetLine = JSON.parse(line);
                if (deletedTweetsSet.has(tweet.id)) {
                    skippedCount++;
                    return;
                }
                processCount++;
                await deleteTweet(tweet);
                await appendDeletedTweetId(deletedTweetsFilePath, tweet.id);
                await waitFor(500);
            } catch (error) {
                errorCount++;
                throw error;
            }
        });
    }
    await queue.onIdle();
    spinner.succeed(`Complete to delete: ${processCount}/${totalCount} Skip: ${skippedCount}`);
}

const selfScriptFilePath = url.fileURLToPath(import.meta.url);
if (process.argv[1] === selfScriptFilePath) {
    const tweetsJsonFilePath = path.join(dataDir, "will-delete-tweets.json");
    const deletedTweetsJsonFilePath = path.join(dataDir, "deleted-tweets.txt");
    deleteTweets(tweetsJsonFilePath, deletedTweetsJsonFilePath).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
