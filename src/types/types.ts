export type Priority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  description?: string;
  expireAt?: string | null;
  estimatedMinutes?: number | null;
  completed?: boolean;
  priority?: Priority;
  priorityOverride?: Priority | null;
};
