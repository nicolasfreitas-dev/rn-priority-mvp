import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import type { Task, Priority } from '../types/types';
import { loadTasksFromStorage, saveTasksToStorage } from '../utils/storage';
import { computePriority } from '../utils/computePriority';
import { nanoid } from 'nanoid/non-secure';

import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FormRouteProp = RouteProp<RootStackParamList, 'Form'>;

export const TaskFormScreen: React.FC = () => {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation();

  const [formState, setFormState] = useState<Partial<Task>>({ title: '' });
  const [selectedOverride, setSelectedOverride] = useState<Priority | 'none'>('none');

  const [localDate, setLocalDate] = useState<Date | null>(() => (formState.expireAt ? new Date(formState.expireAt) : null));
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const [showDatePickerAndroid, setShowDatePickerAndroid] = useState(false);
  const [showTimePickerAndroid, setShowTimePickerAndroid] = useState(false);

  useEffect(() => {
    if (route.params?.id) loadTaskForEditing(route.params.id);
  }, []);

  async function loadTaskForEditing(taskId: string) {
    const allTasks = await loadTasksFromStorage();
    const foundTask = allTasks.find((task) => task.id === taskId);

    if (foundTask) {
      setFormState(foundTask);
      setSelectedOverride(foundTask.priorityOverride || 'none');
      setLocalDate(foundTask.expireAt ? new Date(foundTask.expireAt) : null);
    }
  }

  async function handleSave() {
  try {
    const title = (formState.title || '').trim();
    if (!title) {
      Alert.alert('Título obrigatório', 'Por favor informe um título para a tarefa.');
      return;
    }

    const expireIso = localDate ? localDate.toISOString() : null;

    let allTasks = await loadTasksFromStorage();
    if (!Array.isArray(allTasks)) {
      console.warn('loadTasksFromStorage não retornou array. Inicializando um array vazio.');
      allTasks = [];
    }

    const taskToSave: Task = {
      id: formState.id || nanoid(),
      title,
      description: formState.description ?? null,
      expireAt: expireIso,
      estimatedMinutes: formState.estimatedMinutes ?? null,
      completed: formState.completed ?? false,
      priority: computePriority({
        title,
        expireAt: expireIso,
        estimatedMinutes: formState.estimatedMinutes ?? null,
      }),
      priorityOverride: selectedOverride === 'none' ? null : selectedOverride,
    };

    const existingIndex = allTasks.findIndex((t) => t.id === taskToSave.id);
    if (existingIndex >= 0) {
      allTasks[existingIndex] = taskToSave;
    } else {
      allTasks.push(taskToSave);
    }

    console.debug('Salvando tarefa:', taskToSave);
    console.debug('Total de tarefas antes do save:', allTasks.length);

    await saveTasksToStorage(allTasks);

    setFormState((prev) => ({ ...prev, expireAt: expireIso }));

    navigation.goBack();
  } catch (err) {
    console.error('Erro ao salvar tarefa:', err);
    Alert.alert('Erro', 'Ocorreu um erro ao salvar a tarefa. Veja o console para mais detalhes.');
  }
}

  const formattedLocalDate = localDate ? format(localDate, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : null;

  function onChangeIOS(event: any, selected?: Date) {
    const current = selected || localDate;
    setLocalDate(current || null);
  }

  function onChangeAndroidDate(event: any, selected?: Date) {
    const isDismissed = event?.type === 'dismissed' || event?.action === 'dismissedAction';
    if (isDismissed) {
      setShowDatePickerAndroid(false);
      setShowTimePickerAndroid(false);
      return;
    }
    const pickedDate = selected || new Date();
    const base = localDate || new Date();
    const merged = new Date(
      pickedDate.getFullYear(),
      pickedDate.getMonth(),
      pickedDate.getDate(),
      base.getHours(),
      base.getMinutes(),
      0,
      0
    );
    setLocalDate(merged);
    setShowDatePickerAndroid(false);

    setTimeout(() => setShowTimePickerAndroid(true), 100);
  }

  function onChangeAndroidTime(event: any, selected?: Date) {
    const isDismissed = event?.type === 'dismissed' || event?.action === 'dismissedAction';
    if (isDismissed) {
      setShowTimePickerAndroid(false);
      return;
    }
    const pickedTime = selected || new Date();
    const base = localDate || new Date();
    const merged = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      pickedTime.getHours(),
      pickedTime.getMinutes(),
      0,
      0
    );
    setLocalDate(merged);
    setShowTimePickerAndroid(false);
  }

  const PriorityChip = ({ value, label }: { value: Priority | 'none'; label: string }) => {
    const isSelected = selectedOverride === value;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedOverride(value)}
        style={[styles.chip, isSelected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>{route.params?.id ? 'Editar tarefa' : 'Nova tarefa'}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={formState.title}
            onChangeText={(value) => setFormState({ ...formState, title: value })}
            placeholder="Ex: Finalizar relatório"
            placeholderTextColor="#9aa0a6"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={formState.description}
            onChangeText={(value) => setFormState({ ...formState, description: value })}
            placeholder="Detalhes opcionais..."
            placeholderTextColor="#9aa0a6"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Prazo</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.input}
                activeOpacity={0.8}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    setShowDatePickerAndroid(true);
                  } else {
                    setShowIOSPicker(true);
                  }
                }}
              >
                <Text style={{ color: localDate ? '#111827' : '#9aa0a6', fontSize: 15 }}>
                  {formattedLocalDate ?? 'Sem data — toque para adicionar'}
                </Text>
              </TouchableOpacity>

              {localDate ? (
                <TouchableOpacity
                  onPress={() => {
                    setLocalDate(null);
                  }}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>Limpar</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {Platform.OS === 'ios' && showIOSPicker && (
              <DateTimePicker
                value={localDate || new Date()}
                mode="datetime"
                display="spinner"
                onChange={onChangeIOS}
                minimumDate={new Date(2000, 0, 1)}
              />
            )}

            {Platform.OS === 'android' && showDatePickerAndroid && (
              <DateTimePicker
                value={localDate || new Date()}
                mode="date"
                display="default"
                onChange={onChangeAndroidDate}
                minimumDate={new Date(2000, 0, 1)}
              />
            )}

            {Platform.OS === 'android' && showTimePickerAndroid && (
              <DateTimePicker
                value={localDate || new Date()}
                mode="time"
                display="default"
                onChange={onChangeAndroidTime}
              />
            )}
          </View>

          <View style={[styles.field, { width: 120 }]}>
            <Text style={styles.label}>Est. (min)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formState.estimatedMinutes ? String(formState.estimatedMinutes) : ''}
              onChangeText={(value) => setFormState({ ...formState, estimatedMinutes: value ? Number(value) : null })}
              placeholder="30"
              placeholderTextColor="#9aa0a6"
            />
          </View>
        </View>

        <View style={styles.separator} />

        <Text style={styles.subHeader}>Definir prioridade</Text>
        <View style={styles.chipsRow}>
          <PriorityChip value="none" label="Nenhuma" />
          <PriorityChip value="high" label="Alta" />
          <PriorityChip value="medium" label="Média" />
          <PriorityChip value="low" label="Baixa" />
        </View>

        <View style={{ height: 24 }} />

        <TouchableOpacity style={styles.saveButton} activeOpacity={0.85} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salvar tarefa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#f6f7f9',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderWidth: 1,
    borderColor: '#e6e9ee',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    fontSize: 15,
    color: '#111827',
  },
  textarea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  separator: {
    height: 1,
    backgroundColor: '#e6e9ee',
    marginVertical: 18,
    borderRadius: 2,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 0,
  },
  chipSelected: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e6e9ee',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  clearButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6e9ee',
    backgroundColor: '#fff',
  },
  clearButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
});