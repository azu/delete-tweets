import { convertArchieveToLineTweet } from "../scripts/utils/converter.js";
import assert from "assert";

describe("convertToLineTweet", function () {
    it("convert archive to line", () => {
        const result = convertArchieveToLineTweet({
            retweeted: false,
            source: '<a href="https://github.com/r7kamura/retro-twitter-client" rel="nofollow">Retro twitter client</a>',
            entities: {
                hashtags: [
                    {
                        text: "JavaScript",
                        indices: ["71", "82"]
                    },
                    {
                        text: "JSer",
                        indices: ["83", "88"]
                    }
                ],
                symbols: [],
                user_mentions: [],
                urls: [
                    {
                        url: "https://t.co/CXy3hOXJ8q",
                        expanded_url: "http://JSer.info",
                        display_url: "JSer.info",
                        indices: ["22", "45"]
                    },
                    {
                        url: "https://t.co/rMdfD14nYH",
                        expanded_url: "https://jser.info/",
                        display_url: "jser.info",
                        indices: ["47", "70"]
                    }
                ]
            },
            display_text_range: ["0", "88"],
            favorite_count: "2",
            id_str: "783296194701172736",
            truncated: false,
            retweet_count: "0",
            id: "783296194701172736",
            possibly_sensitive: false,
            created_at: "Tue Oct 04 13:22:20 +0000 2016",
            favorited: false,
            full_text:
                '週一更新のJavaScript情報サイト "https://t.co/CXy3hOXJ8q" https://t.co/rMdfD14nYH #JavaScript #JSer',
            lang: "ja"
        });
        assert.deepStrictEqual(result, {
            favorite_count: 2,
            id: "783296194701172736",
            retweet_count: 0,
            text: '週一更新のJavaScript情報サイト "http://JSer.info" https:/https://jser.info/cript #JSer',
            timestamp: 1475587340000
        });
    });
    it("convert archive to line when includes emoji", () => {
        const result = convertArchieveToLineTweet({
            retweeted: false,
            source: '<a href="http://tapbots.com/tweetbot" rel="nofollow">Tweetbot for iΟS</a>',
            entities: {
                hashtags: [
                    {
                        text: "RxJS",
                        indices: ["13", "18"]
                    }
                ],
                symbols: [],
                user_mentions: [
                    {
                        name: "Ben Lesh",
                        screen_name: "BenLesh",
                        indices: ["3", "11"],
                        id_str: "23795212",
                        id: "23795212"
                    }
                ],
                urls: [
                    {
                        url: "https://t.co/JKqsCZNKeW",
                        expanded_url: "http://rxjs.dev",
                        display_url: "rxjs.dev",
                        indices: ["50", "73"]
                    }
                ]
            },
            display_text_range: ["0", "140"],
            favorite_count: "0",
            id_str: "1387887489285693441",
            truncated: false,
            retweet_count: "0",
            id: "1387887489285693441",
            possibly_sensitive: true,
            created_at: "Thu Apr 29 21:52:17 +0000 2021",
            favorited: false,
            full_text:
                "RT @BenLesh: #RxJS 7.0.0 has been published! 🥳🎉🎉\n\nhttps://t.co/JKqsCZNKeW updated! (you may have to empty cache and hard reload because ser…",
            lang: "en"
        });
        assert.deepStrictEqual(result, {
            favorite_count: 0,
            retweet_count: 0,
            id: "1387887489285693441",
            text: "RT @BenLesh: #RxJS 7.0.0 has been published! 🥳🎉🎉\n\nhttp://rxjs.dev updated! (you may have to empty cache and hard reload because ser…",
            timestamp: 1619733137000
        });
    });
});
