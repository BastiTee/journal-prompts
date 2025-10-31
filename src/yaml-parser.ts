import * as yaml from 'js-yaml';
import { marked } from 'marked';
import { Prompt, CategoryGroup, CleanPromptsData, PromptsData, Category } from './types.ts';

// Configure marked for safe HTML rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export async function loadPrompts(language: string = 'EN'): Promise<CategoryGroup> {
  try {
    // Try to load from new unified file first
    try {
      return await loadPromptsFromUnified(language);
    } catch (unifiedError) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load from unified file, trying legacy format:', unifiedError);

      // Fallback to legacy format for backward compatibility
      return await loadPromptsLegacy(language);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading prompts:', error);
    throw error;
  }
}

async function loadPromptsFromUnified(language: string): Promise<CategoryGroup> {
  const response = await fetch('./journal-prompts.yaml');
  if (!response.ok) {
    throw new Error(`Failed to fetch unified prompts: ${response.statusText}`);
  }

  const yamlText = await response.text();

  // Try to load as clean structure first
  try {
    return loadPromptsFromCleanStructure(yamlText, language);
  } catch (cleanError) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load clean structure, trying nested format:', cleanError);

    // Fallback to nested structure
    return loadPromptsFromNestedStructure(yamlText, language);
  }
}

function loadPromptsFromCleanStructure(yamlText: string, language: string): CategoryGroup {
  const data = yaml.load(yamlText) as CleanPromptsData;

  if (!data || !data.categories || typeof data.categories !== 'object') {
    throw new Error('Invalid clean prompts data structure - missing categories');
  }

  const prompts: Prompt[] = [];
  const languageCode = language.toLowerCase();

  // Process each category
  for (const [categoryId, category] of Object.entries(data.categories)) {
    if (!category.prompts || !Array.isArray(category.prompts)) {
      // eslint-disable-next-line no-console
      console.warn(`Category ${categoryId} missing prompts array, skipping`);
      continue;
    }

    // Get category name in requested language with fallback to English
    const categoryName = (category[languageCode] as string) || (category.en as string) || categoryId;

    // Process each prompt in this category
    for (const cleanPrompt of category.prompts) {
      const translation = cleanPrompt[languageCode] as { prompt: string; purpose: string } | undefined;

      if (!translation || typeof translation !== 'object' || !translation.prompt || !translation.purpose) {
        // Fallback to English if requested language not available
        const fallbackTranslation = cleanPrompt.en as { prompt: string; purpose: string } | undefined;
        if (fallbackTranslation && typeof fallbackTranslation === 'object' && fallbackTranslation.prompt && fallbackTranslation.purpose) {
          // eslint-disable-next-line no-console
          console.warn(`Missing ${language} translation for prompt ${categoryId}${cleanPrompt.id}, using English fallback`);
          prompts.push({
            id: `${categoryId}${cleanPrompt.id}`, // Reconstruct combined ID for compatibility
            category: categoryName,
            prompt: fallbackTranslation.prompt.trim(),
            purpose: fallbackTranslation.purpose.trim(),
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn(`No translation available for prompt ${categoryId}${cleanPrompt.id}, skipping`);
        }
        continue;
      }

      prompts.push({
        id: `${categoryId}${cleanPrompt.id}`, // Reconstruct combined ID for compatibility
        category: categoryName,
        prompt: translation.prompt.trim(),
        purpose: translation.purpose.trim(),
      });
    }
  }

  // Group prompts by category
  const grouped: CategoryGroup = {};
  prompts.forEach(prompt => {
    if (!grouped[prompt.category]) {
      grouped[prompt.category] = [];
    }
    grouped[prompt.category].push(prompt);
  });

  return grouped;
}

function loadPromptsFromNestedStructure(yamlText: string, language: string): CategoryGroup {
  const data = yaml.load(yamlText) as PromptsData;

  if (!data || !data.prompts || !Array.isArray(data.prompts) || !data.categories || !Array.isArray(data.categories)) {
    throw new Error('Invalid nested prompts data structure - missing prompts or categories');
  }

  const prompts: Prompt[] = [];
  const languageCode = language.toLowerCase();

  // Create category lookup map
  const categoryMap = new Map<string, Category>();
  data.categories.forEach(category => {
    categoryMap.set(category.id, category);
  });

  for (const multiPrompt of data.prompts) {
    const translation = multiPrompt.translations[languageCode];
    const category = categoryMap.get(multiPrompt.category_id);

    if (!category) {
      // eslint-disable-next-line no-console
      console.warn(`Category not found for ID ${multiPrompt.category_id}, skipping prompt ${multiPrompt.id}`);
      continue;
    }

    // Get category name in requested language with fallback to English
    const categoryName = category.translations[languageCode] || category.translations.en || multiPrompt.category_id;

    if (!translation) {
      // Fallback to English if requested language not available
      const fallbackTranslation = multiPrompt.translations.en;
      if (fallbackTranslation) {
        // eslint-disable-next-line no-console
        console.warn(`Missing ${language} translation for prompt ${multiPrompt.category_id}${multiPrompt.id}, using English fallback`);
        prompts.push({
          id: `${multiPrompt.category_id}${multiPrompt.id}`, // Reconstruct combined ID for compatibility
          category: categoryName,
          prompt: fallbackTranslation.prompt.trim(),
          purpose: fallbackTranslation.purpose.trim(),
        });
      } else {
        // eslint-disable-next-line no-console
        console.warn(`No translation available for prompt ${multiPrompt.category_id}${multiPrompt.id}, skipping`);
      }
      continue;
    }

    prompts.push({
      id: `${multiPrompt.category_id}${multiPrompt.id}`, // Reconstruct combined ID for compatibility
      category: categoryName,
      prompt: translation.prompt.trim(),
      purpose: translation.purpose.trim(),
    });
  }

  // Group prompts by category
  const grouped: CategoryGroup = {};
  prompts.forEach(prompt => {
    if (!grouped[prompt.category]) {
      grouped[prompt.category] = [];
    }
    grouped[prompt.category].push(prompt);
  });

  return grouped;
}

async function loadPromptsLegacy(language: string): Promise<CategoryGroup> {
  const response = await fetch(`./prompts_${language}.yaml`);
  if (!response.ok) {
    throw new Error(`Failed to fetch legacy prompts: ${response.statusText}`);
  }

  const yamlText = await response.text();
  const documents = yamlText.split('---').filter(doc => doc.trim());

  const prompts: Prompt[] = documents.map(doc => {
    const parsed = yaml.load(doc.trim()) as Prompt;
    return {
      id: parsed.id,
      category: parsed.category,
      prompt: parsed.prompt.trim(),
      purpose: parsed.purpose.trim(),
    };
  });

  // Group prompts by category
  const grouped: CategoryGroup = {};
  prompts.forEach(prompt => {
    if (!grouped[prompt.category]) {
      grouped[prompt.category] = [];
    }
    grouped[prompt.category].push(prompt);
  });

  return grouped;
}

export function getRandomPrompt(prompts: Prompt[]): Prompt {
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex];
}

export function parseMarkdown(text: string): string {
  return marked(text) as string;
}

export function findPromptById(categoryGroups: CategoryGroup, id: string): Prompt | null {
  for (const category in categoryGroups) {
    const prompt = categoryGroups[category].find(p => p.id === id);
    if (prompt) {
      return prompt;
    }
  }
  return null;
}
