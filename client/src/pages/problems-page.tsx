import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Problem } from "@shared/schema";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Tag, Code, ExternalLink } from "lucide-react";
import { problemsAPI } from "@/services/api";

const ProblemsPage = () => {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(
    location.includes("?") ? location.slice(location.indexOf("?")) : ""
  );
  
  const initialCategory = searchParams.get("category") || "";
  const initialDifficulty = searchParams.get("difficulty") || "";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [difficultyFilter, setDifficultyFilter] = useState(initialDifficulty);

  // Fetch problems using the API service
  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ["problems", categoryFilter, difficultyFilter],
    queryFn: () => problemsAPI.getAllProblems(),
  });

  // Get unique categories
  const categories = problems
    ? Array.from(new Set(problems.flatMap((p) => p.tags || [])))
    : [];

  // Filter problems based on search term
  const filteredProblems = problems
    ? problems.filter((problem) =>
        problem.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Handle filter changes
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    const params = new URLSearchParams();
    if (value) params.append("category", value);
    if (difficultyFilter) params.append("difficulty", difficultyFilter);
    const queryString = params.toString();
    setLocation(`/problems${queryString ? `?${queryString}` : ""}`);
  };

  const handleDifficultyChange = (value: string) => {
    setDifficultyFilter(value);
    const params = new URLSearchParams();
    if (categoryFilter) params.append("category", categoryFilter);
    if (value) params.append("difficulty", value);
    const queryString = params.toString();
    setLocation(`/problems${queryString ? `?${queryString}` : ""}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  function getDifficultyColor(difficulty: string) {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Coding Problems</h1>
        <p className="text-muted-foreground">
          Sharpen your skills with algorithm challenges from easy to hard
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-categories">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={handleDifficultyChange}>
          <SelectTrigger>
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

      {/* Problems List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No problems found matching your criteria.</p>
          <Button variant="link" onClick={() => {
            setSearchTerm("");
            setCategoryFilter("");
            setDifficultyFilter("");
            setLocation("/problems");
          }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProblems.map((problem) => (
            <Link key={problem.id} href={`/problems/${problem.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                      </span>
                      
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a 
                        href={problem.external_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  <h3 className="font-bold mb-2">{problem.title}</h3>

                  <div className="flex items-center text-xs text-muted-foreground mb-3 flex-1">
                    <span className="flex items-center mr-3">
                      <Tag className="h-3 w-3 mr-1" />
                      {problem.tags?.map((category, index) => (
                        <span key={category}>
                          {category
                            .split("-")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                          {index < (problem.tags?.length || 0) - 1 ? ", " : ""}
                        </span>
                      ))}
                    </span>
                    <span className="flex items-center">
                      <Code className="h-3 w-3 mr-1" />
                      Problem #{problem.id}
                    </span>
                  </div>

                  <div className="mt-auto">
                    <Button variant="link" className="px-0">
                      Solve Problem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemsPage;
