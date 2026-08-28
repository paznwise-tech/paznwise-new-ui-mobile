import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { UserProfile } from '@/types';
import { FeedService, FeedPost, CreatePostData, UpdatePostData, InteractData } from '@/services/feedService';
import { AuthStorage } from '@/services/authStorage';
import { UserService } from '@/services/userService';
import { FavoritesService } from '@/services/favoritesService';
import { connectSocket, disconnectSocket } from '@/services/socket';
import { clearAuthUserIdCache } from '@/services/currentUser';
import { authEvents } from '@/api/authEvents';
import type { CartLine } from '@/services/cartService';
import {
  useCart as useCartQuery,
  useAddToCart,
  useUpdateCartQuantity,
  useRemoveCartItem,
  useClearCart,
  useRefreshCart,
  cartTotal as calcCartTotal,
  cartCount as calcCartCount,
} from '@/hooks/useCartQueries';

// ─────────────────────────────────────────────────────────
// Context Type Definitions
// ─────────────────────────────────────────────────────────

interface CartContextType {
  cart: CartLine[];
  /** Adds to whatever quantity is already there. */
  addToCart: (productId: string | number, quantity?: number) => Promise<unknown>;
  /** Sets an absolute quantity; anything below 1 removes the line. */
  updateQuantity: (itemId: string, quantity: number) => Promise<unknown>;
  removeFromCart: (itemId: string) => Promise<unknown>;
  clearCart: () => Promise<unknown>;
  /** Re-reads the cart after the server changed it, e.g. on order placement. */
  refreshCart: () => Promise<unknown>;
  cartTotal: number;
  /** Sum of quantities, for the badge — not the number of lines. */
  cartCount: number;
  cartLoading: boolean;
}

interface FavoritesContextType {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

/**
 * Session lifecycle.
 *
 * `loading` is the boot window while a stored token is validated — the
 * root layout holds the splash over it, and route guards must not act
 * until it resolves or a returning user is bounced to the auth stack
 * before their session is known.
 */
export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

interface UserContextType {
  user: UserProfile & { isLoggedIn: boolean };
  status: SessionStatus;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  deleteProfile: () => void;
  followUser: (id: string) => void;
  unfollowUser: (id: string) => void;
  login: (name: string, email: string) => void;
  loginWithProfile: (profile: Partial<UserProfile>) => void;
  loadProfile: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => void;
  switchRole: (role: 'BUYER' | 'ARTIST' | 'ORGANIZER') => Promise<void>;
}

interface FeedContextType {
  feedPosts: FeedPost[];
  trendingPosts: FeedPost[];
  followingPosts: FeedPost[];
  feedLoading: boolean;
  feedError: string | null;
  fetchPersonalisedFeed: (userId: string) => Promise<void>;
  fetchTrendingFeed: () => Promise<void>;
  fetchFollowingFeed: () => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (postId: number, data: UpdatePostData) => Promise<void>;
  deletePost: (postId: number) => Promise<void>;
  interactWithPost: (data: InteractData) => Promise<void>;
  togglePostLike: (postId: number) => Promise<void>;
  likePost: (postId: number) => Promise<void>;
}

// ─────────────────────────────────────────────────────────
// Create Contexts
// ─────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
const UserContext = createContext<UserContextType | undefined>(undefined);
const FeedContext = createContext<FeedContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Auth & User state ───────────────────────────────────
  const [user, setUser] = useState<UserProfile & { isLoggedIn: boolean }>({
    id: '',
    name: '',
    username: '',
    email: '',
    avatar: '',
    bio: '',
    isVerified: false,
    isArtist: false,
    isPerformer: false,
    location: undefined,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isLoggedIn: false,
  });

