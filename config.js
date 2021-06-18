export const config = {
    // textlintベース
    textlint: {
        enabled: true
    },
    // 感情極性値ベース
    negaposi: {
        enabled: true,
        // -1 ~ 1 の範囲で指定可能
        // 感情極性値が-0.3未満の場合が対象となる
        minScore: -0.3
    },
    // 辞書ベース
    // disallow.yaml
    dictionary: {
        enabled: true
    }
};
