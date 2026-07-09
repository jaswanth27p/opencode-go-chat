import { Command } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppSidebar } from "@/components/global/app-sidebar";
import { CommandMenu } from "@/components/global/command-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <div className="hidden items-center gap-2 md:flex">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" />
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Command className="size-3.5" />
            </div>
            <span className="text-sm font-medium">OpenCode Go</span>
          </div>
          <SidebarTrigger className="ml-auto md:hidden" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
