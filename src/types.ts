export interface Prompt {
  id: string;
  category: string;
  prompt: string;
  purpose: string;
}

export interface CategoryGroup {
  [category: string]: Prompt[];
}
