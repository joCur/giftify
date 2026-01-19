# Contributing to Gifty

We're excited to have you contribute to Gifty! This guide will help you get started with understanding our development process, code standards, and how to submit your contributions.

**New to Gifty?** Start with [README.md](./README.md) to understand what the project does.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Project Conventions](#project-conventions)
  - [Code Style](#code-style)
  - [Design System and Styling](#design-system-and-styling)
  - [Naming Conventions](#naming-conventions)
- [Testing and Quality Standards](#testing-and-quality-standards)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. By participating in this project, you agree to uphold the following values:

- **Respectful**: Treat all contributors with respect and kindness
- **Inclusive**: Welcome people of all backgrounds and experience levels
- **Constructive**: Provide feedback that helps improve the project

## Ways to Contribute

There are many ways to contribute to Gifty, not just writing code:

### 🐛 Report Bugs
Found a bug? Help us fix it by opening an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Node version)

### ✨ Suggest Features
Have an idea for improvement? Open a feature request issue with:
- Clear description of the feature
- Why this feature would be useful
- Possible implementation approach (optional)
- Any relevant mockups or examples

### 📝 Improve Documentation
Documentation is crucial for any project:
- Fix typos or unclear sections
- Add examples or clarifications
- Update setup instructions
- Improve code comments

### 🎨 Design Contributions
Help improve the UI/UX:
- Suggest design improvements
- Create mockups for new features
- Help with accessibility improvements
- Review design consistency

### 💻 Write Code
Contribute features, bug fixes, and improvements:
- Pick an issue labeled `good first issue` if new
- Comment on issues to express interest
- Follow the development workflow below
- Ensure tests pass before submitting

## Getting Started

### Prerequisites

Before you begin, make sure you have:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **pnpm** - [Install pnpm](https://pnpm.io/installation)
- **Git** - [Download](https://git-scm.com/)
- A **Supabase account** - [Free tier available](https://supabase.com)

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork locally**
   ```bash
   git clone https://github.com/YOUR_USERNAME/giftify.git
   cd giftify
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/jonascurth/giftify.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

5. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

   See [README.md](./README.md#environment-variables) for how to get your Supabase credentials.

6. **Start local Supabase** (if not running in the cloud)
   ```bash
   supabase start
   ```

7. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## Development Workflow

### Git Workflow

We follow a feature branch workflow:

1. **Create a feature branch** from the latest `main`
2. **Make your changes** with clear, descriptive commits
3. **Push to your fork** and create a pull request
4. **Address code review feedback**
5. **Get approval** and merge to `main`

### Creating a Feature Branch

Always create a new branch for your work. Use descriptive branch names:

```bash
# Update main to latest
git fetch upstream
git checkout main
git rebase upstream/main

# Create feature branch
# Format: feature/description or fix/description
git checkout -b feature/add-wishlist-sharing
# or
git checkout -b fix/claim-notification-bug
```

**Branch naming conventions:**
- `feature/description` - New feature
- `fix/description` - Bug fix
- `chore/description` - Maintenance, dependency updates
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Making Commits

Write clear, descriptive commit messages that explain *why* a change was made:

```bash
# Good commits explain the "why"
git commit -m "Add wishlist sharing functionality

Users can now share wishlists with specific friends. This adds
the ability to control who can see each wishlist through privacy
settings (public/friends/private/selected_friends)."

# Avoid vague messages
# ❌ git commit -m "fix bug"
# ❌ git commit -m "update code"
```

**Commit message guidelines:**
- First line: concise summary (50 chars or less)
- Blank line
- Detailed explanation of changes (if needed)
- Reference related issues: "Fixes #123" or "Related to #456"
- Mention any breaking changes

### Running Tests and Linter Before Commit

Always verify your code quality before pushing:

```bash
# Run ESLint
npm run lint

# Fix auto-fixable lint issues
npm run lint -- --fix

# Build and verify (includes TypeScript type checking)
npm run build
```

**Pro tip:** Use git hooks to prevent commits with linting errors:
```bash
# Create a pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
npm run lint || exit 1
EOF
chmod +x .git/hooks/pre-commit
```

### Creating a Pull Request

1. **Push your branch to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a PR on GitHub**
   - Use a clear, descriptive title
   - Reference related issues: "Fixes #123"
   - Fill out the PR template completely
   - Add screenshots for UI changes
   - Keep the description focused on *why* the change was made

3. **PR Title Format**
   ```
   feature: Add wishlist sharing with privacy controls
   fix: Resolve notification not sending on claim
   docs: Update setup instructions for Supabase
   refactor: Simplify claim status management
   ```

4. **PR Description Template**
   ```markdown
   ## Description
   Clear explanation of what this PR does.

   ## Motivation and Context
   Why is this change needed? What problem does it solve?

   ## How Has This Been Tested?
   What tests did you run? How can reviewers test this?

   ## Screenshots (if applicable)
   Add screenshots for UI changes.

   ## Types of Changes
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Checklist
   - [ ] My code follows the code style
   - [ ] I have run linter and tests
   - [ ] I have added/updated tests
   - [ ] I have updated documentation
   - [ ] This PR doesn't introduce breaking changes
   ```

### Pull Request Review Process

1. **Automated Checks**
   - GitHub Actions runs linting and tests
   - PR blocks merge if checks fail
   - Review the check results and fix any issues

2. **Code Review**
   - Maintainers review the code
   - They may suggest changes or ask questions
   - Be open to feedback - it helps improve the project

3. **Addressing Feedback**
   ```bash
   # Make changes requested in review
   git add .
   git commit -m "Address PR feedback: [description]"
   git push origin feature/your-feature-name

   # The PR automatically updates - no need to close and reopen
   ```

4. **Approval and Merge**
   - Once approved, the PR can be merged
   - Maintainers handle the merge
   - Your branch is deleted after merge
   - Celebrate your contribution! 🎉

## Project Conventions

### Code Style

Refer to `CLAUDE.md` for detailed architecture and patterns. Key conventions:

#### File Organization
- **Components**: `src/components/` - organized by feature
- **Server Actions**: `src/lib/actions/` - all data mutations
- **Queries/Hooks**: `src/lib/queries/` - TanStack Query hooks
- **Types**: `src/lib/types/` - TypeScript type definitions
- **Utils**: `src/lib/utils.ts` - shared utility functions

#### Component Patterns
- **Server Components**: Default for page layouts, data fetching, sensitive operations
- **Client Components**: Only when needed for interactivity (`'use client'`)
- **Naming**: PascalCase for components, kebab-case for files

Example:
```typescript
// src/components/wishlists/WishlistCard.tsx
'use client';

import { useQuery } from '@tanstack/react-query';

export function WishlistCard({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['wishlist', id],
    queryFn: () => getWishlist(id),
  });

  return <div>{data?.name}</div>;
}
```

#### Server Actions
Server actions in `src/lib/actions/` handle all data mutations:
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createWishlist(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  const result = await supabase
    .from('wishlists')
    .insert({ user_id: user.id, name: formData.get('name') });

  revalidatePath('/wishlists');
  return { success: !result.error, error: result.error?.message };
}
```

#### Form Handling
Use React Hook Form + Zod for validation:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export function WishlistForm() {
  const form = useForm({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
    </form>
  );
}
```

#### Styling
Use Tailwind CSS with shadcn/ui components:
```typescript
import { Button } from '@/components/ui/button';

export function MyComponent() {
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-cream-50 shadow-sm">
      <Button variant="primary">Click me</Button>
    </div>
  );
}
```

#### State Management with TanStack Query

For client-side data fetching and caching, use TanStack Query with the query key factory pattern:

**Query Keys** (`src/lib/queries/keys.ts`):
```typescript
// Define hierarchical query keys
export const queryKeys = {
  feed: {
    all: ["feed"] as const,
    friends: () => [...queryKeys.feed.all, "friends"] as const,
    detail: (id: string) => [...queryKeys.feed.all, "detail", id] as const,
  },
  wishlists: {
    all: ["wishlists"] as const,
    lists: () => [...queryKeys.wishlists.all, "lists"] as const,
    detail: (id: string) => [...queryKeys.wishlists.all, "detail", id] as const,
  },
} as const;
```

**Query Hooks** (`src/lib/queries/hooks.ts`):
```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';

export function useFriendActivityFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.feed.friends(),
    queryFn: ({ pageParam }) => getFriendActivityFeed(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useWishlist(id: string) {
  return useQuery({
    queryKey: queryKeys.wishlists.detail(id),
    queryFn: () => getWishlist(id),
  });
}
```

#### Supabase Client Setup

Use the appropriate client for your context:

**Server Components & Server Actions**:
```typescript
import { createClient } from "@/lib/supabase/server";

export async function getWishlists() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', user?.id);

  return data;
}
```

**Client Components**:
```typescript
import { createClient } from "@/lib/supabase/client";

export function WishlistList() {
  const supabase = createClient();
  const { data } = useQuery({
    queryKey: queryKeys.wishlists.lists(),
    queryFn: async () => {
      const { data } = await supabase.from('wishlists').select();
      return data;
    },
  });

  return <div>{/* render wishlists */}</div>;
}
```

#### TypeScript Usage
- All files should be TypeScript (`.ts` or `.tsx`)
- Define interfaces for all data structures
- Use strict types - avoid `any`
- Keep types in `src/lib/types/`
- Import generated Supabase types from `@/lib/supabase/types`

Example type definition:
```typescript
import type { Database } from '@/lib/supabase/types';

type Wishlist = Database['public']['Tables']['wishlists']['Row'];
type WishlistInsert = Database['public']['Tables']['wishlists']['Insert'];

export interface CreateWishlistInput {
  name: string;
  description?: string;
  privacy: 'public' | 'friends' | 'private';
}
```

### Design System and Styling

For UI design patterns, refer to `STYLE_GUIDE.md`. Key principles:

- **Theme**: Warm, playful aesthetic with cream backgrounds and coral accents
- **Colors**: Use CSS custom properties (`--background`, `--primary`, `--muted`, etc.)
- **Components**: Use shadcn/ui components from `src/components/ui/`
- **Spacing**: Use Tailwind utilities with consistent spacing scale
- **Icons**: Use Lucide React icons
- **Animations**: Use `animate-fade-up` for entrances, `animate-blob` for backgrounds

Example styled component:
```typescript
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function FeatureCard() {
  return (
    <div className="group relative p-8 rounded-3xl bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-2">
      <h3 className="font-[family-name:var(--font-outfit)] text-2xl font-bold">
        Feature Title
      </h3>
      <p className="text-muted-foreground mt-2">
        Feature description goes here.
      </p>
      <Button className="mt-4 h-12 rounded-xl">
        Learn More <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
}
```

### Naming Conventions

- **Variables/Functions**: camelCase
- **Components**: PascalCase
- **Files**:
  - Components: PascalCase (e.g., `WishlistCard.tsx`)
  - Utilities: camelCase (e.g., `getInitials.ts`)
  - Types: kebab-case (e.g., `wishlist-types.ts`)
- **Constants**: UPPER_SNAKE_CASE
- **CSS Classes**: Use Tailwind, avoid custom class names when possible

## Testing and Quality Standards

All code submitted to Gifty must meet strict quality standards. These standards help ensure the codebase remains maintainable, secure, and reliable.

### Pre-Commit Quality Checks

Before submitting a PR, you **must** run these quality checks locally:

```bash
# 1. Run linter - catches code style and quality issues
npm run lint

# 2. Fix auto-fixable lint issues
npm run lint -- --fix

# 3. Build - verify the project builds successfully (includes TypeScript type checking)
npm run build

# 4. Run the dev server and test manually
npm run dev
```

**Do not submit a PR if any of these checks fail.** GitHub Actions will automatically verify these on your PR, and it will block merge if checks fail.

### ESLint Standards

The project uses ESLint to enforce code quality. Our ESLint configuration enforces:

- **Naming conventions**: camelCase for variables, PascalCase for components
- **No unused variables or imports**: Keep code clean and maintainable
- **Consistent code style**: Matches the project's established patterns
- **Security best practices**: Prevents common vulnerabilities
- **Performance warnings**: Catches potential optimization issues
- **Accessibility standards**: Ensures components are accessible to all users

**Auto-fixing issues:**
```bash
npm run lint -- --fix
```

This command automatically fixes most common issues. Review the changes before committing.

### Code Quality Requirements

#### No Debug Code in Production

Never commit debug code to the repository:

```typescript
// ❌ Don't do this
console.log('debugging:', variable);
console.warn('test');
debugger;

// ✅ Use meaningful logging only for user-facing issues
if (!user) {
  console.error('User authentication failed');
}
```

All `console.log`, `console.warn`, `console.debug`, and `debugger` statements must be removed before submitting a PR.

#### TypeScript Type Safety

Maintain strict TypeScript checking:

```typescript
// ❌ Never use 'any' type
const data: any = response;

// ✅ Define proper types
type ApiResponse = {
  success: boolean;
  data: Wishlist[];
  error?: string;
};

const data: ApiResponse = response;
```

- No `any` types - always use specific types
- No explicit `@ts-ignore` comments - fix the type issue instead
- Define interfaces for all data structures
- Use generated Supabase types from `@/lib/supabase/types`

#### Error Handling

Always handle errors gracefully:

```typescript
// ❌ Don't ignore errors
const { data } = await supabase.from('wishlists').select();

// ✅ Check for errors and provide feedback
const { data, error } = await supabase.from('wishlists').select();
if (error) {
  console.error('Failed to fetch wishlists:', error.message);
  return { success: false, error: error.message };
}
```

**Best practices:**
- Always check error objects returned from Supabase
- Return meaningful error messages to users
- Use try-catch for async/await operations
- Never expose sensitive error information to users

#### Code Comments and Documentation

- Add JSDoc comments to functions explaining parameters, return values, and usage
- Explain **why** code does something complex, not what it does (code is self-explanatory)
- Update comments when you change code behavior
- Remove outdated comments when refactoring

```typescript
// ✅ Good: Explains the why
/**
 * Claims are soft-deleted rather than hard-deleted to preserve audit history
 * and prevent accidental data loss. This function marks a claim as cancelled.
 */
export async function cancelClaim(claimId: string) {
  // ...
}

// ❌ Bad: Obvious from code
/**
 * Update the claim status to cancelled
 */
export async function cancelClaim(claimId: string) {
  // ...
}
```

### Type Checking

TypeScript type checking is performed automatically during the build process:

```bash
npm run build
```

This checks the entire codebase for TypeScript errors. Fix all errors before submitting your PR. The build will fail if there are any type errors, so running `npm run build` is the best way to verify type safety.

### Testing Guidelines

While we don't currently have automated tests configured, we expect contributors to:

1. **Manually test changes thoroughly** in the development environment
2. **Test edge cases**: empty states, error states, loading states
3. **Test across browsers**: Chrome, Firefox, Safari, and Edge
4. **Test on mobile devices**: Use DevTools mobile emulation or real devices
5. **Test your feature against the acceptance criteria**: Ensure it meets the requirements

For future tests, we will follow these principles:
- Write tests for new features and bug fixes
- Aim for meaningful test coverage (behavior-focused, not coverage metrics)
- Tests should verify **behavior**, not implementation details
- Use descriptive test names that explain what is being tested
- Keep tests maintainable - refactor test code like production code

### Production Build Verification

Always verify your changes work in a production build:

```bash
npm run build
npm run start
```

Then test the production build at [http://localhost:3000](http://localhost:3000). This catches optimization and build issues that don't appear in development mode.

### Breaking Changes Policy

Avoid breaking changes whenever possible. If a breaking change is necessary:

1. **Get approval first**: Discuss with maintainers before making the change
2. **Document clearly**: Explain what changed and why in the PR description
3. **Provide migration guide**: Add step-by-step instructions for how to update code
4. **Consider deprecation**: If possible, deprecate the old API before removing it
5. **Update all docs**: Update README.md, CONTRIBUTING.md, and code comments
6. **Mention in commit message**: Include "BREAKING CHANGE:" in the commit

Example commit message:
```
refactor: Update claim status API

BREAKING CHANGE: The `status` field now uses enum values ('active',
'cancelled', 'fulfilled') instead of strings. Update your code:
- Replace status strings with enum values
- See migration guide in PR for more details
```

### Documentation Updates

When you change code behavior or add new features:

1. **Update JSDoc comments** in the code with parameter and return type documentation
2. **Update README.md** if changes affect setup or usage
3. **Update CONTRIBUTING.md** if changes affect development process or patterns
4. **Update CLAUDE.md** if changes affect architecture or patterns
5. **Add code examples** when introducing new patterns
6. **Update type definitions** if adding new types or interfaces
7. **Add comments** for complex logic explaining the reasoning

### Code Review Process

When your PR is reviewed:

- **Be open to feedback** - Code review helps improve the project and your skills
- **Respond to comments** - Address all review comments or explain your reasoning
- **Ask questions** - If feedback is unclear, ask for clarification
- **Make requested changes** - Push new commits to address feedback
- **Keep discussions respectful** - Be kind and professional

### Quality Checklist

Before submitting your PR, verify:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds without warnings or errors
- [ ] Manually tested in development server
- [ ] Tested in production build
- [ ] No `console.log`, `debugger`, or debug code left
- [ ] No `any` types - all TypeScript types are specific
- [ ] All errors are handled gracefully
- [ ] Comments and JSDoc are up to date
- [ ] No breaking changes, or breaking changes are documented
- [ ] Related documentation is updated
- [ ] Code follows project conventions and patterns

## Common Development Tasks

### Running the Development Server

```bash
npm run dev
```

Opens [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm run start
```

### Managing the Local Database

```bash
# Start Supabase
supabase start

# View database status
supabase status

# Reset database with migrations
supabase db reset

# Pull latest schema from remote
supabase db pull

# Push local migrations to remote
supabase db push

# Stop Supabase
supabase stop
```

### Regenerating Supabase Types

When you add new tables or columns to the database:

```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

### Working with Edge Functions

```bash
# Run functions locally
supabase functions serve

# Deploy function
supabase functions deploy fetch-link-metadata

# View function logs
supabase functions logs fetch-link-metadata
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update a specific package
npm update package-name

# Update all packages
npm update

# Security audit
npm audit
npm audit fix
```

## Troubleshooting

### Common Issues and Solutions

#### Port 3000 Already in Use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# Then restart dev server
npm run dev
```

#### Supabase Connection Issues
```bash
# Restart Supabase
supabase stop
supabase start

# Check configuration
supabase status

# View logs
supabase logs
```

#### Database Migration Issues
```bash
# Reset database completely
supabase db reset

# This will:
# 1. Drop all tables
# 2. Run all migrations fresh
# 3. Re-seed data if configured
```

#### TypeScript Errors After Schema Changes
```bash
# Regenerate Supabase types
supabase gen types typescript --local > src/lib/supabase/types.ts

# Clear TypeScript cache
rm -rf node_modules/.tsconfig.tsbuildinfo
```

#### Environment Variable Issues
```bash
# Verify .env.local exists
ls -la .env.local

# Check that variables are set correctly
echo $NEXT_PUBLIC_SUPABASE_URL

# For Windows/PowerShell:
$env:NEXT_PUBLIC_SUPABASE_URL
```

### Getting Help

- **Documentation**: Check [README.md](./README.md) and [CLAUDE.md](./CLAUDE.md)
- **Issues**: Search existing issues or open a new one
- **Discussions**: Join project discussions for questions
- **Code Review**: Ask questions in PR comments

## Additional Resources

- [README.md](./README.md) - Project overview and setup
- [CLAUDE.md](./CLAUDE.md) - Architecture and patterns
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) - Design system
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

Thank you for contributing to Gifty! We appreciate your time and effort in making this project better. 🎁
