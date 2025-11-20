import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { passwordsAPI, groupsAPI } from "../services/api";

interface PasswordPlatform {
  id: string;
  name: string;
  accountCount: number;
}

interface SharedPasswordEntry {
  id: string;
  groupName: string;
  applicationName: string;
  accountUserName: string;
  password: string;
}

export default function Vaultscreen({ navigation, route }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [platforms, setPlatforms] = useState<PasswordPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const applicationType = route?.params?.applicationType || null;
  const search = route?.params?.search || "";
  const [sharedPasswords, setSharedPasswords] = useState<SharedPasswordEntry[]>([]);
  const [sharedVisibility, setSharedVisibility] = useState<Record<string, boolean>>({});

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      
      // If applicationType is provided, filter by application type
      if (applicationType) {
        const response = await passwordsAPI.getByApplicationType(applicationType);
        data = response.passwords || [];
        
        // Group by application_name and count
        const platformMap = new Map<string, number>();
        data.forEach((pwd: any) => {
          const count = platformMap.get(pwd.application_name) || 0;
          platformMap.set(pwd.application_name, count + 1);
        });
        
        const platformList: PasswordPlatform[] = Array.from(platformMap.entries()).map(([name, count], index) => ({
          id: (index + 1).toString(),
          name,
          accountCount: count,
        }));
        
        setPlatforms(platformList);
      } else {
        // Load all applications as before
        data = await passwordsAPI.getApplications();
        const platformMap = new Map<string, number>();
        
        // Count accounts per platform
        data.forEach((app: any) => {
          const count = platformMap.get(app.application_name) || 0;
          platformMap.set(app.application_name, count + app.total_accounts);
        });
        
        // Convert to array
        const platformList: PasswordPlatform[] = Array.from(platformMap.entries()).map(([name, count], index) => ({
          id: (index + 1).toString(),
          name,
          accountCount: count,
        }));
        
        setPlatforms(platformList);
      }
    } catch (error: any) {
      console.error("Error loading applications:", error);
      Alert.alert("Error", "Failed to load passwords");
    } finally {
      setLoading(false);
    }
  }, [applicationType]);

  const loadSharedPasswords = useCallback(async () => {
    try {
      const data = await groupsAPI.getSharedPasswords();
      // Backend now returns decrypted plaintext values
      const formatted: SharedPasswordEntry[] = data.map((item: any, index: number) => ({
        id: `${item.group_name}-${item.password_id}-${index}`,
        groupName: item.group_name,
        applicationName: item.application_name || "",
        accountUserName: item.account_user_name || "",
        password: item.application_password || "",
      }));
      setSharedPasswords(formatted);
    } catch (error: any) {
      console.error("Error loading shared passwords:", error);
      setSharedPasswords([]);
    }
  }, []);

  useEffect(() => {
    loadApplications();
    loadSharedPasswords();
  }, [loadApplications, loadSharedPasswords]);

  useFocusEffect(
    React.useCallback(() => {
      loadSharedPasswords();
    }, [loadSharedPasswords])
  );

  const toggleSharedVisibility = (id: string) => {
    setSharedVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredPlatforms = platforms.filter((platform) => {
    if (searchQuery) {
      return platform.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (search) {
      return platform.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const searchSuggestions =
    searchQuery.trim().length > 0
      ? platforms
          .filter((platform) =>
            platform.name.toLowerCase().startsWith(searchQuery.trim().toLowerCase())
          )
          .slice(0, 5)
      : [];

  const handlePlatformPress = (platform: string) => {
    navigation.navigate("PasswordDetails", { platform });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>
          {applicationType ? applicationType : "My Vault"}
        </Text>
        <View style={styles.placeholder} />
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
        />
      </View>

      {searchQuery.trim().length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Recommendations</Text>
          {searchSuggestions.length > 0 ? (
            searchSuggestions.map((item) => (
              <Pressable
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handlePlatformPress(item.name)}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
                <Text style={styles.suggestionCount}>
                  {item.accountCount} {item.accountCount === 1 ? "account" : "accounts"}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.suggestionsEmpty}>No matches for "{searchQuery.trim()}"</Text>
          )}
        </View>
      )}

      {/* Add Password Button */}
      <Pressable
        style={styles.addButton}
        onPress={() => navigation.navigate("AddPassword")}
      >
        <Text style={styles.addButtonText}>+ Add Password</Text>
      </Pressable>

      {/* Platforms List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4267FF" />
          <Text style={styles.loadingText}>Loading passwords...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlatforms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.platformItem}
              onPress={() => handlePlatformPress(item.name)}
            >
              <View style={styles.platformContent}>
                <Text style={styles.platformName}>{item.name}</Text>
                <Text style={styles.platformCount}>
                  {item.accountCount} {item.accountCount === 1 ? "account" : "accounts"}
                </Text>
              </View>
              <Text style={styles.menuIcon}>⋮</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No passwords found</Text>
            </View>
          }
        />
      )}

      {sharedPasswords.length > 0 ? (
        <View style={styles.sharedSection}>
          <Text style={styles.sharedTitle}>Shared with you</Text>
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
      ) : null}
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
  platformItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  platformContent: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 4,
  },
  platformCount: {
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
  sharedSection: {
    marginTop: 20,
  },
  sharedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 12,
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
  suggestionsContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E4EC",
    backgroundColor: "#F7F8FC",
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1F3B",
    marginBottom: 8,
  },
  suggestionItem: {
    paddingVertical: 6,
  },
  suggestionText: {
    fontSize: 14,
    color: "#1B1F3B",
    fontWeight: "600",
  },
  suggestionCount: {
    fontSize: 12,
    color: "#6A7181",
  },
  suggestionsEmpty: {
    fontSize: 13,
    color: "#6A7181",
    fontStyle: "italic",
  },
});

