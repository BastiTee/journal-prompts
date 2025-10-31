import { loadPrompts, getRandomPrompt, parseMarkdown, findPromptById } from './yaml-parser.ts';
import { CategoryGroup, Prompt } from './types.ts';
import { TranslationManager } from './translations.ts';
import { replaceIcon } from './icons.ts';
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
  private categorySelectEl!: HTMLSelectElement;
  private promptTextEl!: HTMLElement;
  private promptPurposeEl!: HTMLElement;
  private togglePurposeBtnEl!: HTMLElement;
  private newPromptBtnEl!: HTMLElement;
  private copyLinkBtnEl!: HTMLElement;
  private pinBtnEl!: HTMLElement;
  private languageSwitcherEl!: HTMLElement;
  private themeSwitcherEl!: HTMLElement;
  private statusNotificationEl!: HTMLElement;
  private statusMessageEl!: HTMLElement;
  private purposeVisible: boolean = false;
  private settingsVisible: boolean = false;
  private settingsContainerEl!: HTMLElement;
  private settingsToggleEl!: HTMLElement;
  private wasOpenedWithDeepLink: boolean = false;

  constructor() {
    try {
      // Get main elements
      this.promptDisplayEl = document.getElementById('prompt-display')!;
      this.categorySelectEl = document.getElementById('category-select')! as HTMLSelectElement;
      this.languageSwitcherEl = document.getElementById('language-switcher')!;
      this.themeSwitcherEl = document.getElementById('theme-switcher')!;
      this.statusNotificationEl = document.getElementById('status-notification')!;
      this.statusMessageEl = document.querySelector('.status-message')!;

      // Verify main elements exist
      if (!this.promptDisplayEl) {
        throw new Error('Prompt display element not found');
      }
      if (!this.categorySelectEl) {
        throw new Error('Category select element not found');
      }
      if (!this.languageSwitcherEl) {
        throw new Error('Language switcher element not found');
      }
      if (!this.themeSwitcherEl) {
        throw new Error('Theme switcher element not found');
      }
      if (!this.statusNotificationEl) {
        throw new Error('Status notification element not found');
      }
      if (!this.statusMessageEl) {
        throw new Error('Status message element not found');
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

      // Get settings elements
      this.settingsContainerEl = document.querySelector('.settings-container')!;
      this.settingsToggleEl = document.getElementById('settings-toggle')!;

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

      // Verify settings elements exist
      if (!this.settingsContainerEl) {
        throw new Error('Settings container element not found');
      }
      if (!this.settingsToggleEl) {
        throw new Error('Settings toggle element not found');
      }

      // Replace all icons with Lucide icons
      this.replaceAllIcons();

      void this.init();
    } catch (error) {
      console.error('Constructor error:', error);
      // Show fallback error message since translations might not be initialized yet
      document.body.innerHTML = `<div class="error"><h1>Error</h1><p>Failed to initialize app: ${error}</p></div>`;
    }
  }

  private replaceAllIcons(): void {
    // Replace action button icons
    replaceIcon(this.newPromptBtnEl, 'reload');
    replaceIcon(this.pinBtnEl, 'pin');
    replaceIcon(this.copyLinkBtnEl, 'link');
    replaceIcon(this.togglePurposeBtnEl, 'question');

    // Replace hamburger menu icon
    const settingsToggle = document.getElementById('settings-toggle');
    if (settingsToggle) {
      replaceIcon(settingsToggle, 'menu');
    }

    // Replace theme switcher icons
    const lightThemeBtn = document.getElementById('theme-light');
    const darkThemeBtn = document.getElementById('theme-dark');
    
    if (lightThemeBtn) {
      replaceIcon(lightThemeBtn, 'sun');
    }
    if (darkThemeBtn) {
      replaceIcon(darkThemeBtn, 'moon');
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
      
      // Remove loading class to show the app gracefully
      this.finishLoading();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize app:', error);
      this.showError(TranslationManager.get('messages.loadError'));
      // Still remove loading class even on error
      this.finishLoading();
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

    // Update select placeholder only if no category is selected
    if (!this.currentPrompt) {
      this.updateSelectPlaceholder();
    }

    // Update button tooltips
    this.updateButtonTooltips();

    // Update language switcher tooltips
    this.updateLanguageSwitcherTooltips();

    // Update theme switcher tooltips
    this.updateThemeSwitcherTooltips();
  }

  private updateSelectPlaceholder(): void {
    const placeholder = this.categorySelectEl.querySelector('option[value=""]') as HTMLOptionElement;
    if (placeholder) {
      placeholder.textContent = TranslationManager.get('categorySelection.placeholder');
    }
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
    this.populateSelect();
  }

  private populateSelect(): void {
    const categories = Object.keys(this.categoryGroups);

    // Clear existing options (except placeholder)
    const placeholder = this.categorySelectEl.querySelector('option[value=""]');
    this.categorySelectEl.innerHTML = '';
    
    // Re-add placeholder
    if (placeholder) {
      this.categorySelectEl.appendChild(placeholder);
    }

    // Add category options
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      this.categorySelectEl.appendChild(option);
    });

    // Force Safari iOS to re-apply text centering after populating options
    this.forceSafariCenteringRefresh();
  }

  private forceSafariCenteringRefresh(): void {
    // Force Safari iOS to re-apply text centering by temporarily changing and restoring styles
    // This works around Safari's issue where it doesn't re-apply text centering after DOM changes
    const originalDisplay = this.categorySelectEl.style.display;
    this.categorySelectEl.style.display = 'none';
    
    // Force a reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.categorySelectEl.offsetHeight;
    
    // Restore display and trigger another reflow
    this.categorySelectEl.style.display = originalDisplay;
    
    // Additional Safari iOS specific fix: temporarily change text-align
    const originalTextAlign = this.categorySelectEl.style.textAlign;
    this.categorySelectEl.style.textAlign = 'left';
    
    // Force another reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.categorySelectEl.offsetHeight;
    
    // Restore text-align to center (or remove to use CSS)
    this.categorySelectEl.style.textAlign = originalTextAlign || '';
    
    // Final reflow to ensure changes are applied
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this.categorySelectEl.offsetHeight;
    }, 0);
  }

  private onCategoryChange(): void {
    const selectedCategory = this.categorySelectEl.value;
    if (selectedCategory) {
      this.selectCategory(selectedCategory);
      this.setPinned(true); // Auto-pin when selecting a category
      this.showStatus(TranslationManager.get('messages.categoryPinned'));
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
    // When clicking reload button, reset deep link state and clean URL
    this.wasOpenedWithDeepLink = false;
    this.clearUrl();

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
    const wasPinned = this.isPinned;
    this.setPinned(!this.isPinned);
    
    // Show appropriate status message
    if (this.isPinned) {
      this.showStatus(TranslationManager.get('messages.categoryPinned'));
    } else {
      this.showStatus(TranslationManager.get('messages.categoryUnpinned'));
    }
  }

  private displayPrompt(prompt: Prompt): void {
    this.currentPrompt = prompt;
    this.categorySelectEl.value = prompt.category;
    this.promptTextEl.innerHTML = parseMarkdown(prompt.prompt);
    this.promptPurposeEl.textContent = prompt.purpose;

    // Reset purpose visibility
    this.purposeVisible = false;
    this.promptPurposeEl.classList.add('hidden');
    this.togglePurposeBtnEl.title = TranslationManager.get('buttons.showPurpose');

    // Update current category but don't auto-pin unless user selected it
    this.currentCategory = prompt.category;

    // Only update URL if this was opened with a deep link
    if (this.wasOpenedWithDeepLink) {
      this.updateUrl(prompt);
    }
  }

  private setupEventListeners(): void {
    // Category select event listener
    this.categorySelectEl.addEventListener('change', () => this.onCategoryChange());

    this.togglePurposeBtnEl.addEventListener('click', () => this.togglePurpose());
    this.newPromptBtnEl.addEventListener('click', () => this.selectNewPrompt());
    this.copyLinkBtnEl.addEventListener('click', () => void this.copyCurrentLink());
    this.pinBtnEl.addEventListener('click', () => this.togglePin());

    // Setup hamburger menu toggle
    this.setupSettingsMenu();
  }

  private togglePurpose(): void {
    this.purposeVisible = !this.purposeVisible;

    if (this.purposeVisible) {
      this.promptPurposeEl.classList.remove('hidden');
      this.togglePurposeBtnEl.classList.add('active');
      this.togglePurposeBtnEl.title = TranslationManager.get('buttons.hidePurpose');
    } else {
      this.promptPurposeEl.classList.add('hidden');
      this.togglePurposeBtnEl.classList.remove('active');
      this.togglePurposeBtnEl.title = TranslationManager.get('buttons.showPurpose');
    }
  }


  private updateUrl(prompt: Prompt): void {
    const params = new URLSearchParams();
    params.set('id', prompt.id);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }

  private clearUrl(): void {
    // Clear URL parameters, keeping only the pathname
    const cleanUrl = window.location.pathname;
    window.history.pushState({}, '', cleanUrl);
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
        this.wasOpenedWithDeepLink = true;
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
        this.wasOpenedWithDeepLink = true;
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
      this.wasOpenedWithDeepLink = true;
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
      // If URL is clean (no ID parameter), add current prompt ID first
      if (!this.wasOpenedWithDeepLink && this.currentPrompt) {
        this.updateUrl(this.currentPrompt);
      }

      await navigator.clipboard.writeText(window.location.href);

      // Show status notification
      this.showStatus(TranslationManager.get('messages.linkSaved'));

      // Show temporary visual feedback on button
      this.copyLinkBtnEl.classList.add('copied');
      setTimeout(() => {
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
    // If URL is clean (no ID parameter), add current prompt ID first
    if (!this.wasOpenedWithDeepLink && this.currentPrompt) {
      this.updateUrl(this.currentPrompt);
    }

    const textArea = document.createElement('textarea');
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');

      // Show status notification
      this.showStatus(TranslationManager.get('messages.linkSaved'));

      // Show temporary visual feedback on button
      this.copyLinkBtnEl.classList.add('copied');
      setTimeout(() => {
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

  private setupSettingsMenu(): void {
    // Initialize settings as hidden
    this.settingsVisible = false;
    this.settingsContainerEl.classList.add('settings-hidden');
    
    // Add click handler for toggle functionality
    this.settingsToggleEl.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleSettings();
    });
  }

  private toggleSettings(): void {
    this.settingsVisible = !this.settingsVisible;
    
    if (this.settingsVisible) {
      // Show controls
      this.settingsContainerEl.classList.remove('settings-hidden');
      this.settingsContainerEl.classList.add('settings-visible');
      this.settingsToggleEl.classList.add('active');
    } else {
      // Hide controls
      this.settingsContainerEl.classList.remove('settings-visible');
      this.settingsContainerEl.classList.add('settings-hidden');
      this.settingsToggleEl.classList.remove('active');
    }
  }

  private showStatus(message: string): void {
    // Update status message text
    this.statusMessageEl.textContent = message;
    
    // Show notification
    this.statusNotificationEl.classList.remove('hidden');
    this.statusNotificationEl.classList.add('show');
    
    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      this.statusNotificationEl.classList.remove('show');
      this.statusNotificationEl.classList.add('hidden');
    }, 2500);
  }

  private showError(message: string): void {
    document.body.innerHTML = `
      <div class="error">
        <h1>${TranslationManager.get('messages.errorTitle')}</h1>
        <p>${message}</p>
      </div>
    `;
  }

  private finishLoading(): void {
    // Remove loading class to show the app gracefully
    document.body.classList.remove('loading');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new JournalPromptsApp();
});
