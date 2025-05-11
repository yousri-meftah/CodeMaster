import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserSolution } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, PenSquare, Settings, Code, Calendar } from "lucide-react";
import { Link } from "wouter";

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("solved");
  const [difficultyFilter, setDifficultyFilter] = useState("all-difficulties");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch user's progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/progress"],
    enabled: !!user,
  });

  // Fetch user's solutions
  const { data: solutions, isLoading: solutionsLoading } = useQuery<UserSolution[]>({
    queryKey: ["/api/user/solutions"],
    enabled: !!user,
  });

  // Filter solutions based on tab and search
  const filteredSolutions = solutions
    ? solutions.filter((solution) => {
        const matchesTab = 
          (activeTab === "solved" && solution.solved) ||
          (activeTab === "saved" && !solution.solved) ||
          (activeTab === "favorite" && solution.favorite);
        
        const matchesSearch = 
          !searchTerm || 
          solution.problemId.toString().includes(searchTerm) ||
          solution.language.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDifficulty = difficultyFilter === "all-difficulties" || 
          (solution as any).difficulty === difficultyFilter;
          
        return matchesTab && matchesSearch && matchesDifficulty;
      })
    : [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to view your profile
            </p>
            <Button asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
              {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">{user.name || user.username}</h1>
              <p className="text-muted-foreground mb-3">{user.bio || "Software Engineer"}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                <Badge variant="secondary">JavaScript</Badge>
                <Badge variant="secondary">Python</Badge>
                <Badge variant="secondary">React</Badge>
                <Badge variant="secondary">Algorithms</Badge>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center md:justify-start space-y-2 sm:space-y-0 sm:space-x-4">
                <Button>
                  <PenSquare className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </Button>
              </div>
            </div>
            
            <div className="hidden md:flex flex-col items-end space-y-2">
              <div className="flex space-x-4 text-center">
                <div>
                  <p className="text-xl font-bold">{progress?.problemsSolved || 0}</p>
                  <p className="text-sm text-muted-foreground">Problems Solved</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{progress?.articlesRead || 0}</p>
                  <p className="text-sm text-muted-foreground">Articles Read</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{progress?.streak || 0}</p>
                  <p className="text-sm text-muted-foreground">Days Streak</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 inline mr-2" /> 
                Member since {user.createdAt ? formatDate(user.createdAt) : "January 2023"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Profile Stats for Mobile */}
      <div className="md:hidden">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold">{progress?.problemsSolved || 0}</p>
                <p className="text-sm text-muted-foreground">Problems Solved</p>
              </div>
              <div>
                <p className="text-xl font-bold">{progress?.articlesRead || 0}</p>
                <p className="text-sm text-muted-foreground">Articles Read</p>
              </div>
              <div>
                <p className="text-xl font-bold">{progress?.streak || 0}</p>
                <p className="text-sm text-muted-foreground">Days Streak</p>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground text-center mt-4">
              <Calendar className="h-4 w-4 inline mr-2" />
              Member since {user.createdAt ? formatDate(user.createdAt) : "January 2023"}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Profile Content Tabs */}
      <Card>
        <Tabs defaultValue="solved" value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border">
            <div className="px-6">
              <TabsList className="h-14 bg-transparent border-b-0">
                <TabsTrigger value="solved" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none">
                  Solved Problems
                </TabsTrigger>
                <TabsTrigger value="saved" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none">
                  Saved Solutions
                </TabsTrigger>
                <TabsTrigger value="favorite" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none">
                  Favorite Problems
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          {/* Problem Lists for Each Tab */}
          <TabsContent value="solved" className="m-0">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0 mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold">
                    Solved Problems ({
                      solutions?.filter(s => s.solved).length || 0
                    })
                  </h2>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-difficulties">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search problems..."
                    className="pl-10 w-full md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {solutionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSolutions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {activeTab === "solved"
                      ? "You haven't solved any problems yet."
                      : activeTab === "saved"
                      ? "You haven't saved any solutions yet."
                      : "You don't have any favorite problems yet."}
                  </p>
                  <Button asChild>
                    <Link href="/problems">Browse Problems</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSolutions.map((solution) => (
                    <div key={solution.id} className="bg-background dark:bg-background rounded-lg border hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant={
                              (solution as any).difficulty === "easy" ? "success" : 
                              (solution as any).difficulty === "medium" ? "warning" : 
                              (solution as any).difficulty === "hard" ? "destructive" : 
                              "outline"
                            }>
                              {(solution as any).difficulty || "Unknown"}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-2">
                              {solution.updatedAt ? formatDate(solution.updatedAt) : ""}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {solution.favorite ? (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4 fill-yellow-500"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            ) : (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            )}
                          </Button>
                        </div>
                        
                        <h3 className="font-bold mb-2">
                          Problem #{solution.problemId}
                        </h3>
                        
                        <div className="flex justify-between items-center mt-4">
                          <Badge variant="outline" className="bg-muted">
                            {solution.language}
                          </Badge>
                          
                          <Link href={`/problems/${solution.problemId}`} className="text-primary text-sm hover:underline">
                            View Solution <ExternalLink className="h-3 w-3 inline ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="m-0">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0 mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold">
                    Saved Solutions ({
                      solutions?.filter(s => !s.solved).length || 0
                    })
                  </h2>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-difficulties">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search problems..."
                    className="pl-10 w-full md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Content similar to solved tab */}
              {solutionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSolutions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    You haven't saved any solutions yet.
                  </p>
                  <Button asChild>
                    <Link href="/problems">Browse Problems</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Same solution card component as above */}
                  {filteredSolutions.map((solution) => (
                    <div key={solution.id} className="bg-background dark:bg-background rounded-lg border hover:shadow-md transition-shadow">
                      {/* Same card internals */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant={
                              (solution as any).difficulty === "easy" ? "success" : 
                              (solution as any).difficulty === "medium" ? "warning" : 
                              (solution as any).difficulty === "hard" ? "destructive" : 
                              "outline"
                            }>
                              {(solution as any).difficulty || "Unknown"}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-2">
                              {solution.updatedAt ? formatDate(solution.updatedAt) : ""}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {solution.favorite ? (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4 fill-yellow-500"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            ) : (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            )}
                          </Button>
                        </div>
                        
                        <h3 className="font-bold mb-2">
                          Problem #{solution.problemId}
                        </h3>
                        
                        <div className="flex justify-between items-center mt-4">
                          <Badge variant="outline" className="bg-muted">
                            {solution.language}
                          </Badge>
                          
                          <Link href={`/problems/${solution.problemId}`} className="text-primary text-sm hover:underline">
                            View Solution <ExternalLink className="h-3 w-3 inline ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="favorite" className="m-0">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0 mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold">
                    Favorite Problems ({
                      solutions?.filter(s => s.favorite).length || 0
                    })
                  </h2>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-difficulties">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search problems..."
                    className="pl-10 w-full md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Similar content structure as above */}
              {solutionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSolutions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    You don't have any favorite problems yet.
                  </p>
                  <Button asChild>
                    <Link href="/problems">Browse Problems</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Same card structure */}
                  {filteredSolutions.map((solution) => (
                    <div key={solution.id} className="bg-background dark:bg-background rounded-lg border hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant={
                              (solution as any).difficulty === "easy" ? "success" : 
                              (solution as any).difficulty === "medium" ? "warning" : 
                              (solution as any).difficulty === "hard" ? "destructive" : 
                              "outline"
                            }>
                              {(solution as any).difficulty || "Unknown"}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-2">
                              {solution.updatedAt ? formatDate(solution.updatedAt) : ""}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-4 w-4 fill-yellow-500"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          </Button>
                        </div>
                        
                        <h3 className="font-bold mb-2">
                          Problem #{solution.problemId}
                        </h3>
                        
                        <div className="flex justify-between items-center mt-4">
                          <Badge variant="outline" className="bg-muted">
                            {solution.language}
                          </Badge>
                          
                          <Link href={`/problems/${solution.problemId}`} className="text-primary text-sm hover:underline">
                            View Solution <ExternalLink className="h-3 w-3 inline ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProfilePage;