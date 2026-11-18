AI 小说工作室 V2｜完整功能修复版

本次修复以原 V2 工作台页面为基础，保留原有深色界面、任务卡片、章节管理、人物档案、世界观设定、小说资料、人物编辑、导出备份、浏览器本地存储及 Cloudflare Pages API。

修复内容：
1. 恢复完整工作台结构，不再使用简化页面。
2. 桌面端创作要求区与 AI 结果区调整为约 41:59，结果区增高，长文本更易阅读。
3. 任务卡片是任务类型的唯一入口；后端对灵感生成、故事大纲、章节创作、续写、人物设定、世界观设定、润色改写、剧情审查分别执行专属规则。
4. 生成结果确认保存后自动进入对应区域：章节/续写→章节管理；人物设定→人物档案；世界观→世界观设定；故事大纲→小说资料；灵感/润色/剧情审查→创作归档。
5. 增加创作归档页；原 localStorage 键名仍为 novelStudioV2，既有浏览器本地资料可继续读取。
6. API Key 仍只放在 Cloudflare Pages 环境变量，不写入网页或仓库。

Cloudflare Pages 项目根目录必须是：
public/index.html
functions/api/generate.js
functions/api/health.js

部署设置：Framework preset 选 None；Build command 留空或 exit 0；Build output directory 填 public。
需要 AI 生成时，在 Cloudflare Pages → Settings → Variables and Secrets 配置 OPENAI_API_KEY（Secret）和 OPENAI_MODEL（普通变量）。不配置 Key 时页面可打开，但无法调用 AI。

重要：更新网站前，先在旧网站点击“导出备份”，保存 JSON。不要删除旧网站或清空浏览器数据。部署到同一域名并使用同一浏览器时，原 novelStudioV2 本地资料通常会保留。
