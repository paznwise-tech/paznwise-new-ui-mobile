import { fetchApi } from './api';
import type { ApiResponse } from '../types';

export interface ConversationItem {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage?: string;
  updatedAt: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  createdAt: string;
  isMe?: boolean;
}

export const chatService = {
  /**
   * Get all chat conversations of user
   */
  async getConversations(): Promise<ConversationItem[]> {
    const res = await fetchApi<ApiResponse<ConversationItem[]> | ConversationItem[]>('/messages/conversations', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await fetchApi<ApiResponse<ChatMessage[]> | ChatMessage[]>(`/messages/${conversationId}`, {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Send message in a conversation
   */
  async sendMessage(payload: { conversationId?: string; recipientId?: string; content: string }): Promise<ChatMessage> {
    const res = await fetchApi<ApiResponse<ChatMessage> | ChatMessage>('/messages/send', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    if ('data' in res && res.data) return res.data;
    return res as ChatMessage;
  },

  /**
   * Mark conversation as read
   */
  async markRead(conversationId: string): Promise<void> {
    await fetchApi(`/messages/${conversationId}/read`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
