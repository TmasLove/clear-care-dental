import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import { colors } from '../utils/colors';

import MemberHomeScreen from '../screens/member/MemberHomeScreen';
import PlanDetailsScreen from '../screens/member/PlanDetailsScreen';
import DentistSearchScreen from '../screens/member/DentistSearchScreen';
import DentistDetailScreen from '../screens/member/DentistDetailScreen';
import ClaimsHistoryScreen from '../screens/member/ClaimsHistoryScreen';
import ClaimDetailScreen from '../screens/member/ClaimDetailScreen';
import SharePlanScreen from '../screens/member/SharePlanScreen';
import MemberSupportScreen from '../screens/member/SupportScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: '🏠',
    FindDentist: '🔍',
    Claims: '📋',
    SharePlan: '📤',
    Support: '🎧',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[name] || '•'}</Text>
    </View>
  );
};

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MemberHome" component={MemberHomeScreen} />
    <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} />
    <Stack.Screen name="SharePlan" component={SharePlanScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Support" component={MemberSupportScreen} />
    <Stack.Screen name="FindDentist" component={DentistSearchScreen} />
    <Stack.Screen name="DentistDetail" component={DentistDetailScreen} />
    <Stack.Screen name="Claims" component={ClaimsHistoryScreen} />
    <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
  </Stack.Navigator>
);

const FindDentistStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DentistSearch" component={DentistSearchScreen} />
    <Stack.Screen name="DentistDetail" component={DentistDetailScreen} />
  </Stack.Navigator>
);

const ClaimsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClaimsHistory" component={ClaimsHistoryScreen} />
    <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
  </Stack.Navigator>
);

const ShareStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SharePlanMain" component={SharePlanScreen} />
    <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} />
  </Stack.Navigator>
);

const MemberNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: colors.white,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingBottom: 8,
        paddingTop: 6,
        height: 68,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{ tabBarLabel: 'Home' }}
    />
    <Tab.Screen
      name="FindDentist"
      component={FindDentistStack}
      options={{ tabBarLabel: 'Find Dentist' }}
    />
    <Tab.Screen
      name="Claims"
      component={ClaimsStack}
      options={{ tabBarLabel: 'Claims' }}
    />
    <Tab.Screen
      name="SharePlan"
      component={ShareStack}
      options={{ tabBarLabel: 'My Plan' }}
    />
    <Tab.Screen
      name="Support"
      component={MemberSupportScreen}
      options={{ tabBarLabel: 'Support' }}
    />
  </Tab.Navigator>
);

export default MemberNavigator;
