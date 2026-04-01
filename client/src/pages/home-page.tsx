import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Code2,
  Eye,
  Gauge,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

const developerFeatures = [
  {
    title: "Curated Challenges",
    description: "Sharpen algorithmic thinking with structured problem sets, difficulty ladders, and focused practice flows.",
    icon: Sparkles,
    tone: "text-primary",
  },
  {
    title: "Real-time Code Execution",
    description: "Write, run, and iterate quickly inside the built-in editor with multi-language support and fast feedback loops.",
    icon: Zap,
    tone: "text-emerald-500",
  },
  {
    title: "Progress Signals",
    description: "Track solved work, difficulty progress, and improvement over time instead of practicing blindly.",
    icon: Gauge,
    tone: "text-amber-500",
  },
];

const recruiterFeatures = [
  {
    title: "Fast Interview Creation",
    description: "Launch interview sessions with reusable templates, candidate tokens, and recruiter-specific workflows.",
    icon: MonitorPlay,
    tone: "text-primary",
  },
  {
    title: "Live Proctoring Signals",
    description: "Camera, microphone, connectivity, and activity checks help recruiters observe with more confidence.",
    icon: Eye,
    tone: "text-emerald-500",
  },
  {
    title: "Structured Review Data",
    description: "Combine submissions, recordings, logs, and candidate summaries into a single review workflow.",
    icon: ShieldCheck,
    tone: "text-amber-500",
  },
];

const interviewHighlights = [
  "Integrated coding workspace built for live technical sessions",
  "Real-time candidate monitoring with device and connectivity checks",
  "Problem banks, recordings, logs, and review pages in one flow",
];

const trustMarks = ["Google", "Meta", "Microsoft", "Amazon", "Netflix", "Stripe", "OpenAI", "NVIDIA"];

