import { fetchApi, API_BASE_URL } from './api';
import { ApiResponse } from '@/types';

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface PublicUser {
  id: string;       // always the USER id (not the profile record id)
  name: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  isVerified: boolean;
  isArtist?: boolean;
  isPerformer?: boolean;
  location?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  totalLikes?: number;
  posts?: any[];
}

// Shape of GET /api/user/profile/me and /api/user/profile/{id} responses
interface ProfileApiData {
  id: string;            // profile record id
  userId: string;        // actual user id — use for feed, follow, etc.
  username?: string | null;
  name?: string | null;
  role?: string | null;
  bio?: string | null;
  avatar?: string | null;
  isPublic?: boolean;
  isVerified?: boolean;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  totalLikes?: number;
  location?: string | null;
  posts?: any[];
  recentPosts?: any[];
  // nested user object (may be present on /profile/me and PUT response)
  user?: {
    id?: string;
    username?: string | null;
    email?: string;
    phone?: string;
    name?: string | null;
    picture?: string | null;
    role?: string;
    isVerified?: boolean;
  };
}

function normalizeProfile(d: ProfileApiData): PublicUser {
  const role = d.role ?? d.user?.role ?? '';
  return {
    id: d.userId ?? d.user?.id ?? d.id,
    name: d.name ?? d.user?.name ?? '',
    username: d.username ?? d.user?.username ?? '',
    email: d.user?.email,
    phone: d.user?.phone,
    avatar: resolveAvatarUrl(d.avatar ?? d.user?.picture),
    bio: d.bio ?? '',
    isVerified: d.isVerified ?? d.user?.isVerified ?? false,
    role: role || undefined,
    isArtist: role === 'ARTIST',
    isPerformer: role === 'PERFORMER',
    location: d.location ?? undefined,
    followersCount: d.followersCount ?? 0,
    followingCount: d.followingCount ?? 0,
    postsCount: d.postsCount ?? 0,
    totalLikes: d.totalLikes,
    posts: d.posts || d.recentPosts || [],
  };
}

interface SuggestionsApiData {
  users: Array<{
    id: string;
    userId?: string;    // actual user id — present on some API versions
    username: string;
    name: string;
    avatar: string;
    isVerified: boolean;
    bio: string;
    followersCount: number;
    mutualFollowersCount: number;
    isFollowing: boolean;
  }>;
  nextCursor: string;
  meta: { total: number; hasMore: boolean };
}

export interface UserSuggestion extends PublicUser {
  mutualFollowersCount?: number;
  isFollowing: boolean;
}

export interface FollowUser extends PublicUser {
  isFollowing: boolean;
}

export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export interface UserCounts {
  followers: number;
  following: number;
  posts: number;
  likes: number;
}

export interface UpdateProfileData {
  name?: string;
  username?: string;
  bio?: string;
  role?: string;
  avatarUri?: string;
  avatarMimeType?: string;
}

