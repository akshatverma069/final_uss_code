import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { faqsAPI } from "../services/api";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function FAQsscreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showAddQueryModal, setShowAddQueryModal] = useState(false);
  const [newQuery, setNewQuery] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    try {
      const data = await faqsAPI.getAll();
      const transformedFAQs: FAQ[] = data.map((faq: any) => ({
        id: faq.faq_id.toString(),
        question: faq.question,
        answer: faq.answer,
      }));
      setFaqs(transformedFAQs);
    } catch (error) {
      console.error("Error loading FAQs:", error);
      // Fallback to default FAQs
      setFaqs([
        {
          id: "1",
          question: "How to Add Password",
          answer: "To add a password, go to the Vault screen and click on the 'Add Password' button. Fill in the website/platform, username, and password fields, then click 'Add to Vault'.",
        },
        {
          id: "2",
          question: "How to see vault",
          answer: "To view your vault, navigate to the Vault section from the bottom navigation bar. You will see all your saved passwords organized by platform.",
        },
        {
          id: "3",
          question: "How to see Insecure Password",
          answer: "To view insecure passwords, go to the Security screen from the navigation. You will see alerts for compromised, weak, and reused passwords.",
        },
        {
          id: "4",
          question: "How to check security",
          answer: "Navigate to the Security screen to view your security overview, including password health, security alerts, and recent scans.",
        },
        {
          id: "5",
          question: "How to Add Users",
          answer: "To add trusted users, go to Settings and click on 'Add Emergency Access'. Enter the user's details and your master password to confirm.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFAQs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleAddQuery = () => {
    if (!newQuery.trim()) {
      Alert.alert("Error", "Please enter your question.");
      return;
    }

    // TODO: Submit query to backend
    Alert.alert("Success", "Your query has been submitted! We'll get back to you soon.");
    setShowAddQueryModal(false);
    setNewQuery("");
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
        <Text style={styles.title}>FAQs</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Queries..."
          placeholderTextColor="#9FA5B4"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* FAQs List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4267FF" />
          <Text style={styles.loadingText}>Loading FAQs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFAQs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isExpanded = expandedFAQ === item.id;
            return (
              <Pressable
                style={styles.faqItem}
                onPress={() => toggleFAQ(item.id)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.expandIcon}>{isExpanded ? "▲" : "▼"}</Text>
                </View>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* Add Query Section */}
      <View style={styles.addQuerySection}>
        <Text style={styles.addQueryTitle}>Could not find Your Question?</Text>
        <Pressable
          style={styles.addQueryButton}
          onPress={() => setShowAddQueryModal(true)}
        >
          <Text style={styles.addQueryButtonText}>+ Add Your Query!!</Text>
        </Pressable>
      </View>

      {/* Add Query Modal */}
      <Modal
        visible={showAddQueryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddQueryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Your Query</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your question..."
              placeholderTextColor="#9FA5B4"
              value={newQuery}
              onChangeText={setNewQuery}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddQueryModal(false);
                  setNewQuery("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSubmitButton}
                onPress={handleAddQuery}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1B1F3B",
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  faqItem: {
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    flex: 1,
    marginRight: 10,
  },
  expandIcon: {
    fontSize: 12,
    color: "#6A7181",
  },
  faqAnswer: {
    fontSize: 14,
    color: "#6A7181",
    marginTop: 10,
    lineHeight: 20,
  },
  addQuerySection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E4EC",
    alignItems: "center",
  },
  addQueryTitle: {
    fontSize: 15,
    color: "#6A7181",
    marginBottom: 12,
    textAlign: "center",
  },
  addQueryButton: {
    backgroundColor: "#4267FF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  addQueryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: "#F4F6FA",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1B1F3B",
    borderWidth: 1,
    borderColor: "#E0E4EC",
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#E0E4EC",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
  },
  modalCancelText: {
    color: "#1B1F3B",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: "#4267FF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6A7181",
  },
});

