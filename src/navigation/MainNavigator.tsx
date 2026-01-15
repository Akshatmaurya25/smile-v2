import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  HomeScreen,
  TransactionsScreen,
  AddExpenseScreen,
  FriendsScreen,
  SettingsScreen,
} from '../screens';
import { colors, spacing, borderRadius } from '../styles';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label }) => (
  <View style={styles.tabIconContainer}>
    <Text style={[
      styles.tabIcon,
      { color: focused ? colors.primary : colors.textMuted }
    ]}>
      {icon}
    </Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

interface AddButtonProps {
  onPress: () => void;
}

const AddButton: React.FC<AddButtonProps> = ({ onPress }) => (
  <View style={styles.fabContainer}>
    <TouchableOpacity style={styles.addButton} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.addButtonIcon}>+</Text>
    </TouchableOpacity>
  </View>
);

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="⌂" label="HOME" />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="↔" label="HISTORY" />
          ),
        }}
      />
      <Tab.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={({ navigation }) => ({
          tabBarIcon: () => (
            <AddButton onPress={() => navigation.navigate('AddExpense')} />
          ),
          tabBarStyle: { display: 'none' },
          headerShown: true,
          headerTitle: 'Add Expense',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        })}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="•••" label="SOCIAL" />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="☰" label="MORE" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(13, 13, 13, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    gap: 4,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  tabLabelFocused: {
    color: colors.primary,
  },
  fabContainer: {
    position: 'relative',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
    // Ring effect
    borderWidth: 4,
    borderColor: colors.background,
  },
  addButtonIcon: {
    fontSize: 32,
    color: colors.background,
    fontWeight: '800',
    marginTop: -2,
  },
});

export default MainNavigator;
