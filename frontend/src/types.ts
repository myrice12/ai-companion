export interface LLMSettings {
  api_key: string;
  api_key_set: boolean;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  max_context_tokens: number;
  enable_summary: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  token_count: number;
  created_at: string;
}

export interface ContextPreview {
  messages: Array<{ role: string; content: string; token_count: number }>;
  total_tokens: number;
  max_context_tokens: number;
  truncated_count: number;
}
