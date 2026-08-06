const cdpUrl = process.env.E2E_CDP_URL ?? 'http://127.0.0.1:9222';

async function isCdpReady() {
  try {
    const response = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

if (await isCdpReady()) {
  const info = await (await fetch(`${cdpUrl}/json/version`)).json();
  console.log(`[e2e-dev] Chrome conectável em ${cdpUrl} (${info.Browser})`);
  process.exit(0);
}

console.error('[e2e-dev] Chrome E2E não detectado na porta 9222.');
console.error('');
console.error('Faça assim:');
console.error('  1) Feche TODAS as janelas do Chrome (inclusive na bandeja)');
console.error('  2) Abra pelo ícone "Chrome E2E" na barra de tarefas');
console.error('     (não use o Chrome normal)');
console.error('  3) Faça login em https://www.dev.clampfy.com');
console.error('  4) Rode novamente: npm run test:dev:headed');
console.error('');
console.error('Se o ícone não existir, use o atalho na área de trabalho: Chrome E2E.lnk');
process.exit(1);
