import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: ['.next/**', '.vercel/**', '.frontend-only-build-backup/**', 'out/**', 'build/**']
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;
