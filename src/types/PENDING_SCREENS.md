# Paznwise Mobile — Pending Screens & Work
### Compared against: `paznwise-tech/paznwise-new-ui` (Web App)
_Last updated: 2026-08-07_

---

## Overview

| Category | Count |
|----------|-------|
| Working screens in mobile | 22 |
| Broken / hardcoded screens (exist but need fixing) | 6 |
| Screens missing entirely (exist on web, not in mobile) | 19 |
| Web-only features not needed in mobile (admin, CMS) | — |
| **Total pending mobile work** | **25** |

---

## 1. Broken / Hardcoded Screens (exist but need fixing)

### 1.1 `app/(tabs)/events.tsx`
- **Problem:** Uses hardcoded `EVENTS` constant. No API call.
- **Web equivalent:** `/events` — fetches from backend with city, category, date filters
- **Fix:** Connect to `GET /api/events` with category + city query params

### 1.2 `app/(tabs)/hire.tsx`
- **Problem:** Uses hardcoded `PERFORMERS` constant via `useAppData()`. No API.
- **Web equivalent:** `/book` — fetches performers with search, category, location filters
- **Fix:** Connect to `GET /api/artist-services` or `/api/performers`

### 1.3 `app/artist/[id].tsx`
- **Problem:** Fully hardcoded ("Priya Sharma"), `id` param is ignored entirely.
- **Web equivalent:** `/artist/:id` — real profile, artist's products, bio, follow button, message button
- **Fix:** Fetch `GET /api/user/profile/{id}`, artist's products, and real follower counts

### 1.4 `app/booking/[id].tsx`
- **Problem:** Saves to local `BookingsContext` only, never hits backend.
- **Web equivalent:** `/book/:id` then `/booking-confirmed` — real `POST /api/bookings`
- **Fix:** Call `POST /api/bookings` on confirm; show real server response

### 1.5 `app/booking/my-bookings.tsx`
- **Problem:** Reads from local context only — lost on app restart.
- **Web equivalent:** `/my-bookings` — fetches `GET /api/bookings/me`
- **Fix:** Replace local context read with `GET /api/bookings/me`

### 1.6 `app/product/cart.tsx`
- **Problem:** Generates random order ID locally, no backend order created.
- **Web equivalent:** `/cart` → `/checkout` → `/payment` → `/order-confirmed/:orderId`
- **Fix:** Call `POST /api/orders` on place order; integrate payment gateway (Razorpay/UPI)

---

## 2. Missing Screens — Must Build for Mobile

### 2.1 `app/events/[id].tsx` — Event Detail
- **Web route:** `/events/:id`
- **Why missing:** `EventCard` in events tab has `onPress={() => {}}` — tapping does nothing
- **Needs:** Event banner, description, date/time, venue, ticket tiers, "Book Ticket" CTA

### 2.2 `app/events/book/[id].tsx` — Event Ticket Booking
- **Web route:** `/events/:id/book`
- **Why missing:** No event booking flow exists in mobile at all
- **Needs:** Ticket tier selection, quantity, payment, confirmation

### 3.3 `app/event-bookings/index.tsx` — My Event Tickets
- **Web route:** `/my-event-bookings`
- **Why missing:** No screen to view purchased event tickets
- **Needs:** List of booked events with ticket details, QR code / ticket number

### 2.4 `app/search/index.tsx` — Global Search
- **Web route:** `/search` (tabbed: Art | Events | Hire)
- **Why missing:** Only user search exists (for messaging). No content search.
- **Needs:** Unified search bar, tabs for posts / products / events / artists

### 2.5 `app/notifications/index.tsx` — Notifications
- **Web route:** `/notifications`
- **Why missing:** Entirely absent — no bell icon, no push setup, no list
- **Needs:** In-app list (`GET /api/notifications`), push notification registration (Expo Notifications), badge on tab

### 2.6 `app/orders/index.tsx` — Order History & Tracking
- **Web route:** `/order-tracking`
- **Why missing:** After checkout, there is no order history screen
- **Needs:** `GET /api/orders/me`, order status (processing / shipped / delivered), order detail

### 2.7 `app/favorites/index.tsx` — Saved / Favourites
- **Web route:** `/favorites`
- **Why missing:** `FavoritesContext` is local `useState` — lost on restart, no backend sync
- **Needs:** `GET /api/wishlist`, `POST/DELETE /api/wishlist/{productId}`, persistent favorites list

### 2.8 `app/coupons/index.tsx` — Coupons
- **Web route:** `/coupons`
- **Why missing:** No coupon system at all in mobile
- **Needs:** Browse available coupons, apply coupon at checkout (`/checkout/:sessionId/coupon`)

### 2.9 `app/reviews/index.tsx` — My Reviews
- **Web route:** `/my-reviews`
- **Why missing:** No review submission or review history in mobile
- **Needs:** List of reviews submitted by user, submit review for a purchased product

### 2.10 `app/discover/index.tsx` — Discover / Curated Collections
- **Web route:** `/discover`
- **Why missing:** Home tab has a feed but no dedicated curated discovery page
- **Needs:** Curated artwork collections, featured artists, trending by category

