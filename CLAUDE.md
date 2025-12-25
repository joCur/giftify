# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Giftify is a wishlist sharing and gift coordination app built with Next.js 16 and Supabase. Users create wishlists, share them with friends, and coordinate gift purchases through a claiming system that keeps gifts secret from recipients.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

### Supabase Local Development

```bash
supabase start           # Start local Supabase
supabase db reset        # Reset database with migrations
supabase gen types typescript --local > src/lib/supabase/types.ts  # Regenerate types
supabase functions serve # Run edge functions locally
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React Server Components)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS 4 with shadcn/ui (new-york style)
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query for server state
- **PWA**: next-pwa for progressive web app support

### Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Auth pages (login, signup) - public routes
│   ├── (app)/           # Protected app pages (dashboard, wishlists, friends, profile)
│   ├── globals.css      # Theme variables, animations, custom utilities
│   └── layout.tsx       # Root layout with fonts (Outfit, DM Sans)
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── wishlists/       # Wishlist-related components
│   ├── friends/         # Friend management components
│   ├── navigation/      # Nav components (sidebar, mobile nav)
│   └── providers/       # React Query provider
├── lib/
│   ├── actions/         # Server actions (wishlists, friends, items, claims, profile, feed, etc.)
│   ├── supabase/        # Supabase client setup (server.ts, client.ts, middleware.ts, types.ts)
│   └── utils.ts         # Utility functions (cn, getInitials, extractItemCount)
└── middleware.ts        # Auth session management

supabase/
├── migrations/          # Database schema migrations (run with supabase db reset)
└── functions/           # Edge functions (e.g., fetch-link-metadata for URL previews)
```

### Database Schema

Main tables with RLS policies:
- `profiles` - User profiles (extends auth.users)
- `wishlists` - Wishlists with privacy settings (public/friends/private/selected_friends)
- `wishlist_items` - Items in wishlists (url, title, price, etc.)
- `friendships` - Friend relationships (pending/accepted/declined)
- `item_claims` - Gift claims (hidden from wishlist owner)
- `split_claims` - For sharing gift costs with friends
- `notifications` - User notifications for friend requests, claims, etc.

Key RLS behavior: Wishlist owners cannot see claims on their own items to keep gifts secret.

### Supabase Client Usage

```typescript
// Server Components & Server Actions
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client Components
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

### Server Actions Pattern

Server actions in `src/lib/actions/` handle all data mutations. They:
1. Get user session with `createClient().auth.getUser()`
2. Perform database operations
3. Call `revalidatePath()` for cache invalidation
4. Return `{ success, error?, data? }` objects

## Design System

Refer to `STYLE_GUIDE.md` for comprehensive design guidance. Key points:

- **Theme**: Warm, playful aesthetic - cream backgrounds, coral accents, soft shadows
- **Colors**: CSS custom properties in globals.css using oklch color space
- **Typography**: Outfit for headings, DM Sans for body
- **Components**: Use shadcn/ui components with custom styling
- **Animations**: animate-fade-up for entrances, animate-blob for backgrounds

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Edge function secrets (in Supabase):
```
LINKPREVIEW_API_KEY=  # For fetch-link-metadata function
```
