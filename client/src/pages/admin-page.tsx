import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Problem,
  Article,
  InsertArticle,
} from "@shared/schema";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileCode, 
  Book, 
  Route, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Search,
  Loader2
} from "lucide-react";
import { problemsAPI, roadmapAPI, type RoadmapApi } from "@/services/api";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  difficulty: z.string().min(1, "Difficulty is required"),
  tags: z.string().optional(),
  externalUrl: z.string().optional(),
});

const articleFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  author: z.string().min(1, "Author is required"),
  imageUrl: z.string().optional(),
  readTime: z.number().optional(),
  categories: z.string().min(1, "Categories are required"),
});

type InsertRoadmap = {
  title: string;
  problem_ids_ordered: number[];
};

const AdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("problems");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [isRoadmapDialogOpen, setIsRoadmapDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Problem | Article | RoadmapApi | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'problem' | 'article' | 'roadmap' | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteItemType, setDeleteItemType] = useState<'problem' | 'article' | 'roadmap' | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  // Problems data
  const { data: problems, isLoading: problemsLoading } = useQuery<Problem[]>({
    queryKey: ["problems"],
    queryFn: () => problemsAPI.getAllProblems(),
  });

  // Articles data
  const { data: articles, isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["/articles"],
  });

  // Roadmaps data
  const { data: roadmaps, isLoading: roadmapsLoading } = useQuery<RoadmapApi[]>({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapAPI.getAllRoadmaps(),
  });

  // Users data (simplified)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/users"],
    queryFn: () => Promise.resolve([]), // This would be an actual API call in production
  });

  // Problem form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      difficulty: "easy",
      tags: "",
      externalUrl: "",
    },
  });

  // Article form
  const articleForm = useForm<z.infer<typeof articleFormSchema>>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      content: "",
      summary: "",
      imageUrl: "",
      author: "",
      readTime: 0,
      categories: "",
    },
  });

  // Roadmap form schema
  const roadmapFormSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    problemIds: z.string().min(1, "Problem IDs are required"),
  });

  // Roadmap form
  const roadmapForm = useForm<z.infer<typeof roadmapFormSchema>>({
    resolver: zodResolver(roadmapFormSchema),
    defaultValues: {
      title: "",
      problemIds: "",
    },
  });

  // Create problem mutation
  const createProblemMutation = useMutation({
  mutationFn: async (data: { title: string; difficulty: string; externalUrl?: string; tagNames?: string[] }) => {
    return problemsAPI.createProblem(data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["problems"] }); // ✅ must match your list
    toast({
      title: "Problem created",
      description: "The problem has been created successfully.",
    });
    setIsAddDialogOpen(false);
    form.reset();
  },
  onError: (error: Error) => {
    toast({
      title: "Failed to create problem",
      description: error.message,
      variant: "destructive",
    });
  },
});



  // Update problem mutation
  const updateProblemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; difficulty: string; externalUrl?: string; tagNames?: string[] } }) => {
      return problemsAPI.updateProblem(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      toast({
        title: "Problem updated",
        description: "The problem has been updated successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
      setSelectedItem(null);
      setSelectedItemType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update problem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete problem mutation
  const deleteProblemMutation = useMutation({
    mutationFn: async (id: number) => {
      return problemsAPI.deleteProblem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      toast({
        title: "Problem deleted",
        description: "The problem has been deleted successfully.",
      });
      setDeleteItemId(null);
      setDeleteItemType(null);
      setIsDeleteAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete problem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: async (data: InsertArticle) => {
      const res = await apiRequest("POST", "/articles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/articles"] });
      toast({
        title: "Article created",
        description: "The article has been created successfully.",
      });
      setIsArticleDialogOpen(false);
      articleForm.reset();
      setSelectedItem(null);
      setSelectedItemType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create article",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertArticle> }) => {
      const res = await apiRequest("PUT", `/articles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/articles"] });
      toast({
        title: "Article updated",
        description: "The article has been updated successfully.",
      });
      setIsArticleDialogOpen(false);
      articleForm.reset();
      setSelectedItem(null);
      setSelectedItemType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update article",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/articles"] });
      toast({
        title: "Article deleted",
        description: "The article has been deleted successfully.",
      });
      setDeleteItemId(null);
      setDeleteItemType(null);
      setIsDeleteAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete article",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create roadmap mutation
  const createRoadmapMutation = useMutation({
    mutationFn: async (data: InsertRoadmap) => {
      const res = await apiRequest("POST", "/roadmap", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast({
        title: "Roadmap created",
        description: "The roadmap has been created successfully.",
      });
      setIsRoadmapDialogOpen(false);
      roadmapForm.reset();
      setSelectedItem(null);
      setSelectedItemType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create roadmap",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update roadmap mutation
  const updateRoadmapMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertRoadmap> }) => {
      const res = await apiRequest("PUT", `/roadmap/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast({
        title: "Roadmap updated",
        description: "The roadmap has been updated successfully.",
      });
      setIsRoadmapDialogOpen(false);
      roadmapForm.reset();
      setSelectedItem(null);
      setSelectedItemType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update roadmap",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete roadmap mutation
  const deleteRoadmapMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/roadmap/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast({
        title: "Roadmap deleted",
        description: "The roadmap has been deleted successfully.",
      });
      setDeleteItemId(null);
      setDeleteItemType(null);
      setIsDeleteAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete roadmap",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitProblem = (values: z.infer<typeof formSchema>) => {
    const tagNames = values.tags
      ? values.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

    const problemData = {
      title: values.title,
      difficulty: values.difficulty,
      externalUrl: values.externalUrl,
      tagNames,
    };
    
    if (selectedItem && selectedItemType === 'problem') {
      updateProblemMutation.mutate({ 
        id: selectedItem.id, 
        data: problemData 
      });
    } else {
      createProblemMutation.mutate(problemData);
    }
  };

  const onSubmitArticle = (values: z.infer<typeof articleFormSchema>) => {
    // Convert comma-separated categories to array
    const articleData = {
      ...values,
      categories: values.categories.split(",").map(cat => cat.trim())
    };
    
    if (selectedItem && selectedItemType === 'article') {
      updateArticleMutation.mutate({ 
        id: selectedItem.id, 
        data: articleData
      });
    } else {
      createArticleMutation.mutate(articleData as InsertArticle);
    }
  };

  const onSubmitRoadmap = (values: z.infer<typeof roadmapFormSchema>) => {
    const problem_ids_ordered = values.problemIds
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));

    if (!problem_ids_ordered.length) {
      toast({
        title: "Invalid Problem IDs",
        description: "Please provide a comma-separated list of problem IDs.",
        variant: "destructive",
      });
      return;
    }

    const roadmapData = {
      title: values.title,
      problem_ids_ordered,
    };
    
    if (selectedItem && selectedItemType === 'roadmap') {
      updateRoadmapMutation.mutate({ 
        id: selectedItem.id, 
        data: roadmapData
      });
    } else {
      createRoadmapMutation.mutate(roadmapData);
    }
  };

  const handleEditProblem = (problem: Problem) => {
    setSelectedItem(problem);
    setSelectedItemType('problem');
    form.reset({
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags?.join(", ") || "",
      externalUrl: problem.external_link || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setSelectedItem(article);
    setSelectedItemType('article');
    articleForm.reset({
      title: article.title,
      content: article.content,
      summary: article.summary || "",
      author: article.author || "",
      imageUrl: article.imageUrl || "",
      readTime: article.readTime || 0,
      categories: article.categories?.join(", ") || "",
    });
    setIsArticleDialogOpen(true);
  };

  const handleEditRoadmap = (roadmap: RoadmapApi) => {
    setSelectedItem(roadmap);
    setSelectedItemType('roadmap');
    roadmapForm.reset({
      title: roadmap.title,
      problemIds: roadmap.problem_ids_ordered.join(", "),
    });
    setIsRoadmapDialogOpen(true);
  };

  const handleDeleteAction = (id: number, type: 'problem' | 'article' | 'roadmap') => {
    setDeleteItemId(id);
    setDeleteItemType(type);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (deleteItemId) {
      if (deleteItemType === 'problem') {
        deleteProblemMutation.mutate(deleteItemId);
      } else if (deleteItemType === 'article') {
        deleteArticleMutation.mutate(deleteItemId);
      } else if (deleteItemType === 'roadmap') {
        deleteRoadmapMutation.mutate(deleteItemId);
      }
    }
  };

  // Filter data based on search term
  const filteredProblems = problems
    ? problems.filter((problem) =>
        problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const filteredArticles = articles
    ? articles.filter((article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.categories?.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const filteredRoadmaps = roadmaps
    ? roadmaps.filter((roadmap) =>
        roadmap.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access the admin dashboard
            </p>
            <Button asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Total Problems
              </h3>
              <p className="text-2xl font-bold">{problems?.length || 0}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {problems?.filter(p => p.createdAt && new Date(p.createdAt).getTime() > Date.now() - 7 * 86400000).length || 0} this week
              </p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                Total Articles
              </h3>
              <p className="text-2xl font-bold">{articles?.length || 0}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {articles?.filter(a => a.createdAt && new Date(a.createdAt).getTime() > Date.now() - 7 * 86400000).length || 0} this week
              </p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                Total Users
              </h3>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                0 this week
              </p>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                Total Roadmaps
              </h3>
              <p className="text-2xl font-bold">{roadmaps?.length || 0}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                {roadmaps?.filter(r => (r as any).createdAt && new Date((r as any).createdAt).getTime() > Date.now() - 7 * 86400000).length || 0} this week
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add Problem
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>{selectedItem && selectedItemType === 'problem' ? "Edit Problem" : "Add New Problem"}</DialogTitle>
                    <DialogDescription>
                      {selectedItem && selectedItemType === 'problem'
                        ? "Update the problem details below"
                        : "Fill in the details for the new problem"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitProblem)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Problem Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Two Sum" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty</FormLabel>
                              <FormControl>
                                <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                >
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. arrays, dynamic-programming" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Separate multiple tags with commas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="externalUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>External URL</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. https://leetcode.com/problems/..."
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createProblemMutation.isPending || updateProblemMutation.isPending}
                        >
                          {(createProblemMutation.isPending || updateProblemMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {selectedItem && selectedItemType === 'problem' ? "Save Changes" : "Add Problem"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="h-4 w-4 mr-2" /> Add Article
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>{selectedItem && selectedItemType === 'article' ? "Edit Article" : "Add New Article"}</DialogTitle>
                    <DialogDescription>
                      {selectedItem && selectedItemType === 'article' 
                        ? "Update the article details below" 
                        : "Fill in the details for the new article"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...articleForm}>
                    <form onSubmit={articleForm.handleSubmit(onSubmitArticle)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <FormField
                        control={articleForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Article Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. How to Approach Dynamic Programming" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={articleForm.control}
                        name="summary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Summary</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="A brief summary of the article"
                                className="min-h-[60px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={articleForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Full article content"
                                className="min-h-[150px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={articleForm.control}
                          name="author"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Author</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. John Smith" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={articleForm.control}
                          name="readTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Read Time (minutes)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  placeholder="e.g. 10" 
                                  {...field} 
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={articleForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. https://images.unsplash.com/..." 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={articleForm.control}
                        name="categories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categories</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. dynamic-programming, algorithms" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Separate multiple categories with commas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createArticleMutation.isPending || updateArticleMutation.isPending}
                        >
                          {(createArticleMutation.isPending || updateArticleMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {selectedItem && selectedItemType === 'article' ? "Save Changes" : "Add Article"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isRoadmapDialogOpen} onOpenChange={setIsRoadmapDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" /> Add Roadmap
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedItem && selectedItemType === 'roadmap' ? "Edit Roadmap" : "Add New Roadmap"}</DialogTitle>
                    <DialogDescription>
                      {selectedItem && selectedItemType === 'roadmap'
                        ? "Update the roadmap details below"
                        : "Fill in the details for the new roadmap"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...roadmapForm}>
                    <form onSubmit={roadmapForm.handleSubmit(onSubmitRoadmap)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <FormField
                        control={roadmapForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Roadmap Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Frontend Developer Interview Prep" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={roadmapForm.control}
                        name="problemIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Problem IDs (comma-separated)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 1, 4, 7, 12"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Ordered list of problem IDs for this roadmap
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createRoadmapMutation.isPending || updateRoadmapMutation.isPending}
                        >
                          {(createRoadmapMutation.isPending || updateRoadmapMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {selectedItem && selectedItemType === 'roadmap' ? "Save Changes" : "Add Roadmap"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Button>
            </div>
          </div>
          
          {/* Admin Tabs */}
          <div>
            <Tabs defaultValue="problems" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="problems">
                  <FileCode className="h-4 w-4 mr-2" /> Problems
                </TabsTrigger>
                <TabsTrigger value="articles">
                  <Book className="h-4 w-4 mr-2" /> Articles
                </TabsTrigger>
                <TabsTrigger value="roadmaps">
                  <Route className="h-4 w-4 mr-2" /> Roadmaps
                </TabsTrigger>
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" /> Users
                </TabsTrigger>
              </TabsList>
              
              {/* Problems Content */}
              <TabsContent value="problems" className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Manage Problems</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search problems..."
                      className="pl-10 w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {problemsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">ID</th>
                          <th className="px-4 py-3 text-left font-medium">Problem Name</th>
                          <th className="px-4 py-3 text-left font-medium">Difficulty</th>
                          <th className="px-4 py-3 text-left font-medium">Tags</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProblems.map((problem) => (
                          <tr key={problem.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3 whitespace-nowrap">{problem.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">{problem.title}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge className={
                                problem.difficulty === "easy" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : 
                                problem.difficulty === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" : 
                                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }>
                                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {problem.tags?.slice(0, 2).map((tag, i) => (
                                <span key={i}>
                                  {i > 0 && ", "}
                                  {tag.split("-")
                                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(" ")}
                                </span>
                              ))}
                              {problem.tags && problem.tags.length > 2 && ", ..."}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditProblem(problem)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteAction(problem.id, 'problem')}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing 1 to {filteredProblems.length} of {filteredProblems.length} entries
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* Articles Content */}
              <TabsContent value="articles" className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Manage Articles</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      className="pl-10 w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {articlesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">ID</th>
                          <th className="px-4 py-3 text-left font-medium">Title</th>
                          <th className="px-4 py-3 text-left font-medium">Author</th>
                          <th className="px-4 py-3 text-left font-medium">Category</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredArticles.map((article) => (
                          <tr key={article.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3 whitespace-nowrap">{article.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">{article.title}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{article.author}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {article.categories?.slice(0, 2).map((cat, i) => (
                                <span key={i}>
                                  {i > 0 && ", "}
                                  {cat.split("-")
                                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(" ")}
                                </span>
                              ))}
                              {article.categories && article.categories.length > 2 && ", ..."}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(article.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditArticle(article)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteAction(article.id, 'article')}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing 1 to {filteredArticles.length} of {filteredArticles.length} entries
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* Roadmaps Content */}
              <TabsContent value="roadmaps" className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Manage Roadmaps</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search roadmaps..."
                      className="pl-10 w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {roadmapsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">ID</th>
                          <th className="px-4 py-3 text-left font-medium">Title</th>
                          <th className="px-4 py-3 text-left font-medium">Problems</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRoadmaps.map((roadmap) => (
                          <tr key={roadmap.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3 whitespace-nowrap">{roadmap.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">{roadmap.title}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {roadmap.problem_ids_ordered?.length || 0} problems
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {(roadmap as any).createdAt ? new Date((roadmap as any).createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditRoadmap(roadmap)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteAction(roadmap.id, 'roadmap')}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing 1 to {filteredRoadmaps.length} of {filteredRoadmaps.length} entries
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* Users Content */}
              <TabsContent value="users" className="pt-6">
                <div className="flex justify-center items-center py-20 text-center">
                  <div>
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">User Management</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      User management features will be available in a future update.
                    </p>
                    <Button disabled>Coming Soon</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              {deleteItemType === 'problem' ? ' problem' : 
               deleteItemType === 'article' ? ' article' : 
               deleteItemType === 'roadmap' ? ' roadmap' : ''}
              {deleteItemId ? ` with ID ${deleteItemId}` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteProblemMutation.isPending || deleteArticleMutation.isPending || deleteRoadmapMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPage;
