import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Homescreen from "./Homescreen";
import BottomTabNavigator from "../components/BottomTabNavigator";

export default function HomeWrapper({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Homescreen navigation={navigation} />
      <SafeAreaView edges={["bottom"]} style={styles.tabContainer}>
        <BottomTabNavigator currentScreen="Home" />
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

