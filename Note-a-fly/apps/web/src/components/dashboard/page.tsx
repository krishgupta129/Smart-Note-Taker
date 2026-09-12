import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Clock } from "lucide-react";
import Aurora from "@/components/reactbits/Aurora";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Your Sessions</h1>
        <p className="text-red-500">Failed to load sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Sessions</h1>
        <p className="text-muted-foreground">
          View and manage all your note generation sessions.
        </p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">No sessions yet</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Start by recording audio, uploading a file, or pasting text to generate smart notes, flashcards, quizzes, and more.
            </p>
            <Link href="/dashboard/new" className="mt-6">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first session
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
              <Card className="h-full cursor-pointer transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {session.title || "Untitled Session"}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {session.source_type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="inline-flex rounded-full bg-secondary px-2 py-1 text-xs font-medium capitalize">
                    {session.status}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(session.created_at).toLocaleString()}
                  </div>

                  {session.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {session.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-1 text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}