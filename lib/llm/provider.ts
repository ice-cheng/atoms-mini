// LLM 抽象层：统一流式接口。MVP 默认 OpenAI 兼容协议（fetch + SSE），
// 换 provider 或加模型路由只改这里，前端/路由不动。

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type StreamChunk = { type: "text"; text: string };

/**
 * 调用模型并逐 token 产出文本。
 * @param messages 对话（含 system）
 * @yields 文本增量
 */
export async function* streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "anthropic") {
    yield* streamAnthropic(messages);
  } else if (provider === "ark" || provider === "doubao") {
    // 火山方舟（豆包）：OpenAI 兼容协议
    yield* streamOpenAICompatible(
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      process.env.ARK_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
      process.env.LLM_MODEL ?? "doubao-pro-32k",
      messages
    );
  } else {
    yield* streamOpenAI(messages);
  }
}

async function* streamOpenAI(messages: ChatMessage[]): AsyncGenerator<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("缺少 OPENAI_API_KEY");
  yield* streamOpenAICompatible(
    "https://api.openai.com/v1/chat/completions",
    key,
    process.env.LLM_MODEL ?? "gpt-4o-mini",
    messages
  );
}

// 通用 OpenAI 兼容流式（OpenAI / 火山方舟豆包 / 其他兼容服务）
async function* streamOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  if (!apiKey) throw new Error(`缺少 API key（${url}）`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
  });
  if (!res.ok || !res.body) throw new Error(`LLM 错误: ${res.status} ${await res.text()}`);
  yield* parseOpenAISSE(res.body);
}

async function* parseOpenAISSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* ignore partial */
      }
    }
  }
}

async function* streamAnthropic(messages: ChatMessage[]): AsyncGenerator<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("缺少 ANTHROPIC_API_KEY");
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const rest = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 4096,
      system,
      messages: rest,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`LLM 错误: ${res.status}`);
  yield* parseAnthropicSSE(res.body);
}

async function* parseAnthropicSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      try {
        const json = JSON.parse(trimmed.slice(5).trim());
        if (json.type === "content_block_delta" && json.delta?.text) {
          yield json.delta.text as string;
        }
      } catch {
        /* ignore */
      }
    }
  }
}
