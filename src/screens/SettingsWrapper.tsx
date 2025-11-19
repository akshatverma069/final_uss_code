import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Settingscreen from "./Settingscreen";
import BottomTabNavigator from "../components/BottomTabNavigator";

export default function SettingsWrapper({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Settingscreen navigation={navigation} />
      <SafeAreaView edges={["bottom"]} style={styles.tabContainer}>
        <BottomTabNavigator currentScreen="Settings" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    backgroundColor: "#FFFFFF",
  },
});

