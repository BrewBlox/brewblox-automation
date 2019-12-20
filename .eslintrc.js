module.exports = {
  root: true,
  extends: ['plugin:@typescript-eslint/recommended'],
  plugins: ['simple-import-sort'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parser: '@typescript-eslint/parser',
  },
  rules: {
    'indent': ['error', 2],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': [
      'warn', {
        'ignoreParameters': true
      }
    ],
    '@typescript-eslint/no-unused-vars': 'warn',
    'simple-import-sort/sort': 'error',
    'sort-imports': 'off',
    'import/order': 'off',
    'import/first': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'import/newline-after-import': 'off',
    'object-curly-newline': 'off',
    'no-console': 'warn',
    'no-multiple-empty-lines': 'error',
    'comma-dangle': [
      'error',
      'always-multiline'
    ],
    'max-len': [
      'error',
      120,
      2,
      {
        'ignoreUrls': true,
        'ignoreComments': false
      }
    ],
  },
  overrides: [
    {
      'files': ['*.js'],
      'rules': {
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
}
