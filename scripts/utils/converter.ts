import type { ArchivesURL, ArchiveTweet } from "../types/archieves";
import type { LineTweet } from "../types/output";

function replaceRange({
    text,
    start,
    end,
    substitute
}: {
    text: string;
    start: number;
    end: number;
    substitute: string;
}) {
    // emoji support
    const codePoints = [...text];
    return codePoints.slice(0, start).join("") + substitute + codePoints.slice(end).join("");
}

const rewriteTextWithUrls = (text: string, urls: ArchivesURL[] = []): string => {
    if (urls.length === 0) {
        return text;
    }
    let result = text;
    urls.sort((a, b) => {
        // b > a
        return Number(b.indices[0]) - Number(a.indices[0]);
    }).forEach((url) => {
        result = replaceRange({
            text: result,
            start: Number(url.indices[0]),
            end: Number(url.indices[1]),
            substitute: url.expanded_url
        });
    });
    return result;
};

export const convertArchieveToLineTweet = (tweet: ArchiveTweet): LineTweet => {
    return {
        id: tweet.id,
        text: rewriteTextWithUrls(tweet.full_text, tweet?.entities?.urls),
        timestamp: new Date(tweet.created_at).getTime(),
        retweet_count: Number(tweet.retweet_count),
        favorite_count: Number(tweet.favorite_count)
    };
};
