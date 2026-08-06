import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = process.env.E2E_CDP_PORT ?? '9222';
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const profileDir = path.join(rootDir, 'e2e-integrado', '.chrome-cdp-profile');

const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = candidates.find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error('Google Chrome não encontrado.');
  process.exit(1);
}

fs.mkdirSync(profileDir, { recursive: true });

const child = spawn(
  chromePath,
  [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profileDir}`,
  ],
  { detached: true, stdio: 'ignore' },
);

child.unref();

console.log(`[chrome:debug] Chrome E2E iniciado na porta ${port}.`);
console.log('[chrome:debug] Faça login em https://www.dev.clampfy.com e rode: npm run test:dev:headed');
