export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCall[];
  /** Present on tool-result messages for Ollama. */
  tool_name?: string;
};

export type ChatResponse = {
  message: ChatMessage;
  toolCalls: ToolCall[];
};

export type LlmProvider = {
  chat(messages: ChatMessage[], tools: unknown[]): Promise<ChatResponse>;
};
