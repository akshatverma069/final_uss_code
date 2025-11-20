import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Alert } from "react-native";
import { authAPI, setAuthToken } from "../services/api";

export default function Signupscreen({ navigation }: any) {
  console.log("NAVIGATION PROP IN LOGSCREEN: ", navigation);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Array<{ question_id: number; question_text: string }>>([]);

  useEffect(() => {
    loadSecurityQuestions();
  }, []);

  const loadSecurityQuestions = async () => {
    try {
      const data = await authAPI.getSecurityQuestions();
      setQuestions(data);
    } catch (error) {
      console.error("Error loading security questions:", error);
      // Fallback to default questions
      setQuestions([
        { question_id: 1, question_text: "What is the name of your first school?" },
        { question_id: 2, question_text: "What is the name of your first pet?" },
        { question_id: 3, question_text: "What is your favorite color?" },
        { question_id: 4, question_text: "What was the name of your first teacher?" },
      ]);
    }
  };

const passwordRules = [
  {
    key: "length",
    label: "Minimum 8 characters",
    check: (pwd: string) => pwd.length >= 8,
  },
  {
    key: "uppercase",
    label: "At least one uppercase letter",
    check: (pwd: string) => /[A-Z]/.test(pwd),
  },
  {
    key: "number",
    label: "Contains a number",
    check: (pwd: string) => /[0-9]/.test(pwd),
  },
  {
    key: "special",
    label: "Contains special character (@, #, !, ...)",
    check: (pwd: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
  },
];

const validateSignupInputs = () => {
  const issues: string[] = [];
  const usernamePattern = /^[a-zA-Z0-9_-]{3,50}$/;
  if (!usernamePattern.test(username.trim())) {
    issues.push("Username must be 3-50 characters and only use letters, numbers, _ or -");
  }

  passwordRules.forEach((rule) => {
    if (!rule.check(password)) {
      issues.push(rule.label);
    }
  });
  if (!/[a-z]/.test(password)) {
    issues.push("Password must contain at least one lowercase letter");
  }
  if (["password", "12345678", "qwerty", "abc123", "password123"].includes(password.toLowerCase())) {
    issues.push("Password is too common and easily guessable");
  }

  if (password !== confirmPassword) {
    issues.push("Passwords do not match");
  }

  if (!securityQuestion) {
    issues.push("Please choose a security question");
  }

  if (!answer.trim()) {
    issues.push("Security answer cannot be empty");
  }

  if (issues.length > 0) {
    Alert.alert("Fix these issues", issues.join("\n"));
    return false;
  }

  return true;
};

const handleSignup = async () => {
  if (!username || !password || !confirmPassword || !answer || !securityQuestion) {
    Alert.alert("Error", "Please fill in all fields.");
    return;
  }

  if (!validateSignupInputs()) {
    return;
  }

  setLoading(true);
  try {
    const questionId = parseInt(securityQuestion, 10);
    const response = await authAPI.signup(username.trim(), password, confirmPassword, questionId, answer.trim());
    
    if (response.access_token) {
      setAuthToken(response.access_token);
      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Home"),
        },
      ]);
    }
  } catch (error: any) {
    Alert.alert("Signup Failed", error.message || "Failed to create account");
  } finally {
    setLoading(false);
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Securely set up your credentials</Text>

      {/* Username */}
      <Text style={styles.inputLabel}>Username</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter username"
          placeholderTextColor="#9FA5B4"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
      </View>

      {/* Master Password */}
      <Text style={styles.inputLabel}>Type Master Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Master Password"
          placeholderTextColor="#9FA5B4"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
      </View>
      <View style={styles.passwordChecklist}>
        {passwordRules.map((rule) => {
          const met = rule.check(password);
          return (
            <View key={rule.key} style={styles.passwordRule}>
              <View
                style={[
                  styles.ruleIndicator,
                  met ? styles.ruleIndicatorMet : styles.ruleIndicatorPending,
                ]}
              />
              <Text
                style={[
                  styles.ruleText,
                  met ? styles.ruleTextMet : styles.ruleTextPending,
                ]}
              >
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Confirm Master Password */}
      <Text style={styles.inputLabel}>Confirm Master Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Master Password"
          placeholderTextColor="#9FA5B4"
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {/* Biometric + FaceScan */}
      <View style={styles.authRow}>
        <Pressable style={styles.authBox}>
          <Image
            source={require("../assets/fingerprint.png")}
            style={styles.authIcon}
          />
          <Text style={styles.authText}>Setup Biometric</Text>
        </Pressable>

        <View style={styles.verticalDivider} />

        <Pressable style={styles.authBox}>
          <Image
            source={require("../assets/facescan.png")}
            style={styles.authIcon}
          />
          <Text style={styles.authText}>Setup FaceScan</Text>
        </Pressable>
      </View>

      {/* Security Question */}
      <Text style={styles.inputLabel}>Security Question</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={securityQuestion}
          onValueChange={(itemValue: any) => setSecurityQuestion(itemValue)}
          dropdownIconColor="#1B1F3B"
        >
          <Picker.Item label="Choose a question" value="" />
          {questions.map((q) => (
            <Picker.Item key={q.question_id} label={q.question_text} value={q.question_id.toString()} />
          ))}
        </Picker>
      </View>

        {/* Answer */}
        <Text style={styles.inputLabel}>Answer</Text>
        <View style={styles.inputContainer}>
        <TextInput
            placeholder="Answer"
            placeholderTextColor="#9FA5B4"
            style={styles.input}
            value={answer}
            onChangeText={setAnswer}
        />
        </View>

        {/* Already have an account */}
        <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
        </Pressable>

        {/* Signup Button */}
        <Pressable
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.signupButtonText}>Signup</Text>
          )}
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
    linkText: {
  color: "#4267FF",
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
  marginTop: 10,
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
    marginTop: 20,
    color: "#1B1F3B",
  },

  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 25,
    color: "#6A7181",
  },

  inputLabel: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 6,
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#1B1F3B",
  },

  pickerContainer: {
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    marginBottom: 15,
  },

  authRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginVertical: 20,
  },
  passwordChecklist: {
    marginTop: -5,
    marginBottom: 10,
  },
  passwordRule: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ruleIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  ruleIndicatorMet: {
    backgroundColor: "#10B981",
  },
  ruleIndicatorPending: {
    backgroundColor: "#EF4444",
  },
  ruleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  ruleTextMet: {
    color: "#10B981",
  },
  ruleTextPending: {
    color: "#EF4444",
  },

  authBox: {
    alignItems: "center",
  },

  authIcon: {
    width: 45,
    height: 45,
    tintColor: "#1B1F3B",
  },

  authText: {
    marginTop: 6,
    fontSize: 13,
    color: "#1B1F3B",
    fontWeight: "600",
  },

  verticalDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#D5D9E2",
  },

  signupButton: {
    backgroundColor: "#D4D6DB",
    height: 52,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },

  signupButtonText: {
    color: "#000",
    fontSize: 20,
    fontWeight: "700",
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
});
