import { computePriorityFromTaskData } from '../computePriority';

describe('computePriority heuristics', () => {
  it('aplica prioridade média quando título contém palavra urgente', () => {
    const priority = computePriorityFromTaskData({ title: 'Pagar boleto', expireAt: null, estimatedMinutes: null });
    
    expect(priority).toBe('medium');
  });

  it('aplica prioridade alta para tarefas com prazo passado', () => {
    const priority = computePriorityFromTaskData({ title: 'Tarefa antiga', expireAt: '2000-01-01T00:00:00Z', estimatedMinutes: null });

    expect(priority).toBe('high');
  });
});