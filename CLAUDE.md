# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build to dist/
npm run type-check   # TypeScript type checking
npm run lint         # ESLint
npm run lint:fix     # Auto-fix ESLint issues
```

## Architecture

Vanilla TypeScript SPA built with Vite. No component framework — a single controller class (`JournalPromptsApp` in `src/main.ts`) orchestrates all UI state and interactions.

**Data flow:** `public/journal-prompts.yaml` → `src/yaml-parser.ts` (parses, normalizes multi-format YAML) → `JournalPromptsApp` (selects/renders prompt) → DOM. The parser tries three formats in order: (1) current `CleanPromptsData` structure (`categories` as object keyed by ID), (2) legacy nested structure (`categories` array + `prompts` array), (3) per-language YAML files (`prompts_EN.yaml` etc.).

**Key modules:**
- `src/main.ts` — app controller; handles prompt display, category navigation, deep linking, keyboard shortcuts (R/P/L/S), theme/language switching
- `src/yaml-parser.ts` — loads YAML, supports multiple format versions with fallback logic
- `src/types.ts` — all data model interfaces; `CleanPromptsData`/`CleanCategory`/`CleanPrompt` are the current format; `PromptsData`/`Category`/`MultilingualPrompt` are the legacy nested format
- `src/translations.ts` — dynamically loads `src/translations/{en,de}.json`; falls back to English
- `src/settings.ts` — persists language and theme to `localStorage`
- `src/constants.ts` — single source of truth for storage keys, CSS class names, element IDs, timing constants
- `src/icons.ts` — Lucide SVG icon wrappers

**Deep linking:** prompt identity is encoded as `category-index` in the URL hash; `yaml-parser.ts` reconstructs this from the YAML structure.

**Theming:** CSS custom properties in `src/styles.css`; light/dark via `data-theme` attribute on `<body>`; anti-FOUC script in `index.html` reads `localStorage` before first paint.

**Safari iOS:** `src/utils.ts` contains workarounds for text-centering bugs on iOS Safari.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`. Vite is configured with `base: './'` for relative asset paths.
