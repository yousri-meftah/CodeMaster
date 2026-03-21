import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquareText } from "lucide-react";

const InterviewThankYouPage = () => {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-10">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl">Interview Submitted</CardTitle>
          <CardDescription className="mx-auto max-w-xl text-base">
            Thank you. Your interview has been submitted successfully and your responses have been recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            You can close this page safely. If the recruiting team wants additional feedback from you, they can contact you separately.
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Feedback</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We appreciate your time. A feedback form can be added here later without changing the submission flow.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Link href="/">
              <Button>Back To Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewThankYouPage;
