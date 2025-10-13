import { loadPrompts, getRandomPrompt, parseMarkdown, findPromptById } from './yaml-parser.ts';
import { CategoryGroup, Prompt } from './types.ts';
import { TranslationManager } from './translations.ts';
import './styles.css';

class LanguageManager {
  private static readonly STORAGE_KEY = 'journal-prompts-language';
  private static readonly DEFAULT_LANGUAGE = 'EN';
  private static readonly AVAILABLE_LANGUAGES = ['EN', 'DE'];

  static getCurrentLanguage(): string {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && this.AVAILABLE_LANGUAGES.includes(stored)) {
        return stored;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read language from localStorage:', error);
    }
    return this.DEFAULT_LANGUAGE;
  }

  static setLanguage(language: string): void {
    if (!this.AVAILABLE_LANGUAGES.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, language);
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = language.toLowerCase();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save language to localStorage:', error);
    }
  }

  static getAvailableLanguages(): string[] {
    return [...this.AVAILABLE_LANGUAGES];
  }
}

class ThemeManager {
  private static readonly STORAGE_KEY = 'journal-prompts-theme';
  private static readonly DEFAULT_THEME = 'light';
  private static readonly AVAILABLE_THEMES = ['light', 'dark'];

  static getCurrentTheme(): string {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && this.AVAILABLE_THEMES.includes(stored)) {
        return stored;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read theme from localStorage:', error);
    }
    return this.DEFAULT_THEME;
  }

  static setTheme(theme: string): void {
    if (!this.AVAILABLE_THEMES.includes(theme)) {
      throw new Error(`Unsupported theme: ${theme}`);
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
      // Update HTML data-theme attribute
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save theme to localStorage:', error);
    }
  }

  static getAvailableThemes(): string[] {
    return [...this.AVAILABLE_THEMES];
  }
}

class JournalPromptsApp {
  private categoryGroups: CategoryGroup = {};
  private currentCategory: string = '';
  private currentPrompt: Prompt | null = null;
  private currentLanguage: string = '';
  private currentTheme: string = '';
  private categorySelectionEl: HTMLElement;
  private promptDisplayEl: HTMLElement;
  private categoryDropdownEl: HTMLSelectElement;
  private categoryBadgeEl: HTMLElement;
  private promptTextEl: HTMLElement;
  private promptPurposeEl: HTMLElement;
  private togglePurposeBtnEl: HTMLElement;
  private restartBtnEl: HTMLElement;
  private newPromptBtnEl: HTMLElement;
  private copyLinkBtnEl: HTMLElement;
  private languageSwitcherEl: HTMLElement;
  private themeSwitcherEl: HTMLElement;
  private purposeVisible: boolean = false;

  constructor() {
    this.categorySelectionEl = document.getElementById('category-selection')!;
    this.promptDisplayEl = document.getElementById('prompt-display')!;
    this.categoryDropdownEl = document.getElementById('category-dropdown') as HTMLSelectElement;
    this.categoryBadgeEl = document.querySelector('.category-badge')!;
    this.promptTextEl = document.querySelector('.prompt-text')!;
    this.promptPurposeEl = document.querySelector('.prompt-purpose')!;
    this.togglePurposeBtnEl = document.getElementById('toggle-purpose-btn')!;
    this.restartBtnEl = document.getElementById('restart-btn')!;
    this.newPromptBtnEl = document.getElementById('new-prompt-btn')!;
    this.copyLinkBtnEl = document.getElementById('copy-link-btn')!;
    this.languageSwitcherEl = document.getElementById('language-switcher')!;
    this.themeSwitcherEl = document.getElementById('theme-switcher')!;

    void this.init();
  }

  private async init(): Promise<void> {
    try {
      this.initializeLanguage();
      this.initializeTheme();
      await this.initializeTranslations();
      await this.loadAndDisplayCategories();
      this.updateUIText();
      this.setupEventListeners();
      this.setupLanguageSwitcher();
      this.setupThemeSwitcher();
      this.handleDeepLink();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize app:', error);
      this.showError(TranslationManager.get('messages.loadError'));
    }
  }

