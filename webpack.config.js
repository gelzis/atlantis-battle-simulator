const path = require('path');
const {WebpackManifestPlugin} = require('webpack-manifest-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const fs = require('fs');

module.exports = {
    entry: {
        main: './src/frontend/BattleSimulator/index.tsx',
        martialPoints: './src/frontend/MartialPoints/index.tsx',
    },

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
        new WebpackManifestPlugin(),
        new CleanWebpackPlugin(),
        {
            apply: (compiler) => {
                compiler.hooks.emit.tap('file-reference-plugin', compilation => {
                    const stats = compilation.getStats().toJson();
                    if (!fs.existsSync('src/public/dist/')) {
                        fs.mkdirSync('src/public/dist/');
                    }
                    for (const entry in stats.entrypoints) {
                        const {assets} = stats.entrypoints[entry];
                        fs.writeFileSync(`src/public/dist/${entry}.js`, `export * from '/dist/${assets[0].name}';\n`);
                    }
                });
            },
        },
    ],
};
