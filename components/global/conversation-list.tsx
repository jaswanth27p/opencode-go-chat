"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MoreHorizontal, MessageSquareOff, Loader2 } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
} from "@/hooks/use-conversations";
import { toast } from "sonner";
import type { ConversationThread } from "@/types/conversation";

function ConversationRow({ thread }: { thread: ConversationThread }) {
  const params = useParams<{ threadId?: string }>();
  const router = useRouter();
  const rename = useRenameConversation();
  const remove = useDeleteConversation();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(thread.title ?? "");

  const isActive = params?.threadId === thread.id;
  const label = thread.title?.trim() || "New chat";

  if (editing) {
    return (
      <SidebarMenuItem>
        <form
          className="flex w-full items-center gap-1 px-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const next = title.trim();
            if (!next) {
              setEditing(false);
              return;
            }
            try {
              await rename.mutateAsync({ threadId: thread.id, title: next });
            } catch {
              toast.error("Couldn't rename conversation. Try again.");
            }
            setEditing(false);
          }}
        >
          <Input
            autoFocus
            className="h-7 text-sm"
            onBlur={() => setEditing(false)}
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </form>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link href={`/chat/${thread.id}`} />}
        tooltip={label}
      >
        <span className="truncate">{label}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="absolute top-1 right-1 size-6"
              size="icon"
              variant="ghost"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={async () => {
              setTitle(thread.title ?? "");
              setEditing(true);
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={async () => {
              try {
                await remove.mutateAsync({ threadId: thread.id });
                if (isActive) {
                  router.push("/chat");
                }
              } catch {
                toast.error("Couldn't delete conversation. Try again.");
              }
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function ConversationList() {
  const query = useConversations();
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "64px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const threads = query.data?.pages.flatMap((page) => page.threads) ?? [];

  return (
    <SidebarGroup className="min-h-0 flex-1">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupContent className="min-h-24 flex-1 overflow-y-auto">
        {query.isError ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground text-xs">
            <span>Couldn't load conversations.</span>
            <Button onClick={() => query.refetch()} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        ) : threads.length === 0 && !query.isLoading ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground text-xs">
            <MessageSquareOff className="size-4" />
            <span>No conversations yet</span>
          </div>
        ) : (
          <SidebarMenu>
            {threads.map((thread) => (
              <ConversationRow key={thread.id} thread={thread} />
            ))}
          </SidebarMenu>
        )}
        <div ref={sentinelRef} />
        {query.isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
