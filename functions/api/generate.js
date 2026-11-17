export async function onRequestPost({ request, env }) {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "当前处于零成本模式：尚未配置 AI API。网页可正常访问；启用模型 API 前请先确认服务商价格和预算。" }, { status: 503 });
  }
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  const { task, prompt, context = "" } = body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 30000) {
    return Response.json({ error: "请输入有效创作要求（最多 30000 字符）。" }, { status: 400 });
  }
  if (typeof context !== "string" || context.length > 60000) {
    return Response.json({ error: "小说上下文过长，请精简后重试。" }, { status: 400 });
  }
  if (!env.OPENAI_MODEL) {
    return Response.json({ error: "已配置 API Key，但尚未设置 OPENAI_MODEL。为避免调用错误模型，系统已停止请求。" }, { status: 503 });
  }
  const instructions = `你是一位专业中文小说主编、类型小说作家和连续性编辑。请使用中文回答。严格尊重用户提供的世界观、人物设定和既有剧情，不擅自推翻已确定设定。创作要求：情节有因果、人物动机可信、场景具体、避免空洞总结和重复表达。如果用户要求小说正文，直接输出可用正文，不要先解释写作思路；如果用户要求分析，则用清晰的小标题和可执行修改建议。如果上下文与本次要求冲突，指出冲突并优先遵循用户本次明确指令。`;
  const input = `【任务类型】${task || "自由创作"}\n\n【小说资料与上下文】\n${context || "暂无"}\n\n【本次要求】\n${prompt}`;
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: env.OPENAI_MODEL, instructions, input })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = upstream.status === 401 ? "API Key 无效或无权限。" : upstream.status === 429 ? "服务商额度不足或请求过于频繁，请检查账单与限额。" : (data.error?.message || `模型服务返回错误（${upstream.status}）。`);
      return Response.json({ error: msg }, { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 });
    }
    const text = (data.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text).join("\n");
    return Response.json({ text: text || "模型没有返回文本，请重试。" });
  } catch {
    return Response.json({ error: "暂时无法连接模型服务，请稍后重试。" }, { status: 502 });
  }
}
