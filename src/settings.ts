/**
 * Unified settings manager for language and theme preferences
 */

import {
  STORAGE_KEYS,
  DEFAULTS,
  AVAILABLE_LANGUAGES,
  AVAILABLE_THEMES,
  type Language,
  type Theme
} from './constants.ts';

export class SettingsManager {
  /**
   * Gets the current language setting from localStorage
   * @returns The current language or default if not set/invalid
   */
  static getCurrentLanguage(): Language {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (stored && AVAILABLE_LANGUAGES.includes(stored as Language)) {
        return stored as Language;
      }
    } catch (error) {
      console.warn('Failed to read language from localStorage:', error);
    }
    return DEFAULTS.LANGUAGE;
  }

  /**
   * Sets the language preference and updates DOM attributes
   * @param language - The language to set
   */
  static setLanguage(language: Language): void {
    if (!AVAILABLE_LANGUAGES.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = language.toLowerCase();
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
  }

  /**
   * Gets the current theme setting from localStorage
   * @returns The current theme or default if not set/invalid
   */
  static getCurrentTheme(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME);
      if (stored && AVAILABLE_THEMES.includes(stored as Theme)) {
        return stored as Theme;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }
    return DEFAULTS.THEME;
  }

  /**
   * Sets the theme preference and updates DOM attributes
   * @param theme - The theme to set
   */
  static setTheme(theme: Theme): void {
    if (!AVAILABLE_THEMES.includes(theme)) {
      throw new Error(`Unsupported theme: ${theme}`);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      // Update HTML data-theme attribute
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }

  /**
   * Gets all current settings
   * @returns Object with current language and theme
   */
  static getAllSettings(): { language: Language; theme: Theme } {
    return {
      language: this.getCurrentLanguage(),
      theme: this.getCurrentTheme()
    };
  }

  /**
   * Checks if a language is supported
   * @param language - The language to check
   */
  static isLanguageSupported(language: string): language is Language {
    return AVAILABLE_LANGUAGES.includes(language as Language);
  }

  /**
   * Checks if a theme is supported
   * @param theme - The theme to check
   */
  static isThemeSupported(theme: string): theme is Theme {
    return AVAILABLE_THEMES.includes(theme as Theme);
  }
}