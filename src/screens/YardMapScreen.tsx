import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { PourDepartment } from "../types/pour-schedule";
import { useYardLocationStore } from "../state/yardLocationStore";
import { useEffect } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "YardMap">;

export default function YardMapScreen({ navigation }: Props) {
  const yardedPieces = useYardLocationStore((s) => s.yardedPieces);
  const initializeDefaultLocations = useYardLocationStore((s) => s.initializeDefaultLocations);

  // Initialize default locations on mount
  useEffect(() => {
    initializeDefaultLocations();
  }, []);

  const departments: PourDepartment[] = ["Precast", "Extruded", "Wall Panels", "Flexicore"];

  const getDepartmentColor = (dept: PourDepartment) => {
    switch (dept) {
      case "Precast":
        return { bg: "#EFF6FF", color: "#1E40AF", accent: "#3B82F6" };
      case "Extruded":
        return { bg: "#F0FDF4", color: "#166534", accent: "#10B981" };
      case "Wall Panels":
        return { bg: "#FEF3C7", color: "#92400E", accent: "#F59E0B" };
      case "Flexicore":
        return { bg: "#FCE7F3", color: "#831843", accent: "#EC4899" };
    }
  };

  const getDepartmentStats = (dept: PourDepartment) => {
    const pieces = yardedPieces.filter(
      (p) => p.department === dept && !p.isShipped
    );
    return {
      totalPieces: pieces.length,
      uniqueJobs: new Set(pieces.map((p) => p.jobNumber)).size,
    };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 4 }}>
              Yard Maps
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280" }}>
              Track and locate yarded pieces by department
            </Text>
          </View>

          {/* Placeholder Map Area */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 2,
              borderColor: "#E5E7EB",
              borderStyle: "dashed",
              minHeight: 200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="map-outline" size={64} color="#9CA3AF" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 12 }}>
              General Yard Map
            </Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
              Visual yard map coming soon
            </Text>
          </View>

          {/* Department Selection */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
              Select Yarding Department
            </Text>
            <View style={{ gap: 10 }}>
              {departments.map((dept) => {
                const colors = getDepartmentColor(dept);
                const stats = getDepartmentStats(dept);

                return (
                  <Pressable
                    key={dept}
                    onPress={() => navigation.navigate("YardDepartment", { department: dept })}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: "#E5E7EB",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          <View
                            style={{
                              backgroundColor: colors.bg,
                              padding: 8,
                              borderRadius: 8,
                              marginRight: 12,
                            }}
                          >
                            <Ionicons name="cube" size={24} color={colors.accent} />
                          </View>
                          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.color }}>
                            {dept}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 16, marginLeft: 48 }}>
                          <View>
                            <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                              Pieces in Yard
                            </Text>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.accent }}>
                              {stats.totalPieces}
                            </Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                              Active Jobs
                            </Text>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
                              {stats.uniqueJobs}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={colors.accent} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
              Quick Actions
            </Text>
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={() => navigation.navigate("YardSearch")}
                style={{
                  backgroundColor: "#3B82F6",
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="search" size={24} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginLeft: 12 }}>
                    Search Yard
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
