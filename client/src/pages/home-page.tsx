import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, CheckCircle2, Code2, Sparkles, Trophy, Users, Zap } from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();
  const recruiterHref = user ? "/interviews" : "/auth";

  return (
    <div className="space-y-20 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.18),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))] px-6 py-14 shadow-2xl lg:px-12">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--foreground)/0.28)_1px,transparent_0)] [background-size:26px_26px]" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Architecting The Future
            </div>

            <div className="space-y-5">
              <h1 className="font-headline text-5xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-7xl">
                Engineering
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Excellence</span>
                <br />
                Through Code.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
                The elite darkroom for developers to sharpen their craft and for recruiters to source technical mastery.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/problems">
                <Button className="h-13 rounded-md px-8 text-base font-bold shadow-[0_10px_30px_hsl(var(--primary)/0.25)]">
                  Start Coding
                </Button>
              </Link>
              <Link href={recruiterHref}>
                <Button variant="outline" className="h-13 rounded-md px-8 text-base font-bold">
                  For Recruiters
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/15 to-emerald-400/10 blur-2xl" />
            <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/85 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-border/50 bg-background/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-400/50" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/50" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/50" />
                  </div>
                  <span className="ml-4 font-mono text-[11px] text-muted-foreground">Code.py</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  <Zap className="h-3.5 w-3.5" />
                  Run Code
                </div>
              </div>

              <CardContent className="space-y-1 bg-background/80 px-6 py-6 font-mono text-sm leading-7 text-foreground">
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">01</span><span><span className="text-blue-400">def</span> <span className="text-emerald-400">find_optimal_path</span>(graph, start):</span></div>
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">02</span><span className="pl-4 text-muted-foreground">&quot;&quot;&quot;Implementation of Kinetic Search&quot;&quot;&quot;</span></div>
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">03</span><span className="pl-4">queue = [(0, start, [])]</span></div>
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">04</span><span className="pl-4">visited = set()</span></div>
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">05</span><span className="pl-4">&nbsp;</span></div>
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">06</span><span className="pl-4"><span className="text-blue-400">while</span> queue:</span></div>
                <div className="flex gap-4"><span className="select-none text-muted-foreground/50">07</span><span className="pl-8">(cost, node, path) = heappop(queue)</span></div>
                <div className="mt-4 h-6 w-0.5 animate-pulse bg-primary" />
              </CardContent>

              <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <div className="flex gap-4">
                  <span>Ln 7, Col 42</span>
                  <span>UTF-8</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  0 Errors
                </div>
              </div>
            </Card>

            <div className="absolute -bottom-6 -left-4 rounded-xl border border-border/60 bg-card/90 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Global Rank</div>
                  <div className="font-headline text-2xl font-black text-foreground">#1,248</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-3">
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-foreground">Precision Tools for Modern Architects</h2>
          <div className="h-1 w-14 bg-primary" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <Card className="group relative overflow-hidden border-border/60 bg-card md:col-span-8">
            <div className="absolute inset-0 opacity-20 transition-transform duration-700 group-hover:scale-105 [background-image:linear-gradient(120deg,hsl(var(--primary)/0.16),transparent),radial-gradient(circle_at_top_left,hsl(var(--secondary)/0.12),transparent_35%)]" />
            <CardContent className="relative flex min-h-[320px] flex-col justify-end p-10">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TerminalSquare className="h-7 w-7" />
              </div>
              <h3 className="font-headline text-3xl font-bold text-foreground">Immersive Editor</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                Our darkroom environment minimizes distractions. Features real-time syntax linting, VIM keybindings, and low-latency execution.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card md:col-span-4">
            <CardContent className="flex h-full flex-col justify-between p-8">
              <div>
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <h3 className="font-headline text-2xl font-bold text-foreground">Global Contests</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Compete against the world&apos;s best in weekly high-stakes architectural challenges. Rise through the ranks of the Elite Architects.
                </p>
              </div>
              <div className="mt-8 flex -space-x-3">
                {["A", "B", "C"].map((entry, index) => (
                  <div key={entry} className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-card text-xs font-bold ${index === 0 ? "bg-amber-200 text-slate-900" : index === 1 ? "bg-sky-200 text-slate-900" : "bg-emerald-200 text-slate-900"}`}>
                    {entry}
                  </div>
                ))}
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">+2.4k</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-primary border-border/60 bg-card md:col-span-5">
            <CardContent className="flex h-full flex-col justify-center p-8">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-2xl font-bold text-foreground">Smart Interviewing</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                AI-assisted proctoring and behavioral analysis for recruiters. Move beyond standard challenge flows into higher-fidelity technical review.
              </p>
              <Link href="/interviews" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                Learn more
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-black text-white md:col-span-7">
            <CardContent className="grid h-full grid-cols-3 items-center gap-8 p-8">
              <div className="text-center">
                <div className="font-headline text-4xl font-black">15M+</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/35">Solutions</div>
              </div>
              <div className="border-x border-white/10 text-center">
                <div className="font-headline text-4xl font-black text-emerald-300">99.9%</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/35">Uptime</div>
              </div>
              <div className="text-center">
                <div className="font-headline text-4xl font-black text-blue-300">500+</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/35">Partners</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b border-border/60 p-12 lg:border-b-0 lg:border-r lg:p-20">
              <div className="mb-12 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Code2 className="h-8 w-8" />
              </div>
              <h3 className="font-headline text-4xl font-bold text-foreground">For Developers</h3>
              <div className="mt-8 space-y-4 text-muted-foreground">
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Structured learning paths</div>
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Real-time peer collaboration</div>
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Direct pipeline to Top Tier tech</div>
              </div>
              <Link href="/auth">
                <Button variant="outline" className="mt-10 h-14 w-full text-base font-bold">
                  Create Account
                </Button>
              </Link>
            </div>

            <div className="p-12 lg:p-20">
              <div className="mb-12 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="font-headline text-4xl font-bold text-foreground">For Recruiters</h3>
              <div className="mt-8 space-y-4 text-muted-foreground">
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" />Verified technical rankings</div>
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" />High-fidelity interview sandbox</div>
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" />Advanced talent analytics</div>
              </div>
              <Link href={recruiterHref}>
                <Button className="mt-10 h-14 w-full text-base font-bold">
                  {user ? "Open Recruiter Workspace" : "Create Recruiter Account"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const TerminalSquare = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="m7 9 3 3-3 3" />
    <path d="M13 15h4" />
  </svg>
);

export default HomePage;
