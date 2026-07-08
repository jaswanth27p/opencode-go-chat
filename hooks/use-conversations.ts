"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { ConversationListResponse, ConversationThread } from "@/types/conversation";

const QUERY_KEY = ["conversations"] as const;

async function fetchConversations(page: number): Promise<ConversationListResponse> {
  const res = await fetch(`/api/conversations?page=${page}`);
  if (!res.ok) {
    throw new Error("Failed to load conversations");
  }
  return res.json();
}

export function useConversations() {
  return useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) => fetchConversations(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

type ConversationsCache = InfiniteData<ConversationListResponse>;

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ id: string }> => {
      const res = await fetch("/api/conversations", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to create conversation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const now = new Date().toISOString();
      const placeholder: ConversationThread = {
        id: data.id,
        resourceId: "",
        title: null,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<ConversationsCache>(QUERY_KEY, (old) => {
        if (!old || old.pages.length === 0) {
          return {
            pages: [{ threads: [placeholder], total: 1, page: 0, perPage: 20, hasMore: false }],
            pageParams: [0],
          };
        }
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, threads: [placeholder, ...first.threads], total: first.total + 1 },
            ...rest,
          ],
        };
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, title }: { threadId: string; title: string }) => {
      const res = await fetch(`/api/conversations/${threadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        throw new Error("Failed to rename conversation");
      }
      return res.json() as Promise<ConversationThread>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ConversationsCache>(QUERY_KEY, (old) => {
        if (!old) {
          return old;
        }
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            threads: page.threads.map((t) => (t.id === updated.id ? updated : t)),
          })),
        };
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      const res = await fetch(`/api/conversations/${threadId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete conversation");
      }
      return { threadId };
    },
    onSuccess: ({ threadId }) => {
      queryClient.setQueryData<ConversationsCache>(QUERY_KEY, (old) => {
        if (!old) {
          return old;
        }
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            threads: page.threads.filter((t) => t.id !== threadId),
            total: Math.max(0, page.total - 1),
          })),
        };
      });
    },
  });
}