  private initializeLanguage(): void {
    this.currentLanguage = LanguageManager.getCurrentLanguage();
    document.documentElement.lang = this.currentLanguage.toLowerCase();
  }

  private initializeTheme(): void {
    this.currentTheme = ThemeManager.getCurrentTheme();
    ThemeManager.setTheme(this.currentTheme);
  }

  private async initializeTranslations(): Promise<void> {
    await TranslationManager.initialize(this.currentLanguage);
  }

  private updateUIText(): void {
    // Update page title
    document.title = TranslationManager.get('page.title');

    // Update category selection label
    const categoryLabel = document.querySelector('.category-label') as HTMLElement;
    if (categoryLabel) {
      categoryLabel.textContent = TranslationManager.get('categorySelection.label');
    }

    // Update dropdown placeholder
    this.updateDropdownPlaceholder();

    // Update button tooltips
    this.updateButtonTooltips();

    // Update language switcher tooltips
    this.updateLanguageSwitcherTooltips();

    // Update theme switcher tooltips
    this.updateThemeSwitcherTooltips();
  }

  private updateDropdownPlaceholder(): void {
    const placeholderOption = this.categoryDropdownEl.querySelector('option[value=""]') as HTMLOptionElement;
    if (placeholderOption) {
      placeholderOption.textContent = TranslationManager.get('categorySelection.placeholder');
    }
  }

  private updateButtonTooltips(): void {
    // Update purpose toggle button tooltip based on current state
    this.togglePurposeBtnEl.title = this.purposeVisible 
      ? TranslationManager.get('buttons.hidePurpose')
      : TranslationManager.get('buttons.showPurpose');

    // Update other button tooltips
    this.newPromptBtnEl.title = TranslationManager.get('buttons.newPrompt');
    this.copyLinkBtnEl.title = TranslationManager.get('buttons.copyLink');
    this.restartBtnEl.title = TranslationManager.get('buttons.goBack');
  }

  private updateLanguageSwitcherTooltips(): void {
    const enButton = document.getElementById('lang-en') as HTMLElement;
    const deButton = document.getElementById('lang-de') as HTMLElement;
    
    if (enButton) {
      enButton.title = TranslationManager.get('buttons.switchToEnglish');
    }
    if (deButton) {
      deButton.title = TranslationManager.get('buttons.switchToGerman');
    }
  }

  private async loadAndDisplayCategories(): Promise<void> {
    this.categoryGroups = await loadPrompts(this.currentLanguage);
    this.populateDropdown();
  }

