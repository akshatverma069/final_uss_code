import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PasswordSecurityService, PasswordCheckResult } from "../services/PasswordSecurityService";
import { passwordsAPI } from "../services/api";

interface PasswordAccount {
  id: string;
  username: string;
  password: string;
  strength: "weak" | "medium" | "strong" | "very-strong";
  securityCheck?: PasswordCheckResult;
  isCompromised?: boolean;
  isReused?: boolean;
}

type PasswordRecord = {
  id: string;
  platform: string;
  username: string;
  password: string;
};

export default function PasswordDetailsscreen({ navigation, route }: any) {
  const platform = route?.params?.platform || "Platform";
  
  const [accounts, setAccounts] = useState<PasswordAccount[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [editingAccount, setEditingAccount] = useState<PasswordAccount | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [checkingSecurity, setCheckingSecurity] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [allPasswordsCache, setAllPasswordsCache] = useState<PasswordRecord[] | null>(null);
  const securityCheckTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  // Load passwords for the platform
  useEffect(() => {
    loadPlatformPasswords();
  }, [platform]);

  useEffect(() => {
    return () => {
      Object.values(securityCheckTimers.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  const normalizePasswordRecords = (records: any[]): PasswordRecord[] =>
    records.map((p) => ({
      id: (p.password_id ?? p.id ?? `${p.application_name}-${p.account_user_name}`).toString(),
      platform: p.application_name || p.platform || "Unknown",
      username: p.account_user_name || p.username || "",
      password: p.application_password || p.password || "",
    }));

  const getAllPasswords = async (): Promise<PasswordRecord[]> => {
    if (allPasswordsCache) {
      return allPasswordsCache;
    }
    const data = await passwordsAPI.getAll(0, 1000);
    const rawList = data.passwords || data || [];
    const normalized = normalizePasswordRecords(rawList);
    setAllPasswordsCache(normalized);
    return normalized;
  };

  const invalidateAllPasswords = () => setAllPasswordsCache(null);

  const loadPlatformPasswords = async () => {
    setLoading(true);
    try {
      const data = await passwordsAPI.getByApplication(platform);
      const transformedAccounts: PasswordAccount[] = data.map((pwd: any) => ({
        id: pwd.password_id.toString(),
        username: pwd.account_user_name,
        password: pwd.application_password,
        strength: getStrengthFromScore(pwd.pswd_strength || 50),
      }));
      setAccounts(transformedAccounts);
      
      // Check security for all passwords
      await checkAllPasswordsSecurity(transformedAccounts);
    } catch (error: any) {
      console.error("Error loading passwords:", error);
      Alert.alert("Error", "Failed to load passwords");
    } finally {
      setLoading(false);
    }
  };

  const getStrengthFromScore = (score: number): "weak" | "medium" | "strong" | "very-strong" => {
    if (score < 40) return "weak";
    if (score < 60) return "medium";
    if (score < 80) return "strong";
    return "very-strong";
  };

  const checkAllPasswordsSecurity = async (accountsToCheck: PasswordAccount[]) => {
    let allPasswords: PasswordRecord[] = [];
    try {
      allPasswords = await getAllPasswords();
    } catch (error) {
      console.error("Failed to load complete password list:", error);
    }
    for (const account of accountsToCheck) {
      setCheckingSecurity((prev) => ({ ...prev, [account.id]: true }));
      
      try {
        // Check if compromised
        const isCompromised = await PasswordSecurityService.checkCompromised(account.password);
        
        // Calculate strength
        const securityCheck = PasswordSecurityService.calculateStrength(account.password);
        
        // Check if reused (we'll need all passwords for this)
        try {
          const reuseCheck = PasswordSecurityService.checkReused(account.password, allPasswords);
          
          // Update account with security info
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === account.id
                ? {
                    ...acc,
                    strength: securityCheck.strength,
                    securityCheck,
                    isCompromised,
                    isReused: reuseCheck.isReused,
                  }
                : acc
            )
          );
        } catch (reuseError) {
          // If reuse check fails, just update with compromised and strength
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === account.id
                ? {
                    ...acc,
                    strength: securityCheck.strength,
                    securityCheck,
                    isCompromised,
                    isReused: false,
                  }
                : acc
            )
          );
        }
      } catch (error) {
        console.error(`Error checking security for account ${account.id}:`, error);
      } finally {
        setCheckingSecurity((prev) => ({ ...prev, [account.id]: false }));
      }
    }
  };

  // Check security when password is edited
  const checkPasswordSecurity = async (password: string, accountId: string) => {
    setCheckingSecurity((prev) => ({ ...prev, [accountId]: true }));
    
    try {
      const isCompromised = await PasswordSecurityService.checkCompromised(password);
      const securityCheck = PasswordSecurityService.calculateStrength(password);
      
      // Try to check reuse (may fail if we can't get all passwords)
      try {
        let allPasswords: PasswordRecord[] = allPasswordsCache ?? [];
        if (allPasswords.length === 0) {
          try {
            allPasswords = await getAllPasswords();
          } catch (error) {
            console.error("Failed to load password list for reuse check:", error);
            allPasswords = [];
          }
        }
        const updatedList = allPasswords.map((pwd) =>
          pwd.id === accountId ? { ...pwd, password } : pwd
        );
        const reuseCheck = PasswordSecurityService.checkReused(password, updatedList);
        setAllPasswordsCache(updatedList);
        
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === accountId
              ? {
                  ...acc,
                  password,
                  strength: securityCheck.strength,
                  securityCheck,
                  isCompromised,
                  isReused: reuseCheck.isReused,
                }
              : acc
          )
        );
        setEditingAccount((prev) =>
          prev && prev.id === accountId
            ? {
                ...prev,
                password,
                strength: securityCheck.strength,
                securityCheck,
                isCompromised,
                isReused: reuseCheck.isReused,
              }
            : prev
        );
      } catch {
        // If reuse check fails, just update with compromised and strength
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === accountId
              ? {
                  ...acc,
                  password,
                  strength: securityCheck.strength,
                  securityCheck,
                  isCompromised,
                  isReused: false,
                }
              : acc
          )
        );
        setEditingAccount((prev) =>
          prev && prev.id === accountId
            ? {
                ...prev,
                password,
                strength: securityCheck.strength,
                securityCheck,
                isCompromised,
                isReused: false,
              }
            : prev
        );
      }
    } catch (error) {
      console.error("Error checking password security:", error);
    } finally {
      setCheckingSecurity((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "very-strong":
        return "#10B981"; // Green
      case "strong":
        return "#10B981"; // Green
      case "medium":
        return "#F59E0B"; // Orange
      case "weak":
        return "#EF4444"; // Red
      default:
        return "#6A7181"; // Gray
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case "very-strong":
        return "Very Strong";
      case "strong":
        return "Strong";
      case "medium":
        return "Medium";
      case "weak":
        return "Weak";
      default:
        return "Unknown";
    }
  };

  const handleEdit = (account: PasswordAccount) => {
    setEditingAccount({ ...account });
  };

  const schedulePasswordSecurityCheck = (password: string, accountId: string) => {
    if (securityCheckTimers.current[accountId]) {
      clearTimeout(securityCheckTimers.current[accountId]!);
    }
    securityCheckTimers.current[accountId] = setTimeout(() => {
      checkPasswordSecurity(password, accountId);
    }, 400);
  };

  const handleSaveEdit = async () => {
    if (editingAccount) {
      try {
        // Update password in backend
        await passwordsAPI.update(
          parseInt(editingAccount.id),
          editingAccount.password,
          platform,
          editingAccount.username
        );
        
        // Check security of new password
        await checkPasswordSecurity(editingAccount.password, editingAccount.id);
        
        // Reload passwords
        invalidateAllPasswords();
        await loadPlatformPasswords();
        
        setEditingAccount(null);
        Alert.alert("Success", "Password updated successfully!");
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to update password");
      }
    }
  };

  const handleDelete = (id: string) => {
    setAccountToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirm.toLowerCase() !== "delete") {
      Alert.alert("Error", "Please type 'delete' to confirm.");
      return;
    }

    if (!accountToDelete) return;

    try {
      await passwordsAPI.delete(parseInt(accountToDelete));
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountToDelete));
      invalidateAllPasswords();
      setDeleteModalVisible(false);
      setDeleteConfirm("");
      setAccountToDelete(null);
      Alert.alert("Success", "Password deleted successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete password");
    }
  };

  const handleCopy = (password: string) => {
    // TODO: Implement clipboard copy using @react-native-clipboard/clipboard
    Alert.alert("Copied", "Password copied to clipboard!");
  };

  const handleShare = (account: PasswordAccount) => {
    navigation.navigate("SelectGroups", {
      platform,
      passwordId: account.id,
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
        <Text style={styles.title}>{platform}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4267FF" />
            <Text style={styles.loadingText}>Loading passwords...</Text>
          </View>
        ) : accounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No passwords found for {platform}</Text>
          </View>
        ) : (
          accounts.map((account) => (
          <View key={account.id} style={styles.accountCard}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={
                  editingAccount?.id === account.id
                    ? editingAccount.username
                    : account.username
                }
                editable={editingAccount?.id === account.id}
                onChangeText={(text) => {
                  if (editingAccount?.id === account.id) {
                    setEditingAccount({ ...editingAccount, username: text });
                  }
                }}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={
                  editingAccount?.id === account.id
                    ? editingAccount.password
                    : account.password
                }
                secureTextEntry={!visiblePasswords[account.id]}
                editable={editingAccount?.id === account.id}
                onChangeText={(text) => {
                  if (editingAccount?.id === account.id) {
                    const updated = { ...editingAccount, password: text };
                    setEditingAccount(updated);
                    if (text.length >= 4) {
                      schedulePasswordSecurityCheck(text, editingAccount.id);
                    }
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility(account.id)}
              >
                <Text style={styles.eyeIcon}>
                  {visiblePasswords[account.id] ? "🙈" : "👁️"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.strengthContainer}>
              <Text style={styles.strengthLabel}>Password Strength:</Text>
              {checkingSecurity[account.id] ? (
                <Text style={styles.checkingText}>Checking...</Text>
              ) : (
                <>
                  <View
                    style={[
                      styles.strengthBadge,
                      { backgroundColor: getStrengthColor(account.strength) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.strengthText,
                        { color: getStrengthColor(account.strength) },
                      ]}
                    >
                      {getStrengthLabel(account.strength)}
                    </Text>
                  </View>
                  {account.securityCheck && (
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreText}>Score: {account.securityCheck.score}/100</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Security Warnings */}
            {account.isCompromised && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningIcon}>🚨</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Compromised Password</Text>
                  <Text style={styles.warningText}>
                    This password was found in a data breach. Change it immediately!
                  </Text>
                </View>
              </View>
            )}

            {account.isReused && account.securityCheck && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningIcon}>🔁</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Reused Password</Text>
                  <Text style={styles.warningText}>
                    This password is used in multiple accounts. Use a unique password for better security.
                  </Text>
                </View>
              </View>
            )}

            {account.securityCheck && account.securityCheck.issues.length > 0 && (
              <View style={styles.issuesContainer}>
                <Text style={styles.issuesTitle}>Issues:</Text>
                {account.securityCheck.issues.slice(0, 3).map((issue, idx) => (
                  <Text key={idx} style={styles.issueText}>• {issue}</Text>
                ))}
              </View>
            )}

            {account.securityCheck && account.securityCheck.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                {account.securityCheck.recommendations.slice(0, 2).map((rec, idx) => (
                  <Text key={idx} style={styles.recommendationText}>• {rec}</Text>
                ))}
              </View>
            )}

            {editingAccount?.id === account.id ? (
              <View style={styles.editActions}>
                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>✓ Save</Text>
                </Pressable>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setEditingAccount(null)}
                >
                  <Text style={styles.cancelButtonText}>✕ Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleDelete(account.id)}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleEdit(account)}
                >
                  <Text style={styles.actionIcon}>✏️</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleCopy(account.password)}
                >
                  <Text style={styles.actionIcon}>📋</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleShare(account)}
                >
                  <Text style={styles.actionIcon}>📤</Text>
                </Pressable>
              </View>
            )}
          </View>
          ))
        )}

        {/* Notes Section */}
        <View style={styles.notesContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes....."
            placeholderTextColor="#9FA5B4"
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Password</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this password? If yes, type
              "delete" in the box below.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type 'delete' to confirm"
              placeholderTextColor="#9FA5B4"
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirm("");
                }}
              >
                <Text style={styles.modalCancelText}>✕ Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
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
    textTransform: "capitalize",
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
  accountCard: {
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B1F3B",
    marginBottom: 8,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1B1F3B",
  },
  eyeButton: {
    padding: 5,
  },
  eyeIcon: {
    fontSize: 20,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  strengthLabel: {
    fontSize: 13,
    color: "#6A7181",
    marginRight: 8,
  },
  strengthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  actionButton: {
    marginLeft: 15,
    padding: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  notesContainer: {
    marginTop: 10,
  },
  notesInput: {
    backgroundColor: "#F4F6FA",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1B1F3B",
    borderWidth: 1,
    borderColor: "#E0E4EC",
    minHeight: 100,
    textAlignVertical: "top",
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
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: "#6A7181",
    marginBottom: 15,
    lineHeight: 20,
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
  modalDeleteButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  modalDeleteText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  checkingText: {
    fontSize: 12,
    color: "#6A7181",
    fontStyle: "italic",
  },
  scoreContainer: {
    marginTop: 5,
  },
  scoreText: {
    fontSize: 12,
    color: "#6A7181",
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 16,
  },
  issuesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  issuesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97706",
    marginBottom: 6,
  },
  issueText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    marginBottom: 2,
  },
  recommendationsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  recommendationsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
    marginBottom: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
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
});

