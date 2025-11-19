import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { getCurrentUser } from "../services/api";

export default function Settingscreen({ navigation }: any) {
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const user = getCurrentUser();
    setUsername(user?.username || "User");
  }, []);

  const handleLogout = () => {
    navigation.navigate("Login");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* <Image
            source={require("../assets/profile.png")}
            style={styles.profileIcon}
          /> */}
          <Text style={styles.username}>{username}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Reset Password */}
      <Pressable
        style={styles.actionButton}
        onPress={() => navigation.navigate("ResetPassword")}
      >
        <Text style={styles.actionText}>🔑 Reset Password</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.sectionDescription}>
          Manage your account settings and security preferences from here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // 👈 Add this line (adjust as needed: 40–80 works best)
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIcon: {
    width: 32,
    height: 32,
    tintColor: "#1B1F3B",
    marginRight: 8,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#E0E4EC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B1F3B",
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#D5D9E2",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#F9FAFC",
  },
  actionText: {
    fontSize: 16,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  section: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F9FAFC",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#6A7181",
    lineHeight: 18,
  },
});
