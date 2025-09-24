export interface Task {
  id: string;
  name: string;
  assignee?: string;
  startDate: string;
  endDate: string;
  progress: number;
  manHours?: number;
}