# @azu/delete-tweets

Delete tweets and 日本語の補助ツール

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
