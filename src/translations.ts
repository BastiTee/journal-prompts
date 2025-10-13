// Translation system for the journal prompts app

interface Translations {
  page: {
    title: string;
  };
  categorySelection: {
    label: string;
    placeholder: string;
  };
  buttons: {
    showPurpose: string;
    hidePurpose: string;
    newPrompt: string;
    copyLink: string;
    goBack: string;
    switchToEnglish: string;
    switchToGerman: string;
  };
  messages: {
    loadError: string;
    errorTitle: string;
    copied: string;
  };
}

class TranslationManager {
  private static translations: Map<string, Translations> = new Map();
  private static currentLanguage: string = 'EN';

  static async initialize(language: string): Promise<void> {
    this.currentLanguage = language;
    
    if (!this.translations.has(language)) {
      try {
        const translationModule = await import(`./translations/${language.toLowerCase()}.json`);
        this.translations.set(language, translationModule.default);
      } catch (error) {
        console.warn(`Failed to load translations for language: ${language}`, error);
        // Fallback to English if available
        if (language !== 'EN' && !this.translations.has('EN')) {
          const fallbackModule = await import('./translations/en.json');
          this.translations.set('EN', fallbackModule.default);
          this.currentLanguage = 'EN';
        }
      }
    }
  }

  static setLanguage(language: string): void {
    if (this.translations.has(language)) {
      this.currentLanguage = language;
    }
  }

  static get(key: string): string {
    const translations = this.translations.get(this.currentLanguage);
    if (!translations) {
      console.warn(`No translations found for language: ${this.currentLanguage}`);
      return key;
    }

    // Navigate through nested object using dot notation
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} for language: ${this.currentLanguage}`);
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  static getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  static hasLanguage(language: string): boolean {
    return this.translations.has(language);
  }
}

export { TranslationManager, type Translations };