### 2.11 `app/product/category/[slug].tsx` — Category Browse
- **Web route:** `/category/:slug`
- **Why missing:** Browse tab filters by category inline; no dedicated category page
- **Needs:** Category-specific product listing, title, description, filters

### 2.12 `app/artist/dashboard/index.tsx` — Performer / Artist Dashboard
- **Web route:** `/artist/dashboard`
- **Why missing:** Artists/performers have no dashboard in mobile
- **Needs:** Incoming bookings, manage services, availability calendar, earnings summary

### 2.13 `app/artist/availability/index.tsx` — Manage Availability
- **Web route:** `/my-availability`
- **Why missing:** No availability management for performers
- **Needs:** Time slots, locations, pricing per slot, block dates

### 2.14 `app/seller/dashboard/index.tsx` — Seller Dashboard
- **Web route:** `/sell/dashboard`
- **Why missing:** Sellers have "My Listings" but no analytics or dashboard
- **Needs:** Sales KPIs, revenue chart, orders received, product performance

### 2.15 `app/seller/setup/index.tsx` — Seller Onboarding
- **Web route:** `/sell/setup`
- **Why missing:** No seller onboarding flow in mobile
- **Needs:** Shop name, description, bank details before first product is listed

### 2.16 `app/rentals/index.tsx` — Artwork Rentals
- **Web route:** `/my-rentals` + `/artist/rentals`
- **Why missing:** Rental system does not exist in mobile at all
- **Needs:** Browse artworks available for rent, active rentals, return process; artists can accept/decline rental requests

### 2.17 `app/settings/index.tsx` — Settings
- **Web route:** `/profile` (settings section within profile page)
- **Why missing:** No settings screen; profile menu only has sign-out
- **Needs:** Notification preferences, privacy settings, change password, delete account

### 2.18 `app/help/index.tsx` — Help Center
- **Web route:** `/help-center`
- **Why missing:** No help or FAQ screen in mobile
- **Needs:** Searchable FAQs by category

### 2.19 `app/contact/index.tsx` — Contact Us
- **Web route:** `/contact`
- **Why missing:** No contact form in mobile
- **Needs:** Simple form — name, email, message — `POST /api/contact`

---

## 3. Existing Screens — Smaller Gaps vs Web

| Screen | What web has that mobile doesn't |
|--------|----------------------------------|
| `feed/create.tsx` | Web supports **video uploads** (MP4, WebM, MOV) and **YouTube embeds** — mobile is images only |
| `feed/[id].tsx` | Web shows video player for video posts — mobile has no video renderer |
| `product/[id].tsx` | Ratings are hardcoded `4.8 / 20` — web pulls real reviews from API |
| `product/[id].tsx` | Single image shown — web has swipeable image carousel for multi-image products |
| `product/cart.tsx` | Only COD — web has card, UPI, net banking, wallet via payment gateway |
| `artist/[id].tsx` | Hardcoded — web shows real artist gallery, bio, follow, message, exhibitions |
| `(tabs)/events.tsx` | Tapping a card does nothing — web navigates to full event detail with ticket tiers |
| `messages/index.tsx` | No unread count badge on nav tab — web shows unread count |
| Feed posts | No share-to-external functionality — web has share button with link copy |
| Checkout | No coupon code input — web supports discount codes at checkout |

---

## 4. Second Priority — Admin, Organizer & Advanced Features

These exist on the web and should eventually come to mobile, but are lower priority than the core user-facing screens above.

### 4.1 `app/admin/` — Admin Panel (Mobile)
- **Web route:** `/admin/*` (30+ routes)
- **Needs:** Mobile-friendly admin views for approvals, quick actions, and KPI monitoring
- Key screens to bring to mobile:
  - `/admin/dashboard` — revenue KPIs, pending approvals count
  - `/admin/products` — approve / reject artwork submissions
  - `/admin/artists` — approve / reject artist registrations
  - `/admin/events` — approve / reject events
  - `/admin/posts` — moderate feed posts
  - `/admin/orders` — view and manage all orders
  - `/admin/payouts` — approve artist payouts
  - `/admin/refunds` — process refund requests
  - `/admin/users` — search and manage users
  - `/admin/reviews` — approve / reject / hide reviews
  - `/admin/coupons` — create and manage discount codes
  - `/admin/commissions` — view/configure commission rates
  - `/admin/hero-slides` — manage homepage carousel banners
  - `/admin/categories` — manage product categories
  - `/admin/mediums` — manage art mediums
  - `/admin/art-styles` — manage art styles
  - `/admin/locations` — manage countries, states, cities
  - `/admin/faqs` — manage help center FAQs
  - `/admin/pages` — manage CMS pages (privacy, terms, buyer protection)
  - `/admin/contact-submissions` — view contact form submissions
  - `/admin/invoices` — view and manage invoices
  - `/admin/merchandise` — manage merchandise licensing and royalties

