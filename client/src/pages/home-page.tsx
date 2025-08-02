import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Problem, Article } from "@shared/schema";
import { ExternalLink, ChevronRight, Code, BookOpen, Route } from "lucide-react";

const HomePage = () => {
  // Fetch problem categories
  const { data: problems } = useQuery<Problem[]>({
    queryKey: ["/problems"],
  });

  // Fetch latest articles
  const { data: articles } = useQuery<Article[]>({
    queryKey: ["/articles"],
  });

  // Extract categories from problems data
  const categories = problems
    ? [...new Set(problems.flatMap(problem => problem.categories || []))]
          .slice(0, 4)
          .map(category => {
            const categoryProblems = problems.filter(p => p.categories?.includes(category));
            return {
              name: formatCategoryName(category),
              slug: category,
              count: categoryProblems.length,
              description: getCategoryDescription(category)
            };
          })
    : [];

  // Get latest 3 articles
  const latestArticles = articles ? articles.slice(0, 3) : [];

  function formatCategoryName(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'arrays': 'Two pointers, sliding window, and more',
      'linked-list': 'Reversing, detecting cycles, and manipulation',
      'trees': 'BFS, DFS, and tree manipulations',
      'graphs': 'Graph traversal, shortest path algorithms',
      'dynamic-programming': 'Memoization, tabulation, and subproblems',
      'string': 'String manipulation, pattern matching',
      'binary-search': 'Logarithmic search techniques',
      'hash-table': 'Efficient lookups and collision handling',
      'sorting': 'Comparison-based and linear sorting algorithms',
      'greedy': 'Making locally optimal choices',
      'backtracking': 'Building solutions incrementally',
      'sliding-window': 'Fixed and variable size window techniques',
      'recursion': 'Breaking problems into smaller subproblems',
      'math': 'Mathematical concepts and number theory'
    };
    
    return descriptions[category] || 'Algorithmic problem solving techniques';
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Master Coding Interviews</h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Structured algorithm practice, curated roadmaps, and interview preparation all in one place.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link href="/problems">
            <Button size="lg" className="px-6">
              Start Practicing
            </Button>
          </Link>
          <Link href="/roadmap">
            <Button size="lg" variant="outline" className="px-6">
              View Roadmaps
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-primary mb-2">300+</p>
            <p className="text-muted-foreground">Coding Problems</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-emerald-500 mb-2">25+</p>
            <p className="text-muted-foreground">Study Guides</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-purple-500 mb-2">10+</p>
            <p className="text-muted-foreground">Interview Roadmaps</p>
          </CardContent>
        </Card>
      </section>

      {/* Categories Section */}
      <section className="py-6">
        <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link key={category.slug} href={`/problems?category=${category.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <span className="text-primary">
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground">
                      <Code className="h-4 w-4 inline mr-1" /> {category.count} problems
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Articles Section */}
      <section className="py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Latest Articles</h2>
          <Link href="/explore" className="text-primary hover:underline flex items-center">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestArticles.map((article) => (
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {article.createdAt ? formatDate(article.createdAt) : ""}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {article.readTime} min read
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2">{article.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 flex-1">
                  {article.summary}
                </p>
                <Link
                  href={`/explore/${article.id}`}
                  className="text-primary hover:underline mt-auto inline-flex items-center"
                >
                  Read Article <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
