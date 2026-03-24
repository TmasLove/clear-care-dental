import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MagicLinkScreen from '../screens/auth/MagicLinkScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#F8F9FA' },
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="MagicLink" component={MagicLinkScreen} />
    <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
