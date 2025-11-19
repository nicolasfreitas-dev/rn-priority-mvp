import { differenceInHours, isToday, isBefore, parseISO } from 'date-fns';
import type { Task, Priority } from '../types/types';

export function computePriorityFromTaskData(taskData: Pick<Task, 'title' | 'expireAt' | 'estimatedMinutes'>): Priority {
  let score = 0;
  const normalizedTitle = (taskData.title || '').toLowerCase();

  const urgentKeywords = ['pagar', 'entrega', 'reunião', 'urgente', 'imediato', 'prazo'];

  for (const keyword of urgentKeywords) {
    if (normalizedTitle.includes(keyword)) {
      score += 2;
      break;
    }
  }

  if (taskData.expireAt) {
    const expireAtDate = typeof taskData.expireAt === 'string' ? parseISO(taskData.expireAt) : (taskData.expireAt as any);
    const now = new Date();

    if (isBefore(expireAtDate, now)) {
      score += 4;

    } else if (isToday(expireAtDate)) {
      score += 3;

    } else {
      const hoursUntilDue = differenceInHours(expireAtDate, now);

      if (hoursUntilDue <= 48 && hoursUntilDue > 24) score += 2;
      else if (hoursUntilDue <= 24 && hoursUntilDue >= 0) score += 3;
    }
  }

  const estimated = Number(taskData.estimatedMinutes || 0);

  if (estimated >= 120) score += 2;
  else if (estimated >= 60) score += 1;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  
  return 'low';
}

export const computePriority = computePriorityFromTaskData;