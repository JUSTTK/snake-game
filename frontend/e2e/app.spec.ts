import { expect, test } from '@playwright/test';

test.describe('Snake game e2e', () => {
  test('loads the mode selector and navigates to single player', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '贪吃蛇 3D' })).toBeVisible();
    await expect(page.getByText('选择模式后进入三视角游戏界面。')).toBeVisible();

    await page.getByRole('button', { name: '单机模式' }).click();

    await expect(page).toHaveURL(/\/single-player$/);
    await expect(page.getByRole('heading', { name: '贪吃蛇 3D 单机版' })).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('starts, pauses, and restarts a single-player game', async ({ page }) => {
    await page.goto('/single-player');

    await expect(page.getByText('当前状态：准备开始')).toBeVisible();
    await expect(page.getByText('当前分数')).toBeVisible();

    await page.getByRole('button', { name: '开始游戏' }).click();
    await expect(page.getByText('当前状态：进行中')).toBeVisible();

    await page.keyboard.press('Space');
    await expect(page.getByText('当前状态：已暂停')).toBeVisible();

    await page.getByRole('button', { name: '继续游戏' }).click();
    await expect(page.getByText('当前状态：进行中')).toBeVisible();

    await page.getByRole('button', { name: '重新开始' }).click();
    await expect(page.getByText('当前状态：进行中')).toBeVisible();
  });

  test('opens settings and changes a visible setting', async ({ page }) => {
    await page.goto('/single-player');

    await page.getByRole('button', { name: /设置/ }).click();
    await expect(page.getByRole('heading', { name: '游戏设置' })).toBeVisible();

    await page.getByRole('button', { name: /控制/ }).click();
    await page.getByRole('button', { name: 'WASD' }).click();

    await expect(page.getByRole('button', { name: 'WASD' })).toHaveCSS('color', 'rgb(74, 222, 128)');
  });

  test('validates multiplayer lobby form before connecting', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '多人模式' }).click();

    await expect(page).toHaveURL(/\/multiplayer$/);
    await expect(page.getByText('多人联机大厅')).toBeVisible();

    await page.getByPlaceholder('请输入房间 ID').fill('');
    await page.getByRole('button', { name: '进入游戏' }).click();

    await expect(page.getByText('请填写完整的房间和玩家信息。')).toBeVisible();
  });
});
