import React, { useEffect, useState } from "react";
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
import { groupsAPI } from "../services/api";

interface Group {
  name: string;
  accountCount?: number;
}

export default function SelectGroupsscreen({ navigation, route }: any) {
  const platform = route?.params?.platform || "Password";
  const passwordId = route?.params?.passwordId;
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdminGroups();
  }, []);

  const loadAdminGroups = async () => {
    setLoading(true);
    try {
      const data = await groupsAPI.listSummaries();
      const adminGroups: Group[] = data
        .filter((g: any) => g.is_admin)
        .map((g: any) => ({
          name: g.group_name,
          accountCount: g.member_count ?? 0,
        }));
      setGroups(adminGroups);
    } catch (error: any) {
      console.error("Failed to load groups:", error);
      Alert.alert("Error", error.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupSelection = (groupName: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((name) => name !== groupName)
        : [...prev, groupName]
    );
  };

  const handleSave = () => {
    if (!passwordId) {
      Alert.alert("Error", "Unable to determine which password to share.");
      return;
    }

    if (selectedGroups.length === 0) {
      Alert.alert("Select Group", "Choose at least one group to share this password with.");
      return;
    }

    setSaving(true);
    Promise.all(
      selectedGroups.map((groupName) =>
        groupsAPI.shareAll(groupName, Number(passwordId))
      )
    )
      .then(() => {
        Alert.alert(
          "Password Shared",
          `Password for ${platform} has been shared with selected groups.`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      })
      .catch((error: any) => {
        console.error("Share password failed:", error);
        Alert.alert("Error", error.message || "Failed to share password.");
      })
      .finally(() => {
        setSaving(false);
      });
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
        <Text style={styles.title}>Select Groups</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4267FF" />
          <Text style={styles.loadingText}>Loading your admin groups...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No admin groups</Text>
          <Text style={styles.emptyText}>
            You can only share passwords with groups you manage. Create a group or ask an admin to add you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selectedGroups.includes(item.name);
            return (
              <Pressable
                style={[
                  styles.groupItem,
                  isSelected && styles.groupItemSelected,
                ]}
                onPress={() => toggleGroupSelection(item.name)}
              >
                <View style={styles.groupContent}>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.groupInfo}>
                    <Text
                      style={[
                        styles.groupName,
                        isSelected && styles.groupNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.groupCount}>
                      {item.accountCount ?? 0} members
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Save Button */}
      {groups.length > 0 && (
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.saveButton,
              (saving || selectedGroups.length === 0) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || selectedGroups.length === 0}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Sharing..." : "Share Password"}
            </Text>
          </Pressable>
        </View>
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
    paddingBottom: 10,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E0E4EC",
  },
  groupItemSelected: {
    borderColor: "#4267FF",
    backgroundColor: "#E8EBFF",
  },
  groupContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D5D9E2",
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxSelected: {
    borderColor: "#4267FF",
    backgroundColor: "#4267FF",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  groupNameSelected: {
    color: "#4267FF",
    fontWeight: "700",
  },
  groupCount: {
    fontSize: 13,
    color: "#6A7181",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E4EC",
  },
  saveButton: {
    backgroundColor: "#4267FF",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  saveButtonDisabled: {
    opacity: 0.7,
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
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: "#6A7181",
    textAlign: "center",
    lineHeight: 20,
  },
});

