import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { passwordsAPI } from "../services/api";

export default function AddPasswordscreen({ navigation }: any) {
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [applicationType, setApplicationType] = useState("");
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [passwordLength, setPasswordLength] = useState(16);
  const [securityLevel, setSecurityLevel] = useState("2");
  const [showPassword, setShowPassword] = useState(false);

  // generate a password
  const generatePassword = () => {
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const numbers = "0123456789";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let charset = lowercase + uppercase;
    if (includeNumbers) charset += numbers;
    if (includeSymbols) charset += symbols;

    let generated = "";
    for (let i = 0; i < passwordLength; i++) {
      generated += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    setPassword(generated);
  };

  const [loading, setLoading] = useState(false);

  const handleAddToVault = async () => {
    if (!website || !username || !password) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await passwordsAPI.create(website, username, password, applicationType || undefined);
      // Show success message and navigate back
      Alert.alert(
        "✅ Success",
        "Password added to vault successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              // Clear form fields
              setWebsite("");
              setUsername("");
              setPassword("");
              setApplicationType("");
              // Navigate back
              navigation.goBack();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      // Extract user-friendly error message, removing any technical details
      let errorMessage = "Failed to add password. Please try again.";
      
      // Safely extract message from error object (only string values)
      if (error instanceof Error) {
        errorMessage = String(error.message || "");
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message && typeof error.message === "string") {
        errorMessage = error.message;
      } else if (error?.detail && typeof error.detail === "string") {
        errorMessage = error.detail;
      } else if (error?.error && typeof error.error === "string") {
        errorMessage = error.error;
      }
      
      // Clean up the error message - remove technical prefixes and database details
      errorMessage = String(errorMessage || "").replace(/^API Error \[.*?\]:\s*/i, "");
      errorMessage = errorMessage.replace(/^Error:\s*/i, "");
      // Remove SQL/database error details
      errorMessage = errorMessage.replace(/\(pymysql\.err\..*?\)/gi, "");
      errorMessage = errorMessage.replace(/\[SQL:.*?\]/gi, "");
      errorMessage = errorMessage.replace(/\[parameters:.*?\]/gi, "");
      errorMessage = errorMessage.replace(/\(Background on this error.*?\)/gi, "");
      errorMessage = errorMessage.replace(/Field '.*?' doesn't have a default value/gi, "Database error");
      errorMessage = errorMessage.trim() || "Failed to add password. Please try again.";
      
      // Show clean, user-friendly error message
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Add password</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Website/Platform */}
        <Text style={styles.label}>Website/Platform</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Netflix"
            placeholderTextColor="#9FA5B4"
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
          />
        </View>

        {/* Username/Email */}
        <Text style={styles.label}>Username/Email</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your Username.."
            placeholderTextColor="#9FA5B4"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your Password.."
            placeholderTextColor="#9FA5B4"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
          </Pressable>
        </View>

        {/* Application Type */}
        <Text style={styles.label}>Application Type (e.g., Entertainment, Social, Banking)</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Entertainment"
            placeholderTextColor="#9FA5B4"
            value={applicationType}
            onChangeText={setApplicationType}
            autoCapitalize="words"
          />
        </View>

        {/* Generate Password Button */}
        <Pressable style={styles.generateButton} onPress={generatePassword}>
          <Text style={styles.generateButtonText}>Generate Strong Password</Text>
        </Pressable>

        {/* Password Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>PASSWORD OPTIONS:</Text>

          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include symbols (!@#$)</Text>
            <Switch
              value={includeSymbols}
              onValueChange={setIncludeSymbols}
              trackColor={{ false: "#D5D9E2", true: "#4267FF" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include numbers (0-9)</Text>
            <Switch
              value={includeNumbers}
              onValueChange={setIncludeNumbers}
              trackColor={{ false: "#D5D9E2", true: "#4267FF" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.lengthContainer}>
            <Text style={styles.optionLabel}>Length: {passwordLength}</Text>
            <View style={styles.lengthControls}>
              <Pressable
                style={styles.lengthButton}
                onPress={() => setPasswordLength(Math.max(8, passwordLength - 1))}
              >
                <Text style={styles.lengthButtonText}>-</Text>
              </Pressable>
              <Text style={styles.lengthValue}>{passwordLength}</Text>
              <Pressable
                style={styles.lengthButton}
                onPress={() => setPasswordLength(Math.min(32, passwordLength + 1))}
              >
                <Text style={styles.lengthButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Security Level */}
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>SECURITY LEVEL:</Text>
          <View style={styles.radioContainer}>
            <Pressable
              style={[
                styles.radioButton,
                securityLevel === "1" && styles.radioButtonSelected,
              ]}
              onPress={() => setSecurityLevel("1")}
            >
              <Text
                style={[
                  styles.radioText,
                  securityLevel === "1" && styles.radioTextSelected,
                ]}
              >
                1. Standard Security
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.radioButton,
                securityLevel === "2" && styles.radioButtonSelected,
              ]}
              onPress={() => setSecurityLevel("2")}
            >
              <Text
                style={[
                  styles.radioText,
                  securityLevel === "2" && styles.radioTextSelected,
                ]}
              >
                2. Better Security
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.radioButton,
                securityLevel === "3" && styles.radioButtonSelected,
              ]}
              onPress={() => setSecurityLevel("3")}
            >
              <Text
                style={[
                  styles.radioText,
                  securityLevel === "3" && styles.radioTextSelected,
                ]}
              >
                3. Highly Secure
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Add to Vault Button */}
        <Pressable
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddToVault}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add to Vault</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    flex: 1,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4267FF",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B1F3B",
    flex: 2,
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B1F3B",
    marginBottom: 8,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1B1F3B",
    height: "100%",
  },
  eyeButton: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeIcon: {
    fontSize: 18,
  },
  generateButton: {
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  generateButtonText: {
    color: "#4267FF",
    fontSize: 15,
    fontWeight: "600",
  },
  optionsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 15,
    color: "#1B1F3B",
    fontWeight: "500",
  },
  lengthContainer: {
    marginTop: 10,
  },
  lengthControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  lengthButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F4F6FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  lengthButtonText: {
    fontSize: 20,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  lengthValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: "center",
  },
  securitySection: {
    marginBottom: 30,
  },
  radioContainer: {
    marginTop: 10,
  },
  radioButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E0E4EC",
    backgroundColor: "#F4F6FA",
  },
  radioButtonSelected: {
    borderColor: "#4267FF",
    backgroundColor: "#E8EBFF",
  },
  radioText: {
    fontSize: 15,
    color: "#6A7181",
    fontWeight: "500",
  },
  radioTextSelected: {
    color: "#4267FF",
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: "#4267FF",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
});

