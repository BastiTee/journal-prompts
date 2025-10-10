import { loadPrompts, getRandomPrompt, parseMarkdown, findPromptById } from './yaml-parser.ts';
import { CategoryGroup, Prompt } from './types.ts';
import './styles.css';

class JournalPromptsApp {
  private categoryGroups: CategoryGroup = {};
  private currentCategory: string = '';
  private currentPrompt: Prompt | null = null;
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

    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadAndDisplayCategories();
      this.setupEventListeners();
      this.handleDeepLink();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load journal prompts. Please refresh the page.');
    }
  }

  private async loadAndDisplayCategories(): Promise<void> {
    this.categoryGroups = await loadPrompts();
    this.populateDropdown();
  }

  private populateDropdown(): void {
    const categories = Object.keys(this.categoryGroups);
    
    // Clear existing options except the first one
    this.categoryDropdownEl.innerHTML = '<option value="">Select a category...</option>';
    
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
    this.togglePurposeBtnEl.title = 'Show the purpose of this exercise';

    this.categorySelectionEl.classList.add('hidden');
    this.promptDisplayEl.classList.remove('hidden');
    
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
    this.copyLinkBtnEl.addEventListener('click', () => this.copyCurrentLink());
  }

  private togglePurpose(): void {
    this.purposeVisible = !this.purposeVisible;
    
    if (this.purposeVisible) {
      this.promptPurposeEl.classList.remove('hidden');
      this.togglePurposeBtnEl.title = 'Hide the purpose of this exercise';
    } else {
      this.promptPurposeEl.classList.add('hidden');
      this.togglePurposeBtnEl.title = 'Show the purpose of this exercise';
    }
  }

  private showCategorySelection(): void {
    this.promptDisplayEl.classList.add('hidden');
    this.categorySelectionEl.classList.remove('hidden');
    this.categoryDropdownEl.value = '';
    this.currentCategory = '';
    this.currentPrompt = null;
    
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
      this.copyLinkBtnEl.title = 'Copied!';
      this.copyLinkBtnEl.classList.add('copied');
      
      setTimeout(() => {
        this.copyLinkBtnEl.title = originalTitle;
        this.copyLinkBtnEl.classList.remove('copied');
      }, 2000);
    } catch (error) {
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
      this.copyLinkBtnEl.title = 'Copied!';
      this.copyLinkBtnEl.classList.add('copied');
      setTimeout(() => {
        this.copyLinkBtnEl.title = originalTitle;
        this.copyLinkBtnEl.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Fallback copy failed:', error);
    }
    
    document.body.removeChild(textArea);
  }

  private showError(message: string): void {
    document.body.innerHTML = `
      <div class="error">
        <h1>Error</h1>
        <p>${message}</p>
      </div>
    `;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new JournalPromptsApp();
});
