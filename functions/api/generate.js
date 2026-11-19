const TASK_RULES = {\n  "自由创作": "只负责根据用户给出的文字、创作要求和小说上下文进行自由小说创作。参考资料均可选填；资料不足时结合已知设定合理补全，不得与已确认设定冲突。直接输出可用正文。",\n  "选段修改": "只负责修改用户提供的选段。严格依据修改指令处理；保留未要求改变的人物、事实和剧情约束。若用户要求扩写、缩写、润色或重写，按指定方式执行。只输出修改后的完整选段。",
  "灵感生成": "只负责从用户给出的种子扩展出 3-5 个有差异的故事灵感。每个灵感包含核心设定、主角/核心人物、主要冲突、故事卖点和可发展的悬念。不要直接写完整章节，不要输出人物档案表或剧情审查报告。",
  "故事大纲": "只负责设计故事大纲。按作品定位、核心主题、主角目标、主要人物关系、核心冲突、起承转合、关键转折、高潮与结局、分卷/章节安排组织。写清因果链。不要写成小说正文，不要做剧情审查。",
  "章节创作": "只负责创作小说正文。直接从场景切入，写出具体环境、动作、对话、心理和情绪变化；保持叙事视角和人物设定一致。不要只输出大纲、分析或写作建议。",
  "续写": "只负责承接已提供的章节或前文，从最后一个有效情节之后自然续写。保持人物、时间线、视角、语气和因果连续；不得复述或重写前文，不得另起新故事，不要输出大纲。",
  "人物设定": "只负责建立人物档案。按姓名/称谓、年龄、身份、外貌、性格、背景经历、目标动机、能力与限制、弱点、秘密、人物关系、成长弧光组织。资料不足时可标注待补充，不要擅自生成整部故事大纲或章节正文。",
  "世界观设定": "只负责建立世界观资料。按时代背景、地理环境、社会结构、势力组织、历史沿革、规则/力量体系、资源与限制、文化习俗、核心矛盾组织。明确规则边界，不要写人物档案或章节正文。",
  "润色改写": "只负责对用户提供的原文进行润色改写。保留原文事实、人物关系、事件顺序和剧情结果，不擅自增删关键情节；改善语言、节奏、画面感和对话。直接给出改写后的正文，不要另写大纲或点评。",
  "剧情审查": "只负责审查用户提供的剧情、章节或大纲。按问题位置、问题类型、具体原因、可能后果、修改建议逐项列出，重点检查逻辑漏洞、人物动机、时间线、设定冲突、伏笔回收和节奏。不要续写正文，不要重新生成故事大纲。"
};

export async function onRequestPost({ request, env }) {
  const hasWorkersAI = Boolean(env.AI && typeof env.AI.run === "function");
  const hasOpenAI = Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL);
  if (!hasWorkersAI && !hasOpenAI) {
    return Response.json({ error: "未检测到可用 AI 服务。请确认 Workers AI 绑定变量名为 AI，或配置 OpenAI API Key 与模型名称。" }, { status: 503 });
  }
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "请求格式无效，请刷新页面后重试。" }, { status: 400 });
  }
  const { task, prompt, context = "" } = body || {};
  if (typeof task !== "string" || !Object.prototype.hasOwnProperty.call(TASK_RULES, task)) {
    return Response.json({ error: "任务类型无效。请从创作台上方选择一个任务后重试。" }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 30000) {
    return Response.json({ error: "请输入有效创作要求（最多 30000 字符）。" }, { status: 400 });
  }
  if (typeof context !== "string" || context.length > 60000) {
    return Response.json({ error: "小说上下文过长，请精简后重试。" }, { status: 400 });
  }
  const taskInstruction = TASK_RULES[task];
  const instructions = `你是一位专业中文小说主编、类型小说作家和连续性编辑。请始终使用中文回答。当前任务类型是【${task}】，这是不可更改的任务边界。你必须只执行该任务。\n\n【本任务专属规则】\n${taskInstruction}\n\n【通用规则】\n严格尊重用户提供的世界观、人物设定和既有剧情，不擅自推翻已确定设定。情节有因果，人物动机可信，避免空洞总结和重复表达。资料不足时明确标注缺失信息，不要自行编造与已知设定冲突的内容。严禁把本任务转换成其他任务类型。`;
  const input = `【当前任务：${task}】\n${taskInstruction}\n\n【小说资料与上下文】\n${context || "暂无"}\n\n【用户本次具体要求】\n${prompt}`;
  try {
    if (hasWorkersAI) {
      const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input }
        ]
      });
      const generated = typeof result === "string" ? result :
        (result?.response || result?.output_text || result?.text ||
        (Array.isArray(result?.choices) ? result.choices[0]?.message?.content : ""));
      if (typeof generated !== "string" || !generated.trim()) {
        return Response.json({ error: "Workers AI 已调用，但模型返回内容为空或格式无法识别。请检查模型名称和部署日志。" }, { status: 502 });
      }
      return Response.json({ text: generated, task, provider: "Cloudflare Workers AI", model: "@cf/zai-org/glm-4.7-flash" });
    }
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
    const text = (data.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text).join("\\n");
    return Response.json({ text: text || "模型没有返回文本，请重试。", task, provider: "OpenAI", model: env.OPENAI_MODEL });
  } catch (error) {
    return Response.json({ error: `AI 调用失败：${error?.message || "请检查 Workers AI 绑定、模型权限与部署日志。"}` }, { status: 502 });
  }}
