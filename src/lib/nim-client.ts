import OpenAI from "openai";

export const MODELS = {
  fast: "nvidia/nvidia-nemotron-nano-9b-v2",
  reasoning: "nvidia/llama-3.3-nemotron-super-49b-v1",
} as const;

let _clientFast: OpenAI | null = null;
let _clientReasoning: OpenAI | null = null;

function getClientFast(): OpenAI {
  if (!_clientFast) {
    const key = process.env.NVIDIA_NIM_API_KEY_FAST;
    if (!key) throw new Error("NVIDIA_NIM_API_KEY_FAST is not set");
    _clientFast = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: key,
    });
  }
  return _clientFast;
}

function getClientReasoning(): OpenAI {
  if (!_clientReasoning) {
    const key = process.env.NVIDIA_NIM_API_KEY_REASONING;
    if (!key) throw new Error("NVIDIA_NIM_API_KEY_REASONING is not set");
    _clientReasoning = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: key,
    });
  }
  return _clientReasoning;
}

function getClient(model: keyof typeof MODELS): OpenAI {
  return model === "fast" ? getClientFast() : getClientReasoning();
}

export async function callNemotronWithMessages(
  model: keyof typeof MODELS,
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: {
    tools?: OpenAI.ChatCompletionTool[];
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
  }
) {
  const response = await getClient(model).chat.completions.create({
    model: MODELS[model],
    messages,
    temperature: options?.temperature ?? 0.3,
    top_p: 0.9,
    max_tokens: options?.maxTokens ?? 4096,
    ...(options?.tools
      ? { tools: options.tools, tool_choice: "auto" as const }
      : {}),
    ...(options?.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });
  return response;
}
