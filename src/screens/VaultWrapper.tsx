import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Vaultscreen from "./Vaultscreen";
import BottomTabNavigator from "../components/BottomTabNavigator";

export default function VaultWrapper({ navigation, route }: any) {
  return (
    <View style={styles.container}>
      <Vaultscreen navigation={navigation} route={route} />
      <SafeAreaView edges={["bottom"]} style={styles.tabContainer}>
        <BottomTabNavigator currentScreen="Vault" />
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

