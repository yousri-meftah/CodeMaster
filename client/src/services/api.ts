import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://localhost:8000';

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

  export const problemsAPI = {
  getAllProblems: async (params?: { name?: string; difficulty?: string }) => {
  const response = await api.get("/problem", { params });
  return response.data;
},

  getProblemById: async (id: string) => {
    const response = await api.get(`/problem/${id}`);
    return response.data;
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
  createProblem: async (data : any) => {
    const payload = {
      title: data.title,
      difficulty: data.difficulty,
      external_link: data.externalUrl,
      tag_ids : []
    };
    console.log("payload in createProblem:", payload);
    const response = await api.post("/problem", payload);
    return response.data;
  },
};

// Roadmap related API calls
export const roadmapAPI = {
  getRoadmap: async () => {
    const response = await api.get('/roadmap');
    return response.data;
  },

  getRoadmapSection: async (sectionId: string) => {
    const response = await api.get(`/roadmap/${sectionId}`);
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