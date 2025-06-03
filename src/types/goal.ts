
export interface Goal {
  id: string;
  title: string;
  isGenerating: boolean;
  isGenerated: boolean;
  checklist: ChecklistItem[];
  color: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}
