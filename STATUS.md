# Paznwise Mobile — status

_Replaces `src/types/PENDING_SCREENS.md`, which described screens that no
longer exist and endpoints that have since been fixed._

## Verifying a change

```
npm run check      # tsc --noEmit, then the route-existence check
npx expo export --platform android   # confirms the bundle builds
```

`npm run check:routes` parses the Express routers in `../paznwise` into the
real route table and compares it against every path the services call. It
exists because the largest defect class in this app was calling endpoints
that do not exist — **eleven** were found, and each one typechecked, bundled
and shipped cleanly, failing only at runtime with a 404 the UI swallowed.

It reports two kinds of problem:

- **no matching route** — the path does not exist at all.
- **matches only a wildcard route** — e.g. `PUT /artist-services/availability`
  structurally matched `PUT /:serviceId`, so the request was served as an
  attempt to update a service with the id "availability".

Typed routes are the other real gate: `experiments.typedRoutes` is on, so a
deleted screen becomes a compile error at each `router.push` call site.
**Avoid `as any` on route strings** — it has hidden three broken paths so far.

## Done

Buyer: cart and checkout, orders with tracking and invoices, returns,
reviews, discovery and search, notifications, events with seat selection,
performer hire, rentals, subscriptions and the plan paywall.

Seller: onboarding, dashboard, listing management, orders, review replies,
merchandise royalties.

Artist: registration with the ₹499 fee, services and availability, booking
requests, own events with door check-in, incoming rentals.

Organizer: ticketed events, tiers, sales and attendees.

## Blocked on credentials

| Feature | Needs |
|---|---|
| Google / Facebook sign-in | OAuth client IDs (web, Android + SHA-1, iOS bundle). None exist in this workspace — the web app falls back to the literal `"YOUR_GOOGLE_CLIENT_ID"`. `AuthService.socialLogin` is wired; there is deliberately no UI. |
| Push delivery | `google-services.json` for Android, APNs key for iOS. Registration and tap-routing are wired and fail silently without them. `googleServicesFile` is deliberately **not** declared in app.json — pointing it at a missing file fails every EAS build. |

## Known gaps in the API, not the app

These are flagged rather than worked around:

- **Two monetised flows create no payment order.** Rentals and organizer
  ticket purchases record a `paymentMethod` and settle nothing. Orders,
  event tickets, performer bookings, the artist fee and — since the
  subscription payment fix — plans all go through Razorpay.

  Rentals are the more consequential of the two: the artist dispatches
  artwork having received neither the rental fee nor the security deposit
  that `artist/rentals.tsx` later offers to "refund" or "withhold".
- **Seller payouts have no home.** Seller setup used to collect bank
  details and post them to `POST /api/sellers/setup`, which does not exist.
  The form is gone; how payouts actually work is undecided.
- **A post's images can only be replaced wholesale.** `PUT /feed/post/:id`
  takes files and overwrites `imageUrls`, so a single existing image cannot
  be removed. The edit screen says so rather than offering a button that
  cannot work.

## Not verified

**Nothing here has run on a device.** Every check is static. Untested in
particular: four Razorpay flows, the event seat-locking race
(`409 { unavailableSeats }`), five file-upload paths, token refresh, and
push. See the plan's verification section for the manual scripts.

Payments need Razorpay test keys on a **physical Android device** —
emulators cannot launch UPI apps.
