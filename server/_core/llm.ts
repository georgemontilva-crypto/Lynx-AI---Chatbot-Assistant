/**
 * LLM gateway — Anthropic Claude edition.
 *
 * Replaces the original Manus Forge gateway with direct calls to the
 * Anthropic Messages API, while keeping the exact same exported interface
 * (OpenAI-style invokeLLM / InvokeResult) so existing callers in
 * widgetRouter.ts and routers.ts keep working unchanged.
 *
 * Required env var: ANTHROPIC_API_KEY
 * Optional env var: ANTHROPIC_MODEL (default: claude-haiku-4-5)
 */

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const DEFAULT_MAX_TOKENS = 2048;

/**
 * Legacy model names (from the Forge/OpenAI era) mapped to Claude models so
 * existing call sites keep working without edits.
 */
const MODEL_ALIASES: Record<string, string> = {
  "gpt-5-nano": DEFAULT_MODEL,
  "gpt-5-mini": DEFAULT_MODEL,
  "gpt-5": DEFAULT_MODEL,
  "gpt-4o-mini": DEFAULT_MODEL,
  "gpt-4o": DEFAULT_MODEL,
};

const resolveModel = (model?: string): string => {
  if (!model) return DEFAULT_MODEL;
  return MODEL_ALIASES[model] ?? model;
};

const getApiKey = (): string | undefined => process.env.ANTHROPIC_API_KEY;

const assertApiKey = () => {
  if (!getApiKey()) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
};

// ---------------------------------------------------------------------------
// Message normalization (OpenAI-style input -> Anthropic Messages payload)
// ---------------------------------------------------------------------------

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "url"; url: string } }
  | { type: "document"; source: { type: "url"; url: string } }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: AnthropicContentBlock[] | string;
};

const partToText = (part: MessageContent): string => {
  if (typeof part === "string") return part;
  if (part.type === "text") return part.text;
  return JSON.stringify(part);
};

const normalizeContentPart = (part: MessageContent): AnthropicContentBlock => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return { type: "text", text: part.text };
  }
  if (part.type === "image_url") {
    return { type: "image", source: { type: "url", url: part.image_url.url } };
  }
  if (part.type === "file_url") {
    // Anthropic supports URL-sourced PDF documents; other media types are
    // passed through as a text reference so the request never hard-fails.
    if (part.file_url.mime_type === "application/pdf") {
      return { type: "document", source: { type: "url", url: part.file_url.url } };
    }
    return { type: "text", text: `[archivo adjunto: ${part.file_url.url}]` };
  }
  throw new Error("Unsupported message content part");
};

/**
 * Splits the OpenAI-style message list into Anthropic's shape:
 * system messages become the top-level `system` string, tool/function results
 * become `tool_result` blocks in a user turn, and consecutive same-role turns
 * are merged (Anthropic requires strict user/assistant alternation).
 */
const buildAnthropicPayloadMessages = (
  messages: Message[]
): { system: string | undefined; messages: AnthropicMessage[] } => {
  const systemParts: string[] = [];
  const converted: AnthropicMessage[] = [];

  const pushBlocks = (
    role: "user" | "assistant",
    blocks: AnthropicContentBlock[]
  ) => {
    const last = converted[converted.length - 1];
    if (last && last.role === role && Array.isArray(last.content)) {
      last.content.push(...blocks);
    } else {
      converted.push({ role, content: blocks });
    }
  };

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(
        ensureArray(message.content).map(partToText).join("\n")
      );
      continue;
    }

    if (message.role === "tool" || message.role === "function") {
      const text = ensureArray(message.content).map(partToText).join("\n");
      pushBlocks("user", [
        {
          type: "tool_result",
          tool_use_id: message.tool_call_id ?? "tool_call_0",
          content: text,
        },
      ]);
      continue;
    }

    const role = message.role === "assistant" ? "assistant" : "user";
    pushBlocks(role, ensureArray(message.content).map(normalizeContentPart));
  }

  // Anthropic requires the conversation to start with a user turn.
  if (converted.length === 0 || converted[0].role !== "user") {
    converted.unshift({ role: "user", content: [{ type: "text", text: "" }] });
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    messages: converted,
  };
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): JsonSchema | "json_object" | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "text") return undefined;
    if (explicitFormat.type === "json_object") return "json_object";
    if (!explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat.json_schema;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return schema;
};

