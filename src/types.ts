export interface Prompt {
  id: string;
  category: string;
  prompt: string;
  purpose: string;
}

export interface CategoryGroup {
  [category: string]: Prompt[];
}

// New interfaces for multilingual structure
export interface PromptTranslation {
  prompt: string;
  purpose: string;
}

export interface MultilingualPrompt {
  id: string;
  category: string;
  translations: {
    [languageCode: string]: PromptTranslation;
  };
}

export interface PromptsData {
  prompts: MultilingualPrompt[];
}
