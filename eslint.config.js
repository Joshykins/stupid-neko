import eslintConfig from '@stupid-neko/eslint';

export default [
  ...eslintConfig,
  // JS files baseline (keep simple parsing for plain JS)
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  // Browser extension: allow browser/webextension globals to avoid no-undef noise
  {
    files: ['apps/browser-extension/src/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        // Standard browser globals
        window: 'readonly',
        self: 'readonly',
        document: 'readonly',
        Document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        // WebExtension
        chrome: 'readonly',
        browser: 'readonly',
        // DOM types referenced at runtime (instanceof, etc.)
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLVideoElement: 'readonly',
        SVGSVGElement: 'readonly',
        CSSStyleSheet: 'readonly',
        FontFace: 'readonly',
        Node: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        BroadcastChannel: 'readonly',
        // Timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Service worker/WebExt runtime
        caches: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        // Build-time env occasionally referenced in UI code
        process: 'readonly',
        // Allow existing require() usage in background code (follow-up: migrate to ESM)
        require: 'readonly',
      },
    },
  },
  // Relax a single TS-only rule for type declaration files used by tooling
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Allow legacy require() usage in this background router file for now
  {
    files: ['apps/browser-extension/src/pages/background/content-activity-router.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Node-context files inside the extension (build configs, plugins)
  {
    files: [
      'apps/browser-extension/vite.config.*',
      'apps/browser-extension/custom-vite-plugins.ts',
      'apps/browser-extension/*.config.*',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  // Mobile app files (React Native/Expo)
  {
    files: [
      'apps/mobile/**/*.{js,ts,tsx}',
      'apps/mobile/*.config.*',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  // Web app files (Next.js/React)
  {
    files: [
      'apps/web/**/*.{js,ts,tsx}',
      'apps/web/*.config.*',
    ],
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        // DOM types
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLVideoElement: 'readonly',
        SVGSVGElement: 'readonly',
        CSSStyleSheet: 'readonly',
        FontFace: 'readonly',
        Node: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        BroadcastChannel: 'readonly',
        // Timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // Fetch API
        Request: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        // React globals
        React: 'readonly',
        // Additional browser globals
        self: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        // Build-time env
        process: 'readonly',
      },
    },
  },
  // Allow require() usage in metro.config.js
  {
    files: ['apps/mobile/metro.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
        // Script files (Node.js context)
        {
          files: ['scripts/**/*.{js,ts}'],
          languageOptions: {
            globals: {
              process: 'readonly',
              console: 'readonly',
              __dirname: 'readonly',
              __filename: 'readonly',
              module: 'readonly',
              require: 'readonly',
              Buffer: 'readonly',
              global: 'readonly',
              globalThis: 'readonly',
            },
          },
          rules: {
            'no-console': 'off', // Allow console in scripts
          },
        },
        // Global ignores (workspace level)
        {
          ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.next/**',
            'coverage/**',
            '*.config.js',
            '*.config.mjs',
            // Do not lint built browser extension output
            'apps/browser-extension/dist_chrome/**',
            // Do not lint Next.js build output
            'apps/web/.next/**',
            'apps/web/next-env.d.ts',
            'apps/web/.next/types/**',
          ],
        },
];
