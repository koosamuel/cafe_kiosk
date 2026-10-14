type MenuContext = {
  id?: string;
  name?: string;
  description?: string;
  price?: number;
};

type AssistantRequest = {
  message?: string;
  language?: "ko" | "en";
  intent?: string;
  baseAnswer?: string;
  history?: Array<{ role?: string; text?: string }>;
  menus?: MenuContext[];
};

const ALLOWED_ORIGINS = new Set([
  "https://koosamuel.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestTimes = new Map<string, number[]>();

function json(body: Record<string, unknown>, status: number, origin: string) {
  // A 204 response must not include a body in the Edge Runtime.
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function isRateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")
    || "anonymous";
  const now = Date.now();
  const recent = (requestTimes.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return true;
  recent.push(now);
  requestTimes.set(key, recent);
  return false;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength) : "";
}

function normalizeRequest(value: unknown): Required<Pick<AssistantRequest, "message" | "language" | "intent" | "baseAnswer">> & { menus: MenuContext[] } {
  const input = value && typeof value === "object" ? value as AssistantRequest : {};
  const language = input.language === "en" ? "en" : "ko";
  const menus = Array.isArray(input.menus) ? input.menus.slice(0, 4).map((menu) => ({
    id: cleanText(menu?.id, 80),
    name: cleanText(menu?.name, 100),
    description: cleanText(menu?.description, 300),
    price: Number.isFinite(Number(menu?.price)) ? Number(menu?.price) : 0,
  })) : [];
  return {
    message: cleanText(input.message, 320),
    language,
    intent: cleanText(input.intent, 40),
    baseAnswer: cleanText(input.baseAnswer, 1200),
    menus,
  };
}

function systemPrompt(language: "ko" | "en") {
  const languageInstruction = language === "en" ? "Reply in English." : "한국어로 답하세요.";
  return `${languageInstruction}
You are a cafe menu assistant. Improve only the explanatory answer for a menu recommendation, comparison, or information request.
Use only the menu facts and base answer supplied by the application. Do not invent menu items, prices, options, availability, discounts, policies, or order status.
Do not execute an order, ask for payment, or claim that an order was placed. If the supplied facts are insufficient, say that briefly.
Keep the answer under 500 characters and return plain text only.`;
}

Deno.serve(async (request) => {
  const origin = allowedOrigin(request);
  if (!origin) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return json({}, 204, origin);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (Number(request.headers.get("content-length") || 0) > 10_000) return json({ error: "request_too_large" }, 413, origin);
  if (isRateLimited(request)) return json({ error: "rate_limited" }, 429, origin);

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }
  const input = normalizeRequest(requestBody);
  if (!input.message || !input.baseAnswer) return json({ error: "invalid_request" }, 400, origin);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const model = Deno.env.get("ANTHROPIC_MODEL");
  if (!apiKey || !model) return json({ error: "assistant_not_configured" }, 503, origin);

  const context = JSON.stringify({
    userMessage: input.message,
    intent: input.intent,
    baseAnswer: input.baseAnswer,
    menus: input.menus,
  });

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 320,
        temperature: 0.2,
        system: systemPrompt(input.language),
        messages: [{ role: "user", content: context }],
      }),
    });
    if (!anthropicResponse.ok) {
      console.error("Anthropic request failed", anthropicResponse.status);
      return json({ error: "assistant_unavailable" }, 503, origin);
    }
    const responseBody = await anthropicResponse.json();
    const block = Array.isArray(responseBody?.content)
      ? responseBody.content.find((candidate: { type?: string }) => candidate?.type === "text")
      : null;
    const answer = cleanText(block?.text, 1400);
    if (!answer) return json({ error: "assistant_unavailable" }, 503, origin);
    return json({ answer }, 200, origin);
  } catch (error) {
    console.error("Claude assistant error", error instanceof Error ? error.message : "unknown");
    return json({ error: "assistant_unavailable" }, 503, origin);
  }
});
