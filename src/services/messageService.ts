import { fetchApi } from './api';
import { ApiResponse } from '@/types';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ConversationLastMessage {
  message: string;
  senderId: string;
  timestamp: string;
  messageType?: MessageType;
}

export interface Conversation {
  conversationId: string;
  participants: string[];
  lastMessage: ConversationLastMessage | null;
  updatedAt: string;
  unreadCount?: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: MessageType;
  imageUrl?: string;
  status: MessageStatus;
  timestamp: string;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
}

export interface MessagesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MessagesData {
  messages: Message[];
  pagination: MessagesPagination;
}

interface SendMessageResult {
  conversationId: string;
  status: MessageStatus;
  timestamp: string;
}

interface UploadImageResult {
  conversationId: string;
  imageUrl: string;
  messageType: MessageType;
  status: MessageStatus;
  timestamp: string;
}

/** Builds the deterministic conversation ID from two user ids (sorted). */
export function buildConversationId(userA: string, userB: string): string {
  return `conv_${[userA, userB].sort().join('_')}`;
}

/** Returns the participant that is NOT the current user. */
export function getOtherParticipant(participants: string[], myUserId: string): string | undefined {
  return participants.find(p => p !== myUserId);
}

export const MessageService = {
  async getConversations(): Promise<Conversation[]> {
    const res = await fetchApi<ApiResponse<Conversation[]>>('/api/messages/conversations', {
      requiresAuth: true,
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getMessages(
    conversationId: string,
    options?: { page?: number; limit?: number }
  ): Promise<MessagesData> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    const query = params.toString();
    const res = await fetchApi<ApiResponse<MessagesData>>(
      `/api/messages/${conversationId}${query ? `?${query}` : ''}`,
      { requiresAuth: true }
    );
    return res.data;
  },

  async sendMessage(
    receiverId: string,
    message: string,
    messageType: MessageType = 'text'
  ): Promise<SendMessageResult> {
    const res = await fetchApi<ApiResponse<SendMessageResult>>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({ receiverId, message, messageType }),
      requiresAuth: true,
    });
    return res.data;
  },

  async uploadImage(
    receiverId: string,
    imageUri: string,
    mimeType = 'image/jpeg'
  ): Promise<UploadImageResult> {
    const form = new FormData();
    const filename = imageUri.split('/').pop() ?? 'image.jpg';
    form.append('image', { uri: imageUri, type: mimeType, name: filename } as any);
    form.append('receiverId', receiverId);

    const res = await fetchApi<ApiResponse<UploadImageResult>>('/api/messages/upload', {
      method: 'POST',
      body: form,
      requiresAuth: true,
    });
    return res.data;
  },

  async markAsRead(conversationId: string): Promise<number> {
    const res = await fetchApi<ApiResponse<{ modifiedCount: number }>>(
      `/api/messages/${conversationId}/read`,
      { method: 'PATCH', requiresAuth: true }
    );
    return res.data?.modifiedCount ?? 0;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await fetchApi(`/api/messages/${conversationId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async clearConversation(conversationId: string): Promise<void> {
    await fetchApi(`/api/messages/${conversationId}/clear`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async deleteMessageForMe(messageId: string): Promise<void> {
    await fetchApi(`/api/messages/${messageId}/me`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async deleteMessageForEveryone(messageId: string): Promise<void> {
    await fetchApi(`/api/messages/${messageId}/everyone`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