export const UserService = {
  async getMyProfile(): Promise<PublicUser> {
    const res = await fetchApi<ApiResponse<ProfileApiData>>('/api/user/profile/me', {
      requiresAuth: true,
    });
    return normalizeProfile(res.data);
  },

  async updateProfile(data: UpdateProfileData): Promise<PublicUser> {
    const form = new FormData();
    if (data.name !== undefined) form.append('name', data.name);
    if (data.username !== undefined) form.append('username', data.username);
    if (data.bio !== undefined) form.append('bio', data.bio);
    if (data.role !== undefined) form.append('role', data.role);
    if (data.avatarUri) {
      const filename = data.avatarUri.split('/').pop() ?? 'avatar.jpg';
      form.append('avatar', { uri: data.avatarUri, type: data.avatarMimeType ?? 'image/jpeg', name: filename } as any);
    }

    const res = await fetchApi<ApiResponse<ProfileApiData>>('/api/user/profile', {
      method: 'PUT',
      requiresAuth: true,
      body: form,
    });
    return normalizeProfile(res.data);
  },

  async deleteMyProfile(): Promise<void> {
    await fetchApi('/api/user/profile', {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async getProfileById(id: string, seed?: Partial<PublicUser>): Promise<PublicUser> {
    // Try profile-record-id lookup first (works when id is a profile record id, e.g. from feed posts)
    try {
      const res = await fetchApi<ApiResponse<ProfileApiData>>(`/api/user/profile/${id}`, {
        requiresAuth: true,
      });
      return normalizeProfile(res.data);
    } catch (err: any) {
      // 4xx means the id is a user id, not a profile record id — build from counts + seed data
      if (err?.status >= 400 && err?.status < 500) {
        const counts = await fetchApi<ApiResponse<UserCounts>>(`/api/users/${id}/counts`, {
          requiresAuth: true,
        }).then(r => r.data).catch(() => ({ followers: 0, following: 0, posts: 0, likes: 0 }));
        return {
          id,
          name: seed?.name ?? '',
          username: seed?.username ?? '',
          avatar: resolveAvatarUrl(seed?.avatar),
          bio: seed?.bio ?? '',
          isVerified: seed?.isVerified ?? false,
          role: seed?.role,
          followersCount: counts.followers,
          followingCount: counts.following,
          postsCount: counts.posts,
          totalLikes: counts.likes,
        };
      }
      throw err;
    }
  },

  async getAllUsers(): Promise<UserSuggestion[]> {
    const res = await fetchApi<ApiResponse<SuggestionsApiData>>(
      '/api/users/suggestions',
      { requiresAuth: true }
    );
    return Array.isArray(res.data?.users)
      ? res.data.users.map(u => ({
          ...u,
          id: u.userId ?? u.id,
          avatar: resolveAvatarUrl(u.avatar),
          followingCount: 0,
          postsCount: 0,
        }))
      : [];
  },

  async follow(id: string): Promise<void> {
    await fetchApi(`/api/users/follow/${id}`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  async unfollow(id: string): Promise<void> {
    await fetchApi(`/api/users/unfollow/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async getFollowers(id: string): Promise<FollowUser[]> {
    const res = await fetchApi<ApiResponse<any[]>>(`/api/users/${id}/followers`, {
      requiresAuth: true,
    });
    if (!Array.isArray(res.data)) return [];
    return res.data.map(u => ({
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: false,
      isFollowing: false,
      ...u,
      id: u.userId ?? u.id,
      name: u.name ?? u.username ?? '',
      username: u.username ?? '',
      avatar: resolveAvatarUrl(u.avatar ?? u.picture ?? u.profilePicture),
    }));
  },

  async getFollowing(id: string): Promise<FollowUser[]> {
    const res = await fetchApi<ApiResponse<any[]>>(`/api/users/${id}/following`, {
      requiresAuth: true,
    });
    if (!Array.isArray(res.data)) return [];
    return res.data.map(u => ({
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: false,
      isFollowing: true,
      ...u,
      id: u.userId ?? u.id,
      name: u.name ?? u.username ?? '',
      username: u.username ?? '',
      avatar: resolveAvatarUrl(u.avatar ?? u.picture ?? u.profilePicture),
    }));
  },

  async getFollowStatus(id: string): Promise<FollowStatus> {
    const res = await fetchApi<ApiResponse<FollowStatus>>(`/api/users/${id}/follow-status`, {
      requiresAuth: true,
    });
    return res.data;
  },

  async getCounts(id: string): Promise<UserCounts> {
    const res = await fetchApi<ApiResponse<UserCounts>>(`/api/users/${id}/counts`, {
      requiresAuth: true,
    });
    return res.data;
  },

  /**
   * Get user saved favorites
   */
  async getFavorites(): Promise<any[]> {
    const res = await fetchApi<ApiResponse<any[]> | any[]>('/users/favorites', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Toggle favorite status of artwork product
   */
  async toggleFavorite(productId: string | number): Promise<boolean> {
    const res = await fetchApi<any>(`/products/${productId}/favorite`, {
      method: 'POST',
      requiresAuth: true,
    });
    return res.isFavorite ?? res.data?.isFavorite ?? true;
  },

  /**
   * Get user written reviews
   */
  async getMyReviews(): Promise<any[]> {
    const res = await fetchApi<ApiResponse<any[]> | any[]>('/users/me/reviews', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },
};

export const userService = UserService;