### 4.2 `app/admin/subscriptions/` — Subscription Management (Mobile)
- **Web route:** `/admin/subscriptions/*`
- **Needs:**
  - `/admin/subscriptions/dashboard` — revenue trend, active subscribers, growth chart
  - `/admin/subscriptions/plans` — list, create, edit subscription plans
  - `/admin/subscriptions/users` — manage individual user subscriptions

### 4.3 `app/organizer/dashboard/index.tsx` — Organizer Dashboard (Mobile)
- **Web route:** `/organizer/dashboard`
- **Needs:** Event revenue, tickets sold per event, attendee management, event analytics

### 4.4 `app/subscriptions/index.tsx` — User Subscriptions (Mobile)
- **Web route:** (managed via admin, surfaced to users)
- **Needs:** Browse available subscription plans, subscribe, manage current plan, billing history

---

## 5. Completion Checklist

### Fix Broken Screens
- [ ] 1.1 Events screen — connect to API
- [ ] 1.2 Hire screen — connect to API
- [ ] 1.3 Artist profile — use `id` param, real data
- [ ] 1.4 Booking creation — `POST /api/bookings`
- [ ] 1.5 My bookings — `GET /api/bookings/me`
- [ ] 1.6 Cart checkout — `POST /api/orders` + payment gateway

### Build Missing Screens
- [ ] 2.1 `/events/[id]` — Event detail
- [ ] 2.2 `/events/book/[id]` — Event ticket booking
- [ ] 2.3 `/event-bookings` — My event tickets
- [ ] 2.4 `/search` — Global search (posts, products, events, artists)
- [ ] 2.5 `/notifications` — Notifications + push setup
- [ ] 2.6 `/orders` — Order history & tracking
- [ ] 2.7 `/favorites` — Saved artworks (backend-synced)
- [ ] 2.8 `/coupons` — Browse & apply coupons
- [ ] 2.9 `/reviews` — My reviews
- [ ] 2.10 `/discover` — Curated collections
- [ ] 2.11 `/product/category/[slug]` — Category page
- [ ] 2.12 `/artist/dashboard` — Performer dashboard
- [ ] 2.13 `/artist/availability` — Manage availability
- [ ] 2.14 `/seller/dashboard` — Seller analytics
- [ ] 2.15 `/seller/setup` — Seller onboarding
- [ ] 2.16 `/rentals` — Artwork rental system
- [ ] 2.17 `/settings` — Settings screen
- [ ] 2.18 `/help` — Help center / FAQs
- [ ] 2.19 `/contact` — Contact us

### Improve Existing Screens
- [ ] Feed — add video upload support (Expo AV / video picker)
- [ ] Product detail — swipeable image carousel
- [ ] Product detail — real reviews from API (remove hardcoded rating)
- [ ] Cart — integrate Razorpay / UPI payment gateway
- [ ] Cart — add coupon code input at checkout
- [ ] Messages tab — show unread count badge
- [ ] Feed posts — share button with `Share.share()`
- [ ] Favorites — sync to backend (replace local state)

---

### Second Priority — Admin, Organizer & Advanced Features

#### Admin Panel
- [ ] 4.1.1 `/admin/dashboard` — KPIs and pending approvals
- [ ] 4.1.2 `/admin/products` — approve / reject artworks
- [ ] 4.1.3 `/admin/artists` — approve / reject artist registrations
- [ ] 4.1.4 `/admin/events` — approve / reject events
- [ ] 4.1.5 `/admin/posts` — moderate feed posts
- [ ] 4.1.6 `/admin/orders` — view and manage all orders
- [ ] 4.1.7 `/admin/payouts` — approve artist payouts
- [ ] 4.1.8 `/admin/refunds` — process refund requests
- [ ] 4.1.9 `/admin/users` — search and manage users
- [ ] 4.1.10 `/admin/reviews` — approve / reject / hide reviews
- [ ] 4.1.11 `/admin/coupons` — create and manage discount codes
- [ ] 4.1.12 `/admin/commissions` — view / configure commission rates
- [ ] 4.1.13 `/admin/hero-slides` — manage homepage carousel banners
- [ ] 4.1.14 `/admin/categories` — manage product categories
- [ ] 4.1.15 `/admin/mediums` — manage art mediums
- [ ] 4.1.16 `/admin/art-styles` — manage art styles
- [ ] 4.1.17 `/admin/locations` — manage countries, states, cities
- [ ] 4.1.18 `/admin/faqs` — manage help center FAQs
- [ ] 4.1.19 `/admin/pages` — manage CMS pages
- [ ] 4.1.20 `/admin/contact-submissions` — view contact form submissions
- [ ] 4.1.21 `/admin/invoices` — view and manage invoices
- [ ] 4.1.22 `/admin/merchandise` — merchandise licensing and royalties

#### Subscription Management
- [ ] 4.2.1 `/admin/subscriptions/dashboard` — revenue trend, active subscribers
- [ ] 4.2.2 `/admin/subscriptions/plans` — create and edit plans
- [ ] 4.2.3 `/admin/subscriptions/users` — manage user subscriptions

#### Organizer & User Plans
- [ ] 4.3 `/organizer/dashboard` — event revenue, tickets sold, attendee management
- [ ] 4.4 `/subscriptions` — user-facing subscription plans and billing
