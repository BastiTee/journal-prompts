import * as yaml from 'js-yaml';
import { marked } from 'marked';
import { Prompt, CategoryGroup } from './types.ts';

// Configure marked for safe HTML rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export async function loadPrompts(): Promise<CategoryGroup> {
  try {
    const response = await fetch('/journal-prompts/prompts_EN.yaml');
    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: ${response.statusText}`);
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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading prompts:', error);
    throw error;
  }
}

export function getRandomPrompt(prompts: Prompt[]): Prompt {
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex];
}

export function parseMarkdown(text: string): string {
  return marked(text);
}

export function findPromptById(categoryGroups: CategoryGroup, id: number): Prompt | null {
  for (const category in categoryGroups) {
    const prompt = categoryGroups[category].find(p => p.id === id);
    if (prompt) {
      return prompt;
    }
  }
  return null;
}
