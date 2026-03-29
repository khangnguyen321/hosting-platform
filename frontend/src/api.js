import axios from "axios";

const API_BASE = "http://localhost:5000";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("Token from localStorage:", token); // Debug
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Authorization header set:", config.headers.Authorization); // Debug
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Auth endpoints
export const authAPI = {
  signup: (username, email, password) =>
    api.post("/auth/signup", { username, email, password }),
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
};

// Projects endpoints
export const projectsAPI = {
  list: () => api.get("/api/projects"),
  create: (name, github_url, github_branch, description) =>
    api.post("/api/projects", { name, github_url, github_branch, description }),
  delete: (id) => api.delete(`/api/projects/${id}`),
  getStatus: (id) => api.get(`/api/projects/${id}/status`),
  deploy: (id) => api.post(`/api/projects/${id}/deploy`),
  stop: (id) => api.post(`/api/projects/${id}/stop`),
  getLogs: (id) => api.get(`/api/projects/${id}/logs`),
};

// Secrets endpoints
export const secretsAPI = {
  list: (projectId) => api.get(`/api/projects/${projectId}/secrets`),
  create: (projectId, key, value) =>
    api.post(`/api/projects/${projectId}/secrets`, { key, value }),
  delete: (projectId, key) =>
    api.delete(`/api/projects/${projectId}/secrets/${key}`),
};

// Audit endpoints
export const auditAPI = {
  getLogs: () => api.get("/api/audit/logs"),
};

export default api;
