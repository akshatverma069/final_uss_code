import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Securityscreen from "./Securityscreen";
import BottomTabNavigator from "../components/BottomTabNavigator";

export default function SecurityWrapper({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Securityscreen navigation={navigation} />
      <SafeAreaView edges={["bottom"]} style={styles.tabContainer}>
        <BottomTabNavigator currentScreen="Security" />
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

