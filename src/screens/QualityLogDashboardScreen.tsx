import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { DepartmentType } from "../types/quality-log";
import { useEffect } from "react";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "QualityLogDashboard">;

export default function QualityLogDashboardScreen({ navigation }: Props) {
  const initializeDefaultData = useQualityLogStore((s) => s.initializeDefaultData);
  const departments = useQualityLogStore((s) => s.departments);
  const logs = useQualityLogStore((s) => s.logs);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    // Initialize default departments and issue codes on first load
    initializeDefaultData();
  }, []);

  const getDepartmentStats = (dept: DepartmentType) => {
    const deptLogs = logs.filter((log) => log.department === dept);
    const totalIssues = deptLogs.reduce((sum, log) => sum + (log.issues?.length || 0), 0);
    const openIssues = deptLogs.reduce(
      (sum, log) =>
        sum + (log.issues?.filter((issue) => issue.status === "Open").length || 0),
      0
    );
    const criticalIssues = deptLogs.reduce(
      (sum, log) =>
        sum +
        (log.issues?.filter((issue) => issue.severity === "Critical").length || 0),
      0
    );

    return { totalLogs: deptLogs.length, totalIssues, openIssues, criticalIssues };
  };

  const activeDepartments = departments.filter((d) => d.isActive);

  const departmentColors: Record<DepartmentType, { bg: string; text: string; icon: string }> = {
    Flexicore: { bg: "#DBEAFE", text: "#1E40AF", icon: "#3B82F6" },
    "Wall Panels": { bg: "#D1FAE5", text: "#065F46", icon: "#10B981" },
    Extruded: { bg: "#FEF3C7", text: "#92400E", icon: "#F59E0B" },
    Precast: { bg: "#E0E7FF", text: "#3730A3", icon: "#6366F1" },
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-3xl font-bold text-gray-900">
                Quality Logs
              </Text>
              <Pressable
                onPress={() => navigation.navigate("QualityLogSearch")}
                className="bg-blue-600 rounded-full p-2"
              >
                <Ionicons name="search" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text className="text-base text-gray-600">
              Track quality issues and metrics by department
            </Text>
          </View>

          {/* Department Cards */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Departments
            </Text>
            {activeDepartments.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 shadow-sm">
                <Text className="text-gray-600 text-center">
                  No active departments. Contact admin to set up departments.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {activeDepartments.map((dept) => {
                  const stats = getDepartmentStats(dept.name);
                  const colors = departmentColors[dept.name];

                  return (
                    <Pressable
                      key={dept.id}
                      onPress={() =>
                        navigation.navigate("QualityLogList", {
                          department: dept.name,
                        })
                      }
                      className="bg-white rounded-2xl p-5 shadow-sm active:opacity-70"
                    >
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-3">
                          <View
                            className="rounded-full p-2"
                            style={{ backgroundColor: colors.bg }}
                          >
                            <Ionicons
                              name="business"
                              size={24}
                              color={colors.icon}
                            />
                          </View>
                          <Text
                            className="text-xl font-semibold"
                            style={{ color: colors.text }}
                          >
                            {dept.name}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                      </View>

                      {/* Stats */}
                      <View className="flex-row gap-4 mt-2">
                        <View className="flex-1">
                          <Text className="text-2xl font-bold text-gray-900">
                            {stats.totalLogs}
                          </Text>
                          <Text className="text-xs text-gray-500">Total Logs</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-2xl font-bold text-blue-600">
                            {stats.totalIssues}
                          </Text>
                          <Text className="text-xs text-gray-500">Issues</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-2xl font-bold text-orange-600">
                            {stats.openIssues}
                          </Text>
                          <Text className="text-xs text-gray-500">Open</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-2xl font-bold text-red-600">
                            {stats.criticalIssues}
                          </Text>
                          <Text className="text-xs text-gray-500">Critical</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Quick Actions
            </Text>
            <View className="gap-3">
              <Pressable
                onPress={() => navigation.navigate("QualityLogMetrics")}
                className="bg-white rounded-2xl p-5 shadow-sm active:opacity-70 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <View className="bg-purple-100 rounded-full p-2">
                    <Ionicons name="stats-chart" size={24} color="#9333EA" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-gray-900">
                      View Metrics
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Analytics and trends
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </Pressable>

              {isAdmin && (
                <Pressable
                  onPress={() => navigation.navigate("IssueCodeLibrary")}
                  className="bg-white rounded-2xl p-5 shadow-sm active:opacity-70 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-indigo-100 rounded-full p-2">
                      <Ionicons name="code-slash" size={24} color="#4F46E5" />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-gray-900">
                        Issue Code Library
                      </Text>
                      <Text className="text-sm text-gray-500">
                        Manage issue codes
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
