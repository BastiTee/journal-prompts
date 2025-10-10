export interface Prompt {
  id: number;
  category: string;
  prompt: string;
  purpose: string;
}

export interface CategoryGroup {
  [category: string]: Prompt[];
}