const HomePage = () => {
  const { user } = useAuth();
  const recruiterHref = user ? "/interviews" : "/auth";

  return (
    <div className="space-y-20 pb-10">
      <section className="animate-enter-soft relative overflow-hidden rounded-[28px] border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.18),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))] px-6 py-14 shadow-2xl lg:px-12">
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
                <Button className="hover-lift h-13 rounded-md px-8 text-base font-bold shadow-[0_10px_30px_hsl(var(--primary)/0.25)]">
                  Start Coding
                </Button>
              </Link>
              <Link href={recruiterHref}>
                <Button variant="outline" className="hover-lift h-13 rounded-md px-8 text-base font-bold">
                  For Recruiters
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="animate-float-soft absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/15 to-emerald-400/10 blur-2xl" />
            <Card className="hover-lift relative overflow-hidden rounded-2xl border-border/60 bg-card/85 shadow-2xl backdrop-blur">
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

            <div className="animate-float-soft absolute -bottom-6 -left-4 rounded-xl border border-border/60 bg-card/90 p-4 shadow-xl backdrop-blur">
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

      <section className="animate-enter-soft grid gap-8 lg:grid-cols-2">
        <Card className="hover-lift overflow-hidden border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)/0.82))] hover:border-primary/30 hover:shadow-[0_24px_55px_hsl(var(--foreground)/0.08)]">
          <CardContent className="p-8 md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
              Developers
            </div>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-foreground">
              Forge your technical
              <br />
              supremacy.
            </h2>
            <div className="mt-8 space-y-6">
              {developerFeatures.map(({ title, description, icon: Icon, tone }) => (
                <div key={title} className="hover-lift flex gap-4 rounded-2xl border border-border/50 bg-background/45 p-5 hover:border-primary/25 hover:bg-background/70">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/problems" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              Explore problem sets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift overflow-hidden border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--secondary)/0.18))] hover:border-primary/30 hover:shadow-[0_24px_55px_hsl(var(--foreground)/0.08)]">
          <CardContent className="p-8 md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Recruiters
            </div>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-foreground">
              Hire architects,
              <br />
              not just coders.
            </h2>
            <div className="mt-8 space-y-6">
              {recruiterFeatures.map(({ title, description, icon: Icon, tone }) => (
                <div key={title} className="hover-lift flex gap-4 rounded-2xl border border-border/50 bg-background/45 p-5 hover:border-primary/25 hover:bg-background/70">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href={recruiterHref} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              Open recruiter workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="animate-enter-soft overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,hsl(var(--background)/0.94),hsl(var(--card)),hsl(var(--secondary)/0.16))]">
        <div className="grid gap-10 p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
          <div className="hover-lift relative overflow-hidden rounded-[24px] border border-border/60 bg-slate-950 text-white shadow-2xl">
            <img
              src="/interview-showcase.webp"
              alt="CodeMaster interview showcase"
              className="h-full min-h-[420px] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,13,27,0.18),rgba(7,13,27,0.72))]" />
            <div className="absolute left-5 top-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Live Interview Workspace
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 grid gap-4 p-5 md:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">Candidate Session</div>
                    <div className="mt-1 text-lg font-bold">Binary Tree Recovery</div>
                  </div>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                    Running
                  </div>
                </div>
                <div className="mt-4 space-y-3 font-mono text-sm text-white/75">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                    <span>Language</span>
                    <span className="text-emerald-300">Python</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                    <span>Sync latency</span>
                    <span className="text-sky-300">20ms</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                    <span>Verdict stream</span>
                    <span className="text-amber-300">Live</span>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-white/70">
                  <div><span className="text-sky-300">def</span> <span className="text-emerald-300">recover_tree</span>(root):</div>
                  <div className="pl-4 text-white/55">stack = []</div>
                  <div className="pl-4 text-white/55">current = root</div>
                  <div className="pl-4"><span className="text-sky-300">while</span> current or stack:</div>
                  <div className="pl-8 text-white/55">...</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/52 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-emerald-300" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Camera</div>
                      <div className="font-semibold text-white">Ready</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/52 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <TerminalSquare className="h-5 w-5 text-sky-300" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Activity Log</div>
                      <div className="font-semibold text-white">Captured</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/52 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-amber-300" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Review Packet</div>
                      <div className="font-semibold text-white">Prepared</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/52 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-white/80" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Session Type</div>
                      <div className="font-semibold text-white">Recruiter + Candidate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Interview Experience
            </div>
            <h2 className="mt-6 font-headline text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
              Hire with confidence,
              <br />
              code with clarity.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">
              CodeMaster already has the pieces that matter: candidate entry checks, live coding, problem statements, submissions, recordings, and recruiter review pages. This section brings that story forward in a way that feels sharper and more intentional.
            </p>
            <div className="mt-8 space-y-4">
              {interviewHighlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/70 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm leading-7 text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href={recruiterHref}>
                <Button className="px-7 font-bold">Build an interview</Button>
              </Link>
              <Link href="/challenge">
                <Button variant="outline" className="px-7 font-bold">
                  Candidate entry flow
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-enter-soft overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,#f7f0e4,#efe5d6)] px-0 py-16 text-center text-slate-900 shadow-[0_24px_60px_rgba(103,83,46,0.12)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top,rgba(94,162,255,0.10),transparent_28%),linear-gradient(180deg,#081326,#091328)] dark:text-white dark:shadow-[0_24px_60px_rgba(6,14,32,0.35)]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-xs font-mono uppercase tracking-[0.35em] text-slate-500 dark:text-[#9aa7c7]">
            Joined by elite engineers from
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-[#7f8ba8]">
            (Static demo only. Not real company endorsements or customers yet, maybe one day.)
          </div>
        </div>
        <div className="mt-10 overflow-hidden">
          <div className="marquee-track gap-6 px-6">
            {[...trustMarks, ...trustMarks].map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="hover-lift min-w-max rounded-full border border-[#d7cab2] bg-[#fbf5ea] px-6 py-4 text-lg font-black uppercase tracking-[0.24em] text-slate-800 shadow-[0_8px_18px_rgba(58,48,27,0.05)] hover:border-primary/30 hover:bg-[#ffffff] hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55 dark:shadow-none dark:hover:border-[#7aafff]/35 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-4xl px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="hover-lift rounded-2xl border border-[#d7cab2] bg-[#fffaf2] p-6 shadow-[0_12px_26px_rgba(58,48,27,0.06)] hover:border-primary/25 hover:bg-white dark:border-white/10 dark:bg-[#141f38] dark:shadow-[0_18px_36px_rgba(0,0,0,0.16)] dark:hover:border-[#7aafff]/30 dark:hover:bg-[#192540]">
              <div className="font-headline text-4xl font-black text-slate-900 dark:text-white">15M+</div>
              <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-[#9aa7c7]">Solutions envisioned</div>
            </div>
            <div className="hover-lift rounded-2xl border border-[#d7cab2] bg-[#fffaf2] p-6 shadow-[0_12px_26px_rgba(58,48,27,0.06)] hover:border-primary/25 hover:bg-white dark:border-white/10 dark:bg-[#141f38] dark:shadow-[0_18px_36px_rgba(0,0,0,0.16)] dark:hover:border-[#7aafff]/30 dark:hover:bg-[#192540]">
              <div className="font-headline text-4xl font-black text-primary">99.9%</div>
              <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-[#9aa7c7]">Workspace uptime target</div>
            </div>
            <div className="hover-lift rounded-2xl border border-[#d7cab2] bg-[#fffaf2] p-6 shadow-[0_12px_26px_rgba(58,48,27,0.06)] hover:border-primary/25 hover:bg-white dark:border-white/10 dark:bg-[#141f38] dark:shadow-[0_18px_36px_rgba(0,0,0,0.16)] dark:hover:border-[#7aafff]/30 dark:hover:bg-[#192540]">
              <div className="font-headline text-4xl font-black text-emerald-500">500+</div>
              <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-[#9aa7c7]">Hiring teams imagined</div>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-enter-soft relative overflow-hidden rounded-[32px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)/0.95))] px-8 py-16 md:px-12 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.10),transparent_42%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
            <Code2 className="h-3.5 w-3.5" />
            Architectural Darkroom
          </div>
          <h2 className="mt-6 font-headline text-4xl font-black tracking-tight text-foreground md:text-6xl">
            Start your journey into the
            <br />
            next version of CodeMaster.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Keep the strong hero and top navigation, then let the rest of the page speak clearly about practice, interviews, and recruiter workflows. This version is built to feel more deliberate without drifting away from the product.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/auth">
              <Button className="hover-lift h-14 px-8 text-base font-bold shadow-[0_18px_40px_hsl(var(--primary)/0.18)]">
                Get Started Free
              </Button>
            </Link>
            <Link href={recruiterHref}>
              <Button variant="outline" className="hover-lift h-14 px-8 text-base font-bold">
                Schedule Recruiter Flow
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
