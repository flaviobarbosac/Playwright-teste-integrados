import fs from 'node:fs';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

interface TestEntry {
  title: string;
  project: string;
  file: string;
  status: TestResult['status'];
  durationMs: number;
  error?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  const seconds = Math.round(ms / 100) / 10;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round((seconds % 60) * 10) / 10;
  return `${minutes}m ${rest}s`;
}

function statusLabel(status: TestResult['status']): string {
  switch (status) {
    case 'passed':
      return 'OK';
    case 'failed':
      return 'FALHOU';
    case 'timedOut':
      return 'TIMEOUT';
    case 'skipped':
      return 'PULADO';
    case 'interrupted':
      return 'INTERROMPIDO';
    default:
      return String(status).toUpperCase();
  }
}

function relativeFile(file: string): string {
  return path.relative(process.cwd(), file).replaceAll('\\', '/');
}

function buildTestTitle(test: TestCase): string {
  const parts: string[] = [];
  let suite = test.parent;
  while (suite?.title) {
    if (!suite.title.endsWith('.spec.ts') && suite.title !== suite.project()?.name) {
      parts.unshift(suite.title);
    }
    suite = suite.parent;
  }
  parts.push(test.title);
  return parts.join(' › ');
}

class ResumoReporter implements Reporter {
  private config!: FullConfig;
  private startedAt = Date.now();
  private entries: TestEntry[] = [];

  onBegin(config: FullConfig): void {
    this.config = config;
    this.startedAt = Date.now();
    this.entries = [];
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? 'default';
    const title = buildTestTitle(test);
    const error = result.errors.map((item) => item.message ?? String(item)).join('\n').trim();

    this.entries.push({
      title,
      project,
      file: relativeFile(test.location.file),
      status: result.status,
      durationMs: result.duration,
      error: error || undefined,
    });
  }

  onEnd(result: FullResult): void {
    const finishedAt = new Date();
    const durationMs = Date.now() - this.startedAt;
    const passed = this.entries.filter((entry) => entry.status === 'passed').length;
    const failed = this.entries.filter((entry) => entry.status === 'failed').length;
    const timedOut = this.entries.filter((entry) => entry.status === 'timedOut').length;
    const skipped = this.entries.filter((entry) => entry.status === 'skipped').length;
    const interrupted = this.entries.filter((entry) => entry.status === 'interrupted').length;
    const total = this.entries.length;

    const lines: string[] = [
      '# Relatório E2E — Clampfy',
      '',
      `- **Data:** ${finishedAt.toLocaleString('pt-BR')}`,
      `- **Duração:** ${formatDuration(durationMs)}`,
      `- **Resultado geral:** ${result.status === 'passed' ? 'APROVADO' : 'REPROVADO'}`,
      '',
      '## Resumo',
      '',
      `| Métrica | Quantidade |`,
      `| --- | ---: |`,
      `| Total | ${total} |`,
      `| Aprovados | ${passed} |`,
      `| Falhas | ${failed} |`,
      `| Timeout | ${timedOut} |`,
      `| Pulados | ${skipped} |`,
      `| Interrompidos | ${interrupted} |`,
      '',
      '## Testes',
      '',
      '| Status | Projeto | Teste | Arquivo | Duração |',
      '| --- | --- | --- | --- | ---: |',
    ];

    for (const entry of this.entries) {
      const safeTitle = entry.title.replaceAll('|', '\\|');
      lines.push(
        `| ${statusLabel(entry.status)} | ${entry.project} | ${safeTitle} | \`${entry.file}\` | ${formatDuration(entry.durationMs)} |`,
      );
    }

    const failures = this.entries.filter(
      (entry) => entry.status === 'failed' || entry.status === 'timedOut' || entry.status === 'interrupted',
    );

    if (failures.length > 0) {
      lines.push('', '## Falhas', '');
      for (const entry of failures) {
        lines.push(`### ${entry.title}`, '', `- Projeto: \`${entry.project}\``, `- Arquivo: \`${entry.file}\``, '');
        if (entry.error) {
          lines.push('```', entry.error, '```', '');
        }
      }
    }

    lines.push(
      '',
      '## Artefatos',
      '',
      '- Relatório HTML: `reports/html/index.html`',
      '- Screenshots/trace: `test-results/`',
      '',
    );

    const reportsDir = path.join(process.cwd(), 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const timestamp = finishedAt
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '-')
      .slice(0, 19);
    const historyFile = path.join(reportsDir, `resumo-e2e-${timestamp}.md`);
    const latestFile = path.join(reportsDir, 'ultimo-resumo.md');

    const content = lines.join('\n');
    fs.writeFileSync(historyFile, content, 'utf8');
    fs.writeFileSync(latestFile, content, 'utf8');

    const divider = '═'.repeat(60);
    console.log(`\n${divider}`);
    console.log(' RELATÓRIO E2E — RESULTADO FINAL');
    console.log(divider);
    console.log(` Resultado : ${result.status === 'passed' ? 'APROVADO' : 'REPROVADO'}`);
    console.log(` Duração   : ${formatDuration(durationMs)}`);
    console.log(` Total     : ${total}`);
    console.log(` Aprovados : ${passed}`);
    console.log(` Falhas    : ${failed + timedOut + interrupted}`);
    console.log(` Pulados   : ${skipped}`);
    console.log('─'.repeat(60));

    for (const entry of this.entries) {
      const marker = entry.status === 'passed' ? '✓' : entry.status === 'skipped' ? '○' : '✗';
      console.log(` ${marker} [${entry.project}] ${entry.title} (${formatDuration(entry.durationMs)})`);
    }

    console.log('─'.repeat(60));
    console.log(` Markdown  : ${relativeFile(latestFile)}`);
    console.log(` Histórico : ${relativeFile(historyFile)}`);
    console.log(` HTML      : reports/html/index.html`);
    console.log(`${divider}\n`);
  }
}

export default ResumoReporter;