  private populateDropdown(): void {
    const categories = Object.keys(this.categoryGroups);

    // Clear existing options and add translated placeholder
    this.categoryDropdownEl.innerHTML = `<option value="">${TranslationManager.get('categorySelection.placeholder')}</option>`;

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      this.categoryDropdownEl.appendChild(option);
    });
  }

  private selectCategory(category: string): void {
    this.currentCategory = category;
    const prompts = this.categoryGroups[category];
    const selectedPrompt = getRandomPrompt(prompts);
    this.displayPrompt(selectedPrompt);
  }

  private selectNewPromptFromSameCategory(): void {
    if (this.currentCategory) {
      const prompts = this.categoryGroups[this.currentCategory];
      let newPrompt = getRandomPrompt(prompts);

      // Ensure we don't show the same prompt twice in a row if there are multiple prompts
      if (prompts.length > 1 && this.currentPrompt) {
        while (newPrompt.prompt === this.currentPrompt.prompt) {
          newPrompt = getRandomPrompt(prompts);
        }
      }

      this.displayPrompt(newPrompt);
    }
  }

  private displayPrompt(prompt: Prompt): void {
    this.currentPrompt = prompt;
    this.categoryBadgeEl.textContent = prompt.category;
    this.promptTextEl.innerHTML = parseMarkdown(prompt.prompt);
    this.promptPurposeEl.textContent = prompt.purpose;

    // Reset purpose visibility
    this.purposeVisible = false;
    this.promptPurposeEl.classList.add('hidden');
    this.togglePurposeBtnEl.title = TranslationManager.get('buttons.showPurpose');

    this.categorySelectionEl.classList.add('hidden');
    this.promptDisplayEl.classList.remove('hidden');

    // Hide controls when prompt is displayed
    const controlsContainer = document.querySelector('.controls-container');
    if (controlsContainer) {
      controlsContainer.classList.add('hidden-on-prompt');
    }

    this.updateUrl(prompt);
  }

  private setupEventListeners(): void {
    this.categoryDropdownEl.addEventListener('change', (e) => {
      const selectedCategory = (e.target as HTMLSelectElement).value;
      if (selectedCategory) {
        this.selectCategory(selectedCategory);
      }
    });

    this.togglePurposeBtnEl.addEventListener('click', () => this.togglePurpose());
    this.restartBtnEl.addEventListener('click', () => this.showCategorySelection());
    this.newPromptBtnEl.addEventListener('click', () => this.selectNewPromptFromSameCategory());
    this.copyLinkBtnEl.addEventListener('click', () => void this.copyCurrentLink());
  }

  private togglePurpose(): void {
    this.purposeVisible = !this.purposeVisible;

    if (this.purposeVisible) {
      this.promptPurposeEl.classList.remove('hidden');
      this.togglePurposeBtnEl.title = TranslationManager.get('buttons.hidePurpose');
    } else {
      this.promptPurposeEl.classList.add('hidden');
      this.togglePurposeBtnEl.title = TranslationManager.get('buttons.showPurpose');
    }
  }

  private showCategorySelection(): void {
    this.promptDisplayEl.classList.add('hidden');
    this.categorySelectionEl.classList.remove('hidden');
    this.categoryDropdownEl.value = '';
    this.currentCategory = '';
    this.currentPrompt = null;

    // Show controls when returning to category selection
    const controlsContainer = document.querySelector('.controls-container');
    if (controlsContainer) {
      controlsContainer.classList.remove('hidden-on-prompt');
    }

    // Clear URL parameters
    window.history.pushState({}, '', window.location.pathname);
  }

  private updateUrl(prompt: Prompt): void {
    const params = new URLSearchParams();
    params.set('id', prompt.id.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }

  private handleDeepLink(): void {
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get('id');
    const category = params.get('category');

    // Try new ID-based system first
    if (promptId) {
      const numericId = parseInt(promptId, 10);
      if (!isNaN(numericId)) {
        const prompt = findPromptById(this.categoryGroups, numericId);
        if (prompt) {
          this.currentCategory = prompt.category;
          this.displayPrompt(prompt);
          return;
        }
      }
    }

    // Fallback to old system for backwards compatibility
    const promptPrefix = params.get('prompt');
    if (category && this.categoryGroups[category] && promptPrefix) {
      const decodedPrefix = decodeURIComponent(promptPrefix);
      const prompts = this.categoryGroups[category];
      const matchingPrompt = prompts.find(p => p.prompt.startsWith(decodedPrefix));

      if (matchingPrompt) {
        this.currentCategory = category;
        this.displayPrompt(matchingPrompt);
        return;
      }
    }

    // Category-only fallback
    if (category && this.categoryGroups[category]) {
      this.selectCategory(category);
    }
  }

  private async copyCurrentLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);

      // Show temporary feedback with visual change
      const originalTitle = this.copyLinkBtnEl.title;
      this.copyLinkBtnEl.title = TranslationManager.get('messages.copied');
      this.copyLinkBtnEl.classList.add('copied');

      setTimeout(() => {
        this.copyLinkBtnEl.title = originalTitle;
        this.copyLinkBtnEl.classList.remove('copied');
      }, 1000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      this.fallbackCopyLink();
    }
  }

  private fallbackCopyLink(): void {
    const textArea = document.createElement('textarea');
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      const originalTitle = this.copyLinkBtnEl.title;
      this.copyLinkBtnEl.title = TranslationManager.get('messages.copied');
      this.copyLinkBtnEl.classList.add('copied');
      setTimeout(() => {
        this.copyLinkBtnEl.title = originalTitle;
        this.copyLinkBtnEl.classList.remove('copied');
      }, 1000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Fallback copy failed:', error);
    }

    document.body.removeChild(textArea);
  }

  private setupLanguageSwitcher(): void {
    // Initialize language button states
    this.updateLanguageButtons();

    // Add event listeners for language buttons
    const langButtons = this.languageSwitcherEl.querySelectorAll('.lang-btn');
    langButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const language = target.dataset.lang;
        if (language && language !== this.currentLanguage) {
          void this.switchLanguage(language);
        }
      });
    });
  }

  private updateLanguageButtons(): void {
    const langButtons = this.languageSwitcherEl.querySelectorAll('.lang-btn');
    langButtons.forEach(button => {
      const btnElement = button as HTMLButtonElement;
      const language = btnElement.dataset.lang;
      if (language === this.currentLanguage) {
        btnElement.classList.add('active');
      } else {
        btnElement.classList.remove('active');
      }
    });
  }

  private async switchLanguage(newLanguage: string): Promise<void> {
    try {
      // Save language preference
      LanguageManager.setLanguage(newLanguage);
      this.currentLanguage = newLanguage;

      // Store current state
      const wasOnPromptScreen = !this.promptDisplayEl.classList.contains('hidden');
      const currentPromptId = this.currentPrompt?.id;
      const wasShowingPurpose = this.purposeVisible;

      // Initialize translations for the new language
      await TranslationManager.initialize(newLanguage);
      TranslationManager.setLanguage(newLanguage);

      // Reload prompts with new language
      await this.loadAndDisplayCategories();

      // Update all UI text with new translations
      this.updateUIText();

      // Update language button states
      this.updateLanguageButtons();

      // Update theme switcher tooltips
      this.updateThemeSwitcherTooltips();

      // Restore state if we were viewing a prompt
      if (wasOnPromptScreen && currentPromptId) {
        const prompt = findPromptById(this.categoryGroups, currentPromptId);
        if (prompt) {
          this.currentCategory = prompt.category;
          this.displayPrompt(prompt);
          
          // Restore purpose visibility
          if (wasShowingPurpose) {
            this.togglePurpose();
          }
        } else {
          // Prompt not found in new language, go back to category selection
          this.showCategorySelection();
        }
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch language:', error);
      // Fallback: reload the page
      window.location.reload();
    }
  }

  private setupThemeSwitcher(): void {
    // Initialize theme button states
    this.updateThemeButtons();

    // Add event listeners for theme buttons
    const themeButtons = this.themeSwitcherEl.querySelectorAll('.theme-btn');
    
    themeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const theme = target.dataset.theme;
        if (theme && theme !== this.currentTheme) {
          this.switchTheme(theme);
        }
      });
    });
  }

  private updateThemeButtons(): void {
    const themeButtons = this.themeSwitcherEl.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
      const btnElement = button as HTMLButtonElement;
      const theme = btnElement.dataset.theme;
      if (theme === this.currentTheme) {
        btnElement.classList.add('active');
      } else {
        btnElement.classList.remove('active');
      }
    });
  }

  private updateThemeSwitcherTooltips(): void {
    const lightButton = document.getElementById('theme-light') as HTMLElement;
    const darkButton = document.getElementById('theme-dark') as HTMLElement;
    
    if (lightButton) {
      lightButton.title = TranslationManager.get('buttons.switchToLight');
    }
    if (darkButton) {
      darkButton.title = TranslationManager.get('buttons.switchToDark');
    }
  }

  private switchTheme(newTheme: string): void {
    try {
      // Save theme preference
      ThemeManager.setTheme(newTheme);
      this.currentTheme = newTheme;

      // Update theme button states
      this.updateThemeButtons();

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch theme:', error);
    }
  }

  private showError(message: string): void {
    document.body.innerHTML = `
      <div class="error">
        <h1>${TranslationManager.get('messages.errorTitle')}</h1>
        <p>${message}</p>
      </div>
    `;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new JournalPromptsApp();
});
