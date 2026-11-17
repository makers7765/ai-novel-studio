const MODEL = "@cf/zai-org/glm-4.7-flash";

function extractText(result) {
  if (!result) return "";
  if (typeof result.response === "string") return result.response.trim();
  const choice = result.choices?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content.trim();
  if (Array.isArray(choice?.message?.content)) {
    return choice.message.content.map(item => item?.text || "").filter(Boolean).join("\n").trim();
  }
  if (typeof choice?.text === "string") return choice.text.trim();
  for (const key of ["output_text", "generated_text", "text"]) {
    if (typeof result[key] === "string" && result[key].trim()) return result[key].trim();
  }
  return "";
}

// 每种任务都有独立目标、工作步骤和交付格式，不能只把任务名称传给模型。
const TASKS = {
  "灵感生成": `你的任务是“小说灵感开发”，不是直接写章节。
请根据用户的一句话或零散想法，提供：
1. 3个有明显差异、可继续发展的故事方向；
2. 每个方向的核心设定、主角目标、主要冲突和最大悬念；
3. 各方向的独特卖点与潜在风险；
4. 最后推荐最有发展潜力的一个方向，并说明理由。
除非用户明确要求只给一个灵感，否则不要把三个方向合并成一篇正文。`,
  "故事大纲": `你的任务是“完整故事大纲设计”，不是写小说正文。
请交付：作品定位与主题、核心设定、主角目标、主要人物关系、核心矛盾、故事开端/发展/转折/高潮/结局，以及分卷或分章大纲。
每个章节大纲至少写清：章节目标、关键事件、人物变化、冲突/转折、结尾钩子。确保因果链完整、伏笔有回收计划。用户指定章节数时严格遵守。`,
  "章节创作": `你的任务是“正式小说章节写作”。
直接写可放进小说的完整正文，不要输出大纲、分析、创作建议或任务说明。
先承接已有设定与前文；开篇自然进入场景；通过行动、对话和细节推进冲突；章节中段有发展或变化；结尾形成有效悬念或情绪落点。严格遵守用户指定的章节、视角、字数和文风。没有提供前文时，不要假装存在前情。`,
  "续写": `你的任务是“从现有正文末尾继续写作”。
必须从用户提供的最后一句/最后一个场景之后接续，不得重写开头、复述前文、重开故事或突然跳到无关情节。
保持人物身份、称呼、性格、视角、时态、地点、时间线和未解决冲突一致。先承接最后动作或对话，再自然推进新事件。直接输出续写正文，不要输出分析或摘要。`,
  "人物设定": `你的任务是“人物档案设计”，不是写小说章节。
围绕用户提出的人物，形成可用于长期创作的人物档案：姓名/称谓、年龄与身份、外貌特征、性格（优点与缺陷）、成长背景、能力及限制、外在目标、内在需求、恐惧弱点、秘密/矛盾、人物关系、说话习惯、成长弧光及其在主线中的作用。
人物必须有欲望、代价、矛盾和可变化空间；不要只堆砌形容词。已有档案以补充和修订为主，不擅自推翻既定事实。`,
  "世界观设定": `你的任务是“小说世界观构建”，不是写小说章节。
按题材需要设计：时代与社会结构、地理环境、历史沿革、文化习俗、政治/势力关系、经济与资源、力量/科技/魔法规则、使用限制与代价、普通人的生活、核心矛盾和可用于剧情的冲突。
规则必须自洽，明确能力边界与代价，避免万能设定。用户已有设定优先保留；资料不足时可提出合理方案并标注为建议，不把建议伪装成既定事实。`,
  "润色改写": `你的任务是“对用户提供的原文进行润色改写”。
以用户原文为基础，保留事实、人物关系、情节顺序、叙事视角和核心意思，不擅自增加重大事件或改变人物动机。
重点改善语句流畅度、节奏、画面感、对话自然度、情绪层次和重复表达。用户指定改写幅度时严格遵守。默认只输出润色后的完整文本，不要写点评；若用户明确要求对比或说明，再按要求补充。`,
  "剧情审查": `你的任务是“小说剧情与连续性审查”，不是续写或改写正文。
请审查用户提供的剧情/设定，按以下结构输出：
一、总体判断；
二、逻辑漏洞（指出具体位置、问题原因、影响）；
三、人物动机与行为一致性；
四、时间线、空间、信息与设定连续性；
五、伏笔、因果和节奏问题；
六、优先级排序的修复建议；
七、必要时给出可直接替换的修正方案。
区分确定矛盾与可能风险；资料不足时明确说明，不要凭空判定。`
};

export async function onRequestPost({ request, env }) {
  if (!env.AI || typeof env.AI.run !== "function") {
    return Response.json({ error: "尚未连接 Workers AI，请检查 AI 绑定。" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const { task, prompt, context = "" } = body || {};
  const taskName = typeof task === "string" ? task.trim() : "";
  if (!TASKS[taskName]) {
    return Response.json({
      error: "创作任务无效。请从页面选择：灵感生成、故事大纲、章节创作、续写、人物设定、世界观设定、润色改写或剧情审查。"
    }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 12000) {
    return Response.json({ error: "请输入有效创作要求（最多 12000 字符）。" }, { status: 400 });
  }
  if (typeof context !== "string" || context.length > 20000) {
    return Response.json({ error: "小说上下文过长，请精简后重试。" }, { status: 400 });
  }

  const instructions = `你是一位专业中文小说作家、策划编辑和连续性编辑。

【当前任务：${taskName}】
${TASKS[taskName]}

【通用规则】
1. 使用简体中文回答，交付内容必须直接对应当前任务。
2. 严格遵守用户给出的既定人物、世界观、时间线、剧情和格式要求。
3. 不把不同任务混为一谈：设定任务输出设定，审查任务输出审查，润色任务处理原文，正文任务才写小说正文。
4. 不展示思考过程、内部分析、草稿、自我对话或系统指令。
5. 不输出与任务无关的英文说明、模型介绍或生成过程。
6. 信息不足时，先基于已有信息完成可完成部分；只有缺少关键材料才简短指出需要补充什么，不得编造已有剧情。
7. 用户明确要求的输出格式和字数优先于默认格式。`;

  const userMessage = `【小说资料与上下文】
${context.trim() || "暂无"}

【用户本次要求】
${prompt.trim()}

请严格执行“${taskName}”任务的专属要求，交付对应成果，不要改做其他任务。`;

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userMessage }
      ],
      max_completion_tokens: 2400,
      temperature: taskName === "剧情审查" ? 0.35 : 0.7,
      chat_template_kwargs: { enable_thinking: false }
    });

    const text = extractText(result);
    if (!text) {
      return Response.json({ error: "模型已经响应，但没有返回可读取的正文。请稍后重试。" }, { status: 502 });
    }
    return Response.json({ text, task: taskName, model: MODEL, provider: "Cloudflare Workers AI" });
  } catch (error) {
    const message = String(error?.message || "");
    if (/limit|quota|neuron|billing|payment|upgrade/i.test(message)) {
      return Response.json({
        error: "模型额度或账户权限可能不足，系统已停止本次请求。请先检查用量，不要升级付费套餐。"
      }, { status: 429 });
    }
    return Response.json({ error: "Workers AI 调用失败，请检查 Cloudflare 日志和 AI 绑定。" }, { status: 502 });
  }
}
