export function onRequest({ env }) {
  const configured = Boolean(env.OPENAI_API_KEY);
  return Response.json({
    ok: true,
    configured,
    model: configured ? (env.OPENAI_MODEL || "请在 Cloudflare 环境变量中设置 OPENAI_MODEL") : "零成本模式：尚未启用付费 API"
  });
}
