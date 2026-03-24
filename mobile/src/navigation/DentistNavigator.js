import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import { dentistColors as colors } from '../utils/dentistColors';

import DentistHomeScreen from '../screens/dentist/DentistHomeScreen';
import AppointmentsScreen from '../screens/dentist/AppointmentsScreen';
import PatientEligibilityScreen from '../screens/dentist/PatientEligibilityScreen';
import SubmitClaimScreen from '../screens/dentist/SubmitClaimScreen';
import DentistClaimsScreen from '../screens/dentist/DentistClaimsScreen';
import PaymentsScreen from '../screens/dentist/PaymentsScreen';
import InsuredPatientsScreen from '../screens/dentist/InsuredPatientsScreen';
import EstimatesScreen from '../screens/dentist/EstimatesScreen';
import ReportsScreen from '../screens/dentist/ReportsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ClaimDetailScreen from '../screens/member/ClaimDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabIcon = ({ name }) => {
  const icons = {
    DentistHome: '🏠',
    Appointments: '📅',
    Claims: '📋',
    Payments: '💰',
    Patients: '👥',
    More: '⋯',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[name] || '•'}</Text>
    </View>
  );
};

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DentistHomeMain" component={DentistHomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="PatientEligibility" component={PatientEligibilityScreen} />
    <Stack.Screen name="SubmitClaim" component={SubmitClaimScreen} />
    <Stack.Screen name="SubmitClaimMain" component={SubmitClaimScreen} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="InsuredPatients" component={InsuredPatientsScreen} />
    <Stack.Screen name="Appointments" component={AppointmentsScreen} />
    <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
    <Stack.Screen name="Estimates" component={EstimatesScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
  </Stack.Navigator>
);

const AppointmentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AppointmentsList" component={AppointmentsScreen} />
    <Stack.Screen name="PatientEligibility" component={PatientEligibilityScreen} />
    <Stack.Screen name="SubmitClaim" component={SubmitClaimScreen} />
  </Stack.Navigator>
);

const ClaimsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClaimsHistory" component={DentistClaimsScreen} />
    <Stack.Screen name="SubmitClaimMain" component={SubmitClaimScreen} />
    <Stack.Screen name="PatientEligibility" component={PatientEligibilityScreen} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
  </Stack.Navigator>
);

const PaymentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PaymentsList" component={PaymentsScreen} />
    <Stack.Screen name="Estimates" component={EstimatesScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="SubmitClaim" component={SubmitClaimScreen} />
  </Stack.Navigator>
);

const PatientsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PatientsList" component={InsuredPatientsScreen} />
    <Stack.Screen name="PatientEligibility" component={PatientEligibilityScreen} />
    <Stack.Screen name="SubmitClaim" component={SubmitClaimScreen} />
  </Stack.Navigator>
);

const DentistNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarActiveTintColor: colors.white,
      tabBarInactiveTintColor: colors.sidebarText,
      tabBarStyle: {
        backgroundColor: colors.sidebarBg,
        borderTopColor: colors.sidebarActiveBg,
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
      name="DentistHome"
      component={HomeStack}
      options={{ tabBarLabel: 'Home' }}
    />
    <Tab.Screen
      name="Appointments"
      component={AppointmentsStack}
      options={{ tabBarLabel: 'Schedule' }}
    />
    <Tab.Screen
      name="Claims"
      component={ClaimsStack}
      options={{ tabBarLabel: 'Claims' }}
    />
    <Tab.Screen
      name="Payments"
      component={PaymentsStack}
      options={{ tabBarLabel: 'Payments' }}
    />
    <Tab.Screen
      name="Patients"
      component={PatientsStack}
      options={{ tabBarLabel: 'Patients' }}
    />
  </Tab.Navigator>
);

export default DentistNavigator;
