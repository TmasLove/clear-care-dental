import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../utils/colors';

import AuthNavigator from './AuthNavigator';
import EmployerNavigator from './EmployerNavigator';
import MemberNavigator from './MemberNavigator';
import DentistNavigator from './DentistNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const AppNavigator = () => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) return <LoadingScreen />;

  const getMainNavigator = () => {
    switch (role) {
      case 'admin':
        return AdminNavigator;
      case 'employer':
        return EmployerNavigator;
      case 'dentist':
        return DentistNavigator;
      case 'member':
      default:
        return MemberNavigator;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={getMainNavigator()} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
