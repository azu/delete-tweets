# @azu/delete-tweets

Tweetsの削除と削除対象のフィルターをする日本語の補助ツール。

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

次のステップでTweetsを削除します。

1. Import Archive - TwitterのアーカイブからTweetsデータの作成
2. Detect Tweets - Tweetsデータをフィルタリングして削除候補のTweetsデータを作成
3. Delete Tweets - 削除対象のTweetsを削除

削除後は、`data/deleted-twwets.txt` に削除したTweetのIDが記録されます。
すでに削除済みの場合は、次から無視されるので、2 ~ 3 を繰り返し実行できるようにデザインしています。

### Import Archive

1. [Twitter archive](https://help.twitter.com/en/managing-your-account/how-to-download-your-twitter-archive)を参考にTwitterのアーカイブをリクエストします
2. Twitterのアーカイブ(`twitter-*.zip`)をダウンロードして展開します
3. 中に含まれる `tweeet*.js` を `twitter-archives/` ディレクトリにコピーします

```
twitter-archives/
├── tweet.js
├── tweet-part1.js
└── tweet-part2.js
```

4. 次のコマンドを実行して、`tweet*.js` をインポートして `data/tweets.json` を作成します

    yarn import-twitter-archives

### Detect Tweets

`yarn detect` コマンドで、削除候補のTweetsデータを `data/will-delete-tweets.json` として作成できます。

    # all tweets
    yarn detect
    # 2015-01-01 ~ Now
    $ yarn detect --fromDate 2015-01-01
    # 2015-01-01 ~ 2016-01-01
    $ yarn detect --fromDate 2015-01-01 --toDate 2016-01-01

`yarn detect`は `--fromDate YYYY-MM-DD` と `--toDate YYYY-MM-DD` で対象のTweetsの日付範囲を指定できます。

削除候補を推定する実装アルゴリズム

- [x] textlintでの[放送禁止用語](https://github.com/hata6502/textlint-rule-no-hoso-kinshi-yogo)、[不適切表現](https://github.com/textlint-ja/textlint-rule-ja-no-inappropriate-words)のチェック
- [x] ネガティブ(感情極性値ベース)の推定
- [x] ユーザー定義の許可リスト、不許可リスト

:memo: 基本的にfalse positiveを含んだ過剰な削除候補を作成します。削除候補をチェックして実際に削除する候補のみを `data/will-delete-tweets.json` に残してください。

ユーザー定義の辞書で削除候補に追加、削除できます。
次ののファイルに定義することで、自動的に`yarn detect`が処理します。

#### `allow-id.yaml`

削除しないTweetsの`id`を指定できます。

たとえば、`https://twitter.com/twitter/status/123456765432` を削除対象から外す場合は次のように定義できます。

```yaml
- 123456765432
```

#### `disallow.yaml`

Tweetsに含まれていたら削除対象とする辞書を定義します。
辞書は、文字列または[RegExp-like String](https://github.com/textlint/regexp-string-matcher#regexp-like-string)ベースの正規表現の配列を指定できます。

マッチ対象は `tweeet.text` の値のみです。

```yaml
- /[亜-熙ぁ-んァ-ヶ]w+(\s|$)/ # これはwww みたいなやつ
- /(?<!く)ださい/ # くださいは対象外
- /これだけ知って(おけ|れば)/
- 嘘つき
- ぼったくり
```

#### `allow.yaml`

`disallow.yaml`やtextlintでNGとなった場合にも、マッチした範囲が`allow.yaml`で許可されている場合は、削除対象から外せます。

:memo: `allow.yaml`で定義した辞書が`tweet.text` に含まれているから無条件にOKではなく、あくまでNGとなった範囲がが許可された範囲に含まれていれば、OKという実装になってる

```yaml
- エディター
- ダークソウル
- /example.com\/.*/
```

例) 次のように`disallow.yaml`で `クソ` という単語をNGとしてしまうと、`ダークソウル`もNGとなってしまう。
この場合は、`allow.yaml` に `ダークソウル` を定義することで、`ダークソウル`は許可される。

`disallow.yaml`:

```yaml
- クソ
```

`allow.yaml`:

```yaml
- ダークソウル
```

実装の詳細:

`disallow.yaml`によって、2から3までの範囲がNGとして報告される。
`allow.yaml`によって、0から5までの範囲はたとえNGがあっても例外として無視する。

```shell
|０|１|２|３|４|５|６|７|８|９|
------------------ 対象のTweetのtext
|ダ|ー|ク|ソ|ウ|ル|は|ゲ|ー|ム|
------------------ disallow.yamlの定義
 　 　|ク|ソ|
------------------ allow.yamlの定義
|ダ|ー|ク|ソ|ウ|ル|
```

Steps:

1. `allow-id.yaml` check `tewet.id`
2. `disallow.yaml` check `tweet.text`
3. `allow.yaml` check the disallowed word

### Delete tweets

Delete detected Tweets per 0.5 seconds.

    yarn delete-tweets # It is actual delete tweets

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
