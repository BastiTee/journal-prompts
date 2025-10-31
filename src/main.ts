import { loadPrompts, getRandomPrompt, parseMarkdown, findPromptById } from './yaml-parser.ts';
import { CategoryGroup, Prompt } from './types.ts';
import { TranslationManager } from './translations.ts';
import { replaceIcon } from './icons.ts';
import { forceSafariCenteringRefresh, getElementById, querySelector } from './utils.ts';
import { SettingsManager } from './settings.ts';
import {
  TIMING,
  SELECTORS,
  ELEMENT_IDS,
  CSS_CLASSES,
  type Language,
  type Theme
} from './constants.ts';
import './styles.css';


class JournalPromptsApp {
  private categoryGroups: CategoryGroup = {};
  private currentCategory: string = '';
  private currentPrompt: Prompt | null = null;
  private currentLanguage: Language = 'EN';
  private currentTheme: Theme = 'light';
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
      this.promptDisplayEl = getElementById(ELEMENT_IDS.PROMPT_DISPLAY, 'Prompt display');
      this.categorySelectEl = getElementById<HTMLSelectElement>(ELEMENT_IDS.CATEGORY_SELECT, 'Category select');
      this.languageSwitcherEl = getElementById(ELEMENT_IDS.LANGUAGE_SWITCHER, 'Language switcher');
      this.themeSwitcherEl = getElementById(ELEMENT_IDS.THEME_SWITCHER, 'Theme switcher');
      this.statusNotificationEl = getElementById(ELEMENT_IDS.STATUS_NOTIFICATION, 'Status notification');
      this.statusMessageEl = querySelector(SELECTORS.STATUS_MESSAGE, 'Status message');

      // Get prompt elements
      this.promptTextEl = querySelector(SELECTORS.PROMPT_TEXT, 'Prompt text');
      this.promptPurposeEl = querySelector(SELECTORS.PROMPT_PURPOSE, 'Prompt purpose');

      // Get button elements
      this.togglePurposeBtnEl = getElementById(ELEMENT_IDS.TOGGLE_PURPOSE_BTN, 'Toggle purpose button');
      this.newPromptBtnEl = getElementById(ELEMENT_IDS.NEW_PROMPT_BTN, 'New prompt button');
      this.copyLinkBtnEl = getElementById(ELEMENT_IDS.COPY_LINK_BTN, 'Copy link button');
      this.pinBtnEl = getElementById(ELEMENT_IDS.PIN_BTN, 'Pin button');

      // Get settings elements
      this.settingsContainerEl = querySelector(SELECTORS.SETTINGS_CONTAINER, 'Settings container');
      this.settingsToggleEl = getElementById(ELEMENT_IDS.SETTINGS_TOGGLE, 'Settings toggle');

      // Replace all icons with Lucide icons
      this.replaceAllIcons();

      void this.init();
    } catch (error) {
      console.error('Constructor error:', error);
      // Show fallback error message since translations might not be initialized yet
      document.body.innerHTML = `<div class="error"><h1>Error</h1><p>Failed to initialize app: ${String(error)}</p></div>`;
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
    this.currentLanguage = SettingsManager.getCurrentLanguage();
    document.documentElement.lang = this.currentLanguage.toLowerCase();
  }

  private initializeTheme(): void {
    this.currentTheme = SettingsManager.getCurrentTheme();
    SettingsManager.setTheme(this.currentTheme);
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
    forceSafariCenteringRefresh(this.categorySelectEl);
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
      this.pinBtnEl.classList.add(CSS_CLASSES.PINNED);
    } else {
      this.pinBtnEl.classList.remove(CSS_CLASSES.PINNED);
    }
    this.updateButtonTooltips();
  }

  private togglePin(): void {
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

    // Apply the user's purpose visibility preference instead of resetting to false
    this.updatePurposeDisplay();

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

  private updatePurposeDisplay(): void {
    if (this.purposeVisible) {
      this.promptPurposeEl.classList.remove(CSS_CLASSES.HIDDEN);
      this.togglePurposeBtnEl.classList.add(CSS_CLASSES.ACTIVE);
      this.togglePurposeBtnEl.title = TranslationManager.get('buttons.hidePurpose');
    } else {
      this.promptPurposeEl.classList.add(CSS_CLASSES.HIDDEN);
      this.togglePurposeBtnEl.classList.remove(CSS_CLASSES.ACTIVE);
      this.togglePurposeBtnEl.title = TranslationManager.get('buttons.showPurpose');
    }
  }

  private togglePurpose(): void {
    this.purposeVisible = !this.purposeVisible;
    this.updatePurposeDisplay();
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
      this.copyLinkBtnEl.classList.add(CSS_CLASSES.COPIED);
      setTimeout(() => {
        this.copyLinkBtnEl.classList.remove(CSS_CLASSES.COPIED);
      }, TIMING.COPY_FEEDBACK_DURATION);
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
      this.copyLinkBtnEl.classList.add(CSS_CLASSES.COPIED);
      setTimeout(() => {
        this.copyLinkBtnEl.classList.remove(CSS_CLASSES.COPIED);
      }, TIMING.COPY_FEEDBACK_DURATION);
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
        if (language && language !== this.currentLanguage && SettingsManager.isLanguageSupported(language)) {
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

  private async switchLanguage(newLanguage: Language): Promise<void> {
    try {
      // Save language preference
      SettingsManager.setLanguage(newLanguage);
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
        if (theme && theme !== this.currentTheme && SettingsManager.isThemeSupported(theme)) {
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

  private switchTheme(newTheme: Theme): void {
    try {
      // Save theme preference
      SettingsManager.setTheme(newTheme);
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
