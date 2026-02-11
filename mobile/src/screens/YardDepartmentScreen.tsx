import { View, Text, ScrollView, Pressable, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { usePourScheduleStore } from "../state/pourScheduleStore";
import { useYardLocationStore } from "../state/yardLocationStore";
import { PourDepartment } from "../types/pour-schedule";
import { useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "YardDepartment">;

export default function YardDepartmentScreen({ navigation, route }: Props) {
  const { department } = route.params;
  const [selectedDate, setSelectedDate] = useState(Date.now());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [dateInputText, setDateInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const getPourEntriesByDate = usePourScheduleStore((s) => s.getPourEntriesByDate);
  const getYardedPieceByPourEntryId = useYardLocationStore((s) => s.getYardedPieceByPourEntryId);

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

  const colors = getDepartmentColor(department as PourDepartment);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.getTime());
  };

  const getDateLabel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === -1) return "Yesterday";
    if (diffDays === 1) return "Tomorrow";
    return null;
  };

  const openDatePicker = () => {
    const currentDate = new Date(selectedDate);
    const formatted = `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate
      .getDate()
      .toString()
      .padStart(2, "0")}/${currentDate.getFullYear()}`;
    setDateInputText(formatted);
    setShowDatePickerModal(true);
  };

  const handleDateSubmit = () => {
    const parts = dateInputText.split("/");
    if (parts.length !== 3) {
      return;
    }

    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (
      isNaN(month) ||
      isNaN(day) ||
      isNaN(year) ||
      month < 0 ||
      month > 11 ||
      day < 1 ||
      day > 31 ||
      year < 1900 ||
      year > 2100
    ) {
      return;
    }

    const newDate = new Date(year, month, day);
    setSelectedDate(newDate.getTime());
    setShowDatePickerModal(false);
  };

  const setQuickDate = (daysOffset: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + daysOffset);
    setSelectedDate(today.getTime());
    setShowDatePickerModal(false);
  };

  // Get pour entries for the selected date and department
  const allEntries = getPourEntriesByDate(selectedDate, department as PourDepartment);

  // Filter by search query
  const filteredEntries = searchQuery.trim()
    ? allEntries.filter(
        (entry) =>
          entry.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.jobName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.idNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.markNumbers?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allEntries;

  // Group by form/bed
  const groupedByForm = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.formBedId]) {
      acc[entry.formBedId] = {
        formBedName: entry.formBedName,
        entries: [],
      };
    }
    acc[entry.formBedId].entries.push(entry);
    return acc;
  }, {} as Record<string, { formBedName: string; entries: typeof filteredEntries }>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: colors.bg,
                  padding: 10,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="cube" size={28} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: colors.color }}>
                  {department}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  Select pieces to assign yard locations
                </Text>
              </View>
            </View>
          </View>

          {/* Date Selector */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Pressable onPress={() => changeDate(-1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Pressable onPress={openDatePicker}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </Pressable>
              {getDateLabel() && (
                <Pressable onPress={() => setSelectedDate(Date.now())}>
                  <Text style={{ fontSize: 11, color: colors.accent, fontWeight: "500" }}>
                    {getDateLabel()}
                  </Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => changeDate(1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={22} color="#111827" />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 16,
            }}
          >
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by job, ID, or mark number..."
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 14,
                color: "#111827",
              }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>

          {/* Pieces List */}
          {filteredEntries.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 32,
                alignItems: "center",
              }}
            >
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#6B7280", marginTop: 12 }}>
                {searchQuery.trim() ? "No pieces found" : "No pieces scheduled"}
              </Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                {searchQuery.trim()
                  ? "Try a different search term"
                  : "Select a different date to view scheduled pieces"}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {Object.entries(groupedByForm).map(([formBedId, { formBedName, entries }]) => (
                <View
                  key={formBedId}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  {/* Form/Bed Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F3F4F6",
                    }}
                  >
                    <Ionicons name="layers-outline" size={20} color={colors.accent} />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: colors.color,
                        marginLeft: 8,
                        flex: 1,
                      }}
                    >
                      {formBedName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.color }}>
                        {entries.length}
                      </Text>
                    </View>
                  </View>

                  {/* Pieces */}
                  <View style={{ gap: 8 }}>
                    {entries.map((entry) => {
                      const yardedPiece = getYardedPieceByPourEntryId(entry.id);
                      const isYarded = !!yardedPiece;

                      return (
                        <Pressable
                          key={entry.id}
                          onPress={() =>
                            navigation.navigate("YardProductSelection", {
                              pourEntryId: entry.id,
                              department,
                            })
                          }
                          style={{
                            backgroundColor: isYarded ? "#F0FDF4" : "#F9FAFB",
                            borderRadius: 8,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: isYarded ? "#10B981" : "#E5E7EB",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginBottom: 4,
                                }}
                              >
                                <Text
                                  style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}
                                >
                                  #{entry.jobNumber}
                                </Text>
                                {isYarded && (
                                  <View
                                    style={{
                                      backgroundColor: "#10B981",
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 4,
                                      marginLeft: 8,
                                    }}
                                  >
                                    <Text
                                      style={{ fontSize: 10, fontWeight: "600", color: "#FFFFFF" }}
                                    >
                                      YARDED
                                    </Text>
                                  </View>
                                )}
                              </View>
                              {entry.jobName && (
                                <Text style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>
                                  {entry.jobName}
                                </Text>
                              )}
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                {entry.idNumber && (
                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                    ID: {entry.idNumber}
                                  </Text>
                                )}
                                {entry.markNumbers && (
                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                    {entry.markNumbers}
                                  </Text>
                                )}
                                {entry.dimensions && (
                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                    {entry.dimensions}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Ionicons
                              name={isYarded ? "checkmark-circle" : "chevron-forward"}
                              size={24}
                              color={isYarded ? "#10B981" : colors.accent}
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePickerModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              width: "85%",
              maxWidth: 400,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                Select Date
              </Text>
              <Pressable onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Quick Date Buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <Pressable
                onPress={() => setQuickDate(-1)}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
                  Yesterday
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickDate(0)}
                style={{
                  flex: 1,
                  backgroundColor: colors.accent,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Today</Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickDate(1)}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Tomorrow</Text>
              </Pressable>
            </View>

            {/* Manual Date Input */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              Or enter a date:
            </Text>
            <TextInput
              value={dateInputText}
              onChangeText={setDateInputText}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              keyboardType="numbers-and-punctuation"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: "#111827",
                marginBottom: 20,
              }}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setShowDatePickerModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDateSubmit}
                style={{
                  flex: 1,
                  backgroundColor: colors.accent,
                  borderRadius: 8,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>
                  Go to Date
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
