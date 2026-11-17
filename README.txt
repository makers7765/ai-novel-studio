AI 小说工作室 V2｜恢复布局与任务匹配修复版

本版本基于此前的“人物档案一次填写版”工作台结构制作，保留原有左侧导航、章节管理、人物档案、世界观设定、小说资料、导出备份及本机浏览器保存能力。

本次修复：
1. 恢复原有深色工作台与任务卡片布局，不重做导航结构。
2. 右侧 AI 生成结果区域加宽并增高，便于阅读长文本。
3. 当前任务由上方任务卡片唯一决定，任务名称只读，避免表单与任务卡片不一致。
4. 切换任务时清空旧结果；旧请求即使稍后返回，也不会覆盖新任务结果。
5. 后端对 8 种任务分别设置专属规则，并拒绝无效任务类型。
6. 人物档案上下文会将结构化人物字段完整传给模型。
7. 健康检查会分别报告 API Key 和模型名称是否配置。

Cloudflare Pages 部署：
- 将 public 文件夹中的内容作为网站静态文件。
- 将 functions 文件夹放在项目根目录，与 public 同级。
- 不要把项目文件夹再套一层上传；目录结构应为：
  public/index.html
  functions/api/generate.js
  functions/api/health.js
- Build command 留空（纯静态 + Pages Functions）。

环境变量（Cloudflare Pages → Settings → Variables and Secrets）：
- OPENAI_API_KEY：模型服务商提供的 API Key（Secret）
- OPENAI_MODEL：已开通且服务商支持的模型名称

未配置有效 API Key 和模型名称前，网页可打开，但 AI 生成不能工作。不要把 API Key 写进 HTML、GitHub 仓库或 README。

本机资料存储在浏览器 localStorage。部署前请先在旧网站点击“导出备份”，保存 JSON 文件；本版本继续使用原来的 localStorage 键名 novelStudioV2；如果在同一浏览器、同一网站域名下更新，浏览器中的本地资料通常会保留。仍建议保留 JSON 备份。
