# @azu/delete-tweets

Delete tweets and 日本語の補助ツール

## Features

- Twitterの[データアーカイブ](https://help.twitter.com/ja/managing-your-account/how-to-download-your-twitter-archive)を使った削除の対応
- 自然言語、感情極性値ベースのフィルターでの絞り込みの対応
  - 許可リスト、不許可リスト、ネガティブポジティブ(感情極性値ベース)のフィルタリング、[放送禁止用語](https://github.com/hata6502/textlint-rule-no-hoso-kinshi-yogo)、[不適切表現](https://github.com/textlint-ja/textlint-rule-ja-no-inappropriate-words)
- 絞り込んだ結果のみをTwitterから削除
- 削除済みの履歴を使った絞り込みのキャッシュ
  - Tweetsを削除して、辞書を更新して、また絞り込みと何度も繰り返し処理ができる

## Install

Use yarn.

    yarn install
    yarn bootstrap

## Usage

### Import Archive

    yarn import-twitter-archives

### Detect tweets which will be deleted

    yarn detect

### Delete tweets

    yarn delete-tweets # It is actual delete tweets

## Options

- `allow.yaml`
    - Allow words list
- `allow-id.yaml`
    - Allow tweet's id list
- `disallow.yaml`
    - Disallow words list

Steps

1. `allow-id.yaml` check tewet.id
2. `disallow.yaml` check tweet.text
3. `allow.yaml` check the disallowed word
  - if this word is allowed, skip it

## Debug

[jq](https://stedolan.github.io/jq/) support JSONLD.

```shell
cat data/will-delete-tweets.json | jq -s ".[].text"
```

Group by error's `reason`:

```shell
cat data/will-delete-tweets.json | jq -s "group_by(.reason)[] |  {(.[0].reason): [.[] | .]}"
```

Group by error's `reason` and count it 

```shell
cat data/will-delete-tweets.json | jq -s "[group_by(.reason)[] | {reason: .[0].reason, count: length }] | sort_by(.count) | reverse"
```

Show specific reason

```shell
cat data/will-delete-tweets.json | jq -s 'group_by(.reason)[] | select(.[0].reason | contains("理由")) | .[].text'
```

Remove specific errors

```shell
cat data/will-delete-tweets.json | jq -s -c 'group_by(.reason)[] | select(.[0].reason | contains("感情極性値") | not) | .[]' > data/will-delete-tweets.updated.json 
```

## Changelog

See [Releases page](https://github.com/azu/delete-tweets/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/delete-tweets/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- azu: [GitHub](https://github.com/azu), [Twitter](https://twitter.com/azu_re)

## License

MIT © azu
