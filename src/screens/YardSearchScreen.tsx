import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useYardLocationStore } from "../state/yardLocationStore";
import { PourDepartment } from "../types/pour-schedule";
import { useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "YardSearch">;

export default function YardSearchScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<PourDepartment | null>(null);

  const yardedPieces = useYardLocationStore((s) => s.yardedPieces);
  const getYardLocation = useYardLocationStore((s) => s.getYardLocation);

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

  // Filter pieces
  const filteredPieces = yardedPieces.filter((piece) => {
    if (piece.isShipped) return false;

    const matchesDepartment = selectedDepartment ? piece.department === selectedDepartment : true;

    if (!searchQuery.trim()) return matchesDepartment;

    const query = searchQuery.toLowerCase();
    return (
      matchesDepartment &&
      (piece.jobNumber.toLowerCase().includes(query) ||
        piece.jobName?.toLowerCase().includes(query) ||
        piece.idNumber?.toLowerCase().includes(query) ||
        piece.markNumbers?.toLowerCase().includes(query))
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
              Search Yard
            </Text>
          </View>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F3F4F6",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by job number, ID, or mark..."
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              autoFocus
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 15,
                color: "#111827",
              }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>

          {/* Department Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => setSelectedDepartment(null)}
              style={{
                backgroundColor: selectedDepartment === null ? "#3B82F6" : "#FFFFFF",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: selectedDepartment === null ? "#3B82F6" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: selectedDepartment === null ? "#FFFFFF" : "#6B7280",
                }}
              >
                All
              </Text>
            </Pressable>
            {departments.map((dept) => {
              const colors = getDepartmentColor(dept);
              const isSelected = selectedDepartment === dept;

              return (
                <Pressable
                  key={dept}
                  onPress={() => setSelectedDepartment(dept)}
                  style={{
                    backgroundColor: isSelected ? colors.accent : "#FFFFFF",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.accent : "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isSelected ? "#FFFFFF" : "#6B7280",
                    }}
                  >
                    {dept}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Results Count */}
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 12 }}>
            {filteredPieces.length} {filteredPieces.length === 1 ? "piece" : "pieces"} found
          </Text>
        </View>

        {/* Results */}
        <ScrollView style={{ flex: 1 }}>
          {filteredPieces.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 }}>
              <Ionicons name="search-outline" size={64} color="#9CA3AF" />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 16 }}>
                {searchQuery.trim() ? "No pieces found" : "No pieces in yard"}
              </Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                {searchQuery.trim()
                  ? "Try a different search term"
                  : "Start by assigning pieces to yard locations"}
              </Text>
            </View>
          ) : (
            <View style={{ padding: 16, gap: 10 }}>
              {filteredPieces.map((piece) => {
                const location = getYardLocation(piece.yardLocationId);
                const colors = getDepartmentColor(piece.department);

                return (
                  <Pressable
                    key={piece.id}
                    onPress={() =>
                      navigation.navigate("YardProductSelection", {
                        pourEntryId: piece.pourEntryId,
                        department: piece.department,
                      })
                    }
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 4 }}>
                          Job #{piece.jobNumber}
                        </Text>
                        {piece.jobName && (
                          <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
                            {piece.jobName}
                          </Text>
                        )}
                      </View>
                      <View
                        style={{
                          backgroundColor: colors.bg,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          height: 28,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.color }}>
                          {piece.department}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      {piece.idNumber && (
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>ID: {piece.idNumber}</Text>
                      )}
                      {piece.markNumbers && (
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>{piece.markNumbers}</Text>
                      )}
                      {piece.dimensions && (
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>{piece.dimensions}</Text>
                      )}
                    </View>

                    {/* Location Info */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#F0FDF4",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons name="location" size={16} color="#10B981" />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#166534",
                          marginLeft: 6,
                          flex: 1,
                        }}
                      >
                        {location?.name || "Unknown Location"}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#10B981" />
                    </View>

                    {/* Dates */}
                    <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
                      <View>
                        <Text style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>Poured</Text>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                          {new Date(piece.pourDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>Yarded</Text>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                          {new Date(piece.yardedDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
