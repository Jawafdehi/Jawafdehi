import axios from "axios";
import type { Skill, MCPServer, Summary, Draft, LLMProvider, CaseworkerUser } from "@/types/caseworker";

const BASE_URL = import.meta.env.VITE_CASEWORKER_API_URL ?? `${import.meta.env.VITE_API_BASE_URL ?? ""}/caseworker`;

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("cw_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("cw_refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
          localStorage.setItem("cw_access_token", data.access);
          error.config.headers.Authorization = `Bearer ${data.access}`;
          return client.request(error.config);
        } catch {
          localStorage.removeItem("cw_access_token");
          localStorage.removeItem("cw_refresh_token");
          window.location.href = "/caseworker/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth

export async function login(username: string, password: string) {
  const { data } = await client.post("/auth/token/", { username, password });
  localStorage.setItem("cw_access_token", data.access);
  localStorage.setItem("cw_refresh_token", data.refresh);
  return data;
}

export function logout() {
  localStorage.removeItem("cw_access_token");
  localStorage.removeItem("cw_refresh_token");
}

export async function getMe(): Promise<CaseworkerUser> {
  const { data } = await client.get("/users/me/");
  return data;
}

// Skills

export async function listSkills(): Promise<{ results: Skill[] } | Skill[]> {
  const { data } = await client.get("/skills/");
  return data;
}

export async function createSkill(payload: Partial<Skill>) {
  const { data } = await client.post("/skills/", payload);
  return data as Skill;
}

export async function updateSkill(id: number, payload: Partial<Skill>) {
  const { data } = await client.patch(`/skills/${id}/`, payload);
  return data as Skill;
}

export async function deleteSkill(id: number) {
  await client.delete(`/skills/${id}/`);
}

// Summaries

export async function generateSummary(caseNumber: string, skillId: number, query: string): Promise<Summary> {
  const { data } = await client.post("/summaries/generate/", {
    case_number: caseNumber,
    skill_id: skillId,
    query,
  });
  return data;
}

export async function listSummaries(): Promise<{ results: Summary[] }> {
  const { data } = await client.get("/summaries/");
  return data;
}

// Drafts

export async function listDrafts(): Promise<{ results: Draft[] }> {
  const { data } = await client.get("/drafts/");
  return data;
}

export async function createDraft(caseNumber: string, skillId: number | null, content: string): Promise<Draft> {
  const { data } = await client.post("/drafts/", {
    case_number: caseNumber,
    skill: skillId,
    content,
  });
  return data;
}

export async function updateDraft(id: number, content: string): Promise<Draft> {
  const { data } = await client.patch(`/drafts/${id}/`, { content });
  return data;
}

export async function deleteDraft(id: number) {
  await client.delete(`/drafts/${id}/`);
}

export async function getDraftVersions(id: number) {
  const { data } = await client.get(`/drafts/${id}/versions/`);
  return data;
}

export async function restoreDraftVersion(id: number, versionId: number): Promise<Draft> {
  const { data } = await client.post(`/drafts/${id}/restore_version/`, { version_id: versionId });
  return data;
}

// LLM Providers

export async function listLLMProviders(): Promise<{ results: LLMProvider[] }> {
  const { data } = await client.get("/llm-providers/");
  return data;
}

export async function createLLMProvider(payload: Partial<LLMProvider> & { api_key: string }): Promise<LLMProvider> {
  const { data } = await client.post("/llm-providers/", payload);
  return data;
}

export async function updateLLMProvider(id: number, payload: Partial<LLMProvider> & { api_key?: string }): Promise<LLMProvider> {
  const { data } = await client.patch(`/llm-providers/${id}/`, payload);
  return data;
}

export async function testLLMConnection(id: number): Promise<{ connected: boolean }> {
  const { data } = await client.post(`/llm-providers/${id}/test_connection/`);
  return data;
}

// MCP Servers

export async function listMCPServers(): Promise<{ results: MCPServer[] }> {
  const { data } = await client.get("/mcp-servers/");
  return data;
}

export async function createMCPServer(payload: Partial<MCPServer> & { auth_token: string }): Promise<MCPServer> {
  const { data } = await client.post("/mcp-servers/", payload);
  return data;
}

export async function testMCPConnection(id: number): Promise<{ connected: boolean }> {
  const { data } = await client.post(`/mcp-servers/${id}/test_connection/`);
  return data;
}

export function isLoggedIn() {
  return !!localStorage.getItem("cw_access_token");
}
