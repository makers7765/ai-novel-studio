AI 小说工作室｜Cloudflare Pages 部署包
======================================

重要：这是根据你原来的 AI 小说工作室 v2 项目整理的 Cloudflare Pages 兼容版本。
当前默认是【零成本模式】：没有 API Key、没有预充值、不会主动调用任何模型 API。
网页部署成功后可打开界面；点击 AI 生成时会提示尚未配置 API，而不是产生费用。

一、用手机部署（需要 Cloudflare 和 GitHub 账号）

为什么需要 GitHub？
本项目带有 functions/api/ 后端接口。Cloudflare 官方说明：Pages 仪表盘的拖拽直传不支持部署 /functions；要使用后端函数，建议连接 GitHub 仓库自动部署，或使用 Wrangler 命令行。

步骤：
1. 在浏览器打开 https://github.com/new ，登录或注册 GitHub。
2. Repository name 填：ai-novel-studio ，选择 Public 或 Private 均可。
3. 点击 Create repository。
4. 在新仓库页面选择 Add file → Upload files。
5. 将本压缩包解压后，把里面的 public 文件夹、functions 文件夹、README_部署说明.txt 上传到仓库根目录并提交（Commit changes）。
   注意：不要只上传 ZIP 文件；要上传解压后的文件和文件夹结构。
6. 打开 https://dash.cloudflare.com/ ，登录 Cloudflare。
7. 进入 Workers & Pages → Create application → Pages → Connect to Git。
8. 连接 GitHub，选择 ai-novel-studio 仓库。
9. 构建设置：
   - Framework preset：None
   - Production branch：main
   - Build command：exit 0
   - Build output directory：public
10. 点击 Save and Deploy。成功后 Cloudflare 会给你一个 https://项目名.pages.dev 网址。

二、零成本安全状态
- 不要添加 OPENAI_API_KEY。
- 不要添加任何服务商 API Key。
- 不要开启付费 Worker、AI Gateway 或其他付费附加服务。
- Cloudflare 免费计划/额度和政策可能变化，请以账户页面显示为准；不要选择付费升级。
- 不配置 API Key 时，网站不会向 OpenAI 发起模型请求。

三、以后如要启用模型（必须先由你明确同意）
当前函数只实现原项目的 OpenAI Responses API 调用，不代表 DeepSeek、豆包、WorkBuddy 已接入。
启用前先确认服务商价格、免费额度和预算；再在 Cloudflare 项目 Settings → Variables and Secrets 添加加密 Secret：OPENAI_API_KEY，并添加普通变量 OPENAI_MODEL（填你账号确实有权限使用的模型 ID）。保存前请再次核对计费规则。
不要把 Key 发给任何人，也不要把 Key 放在网页代码、GitHub 文件或聊天消息中。

四、项目结构
public/index.html       网页前端
functions/api/health.js 服务状态接口
functions/api/generate.js 安全的服务端模型调用接口

参考 Cloudflare 官方文档：
Pages Functions：https://developers.cloudflare.com/pages/functions/get-started/
Git 集成/静态 HTML：https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
环境变量与加密 Secret：https://developers.cloudflare.com/pages/functions/bindings/
