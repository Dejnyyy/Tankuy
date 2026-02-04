import React, { useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return (
    <View style={styles.iconContainer}>
      <FontAwesome size={22} {...props} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const dynamicStyles = useMemo(() => getStyles(colors), [colors]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: dynamicStyles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
        headerStyle: dynamicStyles.header,
        headerTitleStyle: dynamicStyles.headerTitle,
        headerTintColor: colors.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabBarIcon 
              name="home" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: 'Find',
          tabBarIcon: ({ color }) => (
            <TabBarIcon 
              name="map-marker" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <TabBarIcon 
              name="camera" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <TabBarIcon 
              name="list" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabBarIcon 
              name="user" 
              color={color} 
            />
          ),
        }}
      />
      {/* Hide the old two.tsx from tabs */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 65,
  },
  header: {
    backgroundColor: colors.card,
    shadowColor: 'transparent',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
