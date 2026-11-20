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
    await expect(page.locator('#nav button')).toHaveCount(11);
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

  test('章节管理页面始终显示编辑区与清晰空状态，导航切换正确', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('[data-page="chapters"]').click();
    await expect(page.locator('#page-chapters')).toBeVisible();
    await expect(page.locator('#page-chapters h1')).toHaveText('章节管理');
    await expect(page.locator('#newChapter')).toBeVisible();
    await expect(page.locator('#chapterList')).toContainText('还没有章节');
    await expect(page.locator('#chapterBody')).toBeVisible();
    await expect(page.locator('#page-chapters')).toBeVisible();
    await page.locator('[data-page="studio"]').click();
    await expect(page.locator('#page-studio')).toBeVisible();
    await expect(page.locator('#page-chapters')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('新版桌面与手机布局没有横向溢出，导航和内容区域可用', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const desktop = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      sidebar: getComputedStyle(document.querySelector('aside')).position,
      mainWidth: document.querySelector('main').getBoundingClientRect().width
    }));
    expect(desktop.overflow).toBeFalsy();
    expect(desktop.sidebar).toBe('sticky');
    expect(desktop.mainWidth).toBeGreaterThan(700);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator('#mobileNavToggle').click();
    await expect(page.locator('#nav')).toHaveClass(/mobile-open/);
    await page.locator('#nav [data-page="chapters"]').click();
    const mobile = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      editorWidth: document.querySelector('#chapterBody').getBoundingClientRect().width
    }));
    expect(mobile.overflow).toBeFalsy();
    expect(mobile.editorWidth).toBeGreaterThan(300);
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
  
  test('自由创作传递已选服务商、连续生成并保存版本，支持选段修改', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem('novelStudioFreeProvider', JSON.stringify({
      provider: 'gemini', apiKey: 'test-gemini-key-123', model: 'gemini-test-model'
    })));
    await page.goto('/');
    const requests = [];
    await page.route('**/api/generate', route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: requests.length === 1 ? '夜色渐深，远处传来一声钟响。' : '钟声之后，门缝里透出一道冷光。' })
      });
    });
    await page.locator('#freeInstruction').fill('写一段悬疑小说开场');
    await page.locator('#runFreeWrite').click();
    await expect(page.locator('#result')).toContainText('夜色渐深');
    await expect(page.locator('#versionList')).toContainText('自由创作');
    expect(requests[0].provider).toBe('gemini');
    expect(requests[0].apiKey).toBe('test-gemini-key-123');
    expect(requests[0].model).toBe('gemini-test-model');

    await page.locator('#freeMode').selectOption('续写');
    await page.locator('#freeInstruction').fill('继续写，保持悬疑气氛');
    await page.locator('#runFreeWrite').click();
    await expect(page.locator('#result')).toContainText('门缝里透出一道冷光');
    expect(requests).toHaveLength(2);
    expect(requests[1].prompt).toContain('夜色渐深，远处传来一声钟响。');
    expect(requests[1].provider).toBe('gemini');
    await expect.poll(async () => page.evaluate(() => {
      const versions = JSON.parse(localStorage.getItem('novelStudioV2Versions') || '{}');
      return Object.values(versions).flat().length;
    })).toBeGreaterThanOrEqual(2);

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
  
  test('多小说项目可创建、切换并保留独立资料', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('[data-page="projects"]').click();
    await expect(page.locator('#novelProjectList .project-card')).toHaveCount(1);
    page.once('dialog', dialog => dialog.accept('测试小说二'));
    await page.locator('#createNovelProject').click();
    await expect(page.locator('#bookTitle')).toHaveValue('测试小说二');
    await page.locator('[data-page="projects"]').click();
    await expect(page.locator('#novelProjectList .project-card')).toHaveCount(2);
    await page.locator('#novelProjectList .project-card').first().getByRole('button', { name: '打开项目' }).click();
    await expect(page.locator('#bookTitle')).not.toHaveValue('测试小说二');
    await page.reload();
    await page.locator('[data-page="projects"]').click();
    await expect(page.locator('#novelProjectList .project-card')).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test('小说记忆、剧情时间线和素材可保存并进入 AI 上下文', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('[data-page="memory"]').click();
    await page.locator('#memoryTitle').fill('主角右手受伤');
    await page.locator('#memoryContent').fill('在治愈之前不能使用长剑。');
    await page.locator('#saveMemory').click();
    await expect(page.locator('#memoryList')).toContainText('主角右手受伤');
    await page.locator('[data-page="timeline"]').click();
    await page.locator('#eventDate').fill('帝历 302 年春');
    await page.locator('#eventTitle').fill('进入北境');
    await page.locator('#eventContent').fill('主角抵达边境城。');
    await page.locator('#saveTimelineEvent').click();
    await expect(page.locator('#timelineList')).toContainText('进入北境');
    await page.locator('[data-page="library"]').click();
    await page.locator('#materialTitle').fill('雾中车站');
    await page.locator('#materialContent').fill('废弃车站被浓雾笼罩，远处传来钟声。');
    await page.locator('#saveMaterial').click();
    await expect(page.locator('#materialList')).toContainText('雾中车站');
    await page.locator('[data-page="studio"]').click();
    await page.locator('#toggleContextPreview').click();
    await page.locator('[data-context="materials"]').check();
    await expect(page.locator('#contextPreview')).toContainText('主角右手受伤');
    await expect(page.locator('#contextPreview')).toContainText('进入北境');
    await expect(page.locator('#contextPreview')).toContainText('雾中车站');
    await page.reload();
    await page.locator('[data-page="memory"]').click();
    await expect(page.locator('#memoryList')).toContainText('主角右手受伤');
    expect(errors).toEqual([]);
  });
  
  test('人物关系图可生成，AI 质量检测可保存报告', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('[data-page="characters"]').click();
    await page.locator('#addCharacter').click();
    await page.locator('#charName').fill('林岚');
    await page.locator('#characterForm').evaluate(form => form.requestSubmit());
    await page.locator('#addCharacter').click();
    await page.locator('#charName').fill('沈砚');
    await page.locator('#characterForm').evaluate(form => form.requestSubmit());
    await page.locator('[data-page="memory"]').click();
    await page.locator('#relationFrom').selectOption('林岚');
    await page.locator('#relationTo').selectOption('沈砚');
    await page.locator('#relationType').selectOption('盟友');
    await page.locator('#saveRelationship').click();
    await expect(page.locator('#relationshipGraph svg line')).toHaveCount(1);
    await expect(page.locator('#relationshipList')).toContainText('盟友');
    await page.locator('[data-page="quality"]').click();
    await page.route('**/api/generate', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: '检测报告：未发现明显逻辑冲突。' })
    }));
    await page.locator('#qaInput').fill('林岚与沈砚结伴进入北境。');
    await page.locator('#runQualityCheck').click();
    await expect(page.locator('#qaResult')).toHaveValue(/检测报告/);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#saveQualityReport').click();
    await page.locator('[data-page="archive"]').click();
    await expect(page.locator('#archiveList')).toContainText('小说质量检测');
    expect(errors).toEqual([]);
  });
  
  test('章节编辑器自动保存、查找替换与沉浸写作可用', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('[data-page="chapters"]').click();
    await page.locator('#newChapter').click();
    await page.locator('#chapterTitle').fill('雾夜来客');
    await page.locator('#chapterBody').fill('林岚推开木门，走进雾中。');
    await expect(page.locator('#chapterWordCount')).toContainText('字');
    await expect.poll(async () => page.evaluate(() => { const w = JSON.parse(localStorage.getItem('novelStudioV2Workspace') || '{}'); const p = (w.projects || []).find(x => x.id === w.activeId); return p?.editorDraft?.title || ''; }), { timeout: 5000 }).toBe('雾夜来客');
    await page.reload();
    await page.locator('[data-page="chapters"]').click();
    await expect(page.locator('#chapterTitle')).toHaveValue('雾夜来客');
    await expect(page.locator('#chapterBody')).toHaveValue('林岚推开木门，走进雾中。');
    await page.locator('#chapterFind').fill('木门');
    await page.locator('#chapterReplace').fill('铁门');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#replaceChapterText').click();
    await expect(page.locator('#chapterBody')).toHaveValue(/铁门/);
    await page.locator('#focusEditor').click();
    await expect(page.locator('body')).toHaveClass(/writing-focus/);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/writing-focus/);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#saveChapterEdit').click();
    await expect(page.locator('#chapterList')).toContainText('雾夜来客');
    await page.locator('#chapterBody').fill('林岚推开铁门，走进浓雾。');
    await expect.poll(async () => page.evaluate(() => { const w = JSON.parse(localStorage.getItem('novelStudioV2Workspace') || '{}'); const p = (w.projects || []).find(x => x.id === w.activeId); return p?.data?.chapters?.[0]?.body || ''; }), { timeout: 5000 }).toBe('林岚推开铁门，走进浓雾。');
    await page.reload();
    await page.locator('[data-page="chapters"]').click();
    await page.locator('#chapterList .item').first().click();
    await expect(page.locator('#chapterBody')).toHaveValue('林岚推开铁门，走进浓雾。');
    expect(errors).toEqual([]);
  });
});
