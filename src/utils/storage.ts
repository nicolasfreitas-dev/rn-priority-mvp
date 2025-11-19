import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '../types/types';

const STORAGE_KEY = 'RN_TASKS_V1';

export async function loadTasksFromStorage(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) return [];
      return JSON.parse(raw) as Task[];

  } catch (error) {
      console.warn('Erro ao carregar tarefas:', error);

      return [];
  }
}

export async function saveTasksToStorage(tasks: Task[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

  } catch (error) {
    console.warn('Erro ao salvar tarefas:', error);
    
  }
}