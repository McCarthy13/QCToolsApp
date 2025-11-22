import { View, Text, Pressable, ScrollView, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { DepartmentType } from "../types/quality-log";

type Props = NativeStackScreenProps<RootStackParamList, "QualityLogList">;

export default function QualityLogListScreen({ navigation, route }: Props) {
  const { department } = route.params;
  const getLogsByDepartment = useQualityLogStore((s) => s.getLogsByDepartment);
  const deleteLog = useQualityLogStore((s) => s.deleteLog);

  const logs = getLogsByDepartment(department as DepartmentType);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Good":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "Issues Found":
        return { bg: "#FED7AA", text: "#9A3412" };
      case "Critical Issues":
        return { bg: "#FEE2E2", text: "#991B1B" };
      default:
        return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        <View style={{ padding: 24 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              {department} Logs
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
            </Text>
          </View>

          {/* Add New Button */}
          <Pressable
            onPress={() =>
              navigation.navigate("QualityLogAddEdit", { department })
            }
            style={{
              backgroundColor: "#3B82F6",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              Create New Log Entry
            </Text>
          </Pressable>

          {/* Log Entries */}
          {logs.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 32,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 12 }}>
                No Log Entries Yet
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
                Create your first log entry to track quality issues and production data.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {logs.map((log) => {
                const statusColor = getStatusColor(log.overallStatus);
                const openIssues = log.issues?.filter((i) => i.status === "Open").length || 0;
                const criticalIssues = log.issues?.filter(
                  (i) => i.severity === "Critical"
                ).length || 0;

                return (
                  <Pressable
                    key={log.id}
                    onPress={() =>
                      navigation.navigate("QualityLogDetail", { logId: log.id })
                    }
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 16,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
                            {formatDate(log.date)}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={{
                            backgroundColor: statusColor.bg,
                            alignSelf: "flex-start",
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginTop: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: statusColor.text }}>
                            {log.overallStatus}
                          </Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    </View>

                    {/* Production Items */}
                    {log.productionItems && log.productionItems.length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>
                          Production: {log.productionItems.length}{" "}
                          {log.productionItems.length === 1 ? "item" : "items"}
                        </Text>
                        <View style={{ gap: 4 }}>
                          {log.productionItems.slice(0, 2).map((item) => (
                            <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <View
                                style={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: "#9CA3AF",
                                }}
                              />
                              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                                {item.jobName}
                                {item.pieceNumber ? ` - ${item.pieceNumber}` : ""}
                              </Text>
                            </View>
                          ))}
                          {log.productionItems.length > 2 && (
                            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                              +{log.productionItems.length - 2} more
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Issue Stats */}
                    {log.issues && log.issues.length > 0 && (
                      <View style={{ flexDirection: "row", gap: 16, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="alert-circle-outline" size={16} color="#6B7280" />
                          <Text style={{ fontSize: 13, color: "#6B7280" }}>
                            {log.issues.length} {log.issues.length === 1 ? "issue" : "issues"}
                          </Text>
                        </View>
                        {openIssues > 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="time-outline" size={16} color="#F59E0B" />
                            <Text style={{ fontSize: 13, color: "#F59E0B", fontWeight: "600" }}>
                              {openIssues} open
                            </Text>
                          </View>
                        )}
                        {criticalIssues > 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="warning" size={16} color="#EF4444" />
                            <Text style={{ fontSize: 13, color: "#EF4444", fontWeight: "600" }}>
                              {criticalIssues} critical
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
