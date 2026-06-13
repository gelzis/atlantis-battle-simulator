module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(uuid)/)',
    ],
};
