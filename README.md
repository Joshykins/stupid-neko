# stupid-neko — Japanese Learning Tracker

stupid-neko is a Japanese language learning tool that helps you track your progress.

This app is built with [Convex](https://convex.dev/), [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind](https://tailwindcss.com/), and [Clerk](https://clerk.com/).

Visit the site: https://stupidneko.com

After the initial setup (<2 minutes) you'll have a working full-stack app using:

- Convex as your backend (database, server logic)
- [React](https://react.dev/) as your frontend (web page interactivity)
- [Next.js](https://nextjs.org/) for optimized web hosting and page routing
- [Tailwind](https://tailwindcss.com/) for building great looking accessible UI
- [Clerk](https://clerk.com/) for authentication

## Start Tracking

If you just cloned this codebase and didn't use `pnpm create convex`, run:

```
pnpm install
pnpm dev
```

If you're reading this README on GitHub and want to use this template, run:

```
pnpm create convex@latest -t nextjs-clerk
```

Then:

1. Open your app. There should be a "Claim your application" button from Clerk in the bottom right of your app.
2. Follow the steps to claim your application and link it to this app.
3. Follow step 3 in the [Convex Clerk onboarding guide](https://docs.convex.dev/auth/clerk#get-started) to create a Convex JWT template.
4. Uncomment the Clerk provider in `convex/auth.config.ts`
5. Paste the Issuer URL as `CLERK_JWT_ISSUER_DOMAIN` to your dev deployment environment variable settings on the Convex dashboard (see [docs](https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances))

If you want to sync Clerk user data via webhooks, check out this [example repo](https://github.com/thomasballinger/convex-clerk-users-table/).

## CI/CD Setup

This project uses GitHub Actions for automated CI/CD. The workflows handle:

- **Development deployments**: Triggered on pull requests and non-main branch pushes
- **Production deployments**: Triggered on pushes to main branch
- **Code quality checks**: Linting and formatting validation

### Required GitHub Secrets

To enable CI/CD, add these secrets to your GitHub repository settings:

#### Infisical Secrets

- `INFISICAL_TOKEN_DEV`: Infisical service token for development environment
- `INFISICAL_TOKEN_PROD`: Infisical service token for production environment
- `INFISICAL_PROJECT_ID`: Infisical project ID (optional, defaults to project in script)

#### Convex Secrets

- `CONVEX_DEPLOY_KEY`: Convex deploy key for authentication

#### Vercel Secrets

- `VERCEL_TOKEN`: Vercel API token for deployments
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Workflow Details

#### Development Workflow (`dev.yml`)

- Runs on pull requests and pushes to non-main branches
- Pulls environment variables from Infisical (dev environment)
- Deploys Convex to development deployment
- Builds browser extension (Chrome & Firefox)
- Deploys to Vercel preview environment
- Uploads extension artifacts for manual store upload

#### Production Workflow (`prod.yml`)

- Runs on pushes to main branch
- Pulls environment variables from Infisical (production environment)
- Deploys Convex to production deployment
- Builds browser extension for production
- Deploys to Vercel production environment
- Uploads extension artifacts for manual store upload

#### Linting Workflow (`lint.yml`)

- Runs on all pull requests and pushes
- Performs ESLint checks
- Validates code formatting with Prettier

### Manual Deployment

You can also trigger deployments manually:

```bash
# Deploy Convex to development
pnpm deploy:convex:dev

# Deploy Convex to production
pnpm deploy:convex:prod

# Pull environment variables
pnpm pull-env:dev    # for development
pnpm pull-env:prod   # for production
```

## Learn more

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.
