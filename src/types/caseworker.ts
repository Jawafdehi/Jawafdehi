export interface CaseworkerUser {
  id: number;
  username: string;
  email: string;
  role: "caseworker" | "administrator"; // derived from is_staff on the backend
}

export interface Skill {
  id: number;
  name: string;
  display_name: string | null;
  description: string;
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface MCPServer {
  id: number;
  name: string;
  display_name: string | null;
  url: string;
  auth_type: "bearer" | "api_key";
  status: "connected" | "disconnected" | "error";
  created_at: string;
  updated_at: string;
}

export interface Summary {
  id: number;
  case_number: string;
  skill: number | null;
  skill_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DraftVersion {
  id: number;
  content: string;
  created_at: string;
}

export interface Draft {
  id: number;
  case_number: string;
  skill: number | null;
  skill_name: string | null;
  content: string;
  status: "draft" | "posted" | "archived";
  external_reference_id: string | null;
  versions: DraftVersion[];
  created_at: string;
  updated_at: string;
}

export interface LLMProvider {
  id: number;
  provider_type: "openai" | "anthropic" | "google" | "ollama" | "azure" | "custom";
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  type: "user" | "assistant" | "info" | "error" | "success";
  message: string;
  timestamp: string;
  isUser?: boolean;
}

export interface ChatTab {
  id: number;
  name: string;
  messages: ChatMessage[];
}
