import axios, { InternalAxiosRequestConfig } from 'axios';
import type { Problem, Roadmap } from "@shared/schema";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_admin: boolean;
  role?: "user" | "recruiter" | "admin";
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData extends LoginData {
  name?: string;
  role?: "user" | "recruiter";
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
  started_at?: string | null;
  submitted_at?: string | null;
  last_seen_at?: string | null;
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

const normalizeProblem = (problem: ProblemApi): Problem => ({
  ...problem,
  tags: (problem.tags ?? []).map((tag) => tag.name),
});

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  withCredentials: true, // Important for handling cookies/sessions
});

// Add request interceptor to include auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? "";
    const detail = error?.response?.data?.detail;
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");

    if (typeof detail === "string" && detail.trim()) {
      error.message = detail;
    }

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  }
);

// Auth related API calls
export const authAPI = {
  login: async (data: LoginData): Promise<User> => {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  register: async (data: RegisterData): Promise<User> => {
  const payload = {
    name: data.name,
    password: data.password,
    email: data.username,
    role: data.role ?? "user",
  };

  const response = await api.post('/auth/register', payload);

  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
},

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const tagsAPI = {
  getAllTags: async (): Promise<TagApi[]> => {
    const response = await api.get("/tag");
    return response.data;
  },
  createTag: async (name: string): Promise<TagApi> => {
    const response = await api.post("/tag", { name });
    return response.data;
  },
};

export const problemsAPI = {
  getAllProblems: async (params?: { name?: string; difficulty?: string; page?: number; page_size?: number }): Promise<{ items: Problem[]; total: number; page: number; page_size: number }> => {
    const response = await api.get<ProblemsPageApi>("/problem", { params });
    return {
      items: response.data.items.map(normalizeProblem),
      total: response.data.total,
      page: response.data.page,
      page_size: response.data.page_size,
    };
  },

  getProblemById: async (id: string): Promise<Problem> => {
    const response = await api.get<ProblemApi>(`/problem/${id}`);
    return normalizeProblem(response.data);
  },

  submitSolution: async (problemId: string, code: string) => {
    const response = await api.post('/SavedSolution', {
      problem_id: parseInt(problemId),
      code: code
    });
    return response.data;
  },
  getSolutionByProblem: async (problemId: number) => {
    const res = await api.get(`/SavedSolution/${problemId}`);
    return res.data|| { code: "" }; 
  },
  createProblem: async (data : { title: string; difficulty: string; externalUrl?: string; tagNames?: string[] }) => {
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
    const payload = {
      title: data.title,
      difficulty: data.difficulty,
      external_link: data.externalUrl,
      tag_ids
    };
    console.log("payload in createProblem:", payload);
    const response = await api.post("/problem", payload);
    return normalizeProblem(response.data);
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

    const payload = {
      title: data.title,
      difficulty: data.difficulty,
      external_link: data.externalUrl,
      tag_ids
    };
    const response = await api.put(`/problem/${id}`, payload);
    return normalizeProblem(response.data);
  },
  deleteProblem: async (id: number) => {
    const response = await api.delete(`/problem/${id}`);
    return response.data;
  },
  getDailyProblem: async (): Promise<Problem> => {
    const response = await api.get<ProblemApi>("/problem/daily");
    return normalizeProblem(response.data);
  },
};

// Roadmap related API calls
export const roadmapAPI = {
  getAllRoadmaps: async (): Promise<RoadmapApi[]> => {
    const response = await api.get<RoadmapApi[]>('/roadmap');
    return response.data;
  },
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
  getActivity: async () => {
    const response = await api.get("/user/activity");
    return response.data;
  },
};

export const userAPI = {
  getSolutions: async () => {
    const response = await api.get("/user/solutions");
    return response.data;
  },
};

export const articlesAPI = {
  getAllArticles: async (category?: string) => {
    const response = await api.get("/articles", {
      params: category ? { category } : undefined,
    });
    return response.data;
  },
  getArticleById: async (id: number) => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },
};

export const submissionsAPI = {
  run: async (payload: { problem_id: number; language: string; code: string }): Promise<SubmissionResult> => {
    const response = await api.post("/submission/run", payload);
    return response.data;
  },
  submit: async (payload: { problem_id: number; language: string; code: string }): Promise<SubmissionResult> => {
    const response = await api.post("/submission/submit", payload);
    return response.data;
  },
  getByProblem: async (problemId: number): Promise<SubmissionListItem[]> => {
    const response = await api.get(`/submission/problem/${problemId}`);
    return response.data;
  },
};

export const interviewsAPI = {
  list: async (): Promise<Interview[]> => {
    const response = await api.get("/interviews/");
    return response.data;
  },
  getById: async (id: number): Promise<InterviewDetail> => {
    const response = await api.get(`/interviews/${id}`);
    return response.data;
  },
  create: async (payload: {
    title: string;
    description?: string;
    difficulty?: string;
    duration_minutes: number;
    availability_days: number;
    settings: Record<string, unknown>;
    status: string;
    problems: InterviewProblemRef[];
  }): Promise<InterviewDetail> => {
    const response = await api.post("/interviews/", payload);
    return response.data;
  },
  update: async (
    id: number,
    payload: {
      title: string;
      description?: string;
      difficulty?: string;
      duration_minutes: number;
      availability_days: number;
      settings: Record<string, unknown>;
      status: string;
      problems: InterviewProblemRef[];
    },
  ): Promise<InterviewDetail> => {
    const response = await api.put(`/interviews/${id}`, payload);
    return response.data;
  },
  addCandidates: async (id: number, emails: string[]): Promise<InterviewCandidate[]> => {
    const response = await api.post(`/interviews/${id}/candidates`, { emails });
    return response.data;
  },
  updateCandidateStatus: async (interviewId: number, candidateId: number, status: string): Promise<InterviewCandidate> => {
    const response = await api.patch(`/interviews/${interviewId}/candidates/${candidateId}/status`, { status });
    return response.data;
  },
  getCandidateReview: async (interviewId: number, candidateId: number): Promise<InterviewCandidateReview> => {
    const response = await api.get(`/interviews/${interviewId}/candidates/${candidateId}`);
    return response.data;
  },
  getCandidateSubmissions: async (interviewId: number, candidateId: number): Promise<InterviewSubmission[]> => {
    const response = await api.get(`/interviews/${interviewId}/candidates/${candidateId}/submissions`);
    return response.data;
  },
  getCandidateLogs: async (interviewId: number, candidateId: number): Promise<InterviewLog[]> => {
    const response = await api.get(`/interviews/${interviewId}/candidates/${candidateId}/logs`);
    return response.data;
  },
  getCandidates: async (
    id: number,
    params?: { page?: number; page_size?: number; status?: string; search?: string },
  ): Promise<InterviewCandidatesPage> => {
    const response = await api.get(`/interviews/${id}/candidates`, { params });
    return response.data;
  },
  getSubmissions: async (id: number): Promise<InterviewSubmission[]> => {
    const response = await api.get(`/interviews/${id}/submissions`);
    return response.data;
  },
  getLogs: async (id: number): Promise<InterviewLog[]> => {
    const response = await api.get(`/interviews/${id}/logs`);
    return response.data;
  },
};

export const interviewSessionAPI = {
  getSession: async (token: string): Promise<CandidateSession> => {
    const response = await api.get("/interview/session", { params: { token } });
    return response.data;
  },
  start: async (token: string): Promise<CandidateSession> => {
    const response = await api.post("/interview/start", null, { params: { token } });
    return response.data;
  },
  save: async (payload: {
    token: string;
    problem_id: number;
    language: string;
    code: string;
    change_summary?: Record<string, unknown>;
  }): Promise<InterviewCandidate> => {
    const response = await api.post("/interview/save", payload);
    return response.data;
  },
  submit: async (token: string): Promise<InterviewCandidate> => {
    const response = await api.post("/interview/submit", { token });
    return response.data;
  },
  log: async (payload: { token: string; event_type: string; meta?: Record<string, unknown> }): Promise<InterviewCandidate> => {
    const response = await api.post("/interview/log", payload);
    return response.data;
  },
};

// User progress related API calls
// export const progressAPI = {
//   getUserProgress: async () => {
//     const response = await api.get('/progress');
//     return response.data;
//   },

//   updateProgress: async (problemId: string, status: string) => {
//     const response = await api.post('/progress', { problemId, status });
//     return response.data;
//   },
// };

export default api; 
