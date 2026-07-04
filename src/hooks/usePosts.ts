import { useState, useEffect, useCallback } from 'react';
import { FeedService, FeedPost } from '../services/feedService';
import { UserService } from '../services/userService';
import { API_BASE_URL } from '../services/api';

function resolveUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function mapProfilePost(p: any): FeedPost {
  return {
    id: p.id,
    artistId: p.artistId,
    title: p.title,
    description: p.description,
    imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls.map((u: string) => resolveUrl(u)!).filter(Boolean) : [],
    height: p.height,
    categoryId: p.categoryId,
    style: p.style,
    tags: p.tags,
    isPromoted: p.isPromoted ?? false,
    likesCount: p.likesCount ?? 0,
    savesCount: p.savesCount,
    sharesCount: p.sharesCount,
    commentsCount: p.commentsCount ?? 0,
    viewsCount: p.viewsCount,
    purchasesCount: p.purchasesCount,
    status: p.approvalStatus ?? p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function useMyPosts() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await UserService.getMyProfile();
      const raw = Array.isArray(profile.posts) ? profile.posts : [];
      setPosts(raw.map(mapProfilePost));
    } catch (err: any) {
      setError(err.message || 'Failed to load your posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const deletePost = async (id: number) => {
    try {
      await FeedService.deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  return { posts, loading, error, refresh: fetchMyPosts, deletePost };
}
