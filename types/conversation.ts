export type ConversationThread = {
  id: string;
  resourceId: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export type ConversationListResponse = {
  threads: ConversationThread[];
  total: number;
  page: number;
  perPage: number | false;
  hasMore: boolean;
};