// ---------------------------------------------------------------------------
// Retry with exponential backoff (kept from the original implementation)
// ---------------------------------------------------------------------------

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      // 4xx errors (except 429) are not retryable — fail fast on bad requests.
      if (
        response.ok ||
        attempt === RETRY_MAX_RETRIES ||
        (response.status >= 400 && response.status < 500 && response.status !== 429)
      ) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

// ---------------------------------------------------------------------------
// Anthropic response shape
// ---------------------------------------------------------------------------

type AnthropicResponse = {
  id: string;
  model: string;
  role: "assistant";
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  >;
  stop_reason: string | null;
  usage?: { input_tokens: number; output_tokens: number };
};

const STOP_REASON_MAP: Record<string, string> = {
  end_turn: "stop",
  stop_sequence: "stop",
  max_tokens: "length",
  tool_use: "tool_calls",
};

const JSON_OUTPUT_TOOL = "json_output";

// ---------------------------------------------------------------------------
// Public API (same signatures as before)
// ---------------------------------------------------------------------------

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    maxTokens,
    max_tokens,
  } = params;

  const { system, messages: anthropicMessages } =
    buildAnthropicPayloadMessages(messages);

  const payload: Record<string, unknown> = {
    model: resolveModel(model),
    max_tokens: max_tokens ?? maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: anthropicMessages,
  };

  if (system) {
    payload.system = system;
  }

  const format = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  const anthropicTools: Array<Record<string, unknown>> = [];
  let jsonMode = false;

  if (format === "json_object") {
    // Best-effort JSON mode: instruct via system prompt.
    payload.system = [
      typeof payload.system === "string" ? payload.system : "",
      "Respond ONLY with a valid JSON object. No prose, no markdown fences.",
    ]
      .filter(Boolean)
      .join("\n\n");
  } else if (format) {
    // json_schema mode: force a tool call whose input IS the schema, which
    // guarantees schema-conformant JSON. The tool input is returned to the
    // caller as a plain JSON string in message.content, matching what the
    // OpenAI-style callers expect to JSON.parse().
    jsonMode = true;
    anthropicTools.push({
      name: JSON_OUTPUT_TOOL,
      description: "Return the final answer as structured JSON.",
      input_schema: format.schema,
    });
    payload.tool_choice = { type: "tool", name: JSON_OUTPUT_TOOL };
  }

  if (tools && tools.length > 0) {
    for (const tool of tools) {
      anthropicTools.push({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters ?? { type: "object" },
      });
    }
    if (!jsonMode) {
      const choice = toolChoice || tool_choice;
      if (choice === "required") {
        payload.tool_choice = { type: "any" };
      } else if (choice && choice !== "auto" && choice !== "none") {
        const name = "name" in choice ? choice.name : choice.function.name;
        payload.tool_choice = { type: "tool", name };
      }
    }
  }

  if (anthropicTools.length > 0) {
    payload.tools = anthropicTools;
  }

  const response = await fetchWithBackoff(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getApiKey() as string,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const data = (await response.json()) as AnthropicResponse;

  // Convert back to the OpenAI-style result the rest of the app expects.
  const textParts = data.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map(block => block.text);

  const toolUses = data.content.filter(
    (block): block is { type: "tool_use"; id: string; name: string; input: unknown } =>
      block.type === "tool_use"
  );

  let contentText = textParts.join("");
  let toolCalls: ToolCall[] | undefined;

  if (jsonMode) {
    const jsonBlock = toolUses.find(t => t.name === JSON_OUTPUT_TOOL);
    if (jsonBlock) {
      contentText = JSON.stringify(jsonBlock.input);
    }
  } else if (toolUses.length > 0) {
    toolCalls = toolUses.map(t => ({
      id: t.id,
      type: "function" as const,
      function: { name: t.name, arguments: JSON.stringify(t.input) },
    }));
  }

  const promptTokens = data.usage?.input_tokens ?? 0;
  const completionTokens = data.usage?.output_tokens ?? 0;

  return {
    id: data.id,
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: contentText,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: data.stop_reason
          ? (STOP_REASON_MAP[data.stop_reason] ?? data.stop_reason)
          : null,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  assertApiKey();
  // The Anthropic API has no public models-list endpoint compatible with this
  // shape; return the configured model so existing consumers keep working.
  return {
    object: "list",
    data: [
      {
        id: DEFAULT_MODEL,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "anthropic",
      },
    ],
  };
}
