module.exports = {
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "standard"
    ],
    "env": {
        "node": true,
        "browser": true,
        "es6": true,
        "jest/globals": true,
    },
    "plugins": [
        "@typescript-eslint",
        "eslint-plugin-react",
        "jest"
    ],
    "rules": {
        "object-curly-spacing": [
            "error",
            "never"
        ],
        "space-before-function-paren": [
            "error",
            "never"
        ],
        "@typescript-eslint/no-useless-constructor": [
            "error"
        ],
        "array-bracket-spacing": [
            "error",
            "never"
        ],
        "comma-dangle": [
            "error",
            "always-multiline"
        ],
        "indent": [
            "error",
            4,
            {
                "SwitchCase": 1
            }
        ],
        "semi": [
            "error",
            "always"
        ],
        "@typescript-eslint/member-delimiter-style": [
            "error",
            {
                "singleline": {
                    "delimiter": "comma",
                    "requireLast": false
                },
                "multiline": {
                    "delimiter": "none",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/no-unused-vars": [
            "error"
        ],
        "camelcase": 2,
        "no-unused-vars": 0
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "./tsconfig.json",
        "tsconfigRootDir": __dirname
    }
};
