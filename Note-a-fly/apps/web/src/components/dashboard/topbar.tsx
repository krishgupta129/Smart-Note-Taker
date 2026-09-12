import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

type DashboardTopbarProps = {
  fullName: string;
};

export function DashboardTopbar({ fullName }: DashboardTopbarProps) {
  const firstName = fullName?.split(" ")[0] || "User";

  const initials =
    fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <h2 className="text-xl font-semibold">Hey {firstName} 👋</h2>
        <p className="text-sm text-muted-foreground">
          Ready to create smart notes?
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/dashboard/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </Link>

        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}