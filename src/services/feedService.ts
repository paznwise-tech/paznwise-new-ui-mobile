import { fetchApi, API_BASE_URL } from './api';
import { ApiResponse } from '@/types';

function resolveUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
}

// ─── Shared normalized shape ──────────────────────────────────────────────────

export interface FeedArtist {
  id: string;
  username: string;
  name: string;
  picture?: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
  profile?: {
    bio?: string;
    avatar?: string;
    isPublic?: boolean;
    isVerified?: boolean;
  };
}

export interface FeedPost {
  id: number;
  artistId?: string;
  title?: string;
  description?: string;
  imageUrls: string[];
  height?: number;
  categoryId?: string;
  category?: string;
  style?: string;
  tags?: string[];
  isPromoted?: boolean;
  likesCount: number;
  savesCount?: number;
  sharesCount?: number;
  commentsCount: number;
  viewsCount?: number;
  purchasesCount?: number;
  trendScore?: number;
  finalScore?: number;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  type?: 'POST' | 'PRODUCT';
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  artist?: FeedArtist;
  profileName?: string;
  picture?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Raw API response shapes ──────────────────────────────────────────────────

interface PersonalisedItem {
  id: number;
  artistId?: string;
  template?: { type?: string; image?: string; height?: number; title?: string; description?: string };
  category?: string;
  style?: string;
  finalScore?: number;
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  isPromoted?: boolean;
  tags?: string[];
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  type?: 'POST' | 'PRODUCT';
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string | null;
}

interface PersonalisedFeedResponse {
  items: PersonalisedItem[];
  nextCursor?: string;
  meta?: { coldStart?: boolean; diversityScore?: number; totalCandidates?: number };
}

interface TrendingItem {
  id: number;
  artistId?: string;
  title?: string;
  description?: string;
  imageUrls?: string[];
  height?: number;
  categoryId?: string;
  style?: string;
  tags?: string[];
  isPromoted?: boolean;
  likesCount?: number;
  savesCount?: number;
  sharesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  purchasesCount?: number;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  artist?: FeedArtist;
  profileName?: string;
  picture?: string;
}

interface FollowingItem {
  id: number;
  artistId?: string;
  title?: string;
  description?: string;
  images?: string[];
  stats?: { likes?: number; saves?: number; shares?: number; comments?: number; views?: number };
  creator?: { id: string; username: string; name: string; avatar?: string; isVerified?: boolean };
  engagement?: { isLiked?: boolean; isSaved?: boolean; isFollowing?: boolean };
  trendScore?: number;
  createdAt: string;
}

interface FollowingFeedResponse {
  posts: FollowingItem[];
  nextCursor?: number;
  hasMore?: boolean;
  meta?: { totalReturned?: number; sortMode?: string; followingCount?: number };
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizePersonalised(item: PersonalisedItem): FeedPost {
  return {
    id: item.id,
    artistId: item.artistId,
    title: item.template?.title,
    description: item.template?.description,
    imageUrls: item.template?.image ? [resolveUrl(item.template.image)!] : [],
    height: item.template?.height,
    category: item.category,
    style: item.style,
    tags: item.tags,
    isPromoted: item.isPromoted,
    likesCount: item.likesCount ?? 0,
    savesCount: item.savesCount,
    commentsCount: item.commentsCount ?? 0,
    finalScore: item.finalScore,
    status: item.status,
    type: item.type,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeArtist(a: FeedArtist | undefined): FeedArtist | undefined {
  if (!a) return undefined;
  return {
    ...a,
    picture: resolveUrl(a.picture),
    avatar: resolveUrl(a.avatar),
    profile: a.profile ? { ...a.profile, avatar: resolveUrl(a.profile.avatar) } : undefined,
  };
}

function normalizeTrending(item: TrendingItem): FeedPost {
  return {
    id: item.id,
    artistId: item.artistId,
    title: item.title,
    description: item.description,
    imageUrls: (item.imageUrls ?? []).map(u => resolveUrl(u)!).filter(Boolean),
    height: item.height,
    categoryId: item.categoryId,
    style: item.style,
    tags: item.tags,
    isPromoted: item.isPromoted,
    likesCount: item.likesCount ?? 0,
    savesCount: item.savesCount,
    sharesCount: item.sharesCount,
    commentsCount: item.commentsCount ?? 0,
    viewsCount: item.viewsCount,
    purchasesCount: item.purchasesCount,
    status: item.approvalStatus ?? item.status,
    artist: normalizeArtist(item.artist),
    profileName: item.profileName,
    picture: resolveUrl(item.picture),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeFollowing(item: FollowingItem): FeedPost {
  const artist: FeedArtist | undefined = item.creator
    ? {
        id: item.creator.id,
        username: item.creator.username,
        name: item.creator.name,
        avatar: resolveUrl(item.creator.avatar),
        isVerified: item.creator.isVerified,
      }
    : undefined;
  return {
    id: item.id,
    artistId: item.artistId ?? item.creator?.id,
    title: item.title,
    description: item.description,
    imageUrls: (item.images ?? []).map(u => resolveUrl(u)!).filter(Boolean),
    likesCount: item.stats?.likes ?? 0,
    savesCount: item.stats?.saves,
    sharesCount: item.stats?.shares,
    commentsCount: item.stats?.comments ?? 0,
    viewsCount: item.stats?.views,
    isLiked: item.engagement?.isLiked,
    isSaved: item.engagement?.isSaved,
    isFollowing: item.engagement?.isFollowing,
    trendScore: item.trendScore,
    artist,
    createdAt: item.createdAt,
  };
}

// ─── Post creation / update types ────────────────────────────────────────────

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export interface CreatePostData {
  images: PickedImage[];
  video?: PickedImage;
  title?: string;
  description?: string;
  categoryId?: string;
  style?: string;
  tags?: string; // comma-separated
}

export interface UpdatePostData {
  images?: PickedImage[];
  title?: string;
  description?: string;
  categoryId?: string;
  style?: string;
  tags?: string;
}

// Mirrors the Joi enum in src/interact/interact.controller.js. `like` and
// `save` are toggles server-side — there is no separate 'unlike', which the
// previous type offered and the API would have rejected.
export type InteractAction = 'like' | 'save' | 'share' | 'view' | 'purchase' | 'skip' | 'comment';

export interface InteractData {
  postId: number;
  action: InteractAction;
}

export interface InteractResponse {
  success: boolean;
  isLiked?: boolean;
  likesCount?: number;
  /** Returned for `save`, which the server treats as a toggle. */
  isSaved?: boolean;
  savesCount?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const FeedService = {
  async getPersonalisedFeed(userId: string): Promise<FeedPost[]> {
    const res = await fetchApi<ApiResponse<PersonalisedFeedResponse>>(`/feed/${userId}`, {
      requiresAuth: true,
    });
    const items = res.data?.items;
    if (!Array.isArray(items)) return [];

    const posts = items.map(normalizePersonalised);

    // Personalised feed omits artist details — batch-fetch them
    const missingIds = [...new Set(
      posts.filter(p => !p.artist && p.artistId).map(p => p.artistId!)
    )].slice(0, 20);

    if (missingIds.length > 0) {
      const settled = await Promise.allSettled(
        missingIds.map(id =>
          fetchApi<ApiResponse<{
            userId?: string; username?: string | null; name?: string | null;
            avatar?: string | null; isVerified?: boolean;
            user?: { username?: string | null; name?: string | null; picture?: string | null; isVerified?: boolean };
          }>>(`/user/profile/${id}`, { requiresAuth: false })
            .then(r => ({ id, data: r.data }))
        )
      );

      const artistMap = new Map<string, FeedArtist>();
      settled.forEach(r => {
        if (r.status !== 'fulfilled') return;
        const { id, data } = r.value;
        artistMap.set(id, {
          id,
          username: data.username ?? data.user?.username ?? '',
          name: data.name ?? data.user?.name ?? '',
          avatar: resolveUrl(data.avatar ?? data.user?.picture),
          picture: resolveUrl(data.avatar ?? data.user?.picture),
          isVerified: data.isVerified ?? data.user?.isVerified ?? false,
        });
      });

      return posts.map(p =>
        (!p.artist && p.artistId && artistMap.has(p.artistId))
          ? { ...p, artist: artistMap.get(p.artistId) }
          : p
      );
    }

    return posts;
  },

  /**
   * @param category Category name or id. `/feed/trend` accepts it as a query
   *   param; omitted entirely for "All", since an empty value is not the same
   *   as no filter server-side.
   */
  async getTrendingFeed(category?: string): Promise<FeedPost[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetchApi<ApiResponse<TrendingItem[]>>(`/feed/trend${qs}`, {
      requiresAuth: false,
    });
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map(normalizeTrending);
  },

  async getFollowingFeed(): Promise<FeedPost[]> {
    const res = await fetchApi<ApiResponse<FollowingFeedResponse>>('/feed/following', {
      requiresAuth: true,
    });
    const posts = res.data?.posts;
    return Array.isArray(posts) ? posts.map(normalizeFollowing) : [];
  },

  async createPost(data: CreatePostData): Promise<FeedPost> {
    const formData = new FormData();
    data.images.forEach(img => {
      formData.append('images', { uri: img.uri, name: img.name, type: img.type } as any);
    });
    if (data.video) {
      formData.append('video', { uri: data.video.uri, name: data.video.name, type: data.video.type } as any);
    }
    if (data.title)       formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.categoryId)  formData.append('categoryId', data.categoryId);
    if (data.style)       formData.append('style', data.style);
    if (data.tags)        formData.append('tags', data.tags);
    const res = await fetchApi<ApiResponse<TrendingItem>>('/feed/post', {
      method: 'POST',
      body: formData,
      requiresAuth: true,
    });
    return normalizeTrending(res.data);
  },

  async updatePost(postId: number, data: UpdatePostData): Promise<FeedPost> {
    const formData = new FormData();
    if (data.images) {
      data.images.forEach(img => {
        formData.append('images', { uri: img.uri, name: img.name, type: img.type } as any);
      });
    }
    if (data.title !== undefined)       formData.append('title', data.title);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.categoryId !== undefined)  formData.append('categoryId', data.categoryId);
    if (data.style !== undefined)       formData.append('style', data.style);
    if (data.tags !== undefined)        formData.append('tags', data.tags);
    const res = await fetchApi<ApiResponse<TrendingItem>>(`/feed/post/${postId}`, {
      method: 'PUT',
      body: formData,
      requiresAuth: true,
    });
    return normalizeTrending(res.data);
  },

  async deletePost(postId: number): Promise<void> {
    await fetchApi(`/feed/post/${postId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async getPostById(postId: number): Promise<FeedPost> {
    const res = await fetchApi<ApiResponse<TrendingItem>>(`/feed/post/${postId}`, {
      requiresAuth: true,
    });
    return normalizeTrending(res.data);
  },

  async interact(data: InteractData): Promise<InteractResponse> {
    return fetchApi<InteractResponse>('/interact', {
      method: 'POST',
      body: JSON.stringify({ postId: data.postId, action: data.action }),
      requiresAuth: true,
    });
  },
};
