const MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_PROMPT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 24000;
const MAX_OUTPUT_TOKENS = 2048;

function extractText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (typeof value.response === "string") return value.response;
  if (typeof value.output_text === "string") return value.output_text;
  if (typeof value.text === "string") return value.text;
  if (typeof value.result === "string") return value.result;
  if (value.result && typeof value.result === "object") {
    const nested = extractText(value.result);
    if (nested) return nested;
  }
  if (Array.isArray(value.choices)) {
    const choice = value.choices[0];
    const content = choice?.message?.content ?? choice?.text;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map(part => typeof part === "string" ? part : part?.text || "").join("\n");
    }
  }
  if (Array.isArray(value.content)) {
    return value.content.map(part => typeof part === "string" ? part : part?.text || "").join("\n");
  }
  return "";
}

export async function onRequestPost({ request, env }) {
  if (!env.AI || typeof env.AI.run !== "function") {
    return Response.json({ error: "尚未启用 Cloudflare Workers AI。请检查 Pages 项目中的 AI 绑定。" }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const { task, prompt, context = "" } = body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
    return Response.json({ error: "创作要求不能为空，且最多 12000 个字符。" }, { status: 400 });
  }
  if (typeof context !== "string" || context.length > MAX_CONTEXT_CHARS) {
    return Response.json({ error: "小说上下文过长，请精简到 24000 个字符以内。" }, { status: 400 });
  }

  const instructions = "你是一位专业中文小说主编、类型小说作家和连续性编辑。请使用中文回答。严格尊重用户提供的世界观、人物设定和既有剧情，不擅自推翻已确定设定。情节要有因果，人物动机可信，场景具体，避免空洞总结和重复表达。若用户要求小说正文，直接输出正文，不要先解释写作思路；若要求分析，则给出清晰、可执行的建议。";
  const userContent = [
    "【任务类型】" + (typeof task === "string" ? task.slice(0, 80) : "自由创作"),
    "【小说资料与上下文】", context || "暂无",
    "【本次要求】", prompt
  ].join("\n\n");

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userContent }
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7
    });

    const generated = extractText(result).trim();
    if (!generated) {
      // Keep diagnostic details minimal; never return prompts or user data.
      const shape = result && typeof result === "object"
        ? Object.keys(result).slice(0, 12).join(", ")
        : typeof result;
      return Response.json({
        error: "模型已响应，但返回格式中没有识别到正文。返回字段：" + (shape || "空")
      }, { status: 502 });
    }
    return Response.json({ text: generated, model: MODEL });
  } catch (error) {
    const message = String(error?.message || "");
    if (/quota|limit|neuron|billing|payment|exceed/i.test(message)) {
      return Response.json({ error: "Workers AI 当前额度或容量不可用。本次已停止，不会切换到付费 API。请稍后重试或检查账户用量。" }, { status: 429 });
    }
    return Response.json({ error: "Cloudflare AI 调用失败：" + message.slice(0, 240) }, { status: 502 });
  }
}
