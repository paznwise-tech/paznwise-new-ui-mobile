// Mock data — swap with API calls from services/ when backend is ready
import { Artwork, Performer, Event, HeroSlide, Category, PerformerType } from '@/types';

export const ARTWORKS: Artwork[] = [
  { id: 1, title: 'Monsoon Blues',      price: 8500,  artist: 'Priya Sharma',    location: 'Mumbai',    img: 'https://images.unsplash.com/photo-1579763902614-a3fb3927b6a5?w=600&h=600&fit=crop', medium: 'Oil on Canvas',    category: 'Paintings',  rating: 4.9, reviews: 47 },
  { id: 2, title: 'Urban Geometry',     price: 12000, artist: 'Rahul Bose',      location: 'Delhi',     img: 'https://images.unsplash.com/photo-1547826039-bdbef92b42b8?w=600&h=600&fit=crop', medium: 'Acrylic',          category: 'Digital',    rating: 4.7, reviews: 29 },
  { id: 3, title: 'Crimson Veil',       price: 6200,  artist: 'Ananya Krishnan', location: 'Bangalore', img: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=600&h=600&fit=crop', medium: 'Watercolour',      category: 'Paintings',  rating: 4.8, reviews: 38 },
  { id: 4, title: 'Stone Whispers',     price: 18000, artist: 'Meera Pillai',    location: 'Kochi',     img: 'https://images.unsplash.com/photo-1576020799627-aeac74d58064?w=600&h=600&fit=crop', medium: 'Bronze Sculpture', category: 'Sculpture',  rating: 5.0, reviews: 15 },
  { id: 5, title: 'Folk Tapestry',      price: 4200,  artist: 'Arjun Singh',     location: 'Jaipur',    img: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&h=600&fit=crop', medium: 'Textile',          category: 'Crafts',     rating: 4.4, reviews: 31 },
  { id: 6, title: 'Sacred Silence',     price: 22000, artist: 'Ajay Pillai',     location: 'Varanasi',  img: 'https://images.unsplash.com/photo-1576020799627-aeac74d58064?w=600&h=600&fit=crop', medium: 'Bronze Sculpture', category: 'Sculpture',  rating: 5.0, reviews: 6  },
  { id: 7, title: 'River of Light',     price: 9800,  artist: 'Sunita Rao',      location: 'Varanasi',  img: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=600&h=600&fit=crop', medium: 'Oil on Canvas',    category: 'Paintings',  rating: 4.7, reviews: 19 },
  { id: 8, title: 'Digital Cosmos',     price: 3500,  artist: 'Vikram Nair',     location: 'Hyderabad', img: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=600&h=600&fit=crop', medium: 'Digital Print',    category: 'Digital',    rating: 4.6, reviews: 22 },
];

export const PERFORMERS: Performer[] = [
  { id: 1, name: 'Priya Sharma',    type: 'Live Painting', price: '₹8,000+',    rating: 4.9, reviews: 47,  img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' },
  { id: 2, name: 'Rahul Bose',      type: 'Live Music',    price: '₹12,000+',   rating: 4.7, reviews: 29,  img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop' },
  { id: 3, name: 'Ananya Krishnan', type: 'Dance',         price: '₹10,000+',   rating: 4.8, reviews: 38,  img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop' },
  { id: 4, name: 'Kavya Menon',     type: 'Mehendi',       price: '₹3,500+',    rating: 5.0, reviews: 112, img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop' },
  { id: 5, name: 'Ishaan Iyer',     type: 'Workshop',      price: '₹2,000/person', rating: 4.6, reviews: 55, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop' },
];

export const EVENTS: Event[] = [
  { id: 1, title: 'Monsoon Art Festival', date: 'Jul 15–20', city: 'Mumbai',    category: 'Exhibition',  img: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop', price: 500,  going: 312 },
  { id: 2, title: 'Summer Dance Showcase',date: 'Jul 25',    city: 'Delhi',     category: 'Performance', img: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=400&fit=crop', price: 800,  going: 189 },
  { id: 3, title: 'Ceramics Workshop',    date: 'Aug 3',     city: 'Bangalore', category: 'Workshop',    img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop', price: 1200, going: 45  },
  { id: 4, title: 'Indie Music Festival', date: 'Sep 20',    city: 'Goa',       category: 'Live',        img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', price: 1500, going: 843 },
];

export const HERO_SLIDES: HeroSlide[] = [
  { id: 1, title: 'Madhubani — Living Lines', caption: 'Bihar folk paintings now available to own', img: 'https://images.unsplash.com/photo-1719498481736-c125dfa45b03?w=800&h=500&fit=crop' },
  { id: 2, title: 'Tribal Art — Earth & Spirit', caption: 'Warli & Gond traditions by indigenous masters', img: 'https://images.unsplash.com/photo-1779386752783-d1af92a174e2?w=800&h=500&fit=crop' },
  { id: 3, title: 'Pattachitra — Scroll of Devotion', caption: 'Odisha\'s ancient cloth-painting tradition', img: 'https://images.unsplash.com/photo-1714250176002-f1945fb03c6f?w=800&h=500&fit=crop' },
];

export const CATEGORIES: Category[] = [
  { label: 'All',         color: '#C9A84C' },
  { label: 'Paintings',   color: '#E65100' },
  { label: 'Sculpture',   color: '#BF360C' },
  { label: 'Digital',     color: '#1565C0' },
  { label: 'Photography', color: '#880E4F' },
  { label: 'Crafts',      color: '#6A1B9A' },
  { label: 'Textile',     color: '#AD1457' },
];

export const PERFORMER_TYPES: PerformerType[] = [
  { key: 'painter',    label: 'Painter',     emoji: '🎨' },
  { key: 'musician',   label: 'Musician',    emoji: '🎵' },
  { key: 'dancer',     label: 'Dancer',      emoji: '💃' },
  { key: 'magician',   label: 'Magician',    emoji: '🎩' },
  { key: 'dj',         label: 'DJ',          emoji: '🎧' },
  { key: 'mehendi',    label: 'Mehendi',     emoji: '🌿' },
  { key: 'standup',    label: 'Stand-up',    emoji: '🎤' },
  { key: 'theatre',    label: 'Theatre',     emoji: '🎭' },
];
