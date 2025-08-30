# Stupid Neko Mobile (Expo)

This is the Expo mobile app for Stupid Neko.

## Setup

1. Create `.env.local` and set your Clerk key:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

2. Install and run:

```
pnpm install
pnpm run start
```

Or from the repo root:

```
pnpm run dev:mobile
```

## Notes

- Uses Expo Router and `@clerk/clerk-expo`.
- Token cache stored via `expo-secure-store`.
