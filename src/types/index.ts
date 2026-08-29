// Global TypeScript definitions for Paznwise Mobile

export interface Artwork {
  /** UUID. Was `number`, which forced parseInt on a UUID and yielded a
   *  truncated id that 404s — "64b8b682-..." became 64. */
  id: string;
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
  /** UUID, for the same reason as `Artwork.id`. */
  id: string;
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
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  isVerified: boolean;
  isArtist: boolean;
  isPerformer: boolean;
  role?: string;
  location?: string;
  /** Owner-only; the API omits these from public profiles. */
  phone?: string;
  cityId?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  totalLikes?: number;
  mutualFollowersCount?: number;
  isFollowing?: boolean;
}

// ─────────────────────────────────────────────────────────
// API Models (From Swagger)
// ─────────────────────────────────────────────────────────

export type ProductStatus = 'PUBLISHED' | 'DRAFT' | 'OUT_OF_STOCK' | 'APPROVED';
export type ProductType = 'PHYSICAL' | 'DIGITAL';
export type DeliveryType = 'MANUAL' | 'DOWNLOAD' | 'NONE';
export type EditionType = 'LIMITED_EDITION' | 'OPEN_EDITION' | 'UNIQUE';
export type ShippingPreference = 'FREE_SHIPPING' | 'BUYER_PAYS_SHIPPING' | 'LOCAL_PICKUP_ONLY';
export type LicenseType = 'PERSONAL_USE' | 'COMMERCIAL_USE' | 'EXCLUSIVE';

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export interface ProductVariant {
  name?: string;
  size?: string;
  color?: string;
  price?: number;
  stock?: number;
}

export interface DigitalAsset {
  fileUrl?: string;
  fileSizeBytes?: string;
  fileType?: string;
  deliveryMethod?: string;
  licenseType?: LicenseType;
  downloadLimit?: number;
  downloadCount?: number;
  downloadExpiryDays?: number;
  watermarkApplied?: boolean;
}

export interface ProductResponse {
  id: string;
  sellerId: string;
  /** Owner has opted this artwork into rentals; rate is per day. */
  rentalEligible?: boolean;
  rentalDailyRate?: number | string | null;
  linkedPostId: number | null;
  title: string;
  description: string;
  slug: string;
  sku: string;
  images: string[];           // legacy — always empty
  productImages: string[];    // S3 image URLs array
  thumbnailUrl?: string;      // single cover image (preferred)
  tags: string[];
  price: number;
  comparePrice: number | null;
  stock: number;
  brand: string | null;
  weight: number | null;
  dimensions: ProductDimensions | null;
  variants: ProductVariant[] | null;
  productType: ProductType;
  requiresShipping: boolean;
  isDownloadable: boolean;
  deliveryType: DeliveryType;
  shippingCharge: number | null;
  cashOnDelivery: boolean;
  returnPolicy: string | null;
  warranty: string | null;
  categoryId: string | null;
  // Art-specific fields
  medium?: string | null;
  artStyle?: string | null;
  yearCreated?: number | null;
  editionType?: EditionType | null;
  includeCertificate?: boolean;
  shippingPreference?: ShippingPreference | null;
  digitalAsset?: DigitalAsset | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  title: string;
  description: string;
  images: any;
  price: number;
  stock: number;
  productType?: ProductType;
  isDownloadable?: boolean;
  requiresShipping?: boolean;
  deliveryType?: DeliveryType;
  tags?: string; // JSON-stringified array
  comparePrice?: number;
  sku?: string;
  categoryId?: string;
  brand?: string;
  weight?: number;
  dimensions?: string; // JSON-stringified object
  variants?: string; // JSON-stringified array
  shippingCharge?: number;
  cashOnDelivery?: boolean;
  returnPolicy?: string;
  warranty?: string;
  status?: ProductStatus;
  linkedPostId?: number;
  medium?: string;
  artStyle?: string;
  yearCreated?: number;
  editionType?: EditionType;
  includeCertificate?: boolean;
  shippingPreference?: ShippingPreference;
}

export type UpdateProductInput = Partial<CreateProductInput>;

// Cursor-based list response for GET /api/products
export interface ProductListResponse {
  success: boolean;
  data: ProductResponse[];
  nextCursor: string | null;
  count: number;
}

// Simple list response for GET /api/products/seller/me
export interface ProductSellerListResponse {
  success: boolean;
  data: ProductResponse[];
  count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
}

export interface AddressPayload {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string | number;
  productId?: string | number;
  productName?: string;
  title?: string;
  price?: number;
  quantity?: number;
  totalPrice?: number;
  productImage?: string;
  imageUrl?: string;
  product?: {
    id: string | number;
    title: string;
    images?: string[];
    productImages?: string[];
    price: number;
    seller?: {
      name: string;
      username: string;
    };
  };
}

export interface Order {
  id: string | number;
  orderId?: string | number;
  invoiceNumber?: string;
  totalAmount?: number;
  subtotal?: number;
  shippingCharge?: number;
  discount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status: string;
  createdAt: string;
  estimatedDelivery?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  products?: OrderItem[];
  shippingAddress?: Address;
  buyer?: {
    name: string;
    email: string;
    phone: string;
  };
  artist?: {
    studio?: string;
    artistName?: string;
  };
  [key: string]: any;
}

export interface Coupon {
  id: string | number;
  code: string;
  title?: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validUntil?: string;
}

export interface CheckoutSummary {
  subtotal: number;
  shipping: number;
  discount: number;
  grandTotal: number;
  items: Array<{
    productId: string;
    title: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  appliedCoupon?: {
    code: string;
    discountApplied: number;
  } | null;
}

