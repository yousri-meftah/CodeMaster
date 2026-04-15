import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { Problem, Roadmap } from "@/types/schema";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const resolveApiUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
};

export interface User {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatar?: string | null;
  is_admin?: boolean;
  role?: "user" | "recruiter" | "admin";
  auth_provider?: "local" | "google" | "github";
  session_id?: string | null;
  token_version?: number;
  issued_at?: string | null;
  expires_at?: string | null;
  createdAt?: string | null;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  role?: "user" | "recruiter";
}

export interface AuthResponse {
  token_type: "bearer";
  user: User;
  requires_role_selection: boolean;
}

export interface OAuthStartResponse {
  authorization_url: string;
  provider: "google" | "github";
}

export type TagApi = {
  id: number;
  name: string;
};

type ProblemApi = Omit<Problem, "tags"> & {
  tags?: TagApi[];
  description?: string | null;
  test_cases?: ProblemTestCaseApi[];
  starter_codes?: ProblemStarterCodeApi[];
};

type ProblemsPageApi = {
  items: ProblemApi[];
  total: number;
  page: number;
  page_size: number;
};

export type RoadmapApi = {
  id: number;
  title: string;
  problem_ids_ordered: number[];
};

type ProblemTestCaseApi = {
  id: number;
  input_text: string;
  output_text: string;
  is_sample: boolean;
  order: number;
};

type ProblemStarterCodeApi = {
  id: number;
  language: string;
  code: string;
};

export type SubmissionCase = {
  id?: number;
  is_sample: boolean;
  input_text?: string | null;
  output_text?: string | null;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  status?: string | null;
  time?: string | null;
  memory?: number | null;
  passed: boolean;
};

export type SubmissionResult = {
  verdict: string;
  passed: number;
  total: number;
  cases: SubmissionCase[];
  hidden?: { passed: number; total: number } | null;
};

export type SubmissionListItem = {
  id: number;
  problem_id: number;
  language: string;
  verdict?: string | null;
  passed?: number | null;
  total?: number | null;
  is_submit: boolean;
  created_at?: string | null;
};

export type InterviewProblemRef = {
  problem_id: number;
  order: number;
};

export type Interview = {
  id: number;
  title: string;
  description?: string | null;
  difficulty?: string | null;
  duration_minutes: number;
  availability_days: number;
  settings: Record<string, unknown>;
  recruiter_id: number;
  status: string;
};

export type InterviewProblem = {
  id: number;
  title: string;
  difficulty: string;
  description?: string | null;
  constraints?: string | null;
  order: number;
};

export type InterviewDetail = Interview & {
  problems: InterviewProblem[];
};

export type InterviewCandidate = {
  id: number;
  email: string;
  token: string;
  status: string;
  invite_status: "pending" | "sent" | "failed";
  invite_error?: string | null;
  invite_sent_at?: string | null;
  invite_attempts: number;
  started_at?: string | null;
  submitted_at?: string | null;
  last_seen_at?: string | null;
};

export type InterviewInviteResult = {
  candidate_id: number;
  email: string;
  status: "pending" | "sent" | "failed";
  error?: string | null;
};

export type InterviewCandidateBatch = {
  candidates: InterviewCandidate[];
  invite_results: InterviewInviteResult[];
};

export type InterviewResendInvite = {
  candidate: InterviewCandidate;
  invite: InterviewInviteResult;
};

export type InterviewCandidateReview = InterviewCandidate & {
  submission_count: number;
  log_count: number;
  completed_problem_count: number;
  risk_score: number;
};

export type InterviewCandidatesPage = {
  items: InterviewCandidate[];
  total: number;
  page: number;
  page_size: number;
};

