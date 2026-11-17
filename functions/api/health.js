const MODELS = [
  { id: "@cf/zai-org/glm-4.7-flash", name: "GLM-4.7 Flash（默认）" },
  { id: "@cf/google/gemma-4-26b-a4b-it", name: "Gemma 4 26B" },
  { id: "@cf/nvidia/nemotron-3-120b", name: "Nemotron 3 120B" }
];

export function onRequest({ env }) {
  const configured = Boolean(env.AI && typeof env.AI.run === "function");
  return Response.json({
    ok: true,
    configured,
    model: configured ? MODELS[0].id : "尚未添加 Cloudflare Workers AI 绑定（AI）",
    models: MODELS,
    mode: "free-first",
    paidFallback: false
  });
}
