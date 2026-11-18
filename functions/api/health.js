export async function onRequestGet({ env }) {
  const workersAIConfigured = Boolean(env.AI && typeof env.AI.run === "function");
  const openAIConfigured = Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL);
  return Response.json({
    configured: workersAIConfigured || openAIConfigured,
    workersAIConfigured,
    keyConfigured: Boolean(env.OPENAI_API_KEY),
    modelConfigured: Boolean(env.OPENAI_MODEL),
    model: workersAIConfigured ? "@cf/zai-org/glm-4.7-flash" : (env.OPENAI_MODEL || null),
    provider: workersAIConfigured ? "Cloudflare Workers AI" : (openAIConfigured ? "OpenAI" : null)
  });
}
