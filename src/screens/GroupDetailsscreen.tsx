import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { groupsAPI, usersAPI, messagesAPI } from "../services/api";

interface GroupMember {
  userId: number;
  username: string;
  isAdmin: boolean;
}

interface UserSearchResult {
  user_id: number;
  username: string;
}

interface SharedPasswordSummary {
  id: string;
  applicationName: string;
  accountUserName: string;
  password: string;
  sharedWith: Array<{
    user_id: number;
    username: string;
    is_admin: boolean;
  }>;
}

export default function GroupDetailsscreen({ navigation, route }: any) {
  const group = route?.params?.group;
  const isAdmin = !!group?.isAdmin;
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<UserSearchResult[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sharedPasswords, setSharedPasswords] = useState<SharedPasswordSummary[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedVisibility, setSharedVisibility] = useState<Record<string, boolean>>({});
  const inviteSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = useCallback(async () => {
    if (!group?.name) {
      setError("Group not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await groupsAPI.getMembers(group.name);
      const mapped: GroupMember[] = response.map((member: any) => ({
        userId: member.user_id,
        username: member.username || `User ${member.user_id}`,
        isAdmin: !!member.admin_status,
      }));
      setMembers(mapped);
      setError(null);
    } catch (err: any) {
      const message =
        err.message?.includes("Only group admins")
          ? "Only group admins can view the member list."
          : "Failed to load group members.";
      setError(message);
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [group?.name]);

  const loadGroupSharedPasswords = useCallback(async () => {
    if (!group?.name) {
      setSharedPasswords([]);
      return;
    }
    setSharedLoading(true);
    try {
      if (isAdmin) {
        const data = await groupsAPI.getGroupSharedPasswords(group.name);
        const formatted: SharedPasswordSummary[] = data.map((item: any) => ({
          id: String(item.password_id),
          applicationName: item.application_name,
          accountUserName: item.account_user_name,
          password: item.application_password || "",
          sharedWith: item.shared_with || [],
        }));
        setSharedPasswords(formatted);
      } else {
        const data = await groupsAPI.getSharedPasswords();
        const formatted: SharedPasswordSummary[] = data
          .filter((item: any) => item.group_name === group.name)
          .map((item: any) => ({
            id: String(item.password_id),
            applicationName: item.application_name,
            accountUserName: item.account_user_name,
            password: item.application_password || "",
            sharedWith: [],
          }));
        setSharedPasswords(formatted);
      }
    } catch (err: any) {
      console.error("Failed to load shared passwords:", err);
      setSharedPasswords([]);
    } finally {
      setSharedLoading(false);
    }
  }, [group?.name, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
      loadGroupSharedPasswords();
    }, [loadMembers, loadGroupSharedPasswords])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
    if (isAdmin) {
      loadGroupSharedPasswords();
    }
  };

  useEffect(() => {
    return () => {
      if (inviteSearchTimer.current) {
        clearTimeout(inviteSearchTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!inviteModalVisible) {
      if (inviteSearchTimer.current) {
        clearTimeout(inviteSearchTimer.current);
      }
      return;
    }

    const query = inviteQuery.trim();
    if (query.length < 2) {
      if (inviteSearchTimer.current) {
        clearTimeout(inviteSearchTimer.current);
      }
      setInviteResults([]);
      return;
    }

    if (inviteSearchTimer.current) {
      clearTimeout(inviteSearchTimer.current);
    }

    inviteSearchTimer.current = setTimeout(() => {
      searchUsers(query);
    }, 400);
  }, [inviteQuery, inviteModalVisible]);

  const openInviteModal = () => {
    setInviteModalVisible(true);
    setInviteQuery("");
    setInviteResults([]);
    setInviteError(null);
  };

  const closeInviteModal = () => {
    if (sendingInvite) return;
    setInviteModalVisible(false);
    setInviteQuery("");
    setInviteResults([]);
    setInviteError(null);
  };

  const searchUsers = async (overrideQuery?: string) => {
    const query = (overrideQuery ?? inviteQuery).trim();
    if (query.length < 2) {
      setInviteError("Enter at least 2 characters to search.");
      setInviteResults([]);
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    try {
      const results = await usersAPI.search(query, 10);
      const existingUsernames = new Set(
        members
          .filter((m) => m.username)
          .map((m) => m.username.toLowerCase())
      );
      const filtered = results.filter(
        (user: UserSearchResult) => !existingUsernames.has(user.username.toLowerCase())
      );
      if (filtered.length === 0) {
        setInviteError("No matching users found or already in the group.");
      }
      setInviteResults(filtered);
    } catch (err: any) {
      console.error("User search failed:", err);
      setInviteError(err.message || "Failed to search users.");
      setInviteResults([]);
    } finally {
      setInviteLoading(false);
    }
  };

  const sendInvitation = async (user: UserSearchResult) => {
    if (!group?.name) return;
    setSendingInvite(true);
    try {
      await messagesAPI.createGroupInvitation(user.username, group.name);
      Alert.alert(
        "Invitation sent",
        `${user.username} will receive an invitation to join ${group.name}.`
      );
      closeInviteModal();
    } catch (err: any) {
      console.error("Failed to send invitation:", err);
      Alert.alert("Error", err.message || "Failed to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  const toggleSharedVisibility = (id: string) => {
    setSharedVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderMember = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberIcon}>
        <Text style={styles.memberIconText}>{item.username.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.username}</Text>
        <Text style={styles.memberMeta}>
          {item.isAdmin ? "Admin" : "Member"} • ID: {item.userId}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{group?.name || "Group"}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Group Overview</Text>
        <Text style={styles.summaryText}>
          {group?.memberCount ?? members.length}{" "}
          {(group?.memberCount ?? members.length) === 1 ? "member" : "members"}
        </Text>
        <Text style={styles.summaryText}>
          Role: {group?.isAdmin ? "Admin" : "Member"}
        </Text>
      </View>

      {isAdmin ? (
        <Pressable style={styles.inviteButton} onPress={openInviteModal}>
          <Text style={styles.inviteButtonText}>+ Invite Members</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4267FF" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadMembers}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => `${item.userId}`}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No members yet</Text>
              <Text style={styles.emptyDescription}>
                Invite others to join this group to see them listed here.
              </Text>
            </View>
          }
        />
      )}

      {isAdmin ? (
        <View style={styles.sharedSection}>
          <Text style={styles.sharedTitle}>Shared Passwords</Text>
          {sharedLoading ? (
            <View style={styles.sharedLoading}>
              <ActivityIndicator size="small" color="#4267FF" />
              <Text style={styles.sharedLoadingText}>Loading shared passwords...</Text>
            </View>
          ) : sharedPasswords.length === 0 ? (
            <Text style={styles.sharedEmpty}>
              No passwords shared yet. Share a password to see it listed here.
            </Text>
          ) : (
            sharedPasswords.map((item) => (
              <View key={item.id} style={styles.sharedCard}>
                <View style={styles.sharedHeader}>
                  <View>
                    <Text style={styles.sharedApp}>{item.applicationName}</Text>
                    <Text style={styles.sharedAccount}>
                      Username: {item.accountUserName}
                    </Text>
                  </View>
                  <Pressable onPress={() => toggleSharedVisibility(item.id)}>
                    <Text style={styles.sharedToggle}>
                      {sharedVisibility[item.id] ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.sharedPasswordRow}>
                  <Text style={styles.sharedPasswordLabel}>Password:</Text>
                  <Text style={styles.sharedPasswordValue}>
                    {sharedVisibility[item.id] ? item.password || "—" : "••••••••"}
                  </Text>
                </View>
                {item.sharedWith && item.sharedWith.length > 0 ? (
                  <View style={styles.sharedWithContainer}>
                    <Text style={styles.sharedWithLabel}>Shared with:</Text>
                    <Text style={styles.sharedWithValue}>
                      {item.sharedWith
                        .filter((member) => !member.is_admin)
                        .map((member) => member.username)
                        .join(", ") || "No members"}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}

      <Modal
        visible={inviteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeInviteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite to {group?.name}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Search by username"
              placeholderTextColor="#9FA5B4"
              autoCapitalize="none"
              value={inviteQuery}
              editable={!inviteLoading && !sendingInvite}
              onChangeText={(text) => {
                setInviteQuery(text);
                if (inviteError) setInviteError(null);
              }}
            />
            <Pressable
              style={[styles.modalSearchButton, (inviteLoading || sendingInvite) && styles.disabledButton]}
              onPress={() => searchUsers()}
              disabled={inviteLoading || sendingInvite}
            >
              <Text style={styles.modalSearchText}>
                {inviteLoading ? "Searching..." : "Search"}
              </Text>
            </Pressable>
            {inviteError ? <Text style={styles.modalError}>{inviteError}</Text> : null}

            {inviteResults.length > 0 ? (
              <FlatList
                data={inviteResults}
                keyExtractor={(item) => `${item.user_id}`}
                style={styles.resultsList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultItem}
                    onPress={() => sendInvitation(item)}
                    disabled={sendingInvite}
                  >
                    <Text style={styles.resultName}>{item.username}</Text>
                    <Text style={styles.resultInvite}>
                      {sendingInvite ? "Sending..." : "Invite"}
                    </Text>
                  </Pressable>
                )}
              />
            ) : null}

            <Pressable
              style={[styles.modalCloseButton, sendingInvite && styles.disabledButton]}
              onPress={closeInviteModal}
              disabled={sendingInvite}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1B1F3B",
    flex: 2,
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#F4F6FA",
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    color: "#6A7181",
    marginBottom: 4,
  },
  inviteButton: {
    alignSelf: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#4267FF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inviteButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4267FF",
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4267FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberIconText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  memberMeta: {
    fontSize: 13,
    color: "#6A7181",
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6A7181",
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 12,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E4EC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1B1F3B",
    marginBottom: 12,
    backgroundColor: "#F4F6FA",
  },
  modalSearchButton: {
    backgroundColor: "#4267FF",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  modalSearchText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalError: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  resultsList: {
    maxHeight: 220,
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E4EC",
  },
  resultName: {
    fontSize: 16,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  resultInvite: {
    fontSize: 14,
    color: "#4267FF",
    fontWeight: "600",
  },
  modalCloseButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 15,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.7,
  },
  sharedSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  sharedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 12,
  },
  sharedLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  sharedLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#6A7181",
  },
  sharedEmpty: {
    fontSize: 14,
    color: "#6A7181",
  },
  sharedCard: {
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    padding: 15,
    marginBottom: 12,
  },
  sharedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sharedApp: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
  },
  sharedAccount: {
    fontSize: 13,
    color: "#6A7181",
    marginTop: 4,
  },
  sharedToggle: {
    fontSize: 14,
    color: "#4267FF",
    fontWeight: "600",
  },
  sharedPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sharedPasswordLabel: {
    fontSize: 14,
    color: "#6A7181",
    marginRight: 8,
  },
  sharedPasswordValue: {
    fontSize: 16,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  sharedWithContainer: {
    marginTop: 6,
  },
  sharedWithLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6A7181",
    marginBottom: 2,
  },
  sharedWithValue: {
    fontSize: 13,
    color: "#1B1F3B",
  },
});


