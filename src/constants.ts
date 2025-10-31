/**
 * Application constants for configuration and magic values
 */

// Storage keys
export const STORAGE_KEYS = {
  LANGUAGE: 'journal-prompts-language',
  THEME: 'journal-prompts-theme',
} as const;

// Default values
export const DEFAULTS = {
  LANGUAGE: 'EN',
  THEME: 'light',
} as const;

// Available options
export const AVAILABLE_LANGUAGES = ['EN', 'DE'] as const;
export const AVAILABLE_THEMES = ['light', 'dark'] as const;

// Timing constants (in milliseconds)
export const TIMING = {
  STATUS_NOTIFICATION_DURATION: 2500,
  COPY_FEEDBACK_DURATION: 1000,
  SAFARI_REFLOW_DELAY: 0,
} as const;

// DOM selectors (for commonly used selectors)
export const SELECTORS = {
  STATUS_MESSAGE: '.status-message',
  PROMPT_TEXT: '.prompt-text',
  PROMPT_PURPOSE: '.prompt-purpose',
  SETTINGS_CONTAINER: '.settings-container',
  LANG_BTN: '.lang-btn',
  THEME_BTN: '.theme-btn',
} as const;

// Element IDs (for commonly referenced elements)
export const ELEMENT_IDS = {
  PROMPT_DISPLAY: 'prompt-display',
  CATEGORY_SELECT: 'category-select',
  LANGUAGE_SWITCHER: 'language-switcher',
  THEME_SWITCHER: 'theme-switcher',
  STATUS_NOTIFICATION: 'status-notification',
  TOGGLE_PURPOSE_BTN: 'toggle-purpose-btn',
  NEW_PROMPT_BTN: 'new-prompt-btn',
  COPY_LINK_BTN: 'copy-link-btn',
  PIN_BTN: 'pin-btn',
  SETTINGS_TOGGLE: 'settings-toggle',
  LANG_EN: 'lang-en',
  LANG_DE: 'lang-de',
  THEME_LIGHT: 'theme-light',
  THEME_DARK: 'theme-dark',
} as const;

// CSS classes for state management
export const CSS_CLASSES = {
  HIDDEN: 'hidden',
  SHOW: 'show',
  ACTIVE: 'active',
  PINNED: 'pinned',
  COPIED: 'copied',
  LOADING: 'loading',
  SETTINGS_HIDDEN: 'settings-hidden',
  SETTINGS_VISIBLE: 'settings-visible',
} as const;

// Data attributes
export const DATA_ATTRIBUTES = {
  LANG: 'data-lang',
  THEME: 'data-theme',
} as const;

// File paths and URLs
export const PATHS = {
  PROMPTS_FILE: './journal-prompts.yaml',
  TRANSLATIONS_DIR: './translations/',
} as const;

export type Language = typeof AVAILABLE_LANGUAGES[number];
export type Theme = typeof AVAILABLE_THEMES[number];