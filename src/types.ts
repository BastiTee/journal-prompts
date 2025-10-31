export interface Prompt {
  id: string;
  category: string;
  prompt: string;
  purpose: string;
}

export interface CategoryGroup {
  [category: string]: Prompt[];
}

// New interfaces for ultra-clean multilingual structure
export interface PromptTranslation {
  prompt: string;
  purpose: string;
}

export interface CleanPrompt {
  id: number;
  [languageCode: string]: PromptTranslation | number;
}

export interface CleanCategory {
  [languageCode: string]: string | CleanPrompt[];
  prompts: CleanPrompt[];
}

export interface CleanPromptsData {
  categories: {
    [categoryId: string]: CleanCategory;
  };
}

// Legacy interfaces for backward compatibility
export interface CategoryTranslation {
  [languageCode: string]: string;
}

export interface Category {
  id: string;
  translations: CategoryTranslation;
}

export interface MultilingualPrompt {
  id: number;
  category_id: string;
  translations: {
    [languageCode: string]: PromptTranslation;
  };
}

export interface PromptsData {
  categories: Category[];
  prompts: MultilingualPrompt[];
}
