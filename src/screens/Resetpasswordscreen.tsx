import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { authAPI, getAuthToken, getCurrentUser } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Resetpasswordscreen({ navigation, route }: any) {
  const userId = route?.params?.userId;
  const [currentPassword, setCurrentPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Array<{ question_id: number; question_text: string }>>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

  useEffect(() => {
    loadSecurityQuestions();
  }, []);

  const loadSecurityQuestions = async () => {
    try {
      const data = await authAPI.getSecurityQuestions();
      setQuestions(data);
    } catch (error) {
      console.error("Error loading security questions:", error);
    }
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in new password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    if (!currentPassword && (!selectedQuestionId || !answer)) {
      Alert.alert("Error", "Please provide either current password or security answer.");
      return;
    }

    setLoading(true);
    try {
      // Get user ID from route params or stored user data
      let resetUserId = userId;
      if (!resetUserId) {
        // Get user ID from stored user data (when accessed from Settings)
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.user_id) {
          resetUserId = currentUser.user_id;
        } else {
          Alert.alert("Error", "User ID not found. Please login again.");
          navigation.navigate("Login");
          return;
        }
      }

      const response = await authAPI.resetPassword(
        resetUserId,
        newPassword,
        currentPassword || undefined,
        selectedQuestionId || undefined,
        answer || undefined
      );

      if (response.success) {
        Alert.alert("Success", "Password updated successfully!", [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            },
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  // 🧭 Back button method
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Settings");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        {/* Back Button */}
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

      {/* Title */}
      <Text style={styles.title}>Reset Master Password</Text>
      <Text style={styles.subtitle}>
        Ensure you remember your new password securely
      </Text>

      {/* Current Password (Optional if using security question) */}
      <Text style={styles.inputLabel}>
        Current Password {!currentPassword && "(or use security question below)"}
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter current password (optional)"
          placeholderTextColor="#9FA5B4"
          secureTextEntry
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
      </View>

      {/* Security Question (Optional if current password is provided) */}
      {!currentPassword && (
        <>
          <Text style={styles.inputLabel}>Security Question</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedQuestionId?.toString() || ""}
              onValueChange={(itemValue) => {
                setSelectedQuestionId(itemValue ? parseInt(itemValue) : null);
                const question = questions.find((q) => q.question_id === parseInt(itemValue));
                setSecurityQuestion(question?.question_text || "");
              }}
              dropdownIconColor="#1B1F3B"
            >
              <Picker.Item label="Select Question" value="" />
              {questions.map((q) => (
                <Picker.Item key={q.question_id} label={q.question_text} value={q.question_id.toString()} />
              ))}
            </Picker>
          </View>
        </>
      )}

      {/* Answer (Required if using security question) */}
      {!currentPassword && (
        <>
          <Text style={styles.inputLabel}>Answer</Text>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Enter your answer"
              placeholderTextColor="#9FA5B4"
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
            />
          </View>
        </>
      )}

      {/* New Password */}
      <Text style={styles.inputLabel}>New Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter new password"
          placeholderTextColor="#9FA5B4"
          secureTextEntry
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      {/* Confirm Password */}
      <Text style={styles.inputLabel}>Confirm New Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Re-enter new password"
          placeholderTextColor="#9FA5B4"
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {/* Reset Button */}
      <Pressable
        style={[styles.resetButton, loading && { opacity: 0.7 }]}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetButtonText}>Reset Password</Text>
        )}
      </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 25,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#4267FF",
    fontSize: 16,
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1B1F3B",
    textAlign: "center",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#6A7181",
    textAlign: "center",
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B1F3B",
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1B1F3B",
  },
  resetButton: {
    backgroundColor: "#4267FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
