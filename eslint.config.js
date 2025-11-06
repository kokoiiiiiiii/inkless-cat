import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import unicornPlugin from 'eslint-plugin-unicorn';
import securityPlugin from 'eslint-plugin-security';
import tailwindPlugin from 'eslint-plugin-tailwindcss';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import * as tseslint from 'typescript-eslint';

const ignores = [
  'dist',
  'build',
  'coverage',
  'node_modules',
  '.vite',
  'public',
  '**/*.min.*',
  '**/generated/**',
  'eslint.config.js',
];

const typescriptFiles = ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'];

const reactRecommendedRules = reactPlugin.configs.recommended.rules ?? {};
const reactHooksRecommendedRules = reactHooksPlugin.configs.recommended.rules ?? {};
const importRecommendedRules = importPlugin.configs.recommended.rules ?? {};
const importTypescriptRules = importPlugin.configs.typescript?.rules ?? {};
const jsxA11yRecommendedRules = jsxA11yPlugin.configs.recommended.rules ?? {};
const unicornRecommendedRules = unicornPlugin.configs.recommended.rules ?? {};
const securityRecommendedRules = securityPlugin.configs.recommended.rules ?? {};

const baseRules = {
  ...reactRecommendedRules,
  ...reactHooksRecommendedRules,
  ...importRecommendedRules,
  ...jsxA11yRecommendedRules,
  ...unicornRecommendedRules,
  ...securityRecommendedRules,
};

const tsSpecificRules = {
  ...importTypescriptRules,
  '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }],
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
};

const sharedRules = {
  ...baseRules,
  'react/react-in-jsx-scope': 'off',
  'react/jsx-uses-react': 'off',
  'import/no-unresolved': 'off',
  'import/order': 'off',
  'simple-import-sort/imports': 'warn',
  'simple-import-sort/exports': 'warn',
  'tailwindcss/classnames-order': 'warn',
  'tailwindcss/no-custom-classname': 'off',
  'unicorn/filename-case': 'off',
  'unicorn/prevent-abbreviations': 'off',
  'unicorn/no-null': 'off',
  'unicorn/consistent-function-scoping': 'off',
  'unicorn/prefer-add-event-listener': 'off',
  'unicorn/prefer-structured-clone': 'off',
  'unicorn/prefer-export-from': 'off',
  'unicorn/text-encoding-identifier-case': 'off',
  'security/detect-object-injection': 'off',
  'security/detect-child-process': 'off',
  'security/detect-non-literal-fs-filename': 'off',
  'prettier/prettier': 'warn',
  'max-lines': 'off',
  'max-lines-per-function': 'off',
  'max-depth': ['warn', 4],
  complexity: 'off',
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: ['@features/*/*'], message: '请从 @features/<name> 的公共入口导入。' },
        { group: ['@entities/*/*'], message: '请从 @entities/<name> 的公共入口导入。' },
        { group: ['@shared/*/*/*'], message: '请从 @shared/<name> 的公共入口导入。' },
        { group: ['@pages/*/**'], message: '禁止跨页面子路径依赖，请抽到 widgets/features。' },
        { group: ['@widgets/*/*'], message: '请从 @widgets/<name> 公共入口导入。' },
      ],
    },
  ],
};

const sharedPlugins = {
  react: reactPlugin,
  'react-hooks': reactHooksPlugin,
  import: importPlugin,
  'jsx-a11y': jsxA11yPlugin,
  unicorn: unicornPlugin,
  security: securityPlugin,
  tailwindcss: tailwindPlugin,
  'simple-import-sort': simpleImportSortPlugin,
  prettier: prettierPlugin,
};

const [
  tsBaseConfig,
  tsEslintRecommendedConfig,
  tsTypeCheckedConfig,
] = tseslint.configs.recommendedTypeChecked;

const typeAwareTsConfigs = [
  { ...tsBaseConfig, files: typescriptFiles },
  { ...tsEslintRecommendedConfig, files: typescriptFiles },
  { ...tsTypeCheckedConfig, files: typescriptFiles },
];

const config = tseslint.config(
  {
    ignores,
  },
  ...typeAwareTsConfigs,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import/resolver': {
        typescript: { project: './tsconfig.eslint.json', alwaysTryTypes: true },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    plugins: sharedPlugins,
    rules: {
      ...sharedRules,
      ...tsSpecificRules,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx'] },
      },
    },
    plugins: sharedPlugins,
    rules: sharedRules,
  },
  {
    files: ['**/*.config.{js,cjs,mjs,ts}', 'vite.config.{js,ts}', 'tailwind.config.{js,ts}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  prettierConfig,
);

export default config;
