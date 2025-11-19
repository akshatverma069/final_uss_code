import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { groupsAPI } from "../services/api";

interface Group {
  name: string;
  memberCount: number;
  isAdmin?: boolean;
}

export default function Groupsscreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const loadGroups = async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const data = await groupsAPI.listSummaries();
      const groupList: Group[] = data.map((g: any) => ({
        name: g.group_name,
        memberCount: g.member_count ?? 0,
        isAdmin: !!g.is_admin,
      }));
      setGroups(groupList);
    } catch (error: any) {
      console.error("Error loading groups:", error);
      Alert.alert("Error", "Failed to load groups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenCreateModal = () => {
    setNewGroupName("");
    setCreateError(null);
    setCreateModalVisible(true);
  };

  const handleCloseCreateModal = () => {
    if (creating) return;
    setCreateModalVisible(false);
    setNewGroupName("");
    setCreateError(null);
  };

  const handleConfirmCreate = async () => {
    if (creating) return;
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setCreateError("Please enter a group name.");
      return;
    }
    try {
      setCreating(true);
      await groupsAPI.create(trimmed);
      setCreateModalVisible(false);
      setNewGroupName("");
      setCreateError(null);
      await loadGroups();
    } catch (e) {
      console.error("Create group failed:", e);
      Alert.alert("Error", "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGroupPress = (group: Group) => {
    setActionsVisible(false);
    setSelectedGroup(null);
    navigation.navigate("GroupDetails", { group });
  };

  const openGroupActions = (group: Group) => {
    setSelectedGroup(group);
    setActionsVisible(true);
  };

  const closeGroupActions = () => {
    if (deleting) return;
    setActionsVisible(false);
    setSelectedGroup(null);
  };

  const confirmDeleteGroup = () => {
    if (!selectedGroup) return;
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${selectedGroup.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteGroup(selectedGroup.name),
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroups({ showSpinner: false });
  };

  const executeDeleteGroup = async (groupName: string) => {
    try {
      setDeleting(true);
      await groupsAPI.deleteGroup(groupName);
      closeGroupActions();
      await loadGroups();
      Alert.alert("Deleted", `Group "${groupName}" has been deleted.`);
    } catch (error: any) {
      console.error("Delete group failed:", error);
      Alert.alert("Error", error.message || "Failed to delete group");
    } finally {
      setDeleting(false);
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
        <Text style={styles.title}>Groups</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor="#9FA5B4"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Create Group Button */}
      <Pressable style={styles.addButton} onPress={handleOpenCreateModal}>
        <Text style={styles.addButtonText}>
          {creating ? "Creating..." : "+ Create Group"}
        </Text>
      </Pressable>

      {/* Groups List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4267FF" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={styles.groupItem}
            >
              <Pressable
                style={styles.groupContent}
                onPress={() => handleGroupPress(item)}
              >
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupCount}>
                  {item.memberCount} {item.memberCount === 1 ? "Member" : "Members"}
                  {item.isAdmin ? " • Admin" : ""}
                </Text>
              </Pressable>
              <Pressable
                style={styles.menuButton}
                onPress={() => openGroupActions(item)}
              >
                <Text style={styles.menuIcon}>⋮</Text>
              </Pressable>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4267FF"
              colors={["#4267FF"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No groups found</Text>
            </View>
          }
        />
      )}

      {/* Create group modal */}
      <Modal
        transparent
        animationType="fade"
        visible={createModalVisible}
        onRequestClose={handleCloseCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group name"
              placeholderTextColor="#9FA5B4"
              value={newGroupName}
              onChangeText={(text) => {
                setNewGroupName(text);
                if (createError) setCreateError(null);
              }}
              editable={!creating}
            />
            {createError ? <Text style={styles.modalError}>{createError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={handleCloseCreateModal}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalPrimary,
                  creating && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmCreate}
                disabled={creating}
              >
                <Text style={styles.modalPrimaryText}>
                  {creating ? "Creating..." : "Create"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Actions modal */}
      <Modal
        transparent
        animationType="fade"
        visible={actionsVisible && !!selectedGroup}
        onRequestClose={closeGroupActions}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>{selectedGroup?.name}</Text>
            <Pressable
              style={styles.actionItem}
              onPress={() => selectedGroup && handleGroupPress(selectedGroup)}
            >
              <Text style={styles.actionItemText}>View group details</Text>
            </Pressable>
            {selectedGroup?.isAdmin ? (
              <Pressable
                style={styles.actionItem}
                onPress={confirmDeleteGroup}
                disabled={deleting}
              >
                <Text style={styles.actionDeleteText}>
                  {deleting ? "Deleting..." : "Delete group"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.actionItem} onPress={closeGroupActions}>
              <Text style={styles.actionItemText}>Close</Text>
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
    marginBottom: 15,
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
  addButton: {
    backgroundColor: "#4267FF",
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  groupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  groupContent: {
    flex: 1,
  },
  menuButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  groupCount: {
    fontSize: 13,
    color: "#6A7181",
  },
  menuIcon: {
    fontSize: 20,
    color: "#1B1F3B",
    marginLeft: 10,
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
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6A7181",
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
    fontSize: 20,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E4EC",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1B1F3B",
    marginBottom: 10,
  },
  modalError: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginLeft: 10,
  },
  modalCancel: {
    backgroundColor: "#F4F6FA",
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  modalCancelText: {
    color: "#1B1F3B",
    fontSize: 15,
    fontWeight: "600",
  },
  modalPrimary: {
    backgroundColor: "#4267FF",
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  actionSheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E4EC",
  },
  actionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionItemText: {
    fontSize: 16,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  actionDeleteText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
  },
});

