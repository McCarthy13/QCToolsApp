import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { useAuthStore } from "../state/authStore";
import { useState, useEffect } from "react";
import { ExtrudedQualityEntry, QualityLogAttachment, IssueCode } from "../types/quality-log";
import * as ImagePicker from "expo-image-picker";

type Props = NativeStackScreenProps<RootStackParamList, "QualityLogAddEdit">;

// Mock job lookup - in production, this would be an API call
const mockJobLookup: Record<string, string> = {
  "1001": "Downtown Office Building",
  "1002": "Riverside Apartments",
  "1003": "Tech Campus Phase 2",
  "1004": "Medical Center Expansion",
  "1005": "University Parking Structure",
};

export default function ExtrudedQualityLogScreen({ navigation, route }: Props) {
  const { logId, department } = route.params || {};
  const insets = useSafeAreaInsets();
  
  const getLog = useQualityLogStore((s) => s.getLog);
  const addLog = useQualityLogStore((s) => s.addLog);
  const updateLog = useQualityLogStore((s) => s.updateLog);
  const getIssueCodesByDepartment = useQualityLogStore((s) => s.getIssueCodesByDepartment);
  const currentUser = useAuthStore((s) => s.currentUser);

  const existingLog = logId ? getLog(logId) : null;
  const isEditing = !!existingLog;

  // Form state
  const [date, setDate] = useState(existingLog?.date || Date.now());
  const [entries, setEntries] = useState<ExtrudedQualityEntry[]>(existingLog?.extrudedEntries || []);
  const [overallStatus, setOverallStatus] = useState<"Good" | "Issues Found" | "Critical Issues">(
    existingLog?.overallStatus || "Good"
  );
  const [notes, setNotes] = useState(existingLog?.notes || "");

  // Entry form state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [markNumber, setMarkNumber] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [issueCode, setIssueCode] = useState<number | "">("");
  const [issueCodeId, setIssueCodeId] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [entryAttachments, setEntryAttachments] = useState<QualityLogAttachment[]>([]);

  // Issue code picker
  const [showIssueCodePicker, setShowIssueCodePicker] = useState(false);
  const availableIssueCodes = getIssueCodesByDepartment("Extruded");

  // Auto-populate job name when job number changes
  useEffect(() => {
    if (jobNumber && mockJobLookup[jobNumber]) {
      setJobName(mockJobLookup[jobNumber]);
    } else if (jobNumber) {
      setJobName(""); // Clear if not found
    }
  }, [jobNumber]);

  const handleAddSlippageData = () => {
    // Navigate to slippage identifier with quality log context
    navigation.navigate("SlippageIdentifier", {
      config: {
        projectNumber: jobNumber,
        markNumber: markNumber,
        idNumber: idNumber,
        productType: "Extruded Hollowcore",
        strandPattern: "Standard",
      },
      fromQualityLog: true,
      qualityLogId: logId,
      qualityEntryId: editingEntryId || undefined,
    });
  };

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newAttachment: QualityLogAttachment = {
        id: `att-${Date.now()}`,
        type: "photo",
        uri: result.assets[0].uri,
        title: "Photo",
        createdAt: Date.now(),
      };
      setEntryAttachments([...entryAttachments, newAttachment]);
    }
  };

  const handleAddNote = () => {
    Alert.prompt(
      "Add Note",
      "Enter your note:",
      (text) => {
        if (text && text.trim()) {
          const newAttachment: QualityLogAttachment = {
            id: `att-${Date.now()}`,
            type: "note",
            description: text,
            title: "Note",
            createdAt: Date.now(),
          };
          setEntryAttachments([...entryAttachments, newAttachment]);
        }
      }
    );
  };

  const handleSaveEntry = () => {
    if (!jobNumber.trim() || !markNumber.trim() || !idNumber.trim() || !issueDescription.trim()) {
      Alert.alert("Error", "Please fill in all required fields (Job #, Mark #, ID #, Issue Description)");
      return;
    }

    const entry: ExtrudedQualityEntry = {
      id: editingEntryId || `entry-${Date.now()}`,
      jobNumber,
      jobName: jobName || undefined,
      markNumber,
      idNumber,
      issueCodeId: issueCodeId || undefined,
      issueCode: issueCode ? Number(issueCode) : undefined,
      issueTitle: issueTitle || undefined,
      issueDescription,
      attachments: entryAttachments,
      createdAt: editingEntryId ? entries.find(e => e.id === editingEntryId)?.createdAt || Date.now() : Date.now(),
      updatedAt: Date.now(),
    };

    if (editingEntryId) {
      setEntries(entries.map(e => e.id === editingEntryId ? entry : e));
    } else {
      setEntries([...entries, entry]);
    }

    // Check if we need to update overall status
    if (issueCode || issueDescription.toLowerCase().includes("critical")) {
      setOverallStatus("Issues Found");
    }

    // Reset form
    resetEntryForm();
    setShowEntryModal(false);
  };

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setJobNumber("");
    setJobName("");
    setMarkNumber("");
    setIdNumber("");
    setIssueCode("");
    setIssueCodeId("");
    setIssueTitle("");
    setIssueDescription("");
    setEntryAttachments([]);
  };

  const handleEditEntry = (entry: ExtrudedQualityEntry) => {
    setEditingEntryId(entry.id);
    setJobNumber(entry.jobNumber);
    setJobName(entry.jobName || "");
    setMarkNumber(entry.markNumber);
    setIdNumber(entry.idNumber);
    setIssueCode(entry.issueCode || "");
    setIssueCodeId(entry.issueCodeId || "");
    setIssueTitle(entry.issueTitle || "");
    setIssueDescription(entry.issueDescription);
    setEntryAttachments(entry.attachments);
    setShowEntryModal(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setEntries(entries.filter(e => e.id !== entryId)),
      },
    ]);
  };

  const handleSaveLog = () => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    if (entries.length === 0) {
      Alert.alert("Warning", "Are you sure you want to save without any entries?", [
        { text: "Cancel", style: "cancel" },
        { text: "Save Anyway", onPress: () => performSave() },
      ]);
      return;
    }

    performSave();
  };

  const performSave = () => {
    if (!currentUser) return;

    if (isEditing && logId) {
      updateLog(logId, {
        department: "Extruded",
        date,
        extrudedEntries: entries,
        overallStatus,
        notes: notes || undefined,
      });
    } else {
      addLog({
        department: "Extruded",
        date,
        extrudedEntries: entries,
        overallStatus,
        notes: notes || undefined,
        createdBy: currentUser.email,
      });
    }

    navigation.goBack();
  };

  const selectIssueCode = (code: IssueCode) => {
    setIssueCodeId(code.id);
    setIssueCode(code.code);
    setIssueTitle(code.title);
    setShowIssueCodePicker(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 100 }}
        >
            {/* Header */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Extruded Quality Log
              </Text>
              <Text style={{ fontSize: 16, color: "#6B7280" }}>
                {new Date(date).toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </Text>
            </View>

            {/* Quality Entries */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  Quality Entries
                </Text>
                <Pressable
                  onPress={() => {
                    resetEntryForm();
                    setShowEntryModal(true);
                  }}
                  style={{
                    backgroundColor: "#3B82F6",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Add Entry</Text>
                </Pressable>
              </View>

              {entries.length === 0 ? (
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 24,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                  <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                    No entries added yet
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {entries.map((entry) => (
                    <View
                      key={entry.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <View style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 12, fontWeight: "600", color: "#1E40AF" }}>
                                Job #{entry.jobNumber}
                              </Text>
                            </View>
                            {entry.issueCode && (
                              <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 12, fontWeight: "600", color: "#92400E" }}>
                                  Issue #{entry.issueCode}
                                </Text>
                              </View>
                            )}
                          </View>
                          {entry.jobName && (
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 6 }}>
                              {entry.jobName}
                            </Text>
                          )}
                          <View style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}>
                            <Text style={{ fontSize: 13, color: "#6B7280" }}>Mark: {entry.markNumber}</Text>
                            <Text style={{ fontSize: 13, color: "#6B7280" }}>ID: {entry.idNumber}</Text>
                          </View>
                          <Text style={{ fontSize: 14, color: "#4B5563", marginTop: 6 }}>
                            {entry.issueDescription}
                          </Text>
                          {entry.attachments.length > 0 && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                              <Ionicons name="attach" size={16} color="#6B7280" />
                              <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                {entry.attachments.length} {entry.attachments.length === 1 ? "attachment" : "attachments"}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ gap: 8 }}>
                          <Pressable
                            onPress={() => handleEditEntry(entry)}
                            style={{
                              backgroundColor: "#EFF6FF",
                              padding: 8,
                              borderRadius: 8,
                            }}
                          >
                            <Ionicons name="pencil" size={16} color="#3B82F6" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteEntry(entry.id)}
                            style={{
                              backgroundColor: "#FEE2E2",
                              padding: 8,
                              borderRadius: 8,
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Overall Status */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                Overall Status
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {(["Good", "Issues Found", "Critical Issues"] as const).map((statusOption) => (
                  <Pressable
                    key={statusOption}
                    onPress={() => setOverallStatus(statusOption)}
                    style={{
                      flex: 1,
                      backgroundColor: overallStatus === statusOption ? "#3B82F6" : "#FFFFFF",
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: overallStatus === statusOption ? "#3B82F6" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: overallStatus === statusOption ? "#FFFFFF" : "#6B7280",
                        textAlign: "center",
                      }}
                    >
                      {statusOption}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                Additional Notes (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes about this log..."
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  color: "#111827",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  minHeight: 100,
                }}
              />
            </View>
          </ScrollView>

          {/* Save Button */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#FFFFFF",
              padding: 16,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
            }}
          >
            <Pressable
              onPress={handleSaveLog}
              style={{
                backgroundColor: "#10B981",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                {isEditing ? "Update Quality Log" : "Save Quality Log"}
              </Text>
            </Pressable>
          </View>

          {/* Entry Modal */}
          <Modal visible={showEntryModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 24,
                  paddingBottom: insets.bottom + 24,
                  maxHeight: "90%",
                }}
              >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                      {editingEntryId ? "Edit Entry" : "Add Quality Entry"}
                    </Text>
                    <Pressable onPress={() => setShowEntryModal(false)}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                    <View style={{ gap: 16 }}>
                      {/* Job Number */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Job # *
                        </Text>
                        <TextInput
                          value={jobNumber}
                          onChangeText={setJobNumber}
                          placeholder="e.g., 1001"
                          placeholderTextColor="#9CA3AF"
                          cursorColor="#000000"
                          keyboardType="number-pad"
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            color: "#111827",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                        />
                        {jobName && (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: "#F0FDF4", borderRadius: 8 }}>
                            <Text style={{ fontSize: 13, color: "#166534", fontWeight: "500" }}>
                              ✓ {jobName}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Mark Number */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Mark # *
                        </Text>
                        <TextInput
                          value={markNumber}
                          onChangeText={setMarkNumber}
                          placeholder="Enter mark number"
                          placeholderTextColor="#9CA3AF"
                          cursorColor="#000000"
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            color: "#111827",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                        />
                      </View>

                      {/* ID Number */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          ID # *
                        </Text>
                        <TextInput
                          value={idNumber}
                          onChangeText={setIdNumber}
                          placeholder="Enter ID number"
                          placeholderTextColor="#9CA3AF"
                          cursorColor="#000000"
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            color: "#111827",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                        />
                      </View>

                      {/* Issue Code (Optional) */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Issue Code (Optional)
                        </Text>
                        <Pressable
                          onPress={() => setShowIssueCodePicker(true)}
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ fontSize: 14, color: issueCode ? "#111827" : "#9CA3AF" }}>
                            {issueCode ? `#${issueCode} - ${issueTitle}` : "Select issue code"}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </Pressable>
                      </View>

                      {/* Issue Description */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Issue Description *
                        </Text>
                        <TextInput
                          value={issueDescription}
                          onChangeText={setIssueDescription}
                          placeholder="Describe the quality issue or observation..."
                          placeholderTextColor="#9CA3AF"
                          cursorColor="#000000"
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            color: "#111827",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            minHeight: 80,
                          }}
                        />
                      </View>

                      {/* Strand Slippage Button */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Strand Slippage Data
                        </Text>
                        <Pressable
                          onPress={handleAddSlippageData}
                          style={{
                            backgroundColor: "#F0FDF4",
                            borderRadius: 12,
                            padding: 16,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: "#10B981",
                          }}
                        >
                          <Ionicons name="resize" size={20} color="#10B981" />
                          <Text style={{ color: "#10B981", fontSize: 14, fontWeight: "600", marginLeft: 8 }}>
                            Add Slippage Details
                          </Text>
                        </Pressable>
                        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                          Opens slippage identifier to capture measurements
                        </Text>
                      </View>

                      {/* Attachments */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Attachments
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                          <Pressable
                            onPress={handleAddPhoto}
                            style={{
                              flex: 1,
                              backgroundColor: "#EFF6FF",
                              borderRadius: 12,
                              padding: 12,
                              alignItems: "center",
                            }}
                          >
                            <Ionicons name="camera" size={24} color="#3B82F6" />
                            <Text style={{ fontSize: 12, color: "#3B82F6", marginTop: 4 }}>Photo</Text>
                          </Pressable>
                          <Pressable
                            onPress={handleAddNote}
                            style={{
                              flex: 1,
                              backgroundColor: "#FEF3C7",
                              borderRadius: 12,
                              padding: 12,
                              alignItems: "center",
                            }}
                          >
                            <Ionicons name="document-text" size={24} color="#F59E0B" />
                            <Text style={{ fontSize: 12, color: "#F59E0B", marginTop: 4 }}>Note</Text>
                          </Pressable>
                        </View>

                        {entryAttachments.length > 0 && (
                          <View style={{ gap: 8 }}>
                            {entryAttachments.map((att) => (
                              <View
                                key={att.id}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  backgroundColor: "#F9FAFB",
                                  padding: 8,
                                  borderRadius: 8,
                                }}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                  <Ionicons 
                                    name={att.type === "photo" ? "image" : att.type === "note" ? "document-text" : "attach"} 
                                    size={16} 
                                    color="#6B7280" 
                                  />
                                  <Text style={{ fontSize: 13, color: "#111827", flex: 1 }} numberOfLines={1}>
                                    {att.title || att.type}
                                  </Text>
                                </View>
                                <Pressable
                                  onPress={() => setEntryAttachments(entryAttachments.filter(a => a.id !== att.id))}
                                  style={{ padding: 4 }}
                                >
                                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                                </Pressable>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                    <Pressable
                      onPress={() => setShowEntryModal(false)}
                      style={{
                        flex: 1,
                        backgroundColor: "#F3F4F6",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "600" }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveEntry}
                      style={{
                        flex: 1,
                        backgroundColor: "#3B82F6",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                        {editingEntryId ? "Update" : "Add"} Entry
                      </Text>
                    </Pressable>
                  </View>
                </View>
            </View>
          </Modal>

          {/* Issue Code Picker Modal */}
          <Modal visible={showIssueCodePicker} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 24,
                  paddingBottom: insets.bottom + 24,
                  maxHeight: "70%",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                    Select Issue Code
                  </Text>
                  <Pressable onPress={() => setShowIssueCodePicker(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>

                <ScrollView style={{ flex: 1 }}>
                  {availableIssueCodes.length === 0 ? (
                    <View style={{ padding: 32, alignItems: "center" }}>
                      <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                      <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12, textAlign: "center" }}>
                        No issue codes available
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {availableIssueCodes.map((code) => (
                        <Pressable
                          key={code.id}
                          onPress={() => selectIssueCode(code)}
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 12,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
                              #{code.code}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: "500", color: "#111827", marginBottom: 4 }}>
                            {code.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#6B7280" }} numberOfLines={2}>
                            {code.description}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
    </SafeAreaView>
  );
}
