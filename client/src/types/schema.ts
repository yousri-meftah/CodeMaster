export type User = {
  id: number;
  username: string;
  password?: string;
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
  createdAt?: string | Date | null;
};

export type InsertUser = {
  username: string;
  password: string;
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
};

export type Problem = {
  id: number;
  title: string;
  difficulty: string;
  tags?: string[] | null;
  external_link?: string | null;
  createdAt?: string | Date | null;
  description?: string | null;
  constraints?: string | null;
};

export type InsertProblem = {
  title: string;
  difficulty: string;
  tags?: string[] | null;
  external_link?: string | null;
};

export type UserSolution = {
  id: number;
  userId: number;
  problemId: number;
  code: string;
  language: string;
  difficulty?: string | null;
  solved?: boolean | null;
  favorite?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type InsertUserSolution = {
  userId: number;
  problemId: number;
  code: string;
  language: string;
  solved?: boolean | null;
  favorite?: boolean | null;
};

export type Article = {
  id: number;
  title: string;
  content: string;
  summary?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  readTime?: number | null;
  categories?: string[] | null;
  createdAt?: string | Date | null;
};

export type InsertArticle = {
  title: string;
  content: string;
  summary?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  readTime?: number | null;
  categories?: string[] | null;
};

export type Roadmap = {
  id: number;
  title: string;
  description: string;
  steps?: unknown;
  createdAt?: string | Date | null;
};

export type InsertRoadmap = {
  title: string;
  description: string;
  steps: unknown;
};

export type Comment = {
  id: number;
  userId: number;
  problemId?: number | null;
  articleId?: number | null;
  content: string;
  parentId?: number | null;
  createdAt?: string | Date | null;
};

export type InsertComment = {
  userId: number;
  problemId?: number | null;
  articleId?: number | null;
  content: string;
  parentId?: number | null;
};

export type UserProgress = {
  id: number;
  userId: number;
  problemsSolved?: number | null;
  articlesRead?: number | null;
  streak?: number | null;
  roadmapProgress?: string | null;
  lastActive?: string | Date | null;
};

export type InsertUserProgress = {
  userId: number;
  problemsSolved?: number | null;
  articlesRead?: number | null;
  streak?: number | null;
  roadmapProgress?: string | null;
  lastActive?: string | Date | null;
};
