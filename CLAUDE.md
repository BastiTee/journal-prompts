# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Journal Prompts is a single-page web application that helps users explore journaling prompts across different categories. The app features an analog-inspired design and provides random prompts from a YAML data source with deep linking capabilities.

## Development Commands

```bash
# Start development server with hot reload on port 3000
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Run TypeScript type checking without emitting files
npm run type-check

# Run ESLint to check code quality and style
npm run lint

# Run ESLint with automatic fixes
npm run lint:fix
```

## Architecture Overview

### Core Structure
- **Frontend-only application**: Built with Vite + TypeScript, no backend required
- **Data-driven**: All prompts stored in `public/prompts.yaml` as YAML documents
- **Single-page app**: Class-based architecture with DOM manipulation
- **Static deployment ready**: Configured for GitHub Pages deployment with base path

### Key Components

**Main Application Class** (`src/main.ts`):
- `JournalPromptsApp` - Central application controller managing state and UI interactions
- Handles category selection, prompt display, deep linking, and clipboard operations
- Uses vanilla TypeScript with direct DOM manipulation

**Data Layer** (`src/yaml-parser.ts`):
- Fetches and parses YAML prompts from `/journal-prompts/prompts.yaml`
- Groups prompts by category for easy selection
- Provides utilities for random prompt selection and markdown parsing
- Supports prompt lookup by unique ID for deep linking

**Type Definitions** (`src/types.ts`):
- `Prompt`: Core data structure with id, category, prompt text, and purpose
- `CategoryGroup`: Organized mapping of categories to their prompts

### Data Structure

The `public/prompts.yaml` file contains journal prompts as YAML documents separated by `---`:

```yaml
id: B1
category: Biography
prompt: |
  Describe a moment that changed the direction of your life...
purpose: |
  Reflect on pivotal life moments to better understand personal transformation.
```

Each prompt has:
- **id**: Unique identifier (format: CategoryPrefix + Number)
- **category**: Grouping for dropdown selection
- **prompt**: The actual journaling question/instruction (supports markdown)
- **purpose**: Explanation of the exercise's intent

### Key Features Implementation

**Deep Linking**:
- URL parameters support sharing specific prompts (`?id=B1`)
- Backwards compatibility with old URL format (`?category=Biography&prompt=...`)
- Updates browser history without page refresh

**Random Selection**:
- Prevents showing the same prompt twice in a row within a category
- Uses `getRandomPrompt()` utility with basic duplicate prevention

**Markdown Support**:
- Prompt text is rendered as HTML using the `marked` library
- Configured for GitHub Flavored Markdown with line breaks

## File Organization

```
src/
├── main.ts          # Main application class and initialization
├── types.ts         # TypeScript type definitions
├── yaml-parser.ts   # Data loading and parsing utilities
└── styles.css       # All application styles

public/
├── prompts.yaml     # Main data source (journal prompts)
├── prompts.yaml.backup  # Backup of prompts data
└── index.html       # Application HTML structure
```

## Development Notes

- **No testing framework** currently configured
- **ESLint configured** with TypeScript support and comprehensive rules for code quality and consistency
- **TypeScript strict mode** enabled with comprehensive type checking
- **Vite configuration** includes custom base path for GitHub Pages deployment
- **All styling** contained in single CSS file with analog-inspired design theme
- **Static assets** served from public/ directory
- **Production builds** output to dist/ directory

## Code Quality

The project uses ESLint with TypeScript support to maintain code quality and consistency:

- **ESLint v9** with flat configuration format
- **TypeScript ESLint** rules for type-aware linting
- **Code style enforcement** including indentation, quotes, semicolons, and spacing
- **Best practices** rules for avoiding common JavaScript/TypeScript pitfalls
- **Automatic fixes** available for many style and formatting issues

Run `npm run lint` before committing changes to ensure code quality standards are met.

## Data Management

When modifying prompts:
1. Edit `public/prompts.yaml` directly
2. Follow existing YAML document structure with `---` separators
3. Ensure unique IDs follow the pattern: CategoryPrefix + Number
4. Test prompt rendering supports markdown formatting
5. Verify deep linking works with new prompt IDs

The application will automatically reload prompt data during development due to Vite's hot module replacement.