import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { loadTasksFromStorage, saveTasksToStorage } from '../utils/storage';
import type { Task, Priority } from '../types/types';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { computePriority } from '../utils/computePriority';
import { format } from 'date-fns';

export const TaskListScreen: React.FC = () => {
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<Priority | 'all'>('all');
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  useEffect(() => {
    if (isFocused) loadAndRefreshTasks();
  }, [isFocused]);

  async function loadAndRefreshTasks() {
    const storedTasks = await loadTasksFromStorage();

    const tasksWithPriority = storedTasks.map((task) => ({
      ...task,
      priority: task.priorityOverride ? task.priorityOverride : computePriority(task),
    }));

    tasksWithPriority.sort(sortTasksByPriorityAndExpireAt);

    setTaskList(tasksWithPriority);
  }

  function sortTasksByPriorityAndExpireAt(taskA: Task, taskB: Task) {
    const priorityScore = (priority: Priority | undefined) => (priority === 'high' ? 3 : priority === 'medium' ? 2 : 1);
    const scoreA = priorityScore(taskA.priority);
    const scoreB = priorityScore(taskB.priority);

    if (scoreA !== scoreB) return scoreB - scoreA;

    if (taskA.expireAt && taskB.expireAt) return new Date(taskA.expireAt).getTime() - new Date(taskB.expireAt).getTime();
    if (taskA.expireAt) return -1;
    if (taskB.expireAt) return 1;

    return taskA.title.localeCompare(taskB.title);
  }

  async function toggleTaskCompletion(taskId: string) {
    const updatedTasks = taskList.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task));

    setTaskList(updatedTasks);

    await saveTasksToStorage(updatedTasks);
  }

  async function deleteTaskById(taskId: string) {
    const remainingTasks = taskList.filter((task) => task.id !== taskId);

    setTaskList(remainingTasks);

    await saveTasksToStorage(remainingTasks);
  }

  function badgeStyle(priority: Priority) {
  if (priority === 'high')
    return { container: { backgroundColor: '#fff1f0' }, text: { color: '#dc2626' } };
  if (priority === 'medium')
    return { container: { backgroundColor: '#fffbeb' }, text: { color: '#b45309' } };
  return { container: { backgroundColor: '#ecfdf5' }, text: { color: '#059669' } };
}

  function renderTaskItem({ item }: { item: Task }) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, item.completed && styles.completedTitle]} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {item.expireAt ? (
            <Text style={styles.expireAt}>{format(new Date(item.expireAt), 'dd/MM/yyyy HH:mm')}</Text>
          ) : (
            <Text style={styles.expireAtPlaceholder}>Sem data</Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
          <View style={[styles.badge, badgeStyle(item.priority || 'low').container]}>
            <Text style={[styles.badgeText, badgeStyle(item.priority || 'low').text]}>{(item.priority || 'low').toUpperCase()}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => toggleTaskCompletion(item.id)} style={styles.actionButton}>
              <Text style={styles.actionText}>{item.completed ? 'Desmarcar' : 'Concluir'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Form' as any, { id: item.id })} style={styles.actionButton}>
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteTaskById(item.id)} style={[styles.actionButton, styles.removeButton]}>
              <Text style={[styles.actionText, styles.removeText]}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const visibleTasks = taskList.filter((task) => (selectedFilter === 'all' ? true : task.priority === selectedFilter));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <Text style={styles.header}>Minhas tarefas</Text>

        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Form' as any)}>
          <Text style={styles.createButtonText}>+ Criar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity style={[styles.filterPill, selectedFilter === 'all' && styles.filterPillActive]} onPress={() => setSelectedFilter('all')}>
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.filterPill, selectedFilter === 'high' && styles.filterPillActive]} onPress={() => setSelectedFilter('high')}>
          <Text style={[styles.filterText, selectedFilter === 'high' && styles.filterTextActive]}>Alta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.filterPill, selectedFilter === 'medium' && styles.filterPillActive]} onPress={() => setSelectedFilter('medium')}>
          <Text style={[styles.filterText, selectedFilter === 'medium' && styles.filterTextActive]}>Média</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.filterPill, selectedFilter === 'low' && styles.filterPillActive]} onPress={() => setSelectedFilter('low')}>
          <Text style={[styles.filterText, selectedFilter === 'low' && styles.filterTextActive]}>Baixa</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleTasks}
        keyExtractor={(task) => task.id}
        renderItem={renderTaskItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma tarefa encontrada.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f9',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  filterPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 6,
    marginBottom: 6,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#9aa0a6',
    fontWeight: '600',
  },
  expireAt: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  expireAtPlaceholder: {
    fontSize: 12,
    color: '#c4c8cc',
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  actionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: 'transparent',
  },
  removeText: {
    color: '#ef4444',
  },
  emptyContainer: {
    marginTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9aa0a6',
    fontSize: 15,
  },
});