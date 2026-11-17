const MODEL = "@cf/zai-org/glm-4.7-flash";

export function onRequest({ env }) {
  const configured = Boolean(env.AI && typeof env.AI.run === "function");
  return Response.json({
    ok: true,
    configured,
    model: configured ? MODEL : "尚未添加 Cloudflare Workers AI 绑定（AI）",
    mode: "free-first",
    paidFallback: false
  });
}
