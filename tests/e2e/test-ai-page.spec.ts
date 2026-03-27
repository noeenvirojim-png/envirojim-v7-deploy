
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, login } from './fixtures';

test('AI Diagnosis Page Rendering', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.manager); // Manager should have access

    await page.goto('/dashboard/diagnosis');
    await page.waitForTimeout(1000);

    // Check for title or question
    const question = page.locator('h2');
    await expect(question).toBeVisible();

    const text = await question.innerText();
    console.log('Diagnosis Question:', text);

    // Check it's not the empty state
    await expect(page.getByText('Aucun arbre de diagnostic configuré')).not.toBeVisible();

    // Check mic button
    const micButton = page.locator('button:has(.lucide-mic)');
    await expect(micButton).toBeVisible();
});