export type InterviewSubmission = {
  id: number;
  candidate_id: number;
  candidate_email: string;
  problem_id: number;
  language: string;
  code: string;
  change_summary?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InterviewLog = {
  id: number;
  candidate_id: number;
  candidate_email: string;
  event_type: string;
  meta?: Record<string, unknown> | null;
  timestamp?: string | null;
};

export type InterviewMediaSegment = {
  id: number;
  candidate_id: number;
  candidate_email?: string | null;
  sequence_number: number;
  media_kind: string;
  mime_type: string;
  size_bytes: number;
  duration_ms?: number | null;
  checksum: string;
  upload_status: string;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  download_url?: string | null;
};

export type InterviewMediaStatus = {
  uploaded_segments: number;
  latest_sequence_number?: number | null;
  statuses: InterviewMediaSegment[];
};

export type CandidateSession = {
  interview_id: number;
  title: string;
  description?: string | null;
  difficulty?: string | null;
  duration_minutes: number;
  availability_days: number;
  status: string;
  started_at?: string | null;
  submitted_at?: string | null;
  expires_at?: string | null;
  available_until?: string | null;
  candidate_email: string;
  settings: Record<string, unknown>;
  problems: InterviewProblem[];
};

const getActiveInterviewToken = () => sessionStorage.getItem("interview_active_token") ?? "";

const normalizeProblem = (problem: ProblemApi): Problem => ({
  ...problem,
  tags: (problem.tags ?? []).map((tag) => tag.name),
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
  },
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

const isAuthBootstrapUrl = (url: string) =>
  url.includes("/auth/login") ||
  url.includes("/auth/register") ||
  url.includes("/auth/refresh") ||
  url.includes("/auth/oauth/") ||
  url.includes("/auth/social-role");

const isCandidateInterviewUrl = (url: string) => url.includes("/interview/");
const isCandidateInterviewPath = () => {
  const path = window.location.pathname;
  return /^\/challenge(\/|$)/.test(path) || /^\/interview(\/|$)/.test(path);
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => config);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      error.message = detail;
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthBootstrapUrl(url) &&
      !isCandidateInterviewUrl(url) &&
      !isCandidateInterviewPath()
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= api.post("/auth/refresh").then(() => undefined).finally(() => {
          refreshPromise = null;
        });
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !isAuthBootstrapUrl(url) && !isCandidateInterviewUrl(url) && !isCandidateInterviewPath()) {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }

    return Promise.reject(error);
  },
);

export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append("grant_type", "password");
    formData.append("username", data.username);
    formData.append("password", data.password);
    const response = await api.post<AuthResponse>("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", {
      name: data.name,
      password: data.password,
      email: data.email,
      role: data.role ?? "user",
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/refresh");
    return response.data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await api.get<User>("/auth/me");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  getOAuthStart: async (provider: "google" | "github"): Promise<OAuthStartResponse> => {
    const response = await api.get<OAuthStartResponse>(`/auth/oauth/${provider}/start`);
    return response.data;
  },

  completeSocialRole: async (role: "user" | "recruiter"): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/social-role", { role });
    return response.data;
  },
};

export const tagsAPI = {
  getAllTags: async (): Promise<TagApi[]> => (await api.get("/tag/")).data,
  createTag: async (name: string): Promise<TagApi> => (await api.post("/tag/", { name })).data,
};

