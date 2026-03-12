/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'react-app',
    'react-app/jest',
  ],
  plugins: ['react-hooks'],
  rules: {
    // React hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Best practices
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-duplicate-imports': 'error',
    'prefer-const': 'warn',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // React
    'react/prop-types': 'off', // disabled in favour of TypeScript migration
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
    'react/jsx-no-target-blank': 'warn',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
      env: { jest: true },
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'build/',
    'node_modules/',
    'public/',
    'src/serviceWorker*.js',
    'coverage/',
  ],
};
