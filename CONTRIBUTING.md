# Contributing to Gifty

We're excited to have you contribute to Gifty! This guide will help you get started with understanding our development process, code standards, and how to submit your contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Project Conventions](#project-conventions)
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

# Run type checking
npm run type-check

# Run tests (if available)
npm run test
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

#### TypeScript Usage
- All files should be TypeScript (`.ts` or `.tsx`)
- Define interfaces for all data structures
- Use strict types - avoid `any`
- Keep types in `src/lib/types/`

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

### Code Quality Requirements

Before submitting a PR, ensure:

1. **Linting passes**
   ```bash
   npm run lint
   ```

2. **Type checking passes**
   ```bash
   npm run type-check
   ```

3. **Code is formatted**
   ```bash
   npm run lint -- --fix
   ```

### Testing Guidelines

- Write tests for new features and bug fixes
- Aim for meaningful test coverage
- Tests should verify behavior, not implementation
- Use descriptive test names

### ESLint and Code Formatting

The project uses ESLint for code quality. Common issues and fixes:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Check specific file
npm run lint src/components/MyComponent.tsx
```

### Breaking Changes Policy

Avoid breaking changes when possible. If a breaking change is necessary:

1. Document it clearly in the PR description
2. Add migration guide in the commit message
3. Update relevant documentation
4. Consider providing a deprecation period

### Documentation Updates

When you change code behavior:
- Update JSDoc comments in the code
- Update relevant sections in `README.md`
- Update type definitions
- Add examples if introducing new patterns

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