export const problemsAPI = {
  getAllProblems: async (params?: { name?: string; difficulty?: string; page?: number; page_size?: number }) => {
    const response = await api.get<ProblemsPageApi>("/problem/", { params });
    return {
      items: response.data.items.map(normalizeProblem),
      total: response.data.total,
      page: response.data.page,
      page_size: response.data.page_size,
    };
  },
  getProblemById: async (id: string): Promise<Problem> => normalizeProblem((await api.get<ProblemApi>(`/problem/${id}`)).data),
  submitSolution: async (problemId: string, code: string) => (await api.post("/SavedSolution", { problem_id: parseInt(problemId, 10), code })).data,
  getSolutionByProblem: async (problemId: number) => (await api.get(`/SavedSolution/${problemId}`)).data || { code: "" },
  createProblem: async (data: { title: string; difficulty: string; externalUrl?: string; tagNames?: string[] }) => {
    const tags = data.tagNames ?? [];
    const existingTags = await tagsAPI.getAllTags();
    const tagNameToId = new Map(existingTags.map((tag) => [tag.name.toLowerCase(), tag.id]));
    const tag_ids: number[] = [];
    for (const tagName of tags) {
      const key = tagName.trim().toLowerCase();
      if (!key) continue;
      const existingId = tagNameToId.get(key);
      if (existingId) {
        tag_ids.push(existingId);
      } else {
        const created = await tagsAPI.createTag(tagName.trim());
        tag_ids.push(created.id);
        tagNameToId.set(created.name.toLowerCase(), created.id);
      }
    }
    return normalizeProblem((await api.post("/problem/", { title: data.title, difficulty: data.difficulty, external_link: data.externalUrl, tag_ids })).data);
  },
  updateProblem: async (id: number, data: { title: string; difficulty: string; externalUrl?: string; tagNames?: string[] }) => {
    const tags = data.tagNames ?? [];
    const existingTags = await tagsAPI.getAllTags();
    const tagNameToId = new Map(existingTags.map((tag) => [tag.name.toLowerCase(), tag.id]));
    const tag_ids: number[] = [];
    for (const tagName of tags) {
      const key = tagName.trim().toLowerCase();
      if (!key) continue;
      const existingId = tagNameToId.get(key);
      if (existingId) {
        tag_ids.push(existingId);
      } else {
        const created = await tagsAPI.createTag(tagName.trim());
        tag_ids.push(created.id);
        tagNameToId.set(created.name.toLowerCase(), created.id);
      }
    }
    return normalizeProblem((await api.put(`/problem/${id}`, { title: data.title, difficulty: data.difficulty, external_link: data.externalUrl, tag_ids })).data);
  },
  deleteProblem: async (id: number) => (await api.delete(`/problem/${id}`)).data,
  getDailyProblem: async (): Promise<Problem> => normalizeProblem((await api.get<ProblemApi>("/problem/daily")).data),
};

export const roadmapAPI = {
  getAllRoadmaps: async (): Promise<RoadmapApi[]> => (await api.get("/roadmap/")).data,
  normalizeRoadmap: (roadmap: RoadmapApi): Roadmap => ({
    id: roadmap.id,
    title: roadmap.title,
    description: "",
    steps: roadmap.problem_ids_ordered.map((problemId) => ({
      name: `Problem #${problemId}`,
      description: "",
      resources: [],
      skills: [],
      problemId,
    })),
    createdAt: new Date(),
  }),
};

export const activityAPI = {
  getActivity: async () => (await api.get("/user/activity")).data,
};

export const userAPI = {
  getSolutions: async () => (await api.get("/user/solutions")).data,
};

export const articlesAPI = {
  getAllArticles: async (category?: string) => (await api.get("/articles/", { params: category ? { category } : undefined })).data,
  getArticleById: async (id: number) => (await api.get(`/articles/${id}`)).data,
};

export const submissionsAPI = {
  run: async (payload: { problem_id: number; language: string; code: string }): Promise<SubmissionResult> => (await api.post("/submission/run", payload)).data,
  submit: async (payload: { problem_id: number; language: string; code: string }): Promise<SubmissionResult> => (await api.post("/submission/submit", payload)).data,
  getByProblem: async (problemId: number): Promise<SubmissionListItem[]> => (await api.get(`/submission/problem/${problemId}`)).data,
};

