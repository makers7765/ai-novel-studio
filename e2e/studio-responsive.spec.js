const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test.describe('StoryForge V3 · 独立验收', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面启动无 JS 异常，11 个导航栏目逐个切换且内容唯一可见', async ({ page }) => {
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    const names=['home','studio','book','world','characters','chapters','memory','timeline','library','archive','quality'];
    for(const name of names){
      await page.locator('[data-page="'+name+'"]').click();
      await expect(page.locator('#page-'+name)).toBeVisible();
      await expect(page.locator('#page-'+name+' h1')).toBeVisible();
      await expect(page.locator('.page.active-page')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test('桌面固定侧栏与右侧独立滚动，手机端导航横向可用且无横向溢出', async ({ page }) => {
    await page.setViewportSize({width:1440,height:850});
    await page.locator('[data-page="chapters"]').click();
    const desktop=await page.evaluate(()=>{
      const side=document.querySelector('.sidebar'),main=document.querySelector('#main');
      return {grid:getComputedStyle(document.querySelector('.app-shell')).display,side:side.getBoundingClientRect(),main:main.getBoundingClientRect(),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    expect(desktop.grid).toBe('grid'); expect(desktop.overflow).toBe(false);
    expect(desktop.main.left).toBeGreaterThan(desktop.side.left+desktop.side.width-1);
    await page.setViewportSize({width:390,height:844});
    await page.reload();
    const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,nav:getComputedStyle(document.querySelector('.nav')).display,body:getComputedStyle(document.body).overflowY}));
    expect(mobile.overflow).toBe(false); expect(mobile.nav).toBe('flex'); expect(mobile.body).not.toBe('hidden');
    await page.locator('[data-page="quality"]').click();
    await expect(page.locator('#page-quality')).toBeVisible();
  });

  test('多作品创建、切换、重命名和刷新后数据仍存在', async ({page})=>{
    await page.locator('#newProject').click();
    await expect(page.locator('#page-book')).toBeVisible();
    await page.locator('#bookTitle').fill('雾海纪事');
    await page.locator('#synopsis').fill('失踪的灯塔守夜人留下了一本航海日志。');
    await page.locator('#saveBook').click();
    await page.locator('[data-page="home"]').click();
    await expect(page.locator('.project-card')).toHaveCount(2);
    await page.reload();
    await expect(page.locator('.project-card')).toHaveCount(2);
    await expect(page.locator('.project-card').filter({hasText:'雾海纪事'})).toHaveCount(1);
    const storage=await page.evaluate(()=>JSON.parse(localStorage.getItem('storyforge.workspace.v1')));
    expect(storage.books.length).toBe(2);
    expect(storage.books.find(b=>b.title==='雾海纪事').synopsis).toContain('灯塔');
  });

  test('小说资料、世界观、人物、记忆、时间线和素材 CRUD 正常', async ({page})=>{
    await page.locator('[data-page="book"]').click();
    await page.locator('#bookTitle').fill('自动化测试作品');
    await page.locator('#synopsis').fill('一个测试用故事简介。');
    await page.locator('#saveBook').click();
    await page.locator('[data-page="world"]').click();
    await page.locator('#worldTitle').fill('潮汐法则');
    await page.locator('#worldContent').fill('每逢月蚀，海潮会倒流三刻钟。');
    await page.locator('#saveWorld').click();
    await expect(page.locator('#worldList')).toContainText('潮汐法则');
    await page.locator('[data-page="characters"]').click();
    await page.locator('#charName').fill('林岚');
    await page.locator('#charRole').fill('灯塔守夜人');
    await page.locator('#charGoal').fill('寻找失踪的姐姐');
    await page.locator('#saveCharacter').click();
    await expect(page.locator('#characterList')).toContainText('林岚');
    await page.locator('[data-page="memory"]').click();
    await page.locator('#memoryTitle').fill('重要事实');
    await page.locator('#memoryContent').fill('林岚害怕深水。');
    await page.locator('#saveMemory').click();
    await expect(page.locator('#memoryList')).toContainText('林岚害怕深水');
    await page.locator('[data-page="timeline"]').click();
    await page.locator('#eventTime').fill('第三年冬');
    await page.locator('#eventTitle').fill('灯塔熄灭');
    await page.locator('#eventContent').fill('海雾吞没了灯塔的光。');
    await page.locator('#saveEvent').click();
    await expect(page.locator('#timelineList')).toContainText('灯塔熄灭');
    await page.locator('[data-page="library"]').click();
    await page.locator('#materialTitle').fill('海雾场景');
    await page.locator('#materialContent').fill('浓雾贴着礁石移动。');
    await page.locator('#saveMaterial').click();
    await expect(page.locator('#materialList')).toContainText('海雾场景');
    await page.reload();
    await page.locator('[data-page="world"]').click();
    await expect(page.locator('#worldList')).toContainText('潮汐法则');
  });

  test('章节新建、草稿自动保存、保存、再次打开和删除', async ({page})=>{
    await page.locator('[data-page="chapters"]').click();
    await page.locator('#newChapter').click();
    await page.locator('#chapterTitle').fill('第一章 雾');
    await page.locator('#chapterBody').fill('林岚推开木门，走进雾中。');
    await expect(page.locator('#chapterWords')).toContainText('字');
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('storyforge.workspace.v1')).books[0].editorDraft.body)).toContain('林岚');
    await page.reload();
    await page.locator('[data-page="chapters"]').click();
    await expect(page.locator('#chapterTitle')).toHaveValue('第一章 雾');
    await expect(page.locator('#chapterBody')).toHaveValue('林岚推开木门，走进雾中。');
    await page.locator('#saveChapter').click();
    await expect(page.locator('#chapterList')).toContainText('第一章 雾');
    await page.locator('#newChapter').click();
    await page.locator('#chapterTitle').fill('第二章');
    await page.locator('#chapterBody').fill('潮水拍打礁石。');
    await page.locator('#saveChapter').click();
    await expect(page.locator('#chapterList .chapter-item')).toHaveCount(2);
    page.once('dialog',d=>d.accept());
    await page.locator('#deleteChapter').click();
    await expect(page.locator('#chapterList .chapter-item')).toHaveCount(1);
  });

  test('模型配置、AI 生成、连续续写、版本恢复和归档可用（模拟模型响应）', async ({page})=>{
    await page.locator('[data-page="studio"]').click();
    await page.locator('#providerBtn').click();
    await page.locator('#apiKey').fill('test-key-123456789');
    await page.locator('#saveProvider').click();
    await page.locator('#prompt').fill('写一段悬疑小说开场。');
    const requests=[];
    await page.route('**/api/generate',async route=>{
      const body=route.request().postDataJSON();requests.push(body);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:requests.length===1?'夜色降临，灯塔突然熄灭。':'雾中传来三声敲门。'})});
    });
    await page.locator('#generateBtn').click();
    await expect(page.locator('#result')).toHaveValue('夜色降临，灯塔突然熄灭。');
    await expect(page.locator('#versionList')).toContainText('自由创作');
    await page.locator('#prompt').fill('继续写，制造悬念。');
    await page.locator('#sourceText').fill('夜色降临，灯塔突然熄灭。');
    await page.locator('#taskList [data-task="续写"]').click();
    await page.locator('#generateBtn').click();
    await expect(page.locator('#result')).toHaveValue('雾中传来三声敲门。');
    expect(requests).toHaveLength(2);
    expect(requests[1].task).toBe('续写');
    expect(requests[0].task).toBe('自由创作');
    expect(requests[0].provider).toBe('gemini');
    const savedData=await page.evaluate(()=>localStorage.getItem('storyforge.workspace.v1')||'');
    expect(savedData).not.toContain('test-key-123456789');
    expect(requests[0].apiKey).toBe('test-key-123456789');
    await expect(page.locator('#versionList .version-item')).toHaveCount(2);
    await page.locator('#saveResultBtn').click();
    await page.locator('[data-page="archive"]').click();
    await expect(page.locator('#archiveList')).toContainText('雾中传来三声敲门');
  });

  test('清空输入不清空结果；复制和备份导入导出控件存在', async ({page})=>{
    await page.locator('[data-page="studio"]').click();
    await page.locator('#prompt').fill('待清空的提示词');
    await page.locator('#sourceText').fill('待清空的原文');
    await page.locator('#result').fill('保留的生成结果');
    await page.locator('#clearBtn').click();
    await expect(page.locator('#prompt')).toBeEmpty();
    await expect(page.locator('#sourceText')).toBeEmpty();
    await expect(page.locator('#result')).toHaveValue('保留的生成结果');
    await expect(page.locator('#exportBtn')).toBeVisible();
    await expect(page.locator('#importBtn')).toBeVisible();
  });

  test('质量检测会把结果写入报告并可保存归档（模拟模型响应）', async ({page})=>{
    await page.locator('[data-page="studio"]').click();
    await page.locator('#providerBtn').click();
    await page.locator('#apiKey').fill('test-key-123456789');
    await page.locator('#saveProvider').click();
    await page.route('**/api/generate',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'审查结论：主角行动动机充分；第三幕时间线需要补充。'})}));
    await page.locator('[data-page="quality"]').click();
    await page.locator('#qualityInput').fill('林岚在夜里离开灯塔，第二天清晨却已经回到房间。');
    await page.locator('#runQuality').click();
    await expect(page.locator('#qualityResult')).toHaveValue(/审查结论/);
    await page.locator('#saveQuality').click();
    await expect(page.locator('#archiveList')).toContainText('质量检测报告');
  });

  test('输入内容安全转义，作品标题不会执行 HTML', async ({page})=>{
    await page.locator('[data-page="world"]').click();
    await page.locator('#worldTitle').fill('<img src=x onerror=alert(1)>');
    await page.locator('#worldContent').fill('普通设定');
    await page.locator('#saveWorld').click();
    await expect(page.locator('#worldList img')).toHaveCount(0);
    await expect(page.locator('#worldList')).toContainText('<img src=x onerror=alert(1)>');
  });

  test('常见手机、平板和桌面视口逐页无横向溢出', async ({page})=>{
    for(const width of [320,360,390,430,768,1024,1280,1440]){
      await page.setViewportSize({width,height:900});
      await page.goto('/');
      for(const name of ['home','studio','book','world','characters','chapters','memory','timeline','library','archive','quality']){
        await page.locator('[data-page="'+name+'"]').click();
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
        expect(overflow, '横向溢出，视口宽度：'+width+'，栏目：'+name).toBe(false);
      }
    }
  });

  test('生成结果手动编辑后刷新仍保留', async ({page})=>{
    await page.locator('[data-page="studio"]').click();
    await page.locator('#result').fill('这是用户手动修改后的章节内容。');
    await page.reload();
    await page.locator('[data-page="studio"]').click();
    await expect(page.locator('#result')).toHaveValue('这是用户手动修改后的章节内容。');
  });

  test('长篇小说资料作为独立上下文发送，不挤占创作指令长度', async ({page})=>{
    await page.locator('[data-page="book"]').click();
    await page.locator('#synopsis').fill('海雾与灯塔。'.repeat(7000));
    await page.locator('#saveBook').click();
    await page.locator('[data-page="studio"]').click();
    await page.locator('#providerBtn').click();
    await page.locator('#apiKey').fill('test-key-123456789');
    await page.locator('#saveProvider').click();
    let requestBody;
    await page.route('**/api/generate',async route=>{
      requestBody=route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'测试生成成功。'})});
    });
    await page.locator('#prompt').fill('写一个新的开场场景。');
    await page.locator('#generateBtn').click();
    await expect(page.locator('#result')).toHaveValue('测试生成成功。');
    expect(requestBody.prompt.length).toBeLessThan(30000);
    expect(requestBody.context.length).toBeGreaterThan(30000);
  });

  test('完整备份可导出并重新导入恢复作品', async ({page})=>{
    await page.locator('#newProject').click();
    await page.locator('#bookTitle').fill('备份恢复测试作品');
    await page.locator('#synopsis').fill('用于验证导出和导入完整性。');
    await page.locator('#saveBook').click();
    const downloadPromise=page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const download=await downloadPromise;
    expect(download.suggestedFilename()).toContain('StoryForge-小说备份');
    const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    expect(backup.workspace.books.some(b=>b.title==='备份恢复测试作品')).toBe(true);
    await page.locator('[data-page="home"]').click();
    await page.locator('#newProject').click();
    await expect(page.locator('#bookTitle')).toHaveValue('我的新小说');
    page.once('dialog',d=>d.accept());
    await page.locator('#importFile').setInputFiles({name:'storyforge-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await expect(page.locator('#page-home')).toBeVisible();
    await expect(page.locator('.project-card').filter({hasText:'备份恢复测试作品'})).toHaveCount(1);
  });
});
