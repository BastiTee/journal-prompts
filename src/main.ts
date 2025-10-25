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

}

class JournalPromptsApp {
  private categoryGroups: CategoryGroup = {};
  private currentCategory: string = '';
  private currentPrompt: Prompt | null = null;
  private currentLanguage: string = '';
  private currentTheme: string = '';
  private isPinned: boolean = false;
  private promptDisplayEl!: HTMLElement;
  private categoryDropdownEl!: HTMLElement;
  private dropdownTriggerEl!: HTMLButtonElement;
  private dropdownMenuEl!: HTMLElement;
  private dropdownContentEl!: HTMLElement;
  private dropdownTextEl!: HTMLElement;
  private promptTextEl!: HTMLElement;
  private promptPurposeEl!: HTMLElement;
  private togglePurposeBtnEl!: HTMLElement;
  private newPromptBtnEl!: HTMLElement;
  private copyLinkBtnEl!: HTMLElement;
  private pinBtnEl!: HTMLElement;
  private languageSwitcherEl!: HTMLElement;
  private themeSwitcherEl!: HTMLElement;
  private purposeVisible: boolean = false;

  constructor() {
    try {
      // Get main elements
      this.promptDisplayEl = document.getElementById('prompt-display')!;
      this.categoryDropdownEl = document.getElementById('category-dropdown')!;
      this.languageSwitcherEl = document.getElementById('language-switcher')!;
      this.themeSwitcherEl = document.getElementById('theme-switcher')!;

      // Verify main elements exist
      if (!this.promptDisplayEl) {
        throw new Error('Prompt display element not found');
      }
      if (!this.categoryDropdownEl) {
        throw new Error('Category dropdown element not found');
      }
      if (!this.languageSwitcherEl) {
        throw new Error('Language switcher element not found');
      }
      if (!this.themeSwitcherEl) {
        throw new Error('Theme switcher element not found');
      }

      // Get dropdown elements
      this.dropdownTriggerEl = this.categoryDropdownEl.querySelector('.dropdown-trigger') as HTMLButtonElement;
      this.dropdownMenuEl = this.categoryDropdownEl.querySelector('.dropdown-menu')!;
      this.dropdownContentEl = this.categoryDropdownEl.querySelector('.dropdown-content')!;
      this.dropdownTextEl = this.categoryDropdownEl.querySelector('.dropdown-text')!;

      // Verify dropdown elements exist
      if (!this.dropdownTriggerEl) {
        throw new Error('Dropdown trigger element not found');
      }
      if (!this.dropdownMenuEl) {
        throw new Error('Dropdown menu element not found');
      }
      if (!this.dropdownContentEl) {
        throw new Error('Dropdown content element not found');
      }
      if (!this.dropdownTextEl) {
        throw new Error('Dropdown text element not found');
      }

      // Get prompt elements
      this.promptTextEl = document.querySelector('.prompt-text')!;
      this.promptPurposeEl = document.querySelector('.prompt-purpose')!;

      // Verify prompt elements exist
      if (!this.promptTextEl) {
        throw new Error('Prompt text element not found');
      }
      if (!this.promptPurposeEl) {
        throw new Error('Prompt purpose element not found');
      }

      // Get button elements
      this.togglePurposeBtnEl = document.getElementById('toggle-purpose-btn')!;
      this.newPromptBtnEl = document.getElementById('new-prompt-btn')!;
      this.copyLinkBtnEl = document.getElementById('copy-link-btn')!;
      this.pinBtnEl = document.getElementById('pin-btn')!;

      // Verify button elements exist
      if (!this.togglePurposeBtnEl) {
        throw new Error('Toggle purpose button element not found');
      }
      if (!this.newPromptBtnEl) {
        throw new Error('New prompt button element not found');
      }
      if (!this.copyLinkBtnEl) {
        throw new Error('Copy link button element not found');
      }
      if (!this.pinBtnEl) {
        throw new Error('Pin button element not found');
      }

      void this.init();
    } catch (error) {
      console.error('Constructor error:', error);
      // Show fallback error message since translations might not be initialized yet
      document.body.innerHTML = `<div class="error"><h1>Error</h1><p>Failed to initialize app: ${error}</p></div>`;
    }
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
      
      // Ensure prompts are loaded before handling deep links or loading initial prompt
      if (Object.keys(this.categoryGroups).length > 0) {
        // Check for deep link first
        const hasDeepLink = this.handleDeepLink();
        
        // If no deep link, load random prompt from any category
        if (!hasDeepLink) {
          this.loadRandomPromptFromAnyCategory();
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('No prompts loaded, cannot initialize app');
      }
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

    // Update app title
    const appTitle = document.querySelector('.app-title') as HTMLElement;
    if (appTitle) {
      appTitle.innerHTML = TranslationManager.get('categorySelection.label');
    }

    // Update dropdown placeholder only if no category is selected
    if (!this.currentPrompt) {
      this.updateDropdownPlaceholder();
    }

    // Update button tooltips
    this.updateButtonTooltips();

    // Update language switcher tooltips
    this.updateLanguageSwitcherTooltips();

    // Update theme switcher tooltips
    this.updateThemeSwitcherTooltips();
  }

  private updateDropdownPlaceholder(): void {
    this.dropdownTextEl.textContent = TranslationManager.get('categorySelection.placeholder');
  }

  private updateButtonTooltips(): void {
    // Update purpose toggle button tooltip based on current state
    this.togglePurposeBtnEl.title = this.purposeVisible 
      ? TranslationManager.get('buttons.hidePurpose')
      : TranslationManager.get('buttons.showPurpose');

    // Update other button tooltips
    this.newPromptBtnEl.title = this.isPinned 
      ? TranslationManager.get('buttons.newPrompt')
      : TranslationManager.get('buttons.newPromptFromAnyCategory');
    this.copyLinkBtnEl.title = TranslationManager.get('buttons.copyLink');
    
    // Update pin button tooltip and aria-label
    this.pinBtnEl.title = this.isPinned 
      ? TranslationManager.get('buttons.unpinCategory')
      : TranslationManager.get('buttons.pinCategory');
    this.pinBtnEl.setAttribute('aria-label', TranslationManager.get('buttons.pinCategory'));
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

    // Clear existing content
    this.dropdownContentEl.innerHTML = '';

    // Add category options
    categories.forEach(category => {
      const option = document.createElement('button');
      option.className = 'dropdown-option';
      option.textContent = category;
      option.setAttribute('data-value', category);
      option.addEventListener('click', () => this.selectDropdownOption(category));
      this.dropdownContentEl.appendChild(option);
    });
  }

  private selectDropdownOption(category: string): void {
    this.dropdownTextEl.textContent = category;
    this.closeDropdown();
    this.selectCategory(category);
    this.setPinned(true); // Auto-pin when selecting a category
  }

  private openDropdown(): void {
    this.dropdownTriggerEl.setAttribute('aria-expanded', 'true');
    this.dropdownMenuEl.setAttribute('aria-hidden', 'false');
  }

  private closeDropdown(): void {
    this.dropdownTriggerEl.setAttribute('aria-expanded', 'false');
    this.dropdownMenuEl.setAttribute('aria-hidden', 'true');
  }

  private toggleDropdown(): void {
    const isOpen = this.dropdownTriggerEl.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private selectCategory(category: string): void {
    this.currentCategory = category;
    const prompts = this.categoryGroups[category];
    const selectedPrompt = getRandomPrompt(prompts);
    this.displayPrompt(selectedPrompt);
  }

  private loadRandomPromptFromAnyCategory(): void {
    // Get all prompts from all categories
    const allPrompts: Prompt[] = [];
    Object.values(this.categoryGroups).forEach(categoryPrompts => {
      allPrompts.push(...categoryPrompts);
    });

    if (allPrompts.length > 0) {
      const randomPrompt = getRandomPrompt(allPrompts);
      this.currentCategory = randomPrompt.category;
      this.displayPrompt(randomPrompt);
    }
  }

  private selectNewPrompt(): void {
    if (this.isPinned && this.currentCategory) {
      // Get new prompt from current category only
      const prompts = this.categoryGroups[this.currentCategory];
      let newPrompt = getRandomPrompt(prompts);

      // Ensure we don't show the same prompt twice in a row if there are multiple prompts
      if (prompts.length > 1 && this.currentPrompt) {
        while (newPrompt.prompt === this.currentPrompt.prompt) {
          newPrompt = getRandomPrompt(prompts);
        }
      }

      this.displayPrompt(newPrompt);
    } else {
      // Get random prompt from any category
      this.loadRandomPromptFromAnyCategory();
    }
  }

  private setPinned(pinned: boolean): void {
    this.isPinned = pinned;
    if (pinned) {
      this.pinBtnEl.classList.add('pinned');
    } else {
      this.pinBtnEl.classList.remove('pinned');
    }
    this.updateButtonTooltips();
  }

  private togglePin(): void {
    this.setPinned(!this.isPinned);
  }

  private displayPrompt(prompt: Prompt): void {
    this.currentPrompt = prompt;
    this.dropdownTextEl.textContent = prompt.category;
    this.promptTextEl.innerHTML = parseMarkdown(prompt.prompt);
    this.promptPurposeEl.textContent = prompt.purpose;

    // Reset purpose visibility
    this.purposeVisible = false;
    this.promptPurposeEl.classList.add('hidden');
    this.togglePurposeBtnEl.title = TranslationManager.get('buttons.showPurpose');

    // Update current category but don't auto-pin unless user selected it
    this.currentCategory = prompt.category;

    this.updateUrl(prompt);
  }

  private setupEventListeners(): void {
    // Custom dropdown event listeners
    this.dropdownTriggerEl.addEventListener('click', () => this.toggleDropdown());
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.categoryDropdownEl.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation for dropdown
    this.dropdownTriggerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleDropdown();
      } else if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    this.togglePurposeBtnEl.addEventListener('click', () => this.togglePurpose());
    this.newPromptBtnEl.addEventListener('click', () => this.selectNewPrompt());
    this.copyLinkBtnEl.addEventListener('click', () => void this.copyCurrentLink());
    this.pinBtnEl.addEventListener('click', () => this.togglePin());
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


  private updateUrl(prompt: Prompt): void {
    const params = new URLSearchParams();
    params.set('id', prompt.id);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }

  private handleDeepLink(): boolean {
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get('id');
    const category = params.get('category');

    // eslint-disable-next-line no-console
    console.log('Deep link handling - URL params:', {
      promptId,
      category,
      categoryGroupsLoaded: Object.keys(this.categoryGroups).length > 0,
      availableCategories: Object.keys(this.categoryGroups)
    });

    // Try new ID-based system first
    if (promptId) {
      const prompt = findPromptById(this.categoryGroups, promptId);
      if (prompt) {
        // eslint-disable-next-line no-console
        console.log('Deep link success - Found prompt by ID:', prompt);
        this.currentCategory = prompt.category;
        this.displayPrompt(prompt);
        return true;
      } else {
        // eslint-disable-next-line no-console
        console.warn('Deep link failed - Prompt ID not found:', promptId);
      }
    }

    // Fallback to old system for backwards compatibility
    const promptPrefix = params.get('prompt');
    if (category && this.categoryGroups[category] && promptPrefix) {
      const decodedPrefix = decodeURIComponent(promptPrefix);
      const prompts = this.categoryGroups[category];
      const matchingPrompt = prompts.find(p => p.prompt.startsWith(decodedPrefix));

      if (matchingPrompt) {
        // eslint-disable-next-line no-console
        console.log('Deep link success - Found prompt by prefix:', matchingPrompt);
        this.currentCategory = category;
        this.displayPrompt(matchingPrompt);
        return true;
      } else {
        // eslint-disable-next-line no-console
        console.warn('Deep link failed - Prompt prefix not found:', decodedPrefix);
      }
    }

    // Category-only fallback
    if (category && this.categoryGroups[category]) {
      // eslint-disable-next-line no-console
      console.log('Deep link fallback - Selecting random prompt from category:', category);
      this.selectCategory(category);
      this.setPinned(true); // Pin the category from deep link
      return true;
    }

    // If we get here, the deep link failed completely
    if (promptId || category) {
      // eslint-disable-next-line no-console
      console.warn('Deep link failed completely - falling back to random prompt');
      // Clear invalid URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }

    return false;
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
          // Prompt not found in new language, load random prompt
          this.loadRandomPromptFromAnyCategory();
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
