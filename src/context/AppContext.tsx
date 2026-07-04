import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Artwork, Performer, CartItem, Booking, UserProfile } from '@/types';
import { ARTWORKS as INITIAL_ARTWORKS, PERFORMERS as INITIAL_PERFORMERS } from '@/constants/data';
import { FeedService, FeedPost, CreatePostData, UpdatePostData, InteractData } from '@/services/feedService';
import { AuthStorage } from '@/services/authStorage';
import { UserService } from '@/services/userService';

// ─────────────────────────────────────────────────────────
// Context Type Definitions
// ─────────────────────────────────────────────────────────

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Artwork) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

interface FavoritesContextType {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

interface BookingsContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => void;
}

interface UserContextType {
  user: UserProfile & { isLoggedIn: boolean };
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  deleteProfile: () => void;
  followUser: (id: string) => void;
  unfollowUser: (id: string) => void;
  login: (name: string, email: string) => void;
  loginWithProfile: (profile: Partial<UserProfile>) => void;
  loadProfile: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => void;
}

interface AppDataContextType {
  artworks: Artwork[];
  performers: Performer[];
  addArtwork: (artwork: Omit<Artwork, 'id'>) => void;
  addPerformer: (performer: Omit<Performer, 'id'>) => void;
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
const BookingsContext = createContext<BookingsContextType | undefined>(undefined);
const UserContext = createContext<UserContextType | undefined>(undefined);
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
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

  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile }));
  }, []);

  const login = useCallback((name: string, email: string) => {
    setUser(prev => ({ ...prev, name, email, isLoggedIn: true }));
  }, []);

  const loginWithProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile, isLoggedIn: true }));
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await UserService.getMyProfile();
      setUser(prev => ({ ...prev, ...profile, isLoggedIn: true }));
    } catch (e) {
      console.warn('[AppContext] loadProfile failed:', e);
    }
  }, []);

  // Restore session on app start if a stored token exists
  useEffect(() => {
    AuthStorage.getAccessToken().then(token => {
      if (token) loadProfile();
    });
  }, [loadProfile]);

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
      await AuthStorage.clearTokens();
      setUser(prev => ({ ...prev, isLoggedIn: false }));
    }
  }, []);

  const refreshSession = useCallback(() => {
    // Mock refreshing token
    console.log('Session refreshed');
  }, []);

  // ── Cart state ──────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: Artwork) => {
    setCart(prev => {
      // Avoid duplicate cart additions
      if (prev.some(cartItem => cartItem.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  }, [cart]);

  // ── Favorites state ─────────────────────────────────────
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(favId => favId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const isFavorite = useCallback((id: number) => {
    return favorites.includes(id);
  }, [favorites]);

  // ── Bookings state ──────────────────────────────────────
  const [bookings, setBookings] = useState<Booking[]>([]);

  const addBooking = useCallback((newBooking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    const booking: Booking = {
      ...newBooking,
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setBookings(prev => [booking, ...prev]);
  }, []);

  // ── App Catalog data state (for selling & registering) ───
  const [artworks, setArtworks] = useState<Artwork[]>(INITIAL_ARTWORKS);
  const [performers, setPerformers] = useState<Performer[]>(INITIAL_PERFORMERS);

  const addArtwork = useCallback((newArt: Omit<Artwork, 'id'>) => {
    setArtworks(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(a => a.id)) + 1 : 1;
      return [{ id: nextId, ...newArt }, ...prev];
    });
  }, []);

  const addPerformer = useCallback((newPerf: Omit<Performer, 'id'>) => {
    setPerformers(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      return [{ id: nextId, ...newPerf }, ...prev];
    });
  }, []);

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
  const cartValue = useMemo(() => ({ cart, addToCart, removeFromCart, clearCart, cartTotal }), [cart, addToCart, removeFromCart, clearCart, cartTotal]);
  const favoritesValue = useMemo(() => ({ favorites, toggleFavorite, isFavorite }), [favorites, toggleFavorite, isFavorite]);
  const bookingsValue = useMemo(() => ({ bookings, addBooking }), [bookings, addBooking]);
  const userValue = useMemo(() => ({ user, updateUserProfile, deleteProfile, followUser, unfollowUser, login, loginWithProfile, loadProfile, logout, refreshSession }), [user, updateUserProfile, deleteProfile, followUser, unfollowUser, login, loginWithProfile, loadProfile, logout, refreshSession]);
  const appDataValue = useMemo(() => ({ artworks, performers, addArtwork, addPerformer }), [artworks, performers, addArtwork, addPerformer]);
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
      <AppDataContext.Provider value={appDataValue}>
        <FeedContext.Provider value={feedValue}>
          <BookingsContext.Provider value={bookingsValue}>
            <FavoritesContext.Provider value={favoritesValue}>
              <CartContext.Provider value={cartValue}>
                {children}
              </CartContext.Provider>
            </FavoritesContext.Provider>
          </BookingsContext.Provider>
        </FeedContext.Provider>
      </AppDataContext.Provider>
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

export const useBookings = () => {
  const context = useContext(BookingsContext);
  if (!context) throw new Error('useBookings must be used within an AppProvider');
  return context;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within an AppProvider');
  return context;
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) throw new Error('useFeed must be used within an AppProvider');
  return context;
};
