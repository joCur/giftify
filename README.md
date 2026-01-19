# Gifty – The Smarter Way to Gift

Never wonder what to gift again. Share wishlists with friends and family, see what they actually want, and coordinate gifts without spoiling the surprise.

**Gifty** is a modern web app that transforms gift-giving by eliminating guesswork, preventing duplicate gifts, and keeping surprises secret. Built with Next.js and Supabase, it's designed to make gift coordination effortless for everyone.

---

## 📖 Table of Contents

- [🎁 Key Features](#-key-features)
- [💡 Why Gifty?](#-why-gifty)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Commands](#development-commands)
- [🗄️ Local Database Setup](#️-local-database-setup-supabase)
- [⚙️ Environment Variables](#️-environment-variables)
- [🏗️ Tech Stack & Architecture](#️-tech-stack--architecture)
- [📚 Project Structure](#-project-structure)
  - [Key Directories Explained](#key-directories-explained)
  - [Data Flow](#data-flow)
  - [Database Schema](#database-schema)
  - [Claim System Details](#claim-system-details)
- [🎨 Design System](#-design-system)
- [🔧 Development Patterns](#-development-patterns)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)
- [🎬 Demo & Screenshots](#-demo--screenshots)
- [💬 Support & Feedback](#-support--feedback)

---

## 🎁 Key Features

### ✨ Create & Share Wishlists
- Easily create personalized wishlists by pasting product links
- Automatic metadata extraction—product images, names, and prices are fetched for you
- Share wishlists with specific people or make them publicly discoverable
- Organize items by occasion, interest, or category

### 👥 Connect with Friends & Family
- Build your network of friends and family members
- Browse their wishlists instantly
- Know exactly what they want for birthdays, holidays, and special occasions
- Discover gift ideas without asking directly

### 🎀 Coordinate Gifts Secretly
- Claim items you plan to buy to avoid duplicate gifts
- Others see what's already claimed, but the recipient never finds out
- Split gift costs with friends—multiple people can contribute to one item
- Gift claims remain confidential until the gift is given

### 🔒 Privacy & Security
- Fine-grained privacy controls—keep wishlists private, share with friends, or make them public
- Wishlist owners can't see who claimed their items (gifts stay secret!)
- Secure friend requests with accept/decline options
- Built on Supabase with Row Level Security (RLS) for data protection

### 📲 Built for All Devices
- Fully responsive design—works seamlessly on mobile, tablet, and desktop
- Progressive Web App (PWA) support for app-like experience
- Fast, snappy performance with optimized images and lazy loading
- Works offline with intelligent caching

[(↑ back to top)](#-table-of-contents)

---

## 💡 Why Gifty?

**The Problem:** Gift-giving is stressful. You guess what people want, end up buying duplicates, and lose the element of surprise when you ask them directly.

**Our Solution:** Gifty brings transparency and coordination to gift-giving while preserving the joy of giving gifts your friends actually want. It's the bridge between "What do you want?" and delightfully surprising someone with the perfect gift.

**For Gift Givers:**
- No more duplicate gifts at the same party
- Confidence that your gift is wanted
- Ability to split expensive gifts with others
- Peace of mind knowing what to buy

**For Wishlist Owners:**
- Get exactly what you want without spoiling the surprise
- Share different wishlists for different occasions
- See who's buying what (kind of)—they know, you don't
- Receive gifts you truly love

[(↑ back to top)](#-table-of-contents)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/yarn/pnpm
- **Supabase** account (free tier available at [supabase.com](https://supabase.com))
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jonascurth/giftify.git
   cd giftify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory. Use `.env.example` as a template:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your actual values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   See [Environment Variables](#environment-variables) section below for details on obtaining these values.

4. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

### Development Commands
```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Create production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

[(↑ back to top)](#-table-of-contents)

---

## 🗄️ Local Database Setup (Supabase)

Gifty uses Supabase for authentication and data storage. For local development:

### Install Supabase CLI

**macOS (Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Windows (Scoop):**
```bash
scoop install supabase
```

**Linux/Other platforms:**
Visit [Supabase CLI documentation](https://supabase.com/docs/guides/cli/getting-started) for installation instructions.

### Start Local Development

Once installed, run these commands to set up your local database:

```bash
# Start local Supabase instance (first time only)
supabase start

# Reset database with migrations
supabase db reset

# Generate TypeScript types from your schema
supabase gen types typescript --local > src/lib/supabase/types.ts

# Run edge functions locally (in another terminal)
supabase functions serve
```

After running `supabase start`, local Supabase will be available at:
- **API URL:** http://localhost:54321
- **Studio URL:** http://localhost:54323
- **Credentials:** Check terminal output for anon key and other details

**Note:** Update your `.env.local` to use the local Supabase URLs when developing locally.

---

## ⚙️ Environment Variables

### Setup
Copy the `.env.example` file to `.env.local` and fill in your actual values:
```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | 1. Go to [Supabase Console](https://app.supabase.com) 2. Select your project 3. Click "Settings" 4. Click "API" 5. Copy "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key | 1. Go to [Supabase Console](https://app.supabase.com) 2. Select your project 3. Click "Settings" 4. Click "API" 5. Copy the "anon public" key under "Project API keys" |

**Note:** These variables are marked with `NEXT_PUBLIC_` prefix, which means they're safe to expose in the browser. They only provide read/write access according to your Supabase Row Level Security (RLS) policies.

### Optional Variables (Edge Functions)

| Variable | Description | Where to Get | Purpose |
|----------|-------------|--------------|---------|
| `LINKPREVIEW_API_KEY` | API key for link preview service | Get from your link preview provider (e.g., [microlink.io](https://microlink.io), [linkpreview.net](https://www.linkpreview.net)) | Used in Supabase edge functions for fetching product metadata from URLs when users add items to their wishlists |

**Note:** If you don't provide `LINKPREVIEW_API_KEY`, the app will still work, but link previews may not load or may have reduced functionality.

### Example `.env.local`
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional
LINKPREVIEW_API_KEY=your-api-key-here
```

### Local Development with Supabase
When using a local Supabase instance (via `supabase start`), update your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-output>
```

For more architecture details, see [CLAUDE.md](./CLAUDE.md).

[(↑ back to top)](#-table-of-contents)

---

## 🏗️ Tech Stack & Architecture

Gifty is built with modern, production-proven technologies designed for scalability, security, and user experience:

### Core Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | React-based framework with Server Components, SSR, and SSG |
| **Database** | Supabase (PostgreSQL) | Open-source Firebase alternative with Row Level Security |
| **Authentication** | Supabase Auth | Built-in auth with email/OAuth support |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework for responsive design |
| **UI Components** | shadcn/ui | Accessible component library (new-york style) |
| **Forms** | React Hook Form + Zod | Type-safe form validation and state management |
| **State Management** | TanStack Query | Server state management with intelligent caching |
| **Progressive Web App** | next-pwa | PWA capabilities for app-like experience |

### Architecture Highlights

**Server-Side:**
- **React Server Components** for optimal performance and reduced JavaScript
- **Server Actions** in `src/lib/actions/` for all data mutations
- **Row Level Security (RLS)** for fine-grained, user-specific data access control
- **Edge Functions** for serverless operations (e.g., link preview metadata fetching)

**Data Management:**
- **Soft deletes** for claim history audit trails and data preservation
- **Claim splitting** system for cost-sharing expensive gifts
- **Claim history events** table for tracking lifecycle changes
- **Notification system** for friend requests, claims, and social interactions

**Client-Side:**
- **TanStack Query** with query key factories for efficient data fetching and caching
- **Custom hooks** for reusable data operations
- **Type-safe patterns** with TypeScript throughout

For detailed implementation patterns and architecture decisions, see [CLAUDE.md](./CLAUDE.md).

[(↑ back to top)](#-table-of-contents)

---

## 📚 Project Structure

Gifty follows a modular, feature-based architecture that makes it easy to navigate and extend:

```
gifty/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # 📖 Public authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── reset-password/
│   │   ├── (app)/                   # 🔒 Protected app pages (require authentication)
│   │   │   ├── dashboard/           # User's main dashboard
│   │   │   ├── wishlists/           # Wishlist management
│   │   │   ├── friends/             # Friend management & browse
│   │   │   └── profile/             # User profile settings
│   │   ├── globals.css              # 🎨 Global styles, CSS variables, animations
│   │   ├── layout.tsx               # 🌐 Root layout with fonts & providers
│   │   └── favicon.ico              # App icon
│   │
│   ├── components/
│   │   ├── ui/                      # 📦 shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (other UI components)
│   │   ├── wishlists/               # 🎁 Wishlist feature components
│   │   │   ├── wishlist-card.tsx
│   │   │   ├── item-form.tsx
│   │   │   └── claim-item-dialog.tsx
│   │   ├── friends/                 # 👥 Friend management components
│   │   │   ├── friend-request-card.tsx
│   │   │   ├── add-friend-dialog.tsx
│   │   │   └── friend-list.tsx
│   │   ├── navigation/              # 🧭 Navigation components
│   │   │   ├── sidebar.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── nav-items.tsx
│   │   └── providers/               # 🔌 React providers
│   │       └── query-provider.tsx   # TanStack Query provider
│   │
│   ├── lib/
│   │   ├── actions/                 # 🔄 Server actions for data mutations
│   │   │   ├── wishlists.ts        # Wishlist mutations
│   │   │   ├── friends.ts          # Friend management mutations
│   │   │   ├── items.ts            # Wishlist item mutations
│   │   │   ├── claims.ts           # Claim management mutations
│   │   │   ├── profile.ts          # Profile mutations
│   │   │   ├── feed.ts             # Activity feed operations
│   │   │   └── notifications.ts    # Notification operations
│   │   │
│   │   ├── queries/                 # 📊 TanStack Query hooks & utilities
│   │   │   ├── keys.ts             # Query key factory (prevents duplicate fetches)
│   │   │   ├── hooks.ts            # Custom query hooks
│   │   │   └── ... (feature-specific hooks)
│   │   │
│   │   ├── types/                   # 📝 TypeScript type definitions
│   │   │   ├── claims.ts           # Claim-related types
│   │   │   ├── feed.ts             # Activity feed types
│   │   │   └── ... (other types)
│   │   │
│   │   ├── supabase/
│   │   │   ├── server.ts           # Supabase client for server components
│   │   │   ├── client.ts           # Supabase client for client components
│   │   │   ├── middleware.ts       # Auth session & redirect middleware
│   │   │   └── types.ts            # Auto-generated TypeScript types from DB
│   │   │
│   │   ├── utils.ts                # 🛠️ General utility functions
│   │   │   ├── cn() - CSS class merging
│   │   │   ├── getInitials() - User initials
│   │   │   └── extractItemCount() - Metadata extraction
│   │   │
│   │   └── constants.ts            # Application-wide constants
│   │
│   └── middleware.ts                # 🔐 Auth session management
│
├── supabase/
│   ├── migrations/                  # 📚 Database schema migrations
│   │   ├── 001_initial_schema.sql  # Tables: profiles, wishlists, items
│   │   ├── 002_friendships.sql     # Friend relationships
│   │   ├── 003_claims.sql          # Claim system
│   │   └── ... (other migrations)
│   │
│   └── functions/                   # ⚡ Edge functions (serverless)
│       └── fetch-link-metadata/    # URL preview metadata extraction
│
├── public/                          # 📁 Static assets
│   └── (images, icons, fonts, etc.)
│
├── .env.example                     # 📝 Environment variables template
├── .gitignore                       # Git ignore rules
├── next.config.ts                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.ts              # Tailwind CSS configuration
└── package.json                    # Dependencies & scripts
```

### Key Directories Explained

**`src/app`** - Next.js App Router pages
- Route groups in parentheses: `(auth)` for public routes, `(app)` for protected routes
- File-based routing: `page.tsx` creates routes automatically
- Layouts are inherited from parent directories

**`src/lib/actions`** - Server Actions for data mutations
- All mutations happen here (create, update, delete wishlists, items, claims, etc.)
- Pattern: Get user session → Perform database operation → Revalidate cache
- Returns `{ success, error?, data? }` for consistent error handling

**`src/lib/queries`** - TanStack Query configuration
- Query key factory prevents duplicate network requests
- Custom hooks with `useQuery` and `useInfiniteQuery` for data fetching
- Automatic caching and invalidation strategies

**`supabase/migrations`** - Database schema
- Sequential migrations define the database structure
- Includes Row Level Security (RLS) policies to protect user data
- Tables: profiles, wishlists, wishlist_items, friendships, item_claims, split_claims, notifications, etc.

**`supabase/functions`** - Edge functions
- Serverless functions that run on Supabase infrastructure
- Used for external API calls (e.g., fetching link metadata)
- Can be called from server actions or directly from client code

### Data Flow

1. **User interacts with UI** → Client component renders
2. **User action triggered** → Server action called (mutation)
3. **Server action executes** → Validates user, updates database
4. **Cache invalidated** → `revalidatePath()` clears cached data
5. **UI updates** → TanStack Query refetches and updates UI

### Database Schema

Gifty's database is built on PostgreSQL with Row Level Security (RLS) policies to protect user data:

**Core Tables:**
- **`profiles`** - User profiles (extends Supabase `auth.users`)
- **`wishlists`** - Wishlists with privacy settings (public/friends/private/selected_friends)
- **`wishlist_items`** - Items in wishlists (url, title, price, image, etc.)
- **`friendships`** - Friend relationships (pending/accepted/declined status)

**Claiming & Splitting:**
- **`item_claims`** - Gift claims with status: `active`/`cancelled`/`fulfilled` (soft deletes)
- **`split_claims`** - For sharing gift costs with multiple people on one item
- **`claim_history_events`** - Audit log for claim lifecycle events

**Social Features:**
- **`notifications`** - User notifications for friend requests, claims, and activities

**Security:**
- Row Level Security (RLS) policies on all tables
- **Key privacy feature:** Wishlist owners cannot see who claimed their items (keeps gifts secret!)
- Policies ensure users can only access their own data and shared/public wishlists

### Claim System Details

The claim system uses soft deletes with status tracking instead of hard deletion:

- **`active`** - User is currently buying this item
- **`cancelled`** - User decided not to buy it (preserved in history)
- **`fulfilled`** - Gift was received (marks as complete)

**Split Claims** allow multiple users to contribute to expensive gifts:
- One item can be claimed by multiple people
- Each person contributes a portion of the cost
- The item shows total contributors and remaining amount needed

For detailed database migrations and RLS policies, see [CLAUDE.md](./CLAUDE.md).

[(↑ back to top)](#-table-of-contents)

---

## 🎨 Design System

Gifty features a warm, playful aesthetic with:
- **Warm cream backgrounds** with coral accents
- **Soft shadows** for depth
- **Smooth animations** for delightful interactions
- **Accessible components** following WCAG guidelines

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for comprehensive design documentation.

[(↑ back to top)](#-table-of-contents)

---

## 🔧 Development Patterns

### Server Actions Pattern

All data mutations (create, update, delete) happen in server actions located in `src/lib/actions/`:

```typescript
// Example: src/lib/actions/wishlists.ts
export async function createWishlist(formData: FormData) {
  // 1. Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Perform database operation
  const { data, error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, ... });

  if (error) {
    return { success: false, error: error.message };
  }

  // 3. Revalidate cache
  revalidatePath("/app/wishlists");

  // 4. Return consistent response
  return { success: true, data };
}
```

### TanStack Query Pattern

For client-side data fetching, use the query key factory to prevent duplicate requests:

```typescript
// src/lib/queries/keys.ts - Define query keys
export const queryKeys = {
  wishlists: {
    all: ["wishlists"] as const,
    myWishlists: () => [...queryKeys.wishlists.all, "my"] as const,
    detail: (id: string) => [...queryKeys.wishlists.all, id] as const,
  },
} as const;

// src/lib/queries/hooks.ts - Create hooks
export function useMyWishlists() {
  return useQuery({
    queryKey: queryKeys.wishlists.myWishlists(),
    queryFn: () => fetchMyWishlists(),
  });
}
```

### Server Components vs Client Components

- **Server Components** (default): For pages and read-only layouts - better performance
- **Client Components** (`"use client"`): For interactive features - form inputs, animations, etc.

```typescript
// Server component - no "use client"
export default async function WishlistPage() {
  const wishlists = await fetchWishlists();
  return <WishlistList data={wishlists} />;
}

// Client component - interactive
"use client"
export function WishlistForm() {
  const [title, setTitle] = useState("");
  // ...
}
```

### Form Validation with React Hook Form + Zod

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL").optional(),
});

export function ItemForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: "", url: "" },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("title")} />
    </form>
  );
}
```

For comprehensive code examples and detailed patterns, see [CLAUDE.md](./CLAUDE.md).

[(↑ back to top)](#-table-of-contents)

---

## 🤝 Contributing

We'd love your contributions! Whether it's bug fixes, features, or documentation, see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to get started.

[(↑ back to top)](#-table-of-contents)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

[(↑ back to top)](#-table-of-contents)

---

## 🎬 Demo & Screenshots

Coming soon! Check back for demo videos and screenshots showcasing Gifty's features.

[(↑ back to top)](#-table-of-contents)

---

## 💬 Support & Feedback

- **Issues & Bug Reports:** [GitHub Issues](https://github.com/jonascurth/giftify/issues)
- **Feature Requests:** [GitHub Discussions](https://github.com/jonascurth/giftify/discussions)
- **Documentation:** Check [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

[(↑ back to top)](#-table-of-contents)

---

**Made with ❤️ for gift-givers everywhere.**
