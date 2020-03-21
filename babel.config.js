module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                modules: false,
                targets: {
                    browsers: 'last 5 years, ie 10',
                },
            },
        ],
        '@babel/preset-react',
        '@babel/preset-typescript',
    ],
    plugins: [
        // '@babel/plugin-proposal-object-rest-spread',
        // ['@babel/plugin-proposal-decorators', {legacy: true}],
        // ['@babel/plugin-proposal-class-properties', {loose: true}],
        // '@babel/plugin-proposal-export-default-from',
        // '@babel/plugin-syntax-dynamic-import',
        // '@babel/plugin-syntax-import-meta',
        // ['babel-plugin-styled-components'],
    ],
};
