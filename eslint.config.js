// @ts-check
import tseslint from 'typescript-eslint';

const serverOnlyPackages = ['@educatr/db', '@educatr/ai'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.vercel/**',
      '**/.output/**',
    ],
  },
  ...tseslint.configs.recommended,
  // Mobile app: must not import server-only packages.
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: serverOnlyPackages.map((name) => ({
            name,
            message:
              'Server-only package. apps/mobile must talk to the web server over HTTP via @educatr/shared apiClient.',
          })),
          patterns: serverOnlyPackages.map((name) => `${name}/*`),
        },
      ],
    },
  },
  // Shared package: isomorphic, must not depend on server-only packages or Node builtins.
  {
    files: ['packages/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...serverOnlyPackages.map((name) => ({
              name,
              message: '@educatr/shared must remain isomorphic — no server-only imports.',
            })),
            { name: 'fs', message: 'No Node builtins in @educatr/shared.' },
            { name: 'node:fs', message: 'No Node builtins in @educatr/shared.' },
            { name: 'path', message: 'No Node builtins in @educatr/shared.' },
            { name: 'node:path', message: 'No Node builtins in @educatr/shared.' },
            { name: 'crypto', message: 'Use Web Crypto in @educatr/shared, not node:crypto.' },
            { name: 'node:crypto', message: 'Use Web Crypto in @educatr/shared.' },
          ],
          patterns: serverOnlyPackages.map((name) => `${name}/*`),
        },
      ],
    },
  },
);
