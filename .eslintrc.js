module.exports = {
    "globals": {
        "SharedArrayBuffer": "readonly",
        "Atomics": "readonly"
    },
    "extends": [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "standard"
    ],
    "env": {
        "node": true,
        "es6": true
    },
    "plugins": [
        "@typescript-eslint",
        "eslint-plugin-react"
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
        "import/order": [
            "error",
            {
                "newlines-between": "always",
                "groups": [
                    [
                        "builtin",
                        "external"
                    ],
                    [
                        "internal",
                        "parent",
                        "sibling",
                        "index"
                    ]
                ]
            }
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
        "@typescript-eslint/no-unused-vars-experimental": [
            "error",
            {
                "ignoreArgsIfArgsAfterAreUsed": true
            }
        ],
        "@typescript-eslint/no-unused-vars": [
            0
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
