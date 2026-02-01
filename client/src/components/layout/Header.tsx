import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { problemsAPI } from "@/services/api";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import MobileMenu from "@/components/layout/MobileMenu";
import { Button } from "@/components/ui/button";
import { Code, Flame } from "lucide-react";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: dailyProblem } = useQuery({
    queryKey: ["daily-problem"],
    queryFn: () => problemsAPI.getDailyProblem(),
  });

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Problems", path: "/problems" },
    { name: "Explore", path: "/explore" },
    { name: "Roadmap", path: "/roadmap" },
  ];

  const isActiveLink = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-primary/10 via-background to-accent/10 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">CodePractice</span>
            </Link>
          </div>

          {/* Main Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`font-medium py-2 transition-colors ${
                  isActiveLink(link.path)
                    ? "text-primary"
                    : "text-foreground/70 hover:text-primary"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* User Controls */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            <Link href={dailyProblem ? `/problems/${dailyProblem.id}` : "/problems"}>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="hidden sm:inline">Daily</span>
              </Button>
            </Link>

            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link href="/auth">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-muted"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          links={navLinks}
          activeLink={location}
        />
      </div>
    </header>
  );
};

export default Header;
