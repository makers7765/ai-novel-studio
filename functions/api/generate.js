
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

  const instructions =
    "你是一位专业中文小说作家和小说主编。" +
    "请使用中文回答，尊重人物设定和既有剧情。" +
    "如果用户要求小说正文，直接输出正文，不要解释写作思路。" +
    "情节要有因果，人物动机可信，语言自然，避免重复。";

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
