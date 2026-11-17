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
  const taskRules = {
    "灵感生成": "只负责从用户给出的种子扩展出多个有差异的故事灵感、核心冲突和卖点；不要直接写完整章节。",
    "故事大纲": "只负责设计故事总纲、主线因果、阶段转折、高潮结局及章节安排；不要把结果写成剧情审查报告。",
    "章节创作": "根据已有设定直接创作小说正文，包含场景、动作、对话和情绪变化；不要只给大纲。",
    "续写": "严格承接用户提供的前文，从最后一个情节自然继续写正文；不得重写前文或另起新故事。",
    "人物设定": "建立人物档案，包含身份、外貌、性格、经历、目标、动机、弱点、秘密、人物弧光及关系；不要生成故事总纲。",
    "世界观设定": "建立世界规则、地理势力、历史背景、社会结构、力量体系及限制；不要写人物档案或章节正文。",
    "润色改写": "对用户提供的原文进行润色改写，保留事实、剧情和人物关系，改善语言、节奏和表现力；不要另写大纲。",
    "剧情审查": "对用户提供的剧情/章节进行审查，逐项指出逻辑漏洞、人物动机问题、时间线冲突、伏笔回收和节奏问题，并给出可执行修正建议；不要生成故事大纲或续写正文。"
  };
  const selectedTask = typeof task === "string" && taskRules[task] ? task : "灵感生成";
  const instructions = `你是一位专业中文小说主编、类型小说作家和连续性编辑。请使用中文回答。严格尊重用户提供的世界观、人物设定和既有剧情，不擅自推翻已确定设定。当前任务必须严格执行：${selectedTask}。任务专属要求：${taskRules[selectedTask]}不得擅自改成其他任务，不得沿用上一次任务的输出类型。创作要求：情节有因果、人物动机可信、场景具体、避免空洞总结和重复表达。如果上下文与本次要求冲突，指出冲突并优先遵循用户本次明确指令。`;
  const input = `【当前任务类型（必须遵守）】${selectedTask}\n\n【小说资料与上下文】\n${context || "暂无"}\n\n【本次要求】\n${prompt}`;
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
