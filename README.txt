AI 小说工作室｜Cloudflare Pages 版本
=====================================

当前版本功能
------------
- AI 创作：灵感、大纲、章节、续写、人物/世界观设定、润色、剧情审查。
- AI 后端：Cloudflare Workers AI，当前模型为 @cf/zai-org/glm-4.7-flash。
- 人物档案：添加、查看、编辑、删除；完整字段会随创作上下文传给模型。
- 世界观、小说简介、补充资料：自动保存并在生成时带入。
- 章节管理：新建、编辑、删除、续写上下文。
- 自动保存：资料保存在当前浏览器的 localStorage；清除浏览器数据或换设备前请先导出 JSON 备份。
- 导出：JSON 完整备份、TXT 正文、Word 可打开的 DOC 文档；支持导入 JSON 备份。

部署信息
--------
GitHub 仓库：makers7765/ai-novel-studio
Cloudflare Pages 项目：ai-novel-studio
生产网站：https://ai-novel-studio-1ma.pages.dev

修改 public/index.html 或 functions/ 下文件并提交到 main 后，Cloudflare Pages 会按项目配置自动部署。部署完成后用 Ctrl+F5 强制刷新。

AI 服务和费用提醒
-----------------
当前只接入 Cloudflare Workers AI 的 GLM-4.7-Flash。
DeepSeek、豆包、WorkBuddy 尚未接入；它们不能仅靠当前 Workers AI 绑定自动使用。后续接入前需要分别核实服务商的 API/OAuth 接入方式、免费额度和价格。
Workers AI 的免费额度、计费方式和账户限制可能变化。成功调用不等于永久免费，也不代表绝不会产生费用。请在 Cloudflare 账单/用量页面核对当前额度；不要升级 Workers Paid，不要添加付款方式或外部 API Key，除非你明确决定启用。
本项目不会在网页端公开 API Key；目前生成请求只发往本项目的 /api/generate 后端。

数据安全
--------
小说资料目前保存在本机浏览器，不会自动同步到其他设备或其他浏览器。
请定期点击网页顶部“导出备份”，保存 JSON 文件。更换设备时，在新设备打开网站后点击“导入备份”。
TXT 适合纯文本阅读；DOC 文件可用 Microsoft Word 或兼容软件打开；JSON 用于完整恢复工作室资料。

项目结构
--------
public/index.html       前端界面与本地资料管理
functions/api/health.js AI 服务状态检查
functions/api/generate.js 服务端模型调用
