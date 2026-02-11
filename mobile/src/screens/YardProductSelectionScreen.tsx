import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { usePourScheduleStore } from "../state/pourScheduleStore";
import { useYardLocationStore } from "../state/yardLocationStore";
import { useAuthStore } from "../state/authStore";
import { useState, useEffect } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "YardProductSelection">;

export default function YardProductSelectionScreen({ navigation, route }: Props) {
  const { pourEntryId, department } = route.params;
  const insets = useSafeAreaInsets();

  const currentUser = useAuthStore((s) => s.currentUser);
  const getPourEntry = usePourScheduleStore((s) => s.getPourEntry);
  const yardLocations = useYardLocationStore((s) => s.yardLocations);
  const addYardLocation = useYardLocationStore((s) => s.addYardLocation);
  const addYardedPiece = useYardLocationStore((s) => s.addYardedPiece);
  const updateYardedPiece = useYardLocationStore((s) => s.updateYardedPiece);
  const getYardedPieceByPourEntryId = useYardLocationStore((s) => s.getYardedPieceByPourEntryId);

  const pourEntry = getPourEntry(pourEntryId);
  const existingYardedPiece = getYardedPieceByPourEntryId(pourEntryId);

  const [selectedLocationId, setSelectedLocationId] = useState(
    existingYardedPiece?.yardLocationId || ""
  );
  const [craneBay, setCraneBay] = useState("");
  const [row, setRow] = useState("");
  const [position, setPosition] = useState("");
  const [notes, setNotes] = useState(existingYardedPiece?.notes || "");
  const [showAddLocationForm, setShowAddLocationForm] = useState(false);

  useEffect(() => {
    if (existingYardedPiece) {
      setSelectedLocationId(existingYardedPiece.yardLocationId);
      setNotes(existingYardedPiece.notes || "");
    }
  }, [existingYardedPiece]);

  if (!pourEntry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 16 }}>
            Piece Not Found
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            The piece you're trying to yard could not be found.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: "#3B82F6",
              borderRadius: 10,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 20,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddCustomLocation = () => {
    if (!craneBay.trim()) {
      Alert.alert("Error", "Crane Bay is required");
      return;
    }

    const locationName = [
      craneBay.trim(),
      row.trim() ? `Row ${row.trim()}` : "",
      position.trim() ? `Pos ${position.trim()}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const locationId = addYardLocation({
      name: locationName,
      craneBay: craneBay.trim(),
      row: row.trim() || undefined,
      position: position.trim() || undefined,
      isActive: true,
    });

    setSelectedLocationId(locationId);
    setShowAddLocationForm(false);
    setCraneBay("");
    setRow("");
    setPosition("");
  };

  const handleAssignYardLocation = () => {
    if (!selectedLocationId) {
      Alert.alert("Error", "Please select a yard location");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    const location = yardLocations.find((l) => l.id === selectedLocationId);
    if (!location) {
      Alert.alert("Error", "Selected location not found");
      return;
    }

    if (existingYardedPiece) {
      // Update existing
      updateYardedPiece(existingYardedPiece.id, {
        yardLocationId: selectedLocationId,
        notes: notes.trim() || undefined,
      });

      Alert.alert("Success", "Yard location updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else {
      // Create new
      addYardedPiece({
        pourEntryId: pourEntry.id,
        yardLocationId: selectedLocationId,
        jobNumber: pourEntry.jobNumber,
        jobName: pourEntry.jobName,
        idNumber: pourEntry.idNumber,
        markNumbers: pourEntry.markNumbers,
        department: pourEntry.department,
        formBedName: pourEntry.formBedName,
        productType: pourEntry.productType,
        dimensions: pourEntry.dimensions,
        yardedDate: Date.now(),
        yardedBy: currentUser.email,
        pourDate: pourEntry.scheduledDate,
        isShipped: false,
        notes: notes.trim() || undefined,
      });

      Alert.alert("Success", "Piece assigned to yard location", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  };

  const activeLocations = yardLocations.filter((l) => l.isActive).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Piece Details */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
              ASSIGNING TO YARD
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              Job #{pourEntry.jobNumber}
            </Text>
            {pourEntry.jobName && (
              <Text style={{ fontSize: 15, color: "#374151", marginBottom: 8 }}>
                {pourEntry.jobName}
              </Text>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {pourEntry.idNumber && (
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>ID: {pourEntry.idNumber}</Text>
                </View>
              )}
              {pourEntry.markNumbers && (
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>{pourEntry.markNumbers}</Text>
                </View>
              )}
              {pourEntry.dimensions && (
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>{pourEntry.dimensions}</Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: "#EFF6FF",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: "#3B82F6", fontWeight: "600" }}>
                  {pourEntry.formBedName}
                </Text>
              </View>
            </View>
          </View>

          {/* Select Location */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Select Yard Location
              </Text>
              <Pressable
                onPress={() => setShowAddLocationForm(!showAddLocationForm)}
                style={{
                  backgroundColor: showAddLocationForm ? "#F3F4F6" : "#3B82F6",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={showAddLocationForm ? "close" : "add"}
                  size={18}
                  color={showAddLocationForm ? "#6B7280" : "#FFFFFF"}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: showAddLocationForm ? "#6B7280" : "#FFFFFF",
                    marginLeft: 4,
                  }}
                >
                  {showAddLocationForm ? "Cancel" : "Add New"}
                </Text>
              </Pressable>
            </View>

            {/* Add New Location Form */}
            {showAddLocationForm && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#3B82F6",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                  Crane Bay *
                </Text>
                <TextInput
                  value={craneBay}
                  onChangeText={setCraneBay}
                  placeholder="e.g., Crane Bay 1"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    color: "#111827",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                  Row
                </Text>
                <TextInput
                  value={row}
                  onChangeText={setRow}
                  placeholder="e.g., 38"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    color: "#111827",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                  Position
                </Text>
                <TextInput
                  value={position}
                  onChangeText={setPosition}
                  placeholder="e.g., A"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    color: "#111827",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    marginBottom: 12,
                  }}
                />

                <Pressable
                  onPress={handleAddCustomLocation}
                  style={{
                    backgroundColor: "#3B82F6",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
                    Add Location
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Existing Locations */}
            {activeLocations.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Ionicons name="location-outline" size={40} color="#9CA3AF" />
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                  No yard locations available
                </Text>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  Add a new location above
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {activeLocations.map((location) => (
                  <Pressable
                    key={location.id}
                    onPress={() => setSelectedLocationId(location.id)}
                    style={{
                      backgroundColor: selectedLocationId === location.id ? "#EFF6FF" : "#FFFFFF",
                      borderRadius: 10,
                      padding: 14,
                      borderWidth: 2,
                      borderColor: selectedLocationId === location.id ? "#3B82F6" : "#E5E7EB",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: selectedLocationId === location.id ? "#1E40AF" : "#111827",
                        }}
                      >
                        {location.name}
                      </Text>
                      {location.notes && (
                        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                          {location.notes}
                        </Text>
                      )}
                    </View>
                    {selectedLocationId === location.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 8 }}>
              Notes (Optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this piece..."
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                color: "#111827",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                minHeight: 80,
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View
        style={{
          padding: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <Pressable
          onPress={handleAssignYardLocation}
          style={{
            backgroundColor: "#10B981",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
            {existingYardedPiece ? "Update Yard Location" : "Assign to Yard"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
