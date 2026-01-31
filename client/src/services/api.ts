import axios, { InternalAxiosRequestConfig } from 'axios';
import type { Problem, Roadmap } from "@shared/schema";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_admin: boolean;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData extends LoginData {
  name?: string;
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
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");
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
  getAllProblems: async (params?: { name?: string; difficulty?: string }): Promise<Problem[]> => {
    const response = await api.get<ProblemApi[]>("/problem", { params });
    return response.data.map(normalizeProblem);
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
