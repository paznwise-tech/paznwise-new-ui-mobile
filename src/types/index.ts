// Global TypeScript definitions for Paznwise Mobile

export interface Artwork {
  id: number;
  title: string;
  price: number;
  artist: string;
  location: string;
  img: string;
  medium?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  tag?: string;
}

export interface Performer {
  id: number;
  name: string;
  type: string;
  price: string;
  rating: number;
  reviews: number;
  img: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  city: string;
  category: string;
  img: string;
  price: number;
  going: number;
}

export interface HeroSlide {
  id: number;
  title: string;
  caption: string;
  img: string;
}

export interface Category {
  label: string;
  color: string;
}

export interface PerformerType {
  key: string;
  label: string;
  emoji: string;
}

export interface CartItem extends Artwork {
  addedAt: string;
}

export interface Booking {
  id: string;
  performerId: number;
  performerName: string;
  performerType: string;
  performerImg: string;
  date: string;
  eventDetails: string;
  price: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  isArtist: boolean;
  isPerformer: boolean;
  location?: string;
}
