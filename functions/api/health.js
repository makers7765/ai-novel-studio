export async function onRequestGet({ env }) {
  return Response.json({
    configured: Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL),
    keyConfigured: Boolean(env.OPENAI_API_KEY),
    modelConfigured: Boolean(env.OPENAI_MODEL),
    model: env.OPENAI_MODEL || null
  });
}
