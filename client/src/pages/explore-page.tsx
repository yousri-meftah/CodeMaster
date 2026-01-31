import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Article } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Calendar, Clock, ChevronRight } from "lucide-react";
import { articlesAPI } from "@/services/api";

const ExplorePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Fetch articles
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["articles", categoryFilter],
    queryFn: () => articlesAPI.getAllArticles(categoryFilter || undefined),
  });

  const articlesToShow = articles || [];

  // Get unique categories
  const categories = articlesToShow
    ? [...new Set(articlesToShow.flatMap((a) => a.categories || []))]
    : [];

  // Filter articles based on search term
  const filteredArticles = articlesToShow
    ? articlesToShow.filter((article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Explore Articles</h1>
        <p className="text-muted-foreground">
          Deepen your understanding with in-depth articles and tutorials
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No articles yet. Ask an admin to add some.</p>
          <Button variant="link" onClick={() => {
            setSearchTerm("");
            setCategoryFilter("");
          }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="overflow-hidden h-full flex flex-col">
              <div className="aspect-video bg-muted relative">
                {article.imageUrl && (
                  <div
                    className="absolute inset-0 bg-center bg-cover"
                    style={{ backgroundImage: `url(${article.imageUrl})` }}
                  />
                )}
              </div>
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {article.createdAt ? formatDate(article.createdAt) : ""}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {article.readTime} min read
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2">{article.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 flex-1">
                  {article.summary}
                </p>
                <Link
                  href={`/articles/${article.id}`}
                  className="text-primary hover:underline mt-auto inline-flex items-center"
                >
                  Read Article <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
