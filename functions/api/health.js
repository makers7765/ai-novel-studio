const MODEL = "@cf/zai-org/glm-4.7-flash";

export function onRequest({ env }) {
  const configured = Boolean(env.AI && typeof env.AI.run === "function");
  return Response.json({
    ok: true,
    configured,
    provider: configured ? "Cloudflare Workers AI" : "尚未绑定 Workers AI",
    model: configured ? MODEL : "请在 Pages 设置中添加 Workers AI 绑定，变量名称填写 AI",
    billingMode: "仅调用 Cloudflare Workers AI 绑定；不使用外部 API Key"
  });
}
