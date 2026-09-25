module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'standard', 'prettier'],
    env: {node: true, browser: true, es6: true, 'jest/globals': true},
    plugins: ['@typescript-eslint', 'eslint-plugin-react', 'jest'],
    rules: {
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        camelcase: 2,
        'no-unused-vars': 0,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {project: './tsconfig.json', tsconfigRootDir: __dirname},
};
