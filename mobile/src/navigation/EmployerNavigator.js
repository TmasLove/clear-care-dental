import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import { colors } from '../utils/colors';

import EmployerDashboard from '../screens/employer/EmployerDashboard';
import PlanManagement from '../screens/employer/PlanManagement';
import CreatePlanScreen from '../screens/employer/CreatePlanScreen';
import MembersListScreen from '../screens/employer/MembersListScreen';
import InviteMemberScreen from '../screens/employer/InviteMemberScreen';
import ClaimsOverview from '../screens/employer/ClaimsOverview';
import SupportScreen from '../screens/employer/SupportScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ClaimDetailScreen from '../screens/member/ClaimDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = {
    Dashboard: focused ? '🏠' : '🏠',
    Plans: focused ? '📋' : '📋',
    Members: focused ? '👥' : '👥',
    Claims: focused ? '📊' : '📊',
    Support: focused ? '🎧' : '🎧',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[name] || '•'}</Text>
    </View>
  );
};

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployerDashboard" component={EmployerDashboard} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
    <Stack.Screen name="InviteMember" component={InviteMemberScreen} />
    <Stack.Screen name="CreatePlan" component={CreatePlanScreen} />
  </Stack.Navigator>
);

const PlansStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PlansList" component={PlanManagement} />
    <Stack.Screen name="CreatePlan" component={CreatePlanScreen} />
  </Stack.Navigator>
);

const MembersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MembersList" component={MembersListScreen} />
    <Stack.Screen name="InviteMember" component={InviteMemberScreen} />
  </Stack.Navigator>
);

const ClaimsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClaimsList" component={ClaimsOverview} />
    <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
  </Stack.Navigator>
);

const EmployerNavigator = () => (
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
      name="Dashboard"
      component={DashboardStack}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen
      name="Plans"
      component={PlansStack}
      options={{ tabBarLabel: 'Plans' }}
    />
    <Tab.Screen
      name="Members"
      component={MembersStack}
      options={{ tabBarLabel: 'Members' }}
    />
    <Tab.Screen
      name="Claims"
      component={ClaimsStack}
      options={{ tabBarLabel: 'Claims' }}
    />
    <Tab.Screen
      name="Support"
      component={SupportScreen}
      options={{ tabBarLabel: 'Support' }}
    />
  </Tab.Navigator>
);

export default EmployerNavigator;
