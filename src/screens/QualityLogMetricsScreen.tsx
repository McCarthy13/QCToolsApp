import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "QualityLogMetrics">;

export default function QualityLogMetricsScreen({ navigation }: Props) {
  const departments = useQualityLogStore((s) => s.departments);
  const logs = useQualityLogStore((s) => s.logs);
  const getMetrics = useQualityLogStore((s) => s.getMetrics);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // Get last 30 days
  const endDate = Date.now();
  const startDate = endDate - 30 * 24 * 60 * 60 * 1000;

  const overallStats = {
    totalLogs: logs.length,
    totalIssues: logs.reduce((sum, log) => sum + (log.issues?.length ?? 0), 0),
    criticalIssues: logs.reduce(
      (sum, log) =>
        sum + (log.issues?.filter((i) => i.severity === "Critical").length ?? 0),
      0
    ),
    openIssues: logs.reduce(
      (sum, log) => sum + (log.issues?.filter((i) => i.status === "Open").length ?? 0),
      0
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              Quality Metrics
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Last 30 days
            </Text>
          </View>

          {/* Overall Stats */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 16 }}>
              Overall Summary
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ fontSize: 32, fontWeight: "700", color: "#3B82F6" }}>
                  {overallStats.totalLogs}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  Total Logs
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ fontSize: 32, fontWeight: "700", color: "#F59E0B" }}>
                  {overallStats.totalIssues}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  Total Issues
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ fontSize: 32, fontWeight: "700", color: "#EF4444" }}>
                  {overallStats.criticalIssues}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  Critical
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ fontSize: 32, fontWeight: "700", color: "#8B5CF6" }}>
                  {overallStats.openIssues}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  Open Issues
                </Text>
              </View>
            </View>
          </View>

          {/* Department Breakdown */}
          <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827", marginBottom: 16 }}>
            By Department
          </Text>
          <View style={{ gap: 12, marginBottom: 24 }}>
            {departments.filter((d) => d.isActive).map((dept) => {
              const deptLogs = logs.filter((log) => log.department === dept.name);
              const deptIssues = deptLogs.reduce((sum, log) => sum + (log.issues?.length ?? 0), 0);
              const deptCritical = deptLogs.reduce(
                (sum, log) =>
                  sum + (log.issues?.filter((i) => i.severity === "Critical").length ?? 0),
                0
              );

              return (
                <View
                  key={dept.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
                    {dept.name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <View>
                      <Text style={{ fontSize: 24, fontWeight: "700", color: "#3B82F6" }}>
                        {deptLogs.length}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Logs</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 24, fontWeight: "700", color: "#F59E0B" }}>
                        {deptIssues}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Issues</Text>
                    </View>
                    {deptCritical > 0 && (
                      <View>
                        <Text style={{ fontSize: 24, fontWeight: "700", color: "#EF4444" }}>
                          {deptCritical}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>Critical</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Placeholder for Charts */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name="bar-chart-outline" size={48} color="#9CA3AF" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 12 }}>
              Detailed Analytics
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
              Charts and trend analysis will be displayed here
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
