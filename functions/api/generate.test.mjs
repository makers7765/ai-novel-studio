import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "./generate.js";

function request(body, raw = false, headers = {}) {
  return new Request("https://storyforge.test/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ? body : JSON.stringify(body)
  });
}
const base = { task: "自由创作", prompt: "写一个开场", context: "" };
async function json(response) { return response.json(); }

test("rejects malformed JSON and unknown task identifiers", async () => {
  let r = await onRequestPost({ request: request("{", true), env: {} });
  assert.equal(r.status, 400);
  r = await onRequestPost({ request: request({ ...base, task: "不存在的任务" }), env: {} });
  assert.equal(r.status, 400);
  assert.match((await json(r)).error, /任务类型无效/);
});

test("validates prompt and context lengths before contacting providers", async () => {
  let r = await onRequestPost({ request: request({ ...base, prompt: " " }), env: {} });
  assert.equal(r.status, 400);
  r = await onRequestPost({ request: request({ ...base, prompt: "x".repeat(30001) }), env: {} });
  assert.equal(r.status, 400);
  r = await onRequestPost({ request: request({ ...base, context: "x".repeat(60001) }), env: {} });
  assert.equal(r.status, 400);
  r = await onRequestPost({ request: request(JSON.stringify({ ...base, prompt: "x".repeat(160001) }), true), env: {} });
  assert.equal(r.status, 413);
});

test("Gemini request uses native generateContent auth and parses candidate text", async () => {
  const original = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Gemini 测试结果" }] } }] }), { status: 200 });
  };
  try {
    const r = await onRequestPost({ request: request({ ...base, provider: "gemini", apiKey: "test-gemini-key", model: "gemini-2.5-flash" }), env: {} });
    const data = await json(r);
    assert.equal(r.status, 200);
    assert.equal(data.text, "Gemini 测试结果");
    assert.match(captured.url, /gemini-2\.5-flash:generateContent/);
    assert.equal(captured.options.headers["x-goog-api-key"], "test-gemini-key");
    assert.equal(captured.options.headers.Authorization, undefined);
  } finally { globalThis.fetch = original; }
});

test("Groq request uses OpenAI-compatible chat completions and parses text", async () => {
  const original = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({ choices: [{ message: { content: "Groq 测试结果" } }] }), { status: 200 });
  };
  try {
    const r = await onRequestPost({ request: request({ ...base, provider: "groq", apiKey: "test-groq-key" }), env: {} });
    const data = await json(r);
    assert.equal(r.status, 200);
    assert.equal(data.text, "Groq 测试结果");
    assert.equal(captured.url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(captured.options.headers.Authorization, "Bearer test-groq-key");
  } finally { globalThis.fetch = original; }
});

test("OpenRouter request uses compatible endpoint and site headers", async () => {
  const original = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({ choices: [{ message: { content: "OpenRouter 测试结果" } }] }), { status: 200 });
  };
  try {
    const r = await onRequestPost({ request: request({ ...base, provider: "openrouter", apiKey: "test-openrouter-key" }), env: {} });
    const data = await json(r);
    assert.equal(r.status, 200);
    assert.equal(data.text, "OpenRouter 测试结果");
    assert.equal(captured.url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(captured.options.headers["X-Title"], "AI Novel Studio");
  } finally { globalThis.fetch = original; }
});

test("provider rate limits are translated into actionable errors", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "rate limit" } }), { status: 429 });
  try {
    const r = await onRequestPost({ request: request({ ...base, provider: "gemini", apiKey: "test-gemini-key" }), env: {} });
    assert.equal(r.status, 429);
    assert.match((await json(r)).error, /额度|频率/);
  } finally { globalThis.fetch = original; }
});

test("Cloudflare AI binding is used when selected and configured", async () => {
  let call;
  const env = { AI: { run: async (model, args) => { call = { model, args }; return { response: "Workers AI 测试结果" }; } } };
  const r = await onRequestPost({ request: request({ ...base, provider: "cloudflare" }), env });
  const data = await json(r);
  assert.equal(r.status, 200);
  assert.equal(data.text, "Workers AI 测试结果");
  assert.equal(call.model, "@cf/zai-org/glm-4.7-flash");
});

test("returns a clear setup error when no provider is configured", async () => {
  const r = await onRequestPost({ request: request(base), env: {} });
  assert.equal(r.status, 503);
  assert.match((await json(r)).error, /没有可用 AI 服务/);
});
