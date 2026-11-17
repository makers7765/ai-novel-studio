const MODEL = "@cf/zai-org/glm-4.7-flash";

export async function onRequestPost({ request, env }) {
  if (!env.AI || typeof env.AI.run !== "function") {
    return Response.json({
      error: "尚未连接 Cloudflare Workers AI。请在 Pages 项目设置中添加 Workers AI 绑定，变量名称填写 AI，然后重新部署。"
    }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const { task, prompt, context = "" } = body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 12000) {
    return Response.json({ error: "请输入有效创作要求（最多 12000 字符）。" }, { status: 400 });
  }
  if (typeof context !== "string" || context.length > 20000) {
    return Response.json({ error: "小说上下文过长，请精简后重试（最多 20000 字符）。" }, { status: 400 });
  }

  const instructions = "你是一位专业中文小说主编、类型小说作家和连续性编辑。请使用中文回答。严格尊重用户提供的世界观、人物设定和既有剧情，不擅自推翻已确定设定。创作要求：情节有因果、人物动机可信、场景具体、避免空洞总结和重复表达。如果用户要求小说正文，直接输出可用正文，不要先解释写作思路；如果用户要求分析，则用清晰的小标题和可执行修改建议。如果上下文与本次要求冲突，指出冲突并优先遵循用户本次明确指令。";

  const userMessage = `【任务类型】${String(task || "自由创作").slice(0, 80)}

【小说资料与上下文】
${context || "暂无"}

【本次要求】
${prompt}`;

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userMessage }
      ],
      max_completion_tokens: 1800,
      temperature: 0.7
    });

    const text =
      (typeof result?.response === "string" && result.response) ||
      result?.choices?.[0]?.message?.content ||
      result?.result?.response ||
      "";

    if (!text) {
      return Response.json({ error: "模型已响应，但没有返回可读取的文本。请稍后重试。" }, { status: 502 });
    }
    return Response.json({ text, model: MODEL, provider: "Cloudflare Workers AI" });
  } catch (error) {
    const message = String(error?.message || "");
    if (/limit|quota|neuron|billing|payment|upgrade/i.test(message)) {
      return Response.json({
        error: "Cloudflare Workers AI 免费额度可能已用完，或当前账户/模型需要付费权限。系统已停止请求；不要升级付费套餐。"
      }, { status: 429 });
    }
    return Response.json({
      error: "Cloudflare Workers AI 调用失败。请确认 AI 绑定名称是 AI、模型在免费计划可用，并查看 Cloudflare 日志。"
    }, { status: 502 });
  }
}