export const interviewsAPI = {
  list: async (): Promise<Interview[]> => (await api.get("/interviews/")).data,
  getById: async (id: number): Promise<InterviewDetail> => (await api.get(`/interviews/${id}`)).data,
  create: async (payload: { title: string; description?: string; difficulty?: string; duration_minutes: number; availability_days: number; settings: Record<string, unknown>; status: string; problems: InterviewProblemRef[] }) => (await api.post("/interviews/", payload)).data,
  update: async (id: number, payload: { title: string; description?: string; difficulty?: string; duration_minutes: number; availability_days: number; settings: Record<string, unknown>; status: string; problems: InterviewProblemRef[] }) => (await api.put(`/interviews/${id}`, payload)).data,
  delete: async (id: number): Promise<void> => {
    await api.delete(`/interviews/${id}`);
  },
  addCandidates: async (id: number, emails: string[]): Promise<InterviewCandidateBatch> => (await api.post(`/interviews/${id}/candidates`, { emails })).data,
  resendCandidateInvite: async (interviewId: number, candidateId: number): Promise<InterviewResendInvite> => (await api.post(`/interviews/${interviewId}/candidates/${candidateId}/resend-invite`)).data,
  updateCandidateStatus: async (interviewId: number, candidateId: number, status: string): Promise<InterviewCandidate> => (await api.patch(`/interviews/${interviewId}/candidates/${candidateId}/status`, { status })).data,
  getCandidateReview: async (interviewId: number, candidateId: number): Promise<InterviewCandidateReview> => (await api.get(`/interviews/${interviewId}/candidates/${candidateId}`)).data,
  getCandidateSubmissions: async (interviewId: number, candidateId: number): Promise<InterviewSubmission[]> => (await api.get(`/interviews/${interviewId}/candidates/${candidateId}/submissions`)).data,
  getCandidateLogs: async (interviewId: number, candidateId: number): Promise<InterviewLog[]> => (await api.get(`/interviews/${interviewId}/candidates/${candidateId}/logs`)).data,
  getCandidateMedia: async (interviewId: number, candidateId: number): Promise<InterviewMediaSegment[]> => (await api.get(`/interviews/${interviewId}/candidates/${candidateId}/media`)).data,
  getCandidates: async (id: number, params?: { page?: number; page_size?: number; status?: string; search?: string }): Promise<InterviewCandidatesPage> => (await api.get(`/interviews/${id}/candidates`, { params })).data,
  getSubmissions: async (id: number): Promise<InterviewSubmission[]> => (await api.get(`/interviews/${id}/submissions`)).data,
  getLogs: async (id: number): Promise<InterviewLog[]> => (await api.get(`/interviews/${id}/logs`)).data,
};

export const interviewSessionAPI = {
  getSession: async (token: string): Promise<CandidateSession> => (await api.post("/interview/session", { token })).data,
  start: async (token: string): Promise<CandidateSession> => (await api.post("/interview/start/secure", { token })).data,
  save: async (payload: { token: string; problem_id: number; language: string; code: string; change_summary?: Record<string, unknown> }): Promise<InterviewCandidate> => (await api.post("/interview/save", payload)).data,
  submit: async (token: string): Promise<InterviewCandidate> => (await api.post("/interview/submit", { token })).data,
  log: async (payload: { token: string; event_type: string; meta?: Record<string, unknown> }): Promise<InterviewCandidate> => (await api.post("/interview/log", payload)).data,
  uploadMediaSegment: async (payload: {
    token: string;
    media_kind: string;
    sequence_number: number;
    mime_type: string;
    started_at?: string;
    ended_at?: string;
    duration_ms?: number;
    file: Blob;
    filename: string;
  }): Promise<InterviewMediaSegment> => {
    const formData = new FormData();
    formData.append("token", payload.token);
    formData.append("media_kind", payload.media_kind);
    formData.append("sequence_number", String(payload.sequence_number));
    formData.append("mime_type", payload.mime_type);
    if (payload.started_at) formData.append("started_at", payload.started_at);
    if (payload.ended_at) formData.append("ended_at", payload.ended_at);
    if (typeof payload.duration_ms === "number") formData.append("duration_ms", String(payload.duration_ms));
    formData.append("file", payload.file, payload.filename);
    return (
      await api.post("/interview/media/segments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
  getMediaStatus: async (token: string): Promise<InterviewMediaStatus> => (await api.post("/interview/media/status", { token })).data,
  finalizeMedia: async (token: string): Promise<InterviewMediaStatus> => (await api.post("/interview/media/finalize", { token })).data,
};

export { getActiveInterviewToken };

export default api;
