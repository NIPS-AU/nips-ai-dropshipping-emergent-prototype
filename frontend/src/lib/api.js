import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE, timeout: 30_000 });

export const endpoints = {
  dashboardStats: () => api.get("/dashboard/stats").then((r) => r.data),
  licenseStatus: () => api.get("/license/status").then((r) => r.data),

  discoverySearch: (body) => api.post("/discovery/search", body).then((r) => r.data),
  discoveryHistory: () => api.get("/discovery/history").then((r) => r.data),
  clearDiscoveryHistory: () => api.delete("/discovery/history").then((r) => r.data),

  listImports: () => api.get("/imports").then((r) => r.data),
  getImport: (id) => api.get(`/imports/${id}`).then((r) => r.data),
  createImport: (body) => api.post("/imports", body).then((r) => r.data),
  patchImport: (id, body) => api.patch(`/imports/${id}`, body).then((r) => r.data),
  deleteImport: (id) => api.delete(`/imports/${id}`).then((r) => r.data),
  clearImports: () => api.delete("/imports").then((r) => r.data),

  aiSettings: () => api.get("/ai/settings").then((r) => r.data),
  saveAISettings: (body) => api.put("/ai/settings", body).then((r) => r.data),
  aiRewrite: (body) => api.post("/ai/rewrite", body).then((r) => r.data),

  publish: (body) => api.post("/publish", body).then((r) => r.data),
  publishLogs: () => api.get("/publish/logs").then((r) => r.data),

  logs: () => api.get("/logs").then((r) => r.data),
  clearLogs: () => api.delete("/logs").then((r) => r.data),

  releases: () => api.get("/v1/plugin/releases").then((r) => r.data),
  releaseLatest: () => api.get("/v1/plugin/releases/latest").then((r) => r.data),

  maintenance: (target) => api.post(`/maintenance/clear`, null, { params: { target } }).then((r) => r.data),
};
