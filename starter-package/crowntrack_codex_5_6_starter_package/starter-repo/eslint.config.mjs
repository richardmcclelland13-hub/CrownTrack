import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['node_modules/**', '.expo/**', 'dist/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser },
    rules: {
      'no-restricted-imports': ['error', { patterns: ['../packages/*/src', '../../packages/*/src', '../../../packages/*/src', '../../../../packages/*/src'] }],
    },
  },
];
