import { fetchApi } from './api';
import { ApiResponse } from '@/types';

export interface Comment {
  _id: string;
  postId: number;
  userId: string;
  parentCommentId: string | null;
  content: string;
  isDeleted: boolean;
  replyCount: number;
  likesCount?: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
  replies?: Comment[];
  hasMoreReplies?: boolean;
  totalReplies?: number;
}

export interface CommentsData {
  comments: Comment[];
  nextCursor?: string;
}

export const CommentService = {
  async getComments(
    postId: number,
    options?: { cursor?: string; limit?: number; replyLimit?: number }
  ): Promise<CommentsData> {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.replyLimit !== undefined) params.set('replyLimit', String(options.replyLimit));
    const query = params.toString();
    const res = await fetchApi<ApiResponse<CommentsData>>(
      `/comments/${postId}${query ? `?${query}` : ''}`,
      { requiresAuth: true }
    );
    return res.data;
  },

  async createComment(postId: number, content: string): Promise<void> {
    await fetchApi('/comments', {
      method: 'POST',
      body: JSON.stringify({ postId, content }),
      requiresAuth: true,
    });
  },

  async replyToComment(postId: number, parentCommentId: string, content: string): Promise<void> {
    await fetchApi('/comments/reply', {
      method: 'POST',
      body: JSON.stringify({ postId, parentCommentId, content }),
      requiresAuth: true,
    });
  },

  async updateComment(commentId: string, content: string): Promise<void> {
    await fetchApi(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
      requiresAuth: true,
    });
  },

  async deleteComment(commentId: string): Promise<void> {
    await fetchApi(`/comments/${commentId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

};
