import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Send, TerminalSquare } from "lucide-react";

const ratingOptions = [
  { value: 1, label: "Very bad", face: "×_×" },
  { value: 2, label: "Bad", face: ":(" },
  { value: 3, label: "Okay", face: ":|" },
  { value: 4, label: "Good", face: ":)" },
  { value: 5, label: "Excellent", face: "^_^" },
];

const InterviewThankYouPage = () => {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const handleSubmitFeedback = () => {
    toast({
      title: "Feedback captured",
      description: "This form is ready for backend wiring when you want to persist candidate feedback.",
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_24%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))] px-4 py-12">
      <div className="mx-auto mb-4 flex w-full max-w-6xl justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-12">
        <section className="space-y-8 lg:col-span-7">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-emerald-500 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.25em]">Session Finalized</span>
            </div>
            <h1 className="font-headline text-5xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-6xl">
              Interview
              <br />
              Complete
            </h1>
            <p className="max-w-2xl text-xl leading-relaxed text-muted-foreground">
              Thank you for your time and contribution to the CodeMaster ecosystem. Your technical insights have been recorded.
            </p>
          </div>

          <Card className="overflow-hidden border-border/60 bg-card/90 shadow-xl">
            <CardContent className="relative flex gap-4 p-6">
              <div className="absolute inset-y-0 left-0 w-1 bg-emerald-400" />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TerminalSquare className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold text-foreground">Next Steps</h2>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                  Our engineering leads will review your session within 48 hours. You&apos;ll receive a detailed performance breakdown via your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-5 pt-2">
            <div className="flex -space-x-3">
              {["A", "B", "C"].map((entry, index) => (
                <div
                  key={entry}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-background text-sm font-extrabold shadow-lg ${
                    index === 0 ? "bg-amber-200 text-slate-900" : index === 1 ? "bg-sky-200 text-slate-900" : "bg-emerald-200 text-slate-900"
                  }`}
                >
                  {entry}
                </div>
              ))}
            </div>
            <p className="text-base text-muted-foreground">Reviewed by the Platform Integrity Team</p>
          </div>

          <div className="flex justify-start">
            <Link href="/">
              <Button variant="outline">Back To Home</Button>
            </Link>
          </div>
        </section>

        <section className="lg:col-span-5">
          <Card className="border-border/60 bg-card/95 shadow-2xl">
            <CardContent className="space-y-8 p-8">
              <div className="space-y-2">
                <h2 className="font-headline text-4xl font-bold tracking-tight text-foreground">Candidate Experience</h2>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Session Rating</p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {ratingOptions.map((option) => {
                  const selected = option.value === rating;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRating(option.value)}
                      className={`aspect-square rounded-xl border text-lg font-bold transition-all ${
                        selected
                          ? "border-emerald-400 bg-emerald-400/10 text-emerald-500 shadow-[0_0_20px_hsl(160_84%_39%/0.18)] dark:text-emerald-300"
                          : "border-border bg-background text-muted-foreground hover:border-emerald-400/50 hover:text-emerald-500 dark:hover:text-emerald-300"
                      }`}
                      aria-label={option.label}
                    >
                      {option.face}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <label htmlFor="feedback" className="block text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  How Can We Improve?
                </label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={5}
                  placeholder="Share your thoughts on the IDE, problem difficulty, or interviewer communication..."
                  className="resize-none rounded-xl"
                />
              </div>

              <div className="space-y-4">
                <Button onClick={handleSubmitFeedback} className="h-14 w-full text-base font-bold">
                  Submit Feedback
                  <Send className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Your feedback is anonymous and helps us refine the CodeMaster recruitment engine.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default InterviewThankYouPage;
