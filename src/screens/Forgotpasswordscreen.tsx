import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { authAPI } from "../services/api";

export default function Forgotpasswordscreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");
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

  const handleSubmit = async () => {
    if (!username || !selectedQuestionId || !answer) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(username, selectedQuestionId, answer);
      
      if (response.success && response.user_id) {
        Alert.alert("Success", "Answer verified! You can now reset your password.", [
          {
            text: "OK",
            onPress: () => navigation.navigate("ResetPassword", { userId: response.user_id }),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid username or answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {/* Title */}
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your username and answer your security question to reset your password
        </Text>

        {/* Username */}
        <Text style={styles.inputLabel}>Username</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your username"
            placeholderTextColor="#9FA5B4"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Security Question */}
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
            <Picker.Item label="Select a question" value="" />
            {questions.map((q) => (
              <Picker.Item key={q.question_id} label={q.question_text} value={q.question_id.toString()} />
            ))}
          </Picker>
        </View>

        {/* Answer */}
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

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 25,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4267FF",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
    color: "#1B1F3B",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
    color: "#6A7181",
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  pickerContainer: {
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    marginBottom: 20,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1B1F3B",
  },
  submitButton: {
    backgroundColor: "#4267FF",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

