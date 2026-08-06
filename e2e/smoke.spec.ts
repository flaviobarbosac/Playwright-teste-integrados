import { test, expect } from '@playwright/test';

test.describe('ClampFY smoke', () => {
  test('landing page carrega', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Do orçamento ao pagamento/i })).toBeVisible();
  });

  test('página de login exibe branding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Do orcamento ao pagamento/i)).toBeVisible();
  });

  test('página de preços é acessível', async ({ page }) => {
    await page.goto('/precos');
    await expect(page).toHaveURL(/precos/);
  });
});
