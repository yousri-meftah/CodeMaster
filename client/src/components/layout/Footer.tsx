import { Link } from "wouter";
import { Code, Github, Linkedin, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background shadow-inner py-8 border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Code className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">CodePractice</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Your platform for mastering coding interviews and improving
              algorithm skills.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/problems" className="text-muted-foreground hover:text-primary">
                  Problems
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-muted-foreground hover:text-primary">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="text-muted-foreground hover:text-primary">
                  Roadmaps
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-muted-foreground hover:text-primary">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4 text-muted-foreground">
              <a
                href="https://www.facebook.com/profile.php?id=61578404676707"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/yousri-meftah"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/yousrimeftah/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CodePractice. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
