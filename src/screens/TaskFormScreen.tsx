import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import type { Task, Priority } from '../types/types';
import { loadTasksFromStorage, saveTasksToStorage } from '../utils/storage';
import { computePriority } from '../utils/computePriority';
import { v4 as uuidv4 } from 'uuid';

type FormRouteProp = RouteProp<RootStackParamList, 'Form'>;

export const TaskFormScreen: React.FC = () => {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation();

  const [formState, setFormState] = useState<Partial<Task>>({ title: '' });
  const [selectedOverride, setSelectedOverride] = useState<Priority | 'none'>('none');

  useEffect(() => {
    if (route.params?.id) loadTaskForEditing(route.params.id);
  }, []);

  async function loadTaskForEditing(taskId: string) {
    const allTasks = await loadTasksFromStorage();
    const foundTask = allTasks.find((task) => task.id === taskId);

    if (foundTask) {
      setFormState(foundTask);
      setSelectedOverride(foundTask.priorityOverride || 'none');
    }
  }

  async function handleSave() {
    const allTasks = await loadTasksFromStorage();

    const taskToSave: Task = {
      id: formState.id || uuidv4(),
      title: (formState.title || '').trim(),
      description: formState.description,
      expireAt: formState.expireAt || null,
      estimatedMinutes: formState.estimatedMinutes || null,
      completed: formState.completed || false,
      priority: computePriority({ title: formState.title || '', expireAt: formState.expireAt, estimatedMinutes: formState.estimatedMinutes }),
      priorityOverride: selectedOverride === 'none' ? null : selectedOverride,
    };

    const existingIndex = allTasks.findIndex((task) => task.id === taskToSave.id);
    if (existingIndex >= 0) allTasks[existingIndex] = taskToSave;
    else allTasks.push(taskToSave);

    await saveTasksToStorage(allTasks);
    navigation.goBack();
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Título</Text>
      <TextInput style={styles.input} value={formState.title} onChangeText={(value) => setFormState({ ...formState, title: value })} />

      <Text>Descrição</Text>
      <TextInput style={styles.input} value={formState.description} onChangeText={(value) => setFormState({ ...formState, description: value })} />

      <Text>Data / Hora (ISO) — ex: 2025-11-18T15:00:00</Text>
      <TextInput style={styles.input} value={formState.expireAt || ''} onChangeText={(value) => setFormState({ ...formState, expireAt: value })} />

      <Text>Tempo estimado (min)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={formState.estimatedMinutes ? String(formState.estimatedMinutes) : ''}
        onChangeText={(value) => setFormState({ ...formState, estimatedMinutes: value ? Number(value) : null })}
      />

      <View style={{ marginTop: 12 }}>
        <Text>Forçar prioridade?</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 }}>
          <Button title="Nenhuma" onPress={() => setSelectedOverride('none')} />
          <Button title="Alta" onPress={() => setSelectedOverride('high')} />
          <Button title="Média" onPress={() => setSelectedOverride('medium')} />
          <Button title="Baixa" onPress={() => setSelectedOverride('low')} />
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <Button title="Salvar" onPress={handleSave} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginBottom: 12 },
});