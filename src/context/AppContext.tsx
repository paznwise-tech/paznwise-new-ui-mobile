import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Artwork, Performer, Event, CartItem, Booking, UserProfile } from '@/types';
import { ARTWORKS as INITIAL_ARTWORKS, PERFORMERS as INITIAL_PERFORMERS } from '@/constants/data';

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
  logout: () => void;
  refreshSession: () => void;
}

interface AppDataContextType {
  artworks: Artwork[];
  performers: Performer[];
  addArtwork: (artwork: Omit<Artwork, 'id'>) => void;
  addPerformer: (performer: Omit<Performer, 'id'>) => void;
}

// ─────────────────────────────────────────────────────────
// Create Contexts
// ─────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
const BookingsContext = createContext<BookingsContextType | undefined>(undefined);
const UserContext = createContext<UserContextType | undefined>(undefined);
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Auth & User state ───────────────────────────────────
  const [user, setUser] = useState<UserProfile & { isLoggedIn: boolean }>({
    id: 'u-1',
    name: 'Kabir Dev',
    username: '@kabir_dev',
    email: 'kabir@paznwise.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
    bio: 'Art enthusiast & collector of fine Indian heritage artworks.',
    isVerified: true,
    isArtist: false,
    isPerformer: false,
    location: 'Mumbai',
    followersCount: 142,
    followingCount: 38,
    postsCount: 12,
    isLoggedIn: true,
  });

  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile }));
  }, []);

  const login = useCallback((name: string, email: string) => {
    setUser(prev => ({ ...prev, name, email, isLoggedIn: true }));
  }, []);

  const deleteProfile = useCallback(() => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    alert('Profile deleted successfully.');
  }, []);

  const followUser = useCallback((id: string) => {
    setUser(prev => ({ ...prev, followingCount: prev.followingCount + 1 }));
  }, []);

  const unfollowUser = useCallback((id: string) => {
    setUser(prev => ({ ...prev, followingCount: Math.max(0, prev.followingCount - 1) }));
  }, []);

  const logout = useCallback(() => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
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

  // ── Memoized Context Values ─────────────────────────────
  const cartValue = useMemo(() => ({ cart, addToCart, removeFromCart, clearCart, cartTotal }), [cart, addToCart, removeFromCart, clearCart, cartTotal]);
  const favoritesValue = useMemo(() => ({ favorites, toggleFavorite, isFavorite }), [favorites, toggleFavorite, isFavorite]);
  const bookingsValue = useMemo(() => ({ bookings, addBooking }), [bookings, addBooking]);
  const userValue = useMemo(() => ({ user, updateUserProfile, deleteProfile, followUser, unfollowUser, login, logout, refreshSession }), [user, updateUserProfile, deleteProfile, followUser, unfollowUser, login, logout, refreshSession]);
  const appDataValue = useMemo(() => ({ artworks, performers, addArtwork, addPerformer }), [artworks, performers, addArtwork, addPerformer]);

  return (
    <UserContext.Provider value={userValue}>
      <AppDataContext.Provider value={appDataValue}>
        <BookingsContext.Provider value={bookingsValue}>
          <FavoritesContext.Provider value={favoritesValue}>
            <CartContext.Provider value={cartValue}>
              {children}
            </CartContext.Provider>
          </FavoritesContext.Provider>
        </BookingsContext.Provider>
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
