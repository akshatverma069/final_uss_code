import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FAQsscreen from "./FAQsscreen";
import BottomTabNavigator from "../components/BottomTabNavigator";

export default function FAQsWrapper({ navigation }: any) {
  return (
    <View style={styles.container}>
      <FAQsscreen navigation={navigation} />
      <SafeAreaView edges={["bottom"]} style={styles.tabContainer}>
        <BottomTabNavigator currentScreen="FAQs" />
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

