import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const storageFile = path.join(rootDir, 'e2e-integrado', '.auth', 'user.json');

if (!fs.existsSync(storageFile)) {
  console.error('[e2e-dev] Sessão não encontrada.');
  console.error('Rode primeiro: npm run auth:save');
  console.error('Faça login no Chrome que abrir e aguarde a mensagem de sucesso.');
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
const origin = state.origins?.find((o) => /clampfy\.com/i.test(o.origin));
const hasSession =
  origin?.localStorage?.some((e) => e.name === 'clampfy.session' && e.value) ||
  origin?.sessionStorage?.some((e) => e.name === 'clampfy.session' && e.value);

if (!hasSession) {
  console.error('[e2e-dev] user.json sem clampfy.session.');
  console.error('Rode novamente: npm run auth:save');
  console.error('Conclua o login em https://www.dev.clampfy.com antes de fechar o Chrome.');
  process.exit(1);
}