  const [status, setStatus] = useState<SessionStatus>('loading');

  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile }));
  }, []);

  const login = useCallback((name: string, email: string) => {
    setUser(prev => ({ ...prev, name, email, isLoggedIn: true }));
    setStatus('signedIn');
  }, []);

  const loginWithProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile, isLoggedIn: true }));
    setStatus('signedIn');
    connectSocket().catch(() => {}); // open real-time connection on fresh login
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await UserService.getMyProfile();
      setUser(prev => ({ ...prev, ...profile, isLoggedIn: true }));
      setStatus('signedIn');
      connectSocket().catch(() => {}); // open real-time connection once authenticated
      // Sync saved artworks from the backend
      FavoritesService.getFavorites()
        .then(items => setFavorites(items.map(i => i.id)))
        .catch(() => {});
    } catch (e) {
      console.warn('[AppContext] loadProfile failed:', e);
      throw e;
    }
  }, []);

  /**
   * Boot: a stored token is only a claim, so it is validated against the
   * profile endpoint before the session counts as signed in. A 401 here
   * has already been through the client's refresh attempt, so failure is
   * final and the token is dropped.
   */
  useEffect(() => {
    let cancelled = false;

    AuthStorage.getAccessToken()
      .then(async token => {
        if (!token) return;
        try {
          await loadProfile();
        } catch {
          await AuthStorage.clearTokens();
          clearAuthUserIdCache();
        }
      })
      .finally(() => {
        if (!cancelled) setStatus(prev => (prev === 'loading' ? 'signedOut' : prev));
      });

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  /**
   * A refresh that fails mid-session is reported by the HTTP client, which
   * sits below React and cannot reach this state directly.
   */
  useEffect(
    () =>
      authEvents.on('signed-out', () => {
        disconnectSocket();
        setUser(prev => ({ ...prev, isLoggedIn: false }));
        setStatus('signedOut');
      }),
    [],
  );

  const deleteProfile = useCallback(() => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    alert('Profile deleted successfully.');
  }, []);

  const followUser = useCallback((_id: string) => {
    setUser(prev => ({ ...prev, followingCount: prev.followingCount + 1 }));
  }, []);

  const unfollowUser = useCallback((_id: string) => {
    setUser(prev => ({ ...prev, followingCount: Math.max(0, prev.followingCount - 1) }));
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await AuthStorage.getRefreshToken();
      if (refreshToken) {
        const { AuthService } = await import('@/services/authService');
        await AuthService.logoutApi(refreshToken).catch(() => {});
      }
    } finally {
      disconnectSocket();
      clearAuthUserIdCache();
      await AuthStorage.clearTokens();
      setUser(prev => ({ ...prev, isLoggedIn: false }));
      setStatus('signedOut');
    }
  }, []);

  /** Re-reads the profile from the server, e.g. after a role switch. */
  const refreshSession = useCallback(() => {
    loadProfile().catch(() => {});
  }, [loadProfile]);

  /**
   * Switches the active role.
   *
   * The server issues a new access token carrying the new role, so it is
   * stored before anything else. The JWT subject is what the backend
   * authorises messaging against, so its cache is cleared too — otherwise
   * the app keeps identifying as the previous session.
   */
  const switchRole = useCallback(async (role: 'BUYER' | 'ARTIST' | 'ORGANIZER') => {
    const { AuthService } = await import('@/services/authService');
    const { accessToken } = await AuthService.switchRole(role);
    await AuthStorage.setAccessToken(accessToken);
    clearAuthUserIdCache();
    await loadProfile();
  }, [loadProfile]);

  // ── Cart ────────────────────────────────────────────────
  // Server-backed. The cart endpoints are behind `authenticate`, so it is
  // only fetched once there is a session; a guest sees an empty cart and is
  // sent to sign in when they try to add.
  const { data: cartLines, isLoading: cartLoading } = useCartQuery(status === 'signedIn');
  const addToCartMutation = useAddToCart();
  const updateQuantityMutation = useUpdateCartQuantity();
  const removeCartItemMutation = useRemoveCartItem();
  const clearCartMutation = useClearCart();
  const refreshCart = useRefreshCart();

  const cart = useMemo(() => cartLines ?? [], [cartLines]);

  const addToCart = useCallback(
    (productId: string | number, quantity = 1) =>
      addToCartMutation.mutateAsync({ productId: String(productId), quantity }),
    [addToCartMutation],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) =>
      quantity < 1
        ? removeCartItemMutation.mutateAsync({ itemId })
        : updateQuantityMutation.mutateAsync({ itemId, quantity }),
    [updateQuantityMutation, removeCartItemMutation],
  );

  const removeFromCart = useCallback(
    (itemId: string) => removeCartItemMutation.mutateAsync({ itemId }),
    [removeCartItemMutation],
  );

  const clearCart = useCallback(() => clearCartMutation.mutateAsync(undefined), [clearCartMutation]);

  const cartTotal = useMemo(() => calcCartTotal(cart), [cart]);
  const cartCount = useMemo(() => calcCartCount(cart), [cart]);

  // ── Favorites state ─────────────────────────────────────
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        FavoritesService.removeFavorite(id).catch(() => {
          setFavorites(curr => (curr.includes(id) ? curr : [...curr, id]));
        });
        return prev.filter(favId => favId !== id);
      } else {
        FavoritesService.addFavorite(id).catch(() => {
          setFavorites(curr => curr.filter(f => f !== id));
        });
        return [...prev, id];
      }
    });
  }, []);

  const isFavorite = useCallback((id: number) => {
    return favorites.includes(id);
  }, [favorites]);

  // ── Feed state ──────────────────────────────────────────
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<FeedPost[]>([]);
  const [followingPosts, setFollowingPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const fetchPersonalisedFeed = useCallback(async (userId: string) => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await FeedService.getPersonalisedFeed(userId);
      setFeedPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[Feed] personalised feed error:', err.message);
      setFeedError(err.message || 'Failed to load feed');
      setFeedPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const fetchTrendingFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await FeedService.getTrendingFeed();
      setTrendingPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[Feed] trending feed error:', err.message);
      setFeedError(err.message || 'Failed to load trending');
      setTrendingPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const fetchFollowingFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await FeedService.getFollowingFeed();
      setFollowingPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[Feed] following feed error:', err.message);
      setFeedError(err.message || 'Failed to load following feed');
      setFollowingPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const createPost = useCallback(async (data: CreatePostData) => {
    try {
      const newPost = await FeedService.createPost(data);
      setFeedPosts(prev => [newPost, ...prev]);
    } catch (err: any) {
      console.warn('[Feed] create post error:', err.message);
      throw err;
    }
  }, []);

  const updatePost = useCallback(async (postId: number, data: UpdatePostData) => {
    try {
      const updated = await FeedService.updatePost(postId, data);
      setFeedPosts(prev => prev.map(p => p.id === postId ? updated : p));
    } catch (err: any) {
      console.warn('[Feed] update post error:', err.message);
      throw err;
    }
  }, []);

  const deleteFeedPost = useCallback(async (postId: number) => {
    try {
      await FeedService.deletePost(postId);
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      console.warn('[Feed] delete post error:', err.message);
      throw err;
    }
  }, []);

  const interactWithPost = useCallback(async (data: InteractData) => {
    try {
      await FeedService.interact(data);
    } catch (err: any) {
      console.warn('[Feed] interact error:', err.message);
      throw err;
    }
  }, []);

  const applyLikeState = useCallback((postId: number, isLiked: boolean, likesCount: number) => {
    const apply = (posts: FeedPost[]) =>
      posts.map(p => p.id === postId ? { ...p, isLiked, likesCount } : p);
    setFeedPosts(apply);
    setTrendingPosts(apply);
    setFollowingPosts(apply);
  }, []);

  const togglePostLike = useCallback(async (postId: number) => {
    const current =
      feedPosts.find(p => p.id === postId) ??
      trendingPosts.find(p => p.id === postId) ??
      followingPosts.find(p => p.id === postId);
    if (!current) return;
    const wasLiked = current.isLiked ?? false;
    applyLikeState(postId, !wasLiked, current.likesCount + (wasLiked ? -1 : 1));
    // Unlike has no API endpoint — handled frontend-only
    if (wasLiked) return;
    try {
      await FeedService.interact({ postId, action: 'like' });
      // Don't sync isLiked from API response — server may toggle on repeat likes,
      // so trust the optimistic state already applied above
    } catch {
      applyLikeState(postId, wasLiked, current.likesCount);
    }
  }, [feedPosts, trendingPosts, followingPosts, applyLikeState]);

  const likePost = useCallback(async (postId: number) => {
    const current =
      feedPosts.find(p => p.id === postId) ??
      trendingPosts.find(p => p.id === postId) ??
      followingPosts.find(p => p.id === postId);
    if (!current || current.isLiked) return;
    applyLikeState(postId, true, current.likesCount + 1);
    try {
      await FeedService.interact({ postId, action: 'like' });
    } catch {
      applyLikeState(postId, false, current.likesCount);
    }
  }, [feedPosts, trendingPosts, followingPosts, applyLikeState]);

  // ── Memoized Context Values ─────────────────────────────
  const cartValue = useMemo(
    () => ({ cart, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart, cartTotal, cartCount, cartLoading }),
    [cart, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart, cartTotal, cartCount, cartLoading],
  );
  const favoritesValue = useMemo(() => ({ favorites, toggleFavorite, isFavorite }), [favorites, toggleFavorite, isFavorite]);
  const userValue = useMemo(() => ({ user, status, updateUserProfile, deleteProfile, followUser, unfollowUser, login, loginWithProfile, loadProfile, logout, refreshSession, switchRole }), [user, status, updateUserProfile, deleteProfile, followUser, unfollowUser, login, loginWithProfile, loadProfile, logout, refreshSession, switchRole]);
  const feedValue = useMemo(() => ({
    feedPosts, trendingPosts, followingPosts, feedLoading, feedError,
    fetchPersonalisedFeed, fetchTrendingFeed, fetchFollowingFeed,
    createPost, updatePost, deletePost: deleteFeedPost, interactWithPost, togglePostLike, likePost,
  }), [
    feedPosts, trendingPosts, followingPosts, feedLoading, feedError,
    fetchPersonalisedFeed, fetchTrendingFeed, fetchFollowingFeed,
    createPost, updatePost, deleteFeedPost, interactWithPost, togglePostLike, likePost,
  ]);

  return (
    <UserContext.Provider value={userValue}>
        <FeedContext.Provider value={feedValue}>
            <FavoritesContext.Provider value={favoritesValue}>
              <CartContext.Provider value={cartValue}>
                {children}
              </CartContext.Provider>
            </FavoritesContext.Provider>
        </FeedContext.Provider>
    </UserContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────
// Custom Hooks for Clean Consumption
// ─────────────────────────────────────────────────────────

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within an AppProvider');
  return context;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within an AppProvider');
  return context;
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within an AppProvider');
  return context;
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) throw new Error('useFeed must be used within an AppProvider');
  return context;
};
