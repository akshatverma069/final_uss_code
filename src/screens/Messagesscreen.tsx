import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messagesAPI } from "../services/api";

interface Message {
  id: string;
  type: "trusted_user_request" | "group_invitation";
  from: string;
  fromEmail?: string;
  groupName?: string;
  message: string;
  timestamp: string;
  status: "pending" | "accepted" | "rejected";
}

export default function Messagesscreen({ navigation, route }: any) {
  // Get callback from route params to update message count in Home screen
  const updateMessageCount = route?.params?.updateMessageCount;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await messagesAPI.getAll();
      // Transform API response to Message format
      const transformedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id || msg.message_id || String(Date.now()),
        type: msg.type,
        from: msg.from || msg.from_user,
        fromEmail: msg.from_email || msg.fromEmail,
        groupName: msg.group_name || msg.groupName,
        message: msg.message,
        timestamp: formatTimestamp(msg.timestamp),
        status: msg.status || "pending",
      }));
      setMessages(transformedMessages);
      
      // Update message count
      if (updateMessageCount) {
        updateMessageCount(transformedMessages.filter((m) => m.status === "pending").length);
      }
    } catch (error: any) {
      console.error("Error loading messages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    // Simple timestamp formatting (can be improved)
    if (!timestamp) return "Just now";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } catch {
      return timestamp;
    }
  };

  const handleAccept = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    
    if (!message) return;

    try {
      // Call backend API to accept message
      await messagesAPI.accept(messageId);
      
      // Update message status immediately
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: "accepted" as const }
            : msg
        );
        // Update message count in parent screen
        if (updateMessageCount) {
          const pendingCount = updated.filter((m) => m.status === "pending").length;
          updateMessageCount(pendingCount);
        }
        return updated;
      });

      if (message.type === "trusted_user_request") {
        Alert.alert(
          "Accepted",
          `You have accepted ${message.from}'s trusted user request.`,
          [
            {
              text: "OK",
              onPress: () => {
                // Reload messages to remove accepted ones
                loadMessages();
              },
            },
          ]
        );
      } else if (message.type === "group_invitation") {
        Alert.alert(
          "Accepted",
          `You have accepted the invitation to join ${message.groupName}.`,
          [
            {
              text: "OK",
              onPress: () => {
                // Reload messages to remove accepted ones
                loadMessages();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept message");
    }
  };

  const handleReject = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    
    if (!message) return;

    Alert.alert(
      "Reject Request",
      message.type === "trusted_user_request"
        ? `Are you sure you want to reject ${message.from}'s trusted user request?`
        : `Are you sure you want to reject the invitation to ${message.groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              // Call backend API to reject message
              await messagesAPI.reject(messageId);
              
              // Update message status immediately
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, status: "rejected" as const }
                    : msg
                );
                // Update message count in parent screen
                if (updateMessageCount) {
                  const pendingCount = updated.filter((m) => m.status === "pending").length;
                  updateMessageCount(pendingCount);
                }
                return updated;
              });

              Alert.alert(
                "Rejected",
                message.type === "trusted_user_request"
                  ? `You have rejected ${message.from}'s trusted user request.`
                  : `You have rejected the invitation to ${message.groupName}.`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Reload messages to remove rejected ones
                      loadMessages();
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to reject message");
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.status !== "pending") {
      return null; // Don't show accepted/rejected messages
    }

    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <View style={styles.messageIcon}>
            <Text style={styles.iconText}>
              {item.type === "trusted_user_request" ? "👤" : "👥"}
            </Text>
          </View>
          <View style={styles.messageContent}>
            <Text style={styles.messageFrom}>{item.from}</Text>
            <Text style={styles.messageText}>
              {item.type === "trusted_user_request"
                ? item.message
                : `${item.message} "${item.groupName}"`}
            </Text>
            {item.fromEmail && (
              <Text style={styles.messageEmail}>{item.fromEmail}</Text>
            )}
            <Text style={styles.messageTime}>{item.timestamp}</Text>
          </View>
        </View>

        <View style={styles.messageActions}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const pendingMessages = messages.filter((m) => m.status === "pending");

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
        <Text style={styles.title}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4267FF" />
          <Text style={styles.emptyText}>Loading messages...</Text>
        </View>
      ) : pendingMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No new messages</Text>
          <Text style={styles.emptySubtext}>
            You're all caught up! New requests and invitations will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  messageCard: {
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  messageHeader: {
    flexDirection: "row",
    marginBottom: 15,
  },
  messageIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4267FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageFrom: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#6A7181",
    marginBottom: 4,
  },
  messageEmail: {
    fontSize: 13,
    color: "#9FA5B4",
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: "#9FA5B4",
    marginTop: 4,
  },
  messageActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginRight: 10,
  },
  rejectButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#4267FF",
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6A7181",
    textAlign: "center",
    lineHeight: 20,
  },
});

