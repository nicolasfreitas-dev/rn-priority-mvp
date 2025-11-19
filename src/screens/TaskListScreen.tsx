import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
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

  function renderTaskItem({ item }: { item: Task }) {
    return (
      <View style={styles.itemContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          {item.expireAt ? <Text style={styles.expireAt}>{format(new Date(item.expireAt), "dd/MM/yyyy HH:mm")}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.badge, badgeStyle(item.priority || 'low')]}>{(item.priority || 'low').toUpperCase()}</Text>

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity onPress={() => toggleTaskCompletion(item.id)} style={styles.smallButton}>
              <Text>{item.completed ? 'Desmarcar' : 'Concluir'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Form' as any, { id: item.id })} style={styles.smallButton}>
              <Text>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteTaskById(item.id)} style={styles.smallButton}>
              <Text>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const visibleTasks = taskList.filter((task) => (selectedFilter === 'all' ? true : task.priority === selectedFilter));

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', marginBottom: 12, justifyContent: 'space-between' }}>
        <Button title="Criar" onPress={() => navigation.navigate('Form' as any)} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Button title="Todas" onPress={() => setSelectedFilter('all')} />
          <Button title="Alta" onPress={() => setSelectedFilter('high')} />
          <Button title="Média" onPress={() => setSelectedFilter('medium')} />
          <Button title="Baixa" onPress={() => setSelectedFilter('low')} />
        </View>
      </View>

      <FlatList data={visibleTasks} keyExtractor={(task) => task.id} renderItem={renderTaskItem} />
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '600' },
  expireAt: { fontSize: 12, color: '#666' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontWeight: '700' },
  smallButton: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 },
});

function badgeStyle(priority: Priority) {
  if (priority === 'high') return { backgroundColor: '#ffdada', color: '#d00' } as any;
  if (priority === 'medium') return { backgroundColor: '#fff4d6', color: '#c60' } as any;
  return { backgroundColor: '#e6fff0', color: '#090' } as any;
}