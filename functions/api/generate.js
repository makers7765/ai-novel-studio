
const MODEL = "@cf/zai-org/glm-4.7-flash";

// 专门读取模型正文，不把 usage 等统计信息当成正文。
function extractText(result) {
  if (!result) return "";

  // 常见 Workers AI 返回格式
  if (typeof result.response === "string") {
    return result.response.trim();
  }

  // OpenAI 兼容格式
  const choice = result.choices?.[0];

  if (typeof choice?.message?.content === "string") {
    return choice.message.content.trim();
  }

  if (Array.isArray(choice?.message?.content)) {
    return choice.message.content
      .map(item => item?.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (typeof choice?.text === "string") {
    return choice.text.trim();
  }

  // 其他常见格式
  for (const key of ["output_text", "generated_text", "text"]) {
    if (typeof result[key] === "string" && result[key].trim()) {
      return result[key].trim();
    }
  }

  return "";
}

export async function onRequestPost({ request, env }) {
  if (!env.AI || typeof env.AI.run !== "function") {
    return Response.json({
      error: "尚未连接 Workers AI，请检查 AI 绑定。"
    }, { status: 503 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({
      error: "请求格式无效。"
    }, { status: 400 });
  }

  const { task, prompt, context = "" } = body || {};

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    prompt.length > 12000
  ) {
    return Response.json({
      error: "请输入有效创作要求（最多 12000 字符）。"
    }, { status: 400 });
  }

  if (
    typeof context !== "string" ||
    context.length > 20000
  ) {
    return Response.json({
      error: "小说上下文过长，请精简后重试。"
    }, { status: 400 });
  }

  const instructions = `你是一位专业中文小说作家、主编和连续性编辑。

【语言要求】
1. 默认必须使用简体中文。
2. 小说正文只能使用中文，不得夹杂英文解释、英文思考过程或英文对话复盘。
3. 不得输出与小说创作无关的内容。

【创作要求】
1. 严格遵守用户提供的人物设定、世界观、时间线和已有剧情。
2. 保持人物性格、叙事视角、语言风格和情节连续性。
3. 情节必须有因果关系，人物行为必须符合动机。
4. 场景具体，描写自然，避免空洞总结和重复表达。
5. 续写时必须从已有正文的最后情节自然接续，不得重新开头或重复上一章。

【输出规则】
1. 用户要求小说正文时，直接输出小说正文。
2. 不得展示思考过程、内部分析、推理、草稿或自我对话。
3. 不得出现“The user”“I need to”“Wait”“Looking at the history”“My response”等英文分析语句。
4. 不得讨论提示词、模型、系统指令或生成过程。
5. 不要擅自改变用户要求的章节、字数和创作任务。
6. 如果信息不足，简短询问用户，不要编造已有剧情。
7. 输出前自行检查：删除与小说正文无关的内容，确保人物和剧情连贯。`;
    

  const userMessage = `
【任务类型】
${String(task || "自由创作").slice(0, 80)}

【小说资料与上下文】
${context || "暂无"}

【本次要求】
${prompt}
`;

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content: instructions
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_completion_tokens: 1800,
      temperature: 0.7,

      // 关闭思考模式，优先获得可读取的正文
      chat_template_kwargs: {
        enable_thinking: false
      }
    });

    const text = extractText(result);

    if (!text) {
      return Response.json({
        error: "模型已经响应，但没有返回可读取的正文。请稍后重试。"
      }, { status: 502 });
    }

    return Response.json({
      text,
      model: MODEL,
      provider: "Cloudflare Workers AI"
    });

  } catch (error) {
    const message = String(error?.message || "");

    if (/limit|quota|neuron|billing|payment|upgrade/i.test(message)) {
      return Response.json({
        error: "模型额度或账户权限可能不足，系统已停止本次请求。请先检查用量，不要升级付费套餐。"
      }, { status: 429 });
    }

    return Response.json({
      error: "Workers AI 调用失败，请检查 Cloudflare 日志和 AI 绑定。"
    }, { status: 502 });
  }
}
