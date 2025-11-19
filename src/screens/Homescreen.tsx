import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  passwordsAPI,
  messagesAPI,
  securityAPI,
  getCurrentUser,
  groupsAPI,
} from "../services/api";

interface PasswordItem {
  id: string;
  platform: string;
  accountCount: number;
}

interface ApplicationType {
  id: string;
  type: string;
  count: number;
}

interface SharedPassword {
  id: string;
  groupName: string;
  applicationName: string;
  accountUserName: string;
  password: string;
}

export default function Homescreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const [recentlyAdded, setRecentlyAdded] = useState<PasswordItem[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [username, setUsername] = useState<string>("");
  const [compromisedCount, setCompromisedCount] = useState(0);
  const [sharedPasswords, setSharedPasswords] = useState<SharedPassword[]>([]);
  const [sharedVisibility, setSharedVisibility] = useState<Record<string, boolean>>({});
  const initials = React.useMemo(() => {
    if (!username) return "U";
    const parts = username.split(/[\s._-]+/).filter(Boolean).slice(0, 2);
    const letters = parts.map((s) => (s && s[0] ? s[0].toUpperCase() : ""));
    const joined = letters.join("");
    return joined || "U";
  }, [username]);

  useEffect(() => {
    loadRecentPasswords();
    loadMessageCount();
    loadCompromisedCount();
    loadApplicationTypes();
    loadSharedPasswords();
    const user = getCurrentUser();
    if (user?.username) {
      setUsername(user.username);
    }
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadRecentPasswords();
      loadMessageCount();
      loadCompromisedCount();
      loadApplicationTypes();
      loadSharedPasswords();
    }, [])
  );

  const loadRecentPasswords = async () => {
    try {
      const data = await passwordsAPI.getRecent(4);
      const recent = data.map((pwd: any) => ({
        id: pwd.password_id.toString(),
        platform: pwd.application_name,
        accountCount: 1, // Will be updated when we get platform counts
      }));
      
      // Group by platform
      const platformMap = new Map<string, number>();
      recent.forEach((item: PasswordItem) => {
        const count = platformMap.get(item.platform) || 0;
        platformMap.set(item.platform, count + 1);
      });
      
      const grouped = Array.from(platformMap.entries()).map(([platform, accountCount], index) => ({
        id: (index + 1).toString(),
        platform,
        accountCount,
      }));
      
      setRecentlyAdded(grouped);
    } catch (error) {
      console.error("Error loading recent passwords:", error);
    }
  };

  const loadMessageCount = async () => {
    try {
      const data = await messagesAPI.getCount();
      setPendingMessagesCount(data.count || 0);
    } catch (error) {
      console.error("Error loading message count:", error);
    }
  };

  const loadCompromisedCount = async () => {
    try {
      const analysis = await securityAPI.analyzePasswords();
      setCompromisedCount(analysis.compromised_count || 0);
    } catch (error) {
      console.error("Error loading compromised count:", error);
      setCompromisedCount(0);
    }
  };

  const loadApplicationTypes = async () => {
    try {
      const data = await passwordsAPI.getApplicationTypes();
      const types: ApplicationType[] = data.map((item: any, index: number) => ({
        id: (index + 1).toString(),
        type: item.application_type,
        count: item.total_passwords,
      }));
      setApplicationTypes(types);
    } catch (error) {
      console.error("Error loading application types:", error);
      setApplicationTypes([]);
    }
  };

  const loadSharedPasswords = async () => {
    try {
      const data = await groupsAPI.getSharedPasswords();
      const formatted: SharedPassword[] = data.map((item: any, index: number) => ({
        id: `${item.group_name}-${item.password_id}-${index}`,
        groupName: item.group_name,
        applicationName: item.application_name,
        accountUserName: item.account_user_name,
        password: item.application_password || "",
      }));
      setSharedPasswords(formatted);
    } catch (error) {
      console.error("Error loading shared passwords:", error);
      setSharedPasswords([]);
    }
  };

  const toggleSharedVisibility = (id: string) => {
    setSharedVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => navigation.navigate("Login"),
      },
    ]);
  };

  const handleSecurityAlert = () => {
    navigation.navigate("Security");
  };

  const handlePlatformPress = (platform: string) => {
    navigation.navigate("PasswordDetails", { platform });
  };

  const handleCategoryPress = (applicationType: string) => {
    navigation.navigate("Vault", { applicationType });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.username}>
              {username || "User"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.messagesButton}
              onPress={() =>
                navigation.navigate("Messages", {
                  updateMessageCount: (count: number) => {
                    setPendingMessagesCount(count);
                  },
                })
              }
            >
              <Text style={styles.messagesIcon}>💬</Text>
              {pendingMessagesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingMessagesCount > 9 ? "9+" : pendingMessagesCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>→ Logout</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Main Title */}
        <View style={styles.titleSection}>
          <Text style={styles.subtitle}>Manage your</Text>
          <Text style={styles.mainTitle}>Password Easily</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search passwords..."
            placeholderTextColor="#9FA5B4"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                navigation.navigate("Vault", { search: searchQuery });
              }
            }}
          />
        </View>

        {/* Password Categories - Dynamic Folders */}
        {applicationTypes.length > 0 && (
          <View style={styles.categoriesContainer}>
            {applicationTypes.slice(0, 3).map((appType) => (
              <Pressable
                key={appType.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(appType.type)}
              >
                <Text style={styles.categoryIcon}>📁</Text>
                <Text style={styles.categoryTitle} numberOfLines={1}>
                  {appType.type}
                </Text>
                <Text style={styles.categoryCount}>
                  {appType.count} {appType.count === 1 ? "Password" : "Passwords"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Security Alert */}
        <View style={styles.alertSection}>
          <Text style={styles.sectionTitle}>Security Alert:</Text>
          <Pressable style={styles.alertCard} onPress={handleSecurityAlert}>
            <Text style={styles.alertIcon}>🔓</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {compromisedCount} Compromised Password{compromisedCount !== 1 ? "s" : ""}
              </Text>
              <Text style={styles.alertSubtitle}>Found in Breach</Text>
            </View>
            <Text style={styles.alertArrow}>→</Text>
          </Pressable>
        </View>

        {/* Shared Passwords */}
        {sharedPasswords.length > 0 && (
          <View style={styles.sharedSection}>
            <Text style={styles.sectionTitle}>Shared with you</Text>
            {sharedPasswords.map((item) => (
              <View key={item.id} style={styles.sharedCard}>
                <View style={styles.sharedHeader}>
                  <View>
                    <Text style={styles.sharedApp}>{item.applicationName}</Text>
                    <Text style={styles.sharedAccount}>Username: {item.accountUserName}</Text>
                  </View>
                  <Text style={styles.sharedGroup}>Group: {item.groupName}</Text>
                </View>
                <View style={styles.sharedPasswordRow}>
                  <Text style={styles.sharedPasswordLabel}>Password:</Text>
                  <Text style={styles.sharedPasswordValue}>
                    {sharedVisibility[item.id] ? item.password || "—" : "••••••••"}
                  </Text>
                  <Pressable onPress={() => toggleSharedVisibility(item.id)}>
                    <Text style={styles.sharedToggle}>
                      {sharedVisibility[item.id] ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recently Added */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recently added</Text>
          <FlatList
            data={recentlyAdded}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recentItem}
                onPress={() => handlePlatformPress(item.platform)}
              >
                <View style={styles.recentItemContent}>
                  <Text style={styles.recentPlatform}>{item.platform}</Text>
                  <Text style={styles.recentCount}>
                    {item.accountCount} accounts
                  </Text>
                </View>
                <Text style={styles.recentMenu}>⋮</Text>
              </Pressable>
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4267FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B1F3B",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  messagesButton: {
    position: "relative",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F4F6FA",
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  messagesIcon: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#E0E4EC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B1F3B",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E4EC",
    marginBottom: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A7181",
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1B1F3B",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 25,
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
  categoriesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6A7181",
  },
  alertSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 12,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 13,
    color: "#6A7181",
  },
  alertArrow: {
    fontSize: 20,
    color: "#1B1F3B",
    marginLeft: 10,
  },
  sharedSection: {
    marginBottom: 30,
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
    alignItems: "flex-start",
    marginBottom: 12,
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
  sharedGroup: {
    fontSize: 13,
    color: "#4267FF",
    fontWeight: "600",
  },
  sharedPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
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
    marginRight: 12,
  },
  sharedToggle: {
    fontSize: 14,
    color: "#4267FF",
    fontWeight: "600",
  },
  recentSection: {
    marginBottom: 20,
  },
  recentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  recentItemContent: {
    flex: 1,
  },
  recentPlatform: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  recentCount: {
    fontSize: 13,
    color: "#6A7181",
  },
  recentMenu: {
    fontSize: 20,
    color: "#1B1F3B",
    marginLeft: 10,
  },
});

