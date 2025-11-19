import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { authAPI, setAuthToken } from "../services/api";

export default function Logscreen({ navigation }: any) {
  console.log("NAVIGATION PROP IN LOGSCREEN: ", navigation);
  const [username, setUsername] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !masterPassword) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(username, masterPassword);
      
      if (response.access_token) {
        setAuthToken(response.access_token);
        Alert.alert("Success", "Login successful!", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Home"),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Securely access your account</Text>

      {/* Username */}
      <Text style={styles.inputLabel}>Username</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter your username"
          placeholderTextColor="#9FA5B4"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
      </View>
      {/* In orther to avoid Key Stroking we have build Virtual Keyboard*/}
      {/* Password */}
      <Text style={styles.inputLabel}>Master Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#9FA5B4"
          secureTextEntry
          style={styles.input}
          value={masterPassword}
          onChangeText={setMasterPassword}
        />
      </View>

      {/* Login Button */}
      <Pressable
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </Pressable>

      {/* OR Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.line} />
      </View>

      {/* Authentication Options */}
      <View style={styles.authRow}>
        <Pressable style={styles.authBox}>
          <Image
            source={require("../assets/fingerprint.png")}
            style={styles.authIcon}
          />
          <Text style={styles.authText}>Biometric</Text>
        </Pressable>

        <Pressable style={styles.authBox}>
          <Image
            source={require("../assets/facescan.png")}
            style={styles.authIcon}
          />
          <Text style={styles.authText}>Face Login</Text>
        </Pressable>
      </View>

      {/* Links */}
      <View style={styles.bottomLinks}>
        <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>

      <Pressable onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>New user? Sign up</Text>
      </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
  color: "#4267FF",
  fontSize: 14,
  fontWeight: "600",
},
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: "#FFFFFF",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 40,
    color: "#1B1F3B",
  },

  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 40,
    color: "#6A7181",
  },

  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: "#1B1F3B",
    fontWeight: "600",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },

  inputIcon: {
    width: 20,
    height: 20,
    tintColor: "#9FA5B4",
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#1B1F3B",
  },

  loginButton: {
    backgroundColor: "#4267FF",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#D5D9E2",
  },

  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#6A7181",
    fontWeight: "600",
  },

  authRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  authBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#D5D9E2",
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
  },

  authIcon: {
    width: 32,
    height: 32,
    tintColor: "#1B1F3B",
    marginBottom: 6,
  },

  authText: {
    fontSize: 14,
    color: "#1B1F3B",
    fontWeight: "600",
  },

  bottomLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  linkText: {
    fontSize: 14,
    color: "#4267FF",
    fontWeight: "600",
  },
});

