import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entry = 'src/index.ts';

await build({
  entryPoints: [entry],
  platform: 'node',
  format: 'cjs', // Firebase Functions requires CommonJS
  target: 'node18',
  outfile: 'dist/index.cjs',
  bundle: true,
  sourcemap: true,
  mainFields: ['module', 'main'],
  external: [
    'firebase-admin',
    'firebase-functions',
  ],
  logLevel: 'info',
  banner: {
    js: '// Firebase Cloud Functions Bundle',
  },
  // Resolve workspace packages
  alias: {
    '@api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src/index.ts'),
    '@clients-rxnorm': path.resolve(__dirname, '../../packages/clients-rxnorm/src/index.ts'),
    '@clients-openfda': path.resolve(__dirname, '../../packages/clients-openfda/src/index.ts'),
    '@clients-openai': path.resolve(__dirname, '../../packages/clients-openai/src/index.ts'),
    '@domain-ndc': path.resolve(__dirname, '../../packages/domain-ndc/src/index.ts'),
    '@data-cache': path.resolve(__dirname, '../../packages/data-cache/src/index.ts'),
    '@core-config': path.resolve(__dirname, '../../packages/core-config/src/index.ts'),
    '@core-guardrails': path.resolve(__dirname, '../../packages/core-guardrails/src/index.ts'),
    '@utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
  },
});

console.log('✅ Build completed successfully!');

