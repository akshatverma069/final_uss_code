import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Groupsscreen from "./Groupsscreen";
import BottomTabNavigator from "../components/BottomTabNavigator";

export default function GroupsWrapper({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Groupsscreen navigation={navigation} />
      <SafeAreaView edges={["bottom"]} style={styles.tabContainer}>
        <BottomTabNavigator currentScreen="Groups" />
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

