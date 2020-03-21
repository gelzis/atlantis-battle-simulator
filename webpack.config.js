const path = require('path');
const ManifestPlugin = require('webpack-manifest-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const fs = require('fs');

module.exports = {
    entry: './src/frontend/index.tsx',

    output: {
        path: path.join(__dirname, './src/public/dist'),
        filename: '[name].[hash].js',
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },

    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
        ],
    },

    plugins: [
        new ManifestPlugin(),
        new CleanWebpackPlugin(),
        {
            apply: (compiler) => {
                compiler.hooks.emit.tap('file-reference-plugin', compilation => {
                    const stats = compilation.getStats().toJson();

                    for (const entry in stats.entrypoints) {
                        const {assets} = stats.entrypoints[entry];
                        fs.writeFileSync(`src/public/dist/${entry}.js`, `export * from '/dist/${assets[0]}';\n`);
                    }
                });
            },
        },
    ],
};
