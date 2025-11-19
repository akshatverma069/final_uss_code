import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

interface BottomTabNavigatorProps {
  currentScreen?: string;
}

export default function BottomTabNavigator({ currentScreen }: BottomTabNavigatorProps) {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const tabs = [
    { name: "Home", icon: "🏠", screen: "Home" },
    { name: "Vault", icon: "🔐", screen: "Vault" },
    { name: "Groups", icon: "👥", screen: "Groups" },
    { name: "Help", icon: "❓", screen: "FAQs" },
    { name: "Settings", icon: "⚙️", screen: "Settings" },
  ];

  const isActive = (screenName: string) => {
    // Check if current route matches the screen or if currentScreen prop is provided
    const routeName = route.name || currentScreen || "";
    return routeName === screenName || routeName.includes(screenName);
  };

  const handleTabPress = (screen: string) => {
    // Reset navigation stack to the selected screen
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = isActive(tab.screen);
        return (
          <Pressable
            key={tab.name}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => handleTabPress(tab.screen)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[styles.tabLabel, active && styles.tabLabelActive]}
            >
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E4EC",
    paddingVertical: 10,
    paddingHorizontal: 5,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 60,
  },
  tabActive: {
    backgroundColor: "#E8EBFF",
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: "#6A7181",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#4267FF",
    fontWeight: "700",
  },
});

