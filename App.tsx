import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { TaskFormScreen } from './src/screens/TaskFormScreen';

export type RootStackParamList = {
  Home: undefined;
  Form: { id?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={TaskListScreen} options={{ title: 'Tarefas' }} />
        <Stack.Screen name="Form" component={TaskFormScreen} options={{ title: 'Criar / Editar' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}