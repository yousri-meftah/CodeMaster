import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  BookmarkIcon, 
  ThumbsUp,
  Copy,
  Share2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const ArticleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const articleId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch article details
  const { data: article, isLoading } = useQuery<Article>({
    queryKey: [`/api/articles/${articleId}`],
    enabled: !isNaN(articleId),
  });

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Article link copied to clipboard"
    });
  };

  const handleBookmark = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to bookmark this article.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Article bookmarked",
      description: "This article has been added to your bookmarks."
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <a href="/articles">Back to Articles</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Article Header */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          {article.categories?.map((category) => (
            <Badge key={category} variant="outline" className="capitalize">
              {category.replace(/-/g, ' ')}
            </Badge>
          ))}
          <span className="text-muted-foreground text-sm">
            {formatDate(article.createdAt)}
          </span>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
        
        {article.summary && (
          <p className="text-lg text-muted-foreground mb-6">
            {article.summary}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-medium text-primary">
                {article.author ? article.author.substring(0, 2).toUpperCase() : "A"}
              </span>
            </div>
            <div>
              <p className="font-medium">{article.author || "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">Author</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBookmark}
              className="flex items-center"
            >
              <BookmarkIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Bookmark</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center"
            >
              <Copy className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Copy Link</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center"
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Article Content */}
      <div className="prose dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: article.content || "" }} />
      </div>
      
      {/* Article Categories - Showing as tags */}
      {article.categories && article.categories.length > 0 && (
        <div className="pt-4">
          <h3 className="text-lg font-semibold mb-2">Related Topics</h3>
          <div className="flex flex-wrap gap-2">
            {article.categories.map((category: string) => (
              <Badge key={category} variant="secondary">
                {category.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Related Articles */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Introduction to Algorithms</CardTitle>
              <CardDescription>A beginner-friendly overview of algorithms</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Read Article</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Structures Crash Course</CardTitle>
              <CardDescription>Learn the most important data structures for coding interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">Read Article</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Like/Share Section */}
      <div className="flex justify-center pt-8">
        <Button variant="outline" size="lg" className="rounded-full">
          <ThumbsUp className="mr-2 h-5 w-5" />
          Found this helpful
        </Button>
      </div>
    </div>
  );
};

export default ArticleDetailPage;