const path = require('path');

module.exports = {
    entry: './src/frontend/index.tsx',

    output: {
        path: path.join(__dirname, '/dist'),
        filename: 'index.js'
    },

    // adding .ts and .tsx to resolve.extensions will help babel look for .ts and .tsx files to transpile
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },

    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                },
            }
        ]
    },
};