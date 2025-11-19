import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PasswordAnalysis } from "../services/PasswordSecurityService";

export default function SecurityDetailsscreen({ navigation, route }: any) {
  const { type, analysis } = route?.params || {};
  
  if (!analysis) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: any) => {
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.platformName}>{item.platform}</Text>
          {type === "compromised" && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🚨 Compromised</Text>
            </View>
          )}
          {type === "weak" && (
            <View style={[styles.badge, styles.weakBadge]}>
              <Text style={[styles.badgeText, styles.weakBadgeText]}>⚠️ Weak</Text>
            </View>
          )}
          {type === "reused" && (
            <View style={[styles.badge, styles.reusedBadge]}>
              <Text style={[styles.badgeText, styles.reusedBadgeText]}>🔁 Reused</Text>
            </View>
          )}
        </View>
        <Text style={styles.username}>{item.username}</Text>
        {type === "compromised" && item.breachCount && (
          <Text style={styles.detailText}>
            Found in {item.breachCount} data breach{item.breachCount > 1 ? "es" : ""}
          </Text>
        )}
        {type === "weak" && item.score !== undefined && (
          <Text style={styles.detailText}>Security Score: {item.score}/100</Text>
        )}
        {type === "weak" && item.issues && item.issues.length > 0 && (
          <View style={styles.issuesList}>
            {item.issues.slice(0, 2).map((issue: string, idx: number) => (
              <Text key={idx} style={styles.issueItem}>• {issue}</Text>
            ))}
          </View>
        )}
        {type === "reused" && item.usedIn && (
          <Text style={styles.detailText}>
            Also used in: {item.usedIn.slice(0, 2).join(", ")}
            {item.usedIn.length > 2 && ` +${item.usedIn.length - 2} more`}
          </Text>
        )}
        <Pressable
          style={styles.changeButton}
          onPress={() => {
            navigation.navigate("PasswordDetails", { platform: item.platform });
          }}
        >
          <Text style={styles.changeButtonText}>Change Password →</Text>
        </Pressable>
      </View>
    );
  };

  const getTitle = () => {
    switch (type) {
      case "compromised":
        return "Compromised Passwords";
      case "weak":
        return "Weak Passwords";
      case "reused":
        return "Reused Passwords";
      default:
        return "Security Issues";
    }
  };

  const getData = () => {
    switch (type) {
      case "compromised":
        // Handle both snake_case (from API) and camelCase (from service)
        return analysis.compromised_passwords || analysis.compromisedPasswords || [];
      case "weak":
        // Handle both snake_case (from API) and camelCase (from service)
        return analysis.weak_passwords || analysis.weakPasswords || [];
      case "reused":
        // Handle both snake_case (from API) and camelCase (from service)
        return analysis.reused_passwords || analysis.reusedPasswords || [];
      default:
        return [];
    }
  };

  const data = getData();

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
        <Text style={styles.title}>{getTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No issues found!</Text>
          <Text style={styles.emptySubtext}>
            All your passwords are secure in this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
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
    fontSize: 20,
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
  },
  itemCard: {
    backgroundColor: "#F4F6FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E4EC",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  platformName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1F3B",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  weakBadge: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  weakBadgeText: {
    color: "#D97706",
  },
  reusedBadge: {
    backgroundColor: "#DBEAFE",
    borderColor: "#BFDBFE",
  },
  reusedBadgeText: {
    color: "#2563EB",
  },
  username: {
    fontSize: 14,
    color: "#6A7181",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#6A7181",
    marginBottom: 8,
    lineHeight: 18,
  },
  issuesList: {
    marginTop: 5,
    marginBottom: 8,
  },
  issueItem: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    marginBottom: 2,
  },
  changeButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: "#4267FF",
    alignItems: "center",
  },
  changeButtonText: {
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

