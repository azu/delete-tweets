import * as url from "url";
// @ts-ignore
import { Piscina } from "piscina";
import meow from "meow";

export const cli = meow(
    `
    Usage
      $ pbpaste | yarn test-detect
`,
    {
        importMeta: import.meta,
        autoHelp: true,
        autoVersion: true
    }
);
export type CheckResult = {
    ok: boolean;
    message: string;
    data: any;
};

export async function detect(text: string): Promise<CheckResult[]> {
    const piscina = new Piscina({
        filename: new URL("./worker.mjs", import.meta.url).href,
        maxQueue: 1
    });
    return await piscina.run({
        text: text,
        id: "dummy",
        timestamp: 0
    });
}

const selfScriptFilePath = url.fileURLToPath(import.meta.url);
if (process.argv[1] === selfScriptFilePath) {
    const buffers = [];
    for await (const chunk of process.stdin) buffers.push(chunk);
    const buffer = Buffer.concat(buffers);
    const text = buffer.toString();
    console.log("text:", text);
    const results = await detect(text).catch((error) => {
        console.error(error);
        process.exit(1);
    });
    results
        .filter((result) => !result.ok)
        .forEach((result) => {
            console.log(result.message);
        });
}
