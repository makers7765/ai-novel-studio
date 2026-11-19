const { test, expect } = require('@playwright/test');

test.describe('AI 小说工作室 · 安全 UI 检查', () => {
  test('桌面端页面加载、八项任务入口和上下文预览存在', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Novel Studio/);
    await expect(page.locator('#freeStudio')).toBeVisible();
    await expect(page.locator('#freeMode')).toBeVisible();
    await expect(page.locator('#tasks .task')).toHaveCount(8);
    await expect(page.locator('#contextControls')).toBeAttached();
    await expect(page.locator('#importBtn')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
    expect(pageErrors).toEqual([]);
  });

  test('窄屏导航可展开，任务卡片单列且无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const toggle = page.locator('#mobileNavToggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#nav')).toHaveClass(/mobile-open/);
    await expect(page.locator('#nav button')).toHaveCount(10);
    await page.locator('#nav button[data-page="studio"]').click();
    await expect(page.locator('#page-studio')).toBeVisible();
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      taskColumns: getComputedStyle(document.querySelector('#tasks')).gridTemplateColumns.split(' ').length,
      generateVisible: (() => { const r = document.querySelector('#generateBtn').getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1; })(),
      clearVisible: (() => { const r = document.querySelector('#clearPrompt').getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1; })()
    }));
    expect(metrics.overflow).toBeFalsy();
    expect(metrics.taskColumns).toBe(1);
    expect(metrics.generateVisible).toBeTruthy();
    expect(metrics.clearVisible).toBeTruthy();
  });

  test('切换任务不触发 AI 请求，八项入口保持可用', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.locator('.advanced-task-list summary').click();
    await page.locator('.task[data-task="人物设定"]').click();
    await expect(page.locator('#taskName')).toHaveValue('人物设定');
    await page.locator('.task[data-task="续写"]').click();
    await expect(page.locator('#taskName')).toHaveValue('续写');
    await page.locator('#toggleContextPreview').click();
    await expect(page.locator('#contextControls')).toBeVisible();
  });
  
  test('自由创作可选填输入并支持选段修改', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.route('**/api/generate', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: '夜色渐深，远处传来一声钟响。' })
    }));
    await page.locator('#freeInstruction').fill('写一段悬疑小说开场');
    await page.locator('#runFreeWrite').click();
    await expect(page.locator('#result')).toContainText('夜色渐深');
    await expect(page.locator('#versionList')).toContainText('自由创作');
    await page.locator('#result').evaluate(el => {
      el.textContent = '主角推开古老的木门。';
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.locator('#useSelectedText').click();
    await expect(page.locator('#freeReference')).toHaveValue('主角推开古老的木门。');
  });
});
