# Journal Prompts

> An analog-inspired single-page web application for journaling prompts that helps users understand and reflect on themselves.
>
> **<https://bastitee.github.io/journal-prompts/>**

## Features

- **Category Selection**: Choose from different categories of journaling prompts via a clean dropdown interface
- **Random Prompt Display**: Get randomly selected prompts from your chosen category with full context
- **Same-Category Exploration**: Get new prompts from the same category without reselecting
- **Deep Linking**: Share specific prompts with others via shareable URLs
- **Copy Link**: One-click copying of prompt URLs to clipboard
- **Multilingual Support**: Available in English and German with easy language switching
- **Theme Support**: Light and dark mode options
- **Analog Design**: Paper-inspired design with warm colors and subtle textures
- **Responsive**: Works beautifully on desktop and mobile devices
- **TypeScript**: Fully typed for better development experience

## Data Format

Prompts are stored in YAML format with support for multilingual content:

```yaml
categories:
  BIO:
    en: Biography
    de: Biografie
    prompts:
      - id: 1
        en:
          prompt: "Describe a moment that changed your life..."
          purpose: "Reflect on pivotal life moments..."
        de:
          prompt: "Beschreibe einen Moment, der dein Leben verändert hat..."
          purpose: "Reflektiere über entscheidende Lebensmomente..."
```

## Development Setup

### Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)

### Installation

```bash
npm install
```

### Development Commands

```bash
# Start development server with hot reload on port 8080
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run TypeScript type checking
npm run type-check

# Run ESLint for code quality
npm run lint

# Auto-fix ESLint issues
npm run lint:fix
```

## License

This project is open source and available under the MIT License.
[Diary icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/diary).
