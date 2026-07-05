export interface LLMProviderPreset {
  id: string;
  name: string;
  emoji: string;
  base_url: string;
  model: string;
  needsKey: boolean;
}

export const LLM_PRESETS: LLMProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    emoji: "🤖",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    emoji: "🐳",
    base_url: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    needsKey: true,
  },
  {
    id: "ollama",
    name: "Ollama 本地",
    emoji: "🦙",
    base_url: "http://host.docker.internal:11434/v1",
    model: "llama3",
    needsKey: false,
  },
  {
    id: "custom",
    name: "自定义",
    emoji: "✨",
    base_url: "",
    model: "",
    needsKey: true,
  },
];

export function isSettingsConfigured(settings: {
  api_key_set: boolean;
  base_url: string;
}): boolean {
  const isLocal =
    settings.base_url.includes("localhost") ||
    settings.base_url.includes("127.0.0.1") ||
    settings.base_url.includes("host.docker.internal");
  return settings.api_key_set || isLocal;
}
