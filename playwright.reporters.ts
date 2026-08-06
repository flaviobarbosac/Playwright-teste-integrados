import type { ReporterDescription } from '@playwright/test';

export const playwrightReporters: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never', outputFolder: 'reports/html' }],
  ['./reporters/resumo-reporter.ts'],
];
