import { execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = process.env.CLAMPFY_API_DIR ?? path.resolve(rootDir, '../../profissionaisliberais');
const composeFile = path.join(apiRoot, 'docker-compose.dev.yml');
const skipDocker = process.env.E2E_SKIP_DOCKER === '1';

function waitForPort(port, host = '127.0.0.1', timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Porta ${port} indisponível após ${timeoutMs}ms`));
          return;
        }
        setTimeout(tryConnect, 1_000);
      });
    };
    tryConnect();
  });
}

async function ensureDockerInfra() {
  if (skipDocker) {
    console.log('[e2e] E2E_SKIP_DOCKER=1 — assumindo Postgres/Rabbit/Redis já ativos.');
    return;
  }

  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch {
    console.warn('[e2e] Docker indisponível — assumindo infra local já ativa.');
    return;
  }

  console.log('[e2e] Subindo postgres, rabbitmq e redis via docker compose...');
  execSync(`docker compose -f "${composeFile}" up -d postgres rabbitmq redis`, {
    stdio: 'inherit',
    cwd: apiRoot,
  });

  await waitForPort(5432);
  await waitForPort(5672);
  await waitForPort(6379);
  console.log('[e2e] Infra Docker pronta.');
}

await ensureDockerInfra();
