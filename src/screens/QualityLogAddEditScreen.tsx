import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { useAuthStore } from "../state/authStore";
import { useState } from "react";
import { DepartmentType, ProductionItem, QualityIssue, IssueStatus, IssueSeverity } from "../types/quality-log";

type Props = NativeStackScreenProps<RootStackParamList, "QualityLogAddEdit">;

export default function QualityLogAddEditScreen({ navigation, route }: Props) {
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
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType>(
    existingLog?.department || (department as DepartmentType) || "Flexicore"
  );
  const [date, setDate] = useState(existingLog?.date || Date.now());
  const [productionItems, setProductionItems] = useState<ProductionItem[]>(
    existingLog?.productionItems || []
  );
  const [issues, setIssues] = useState<QualityIssue[]>(existingLog?.issues || []);
  const [overallStatus, setOverallStatus] = useState<"Good" | "Issues Found" | "Critical Issues">(
    existingLog?.overallStatus || "Good"
  );
  const [notes, setNotes] = useState(existingLog?.notes || "");

  // Modal states
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showIssueCodePicker, setShowIssueCodePicker] = useState(false);

  // Production item form
  const [prodJobName, setProdJobName] = useState("");
  const [prodJobNumber, setProdJobNumber] = useState("");
  const [prodPieceNumber, setProdPieceNumber] = useState("");
  const [prodProductType, setProdProductType] = useState("");

  // Issue form
  const [issueCodeId, setIssueCodeId] = useState("");
  const [issueCode, setIssueCode] = useState<number | "">("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueStatus, setIssueStatus] = useState<IssueStatus>("Open");
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity>("Minor");
  const [issueLocation, setIssueLocation] = useState("");

  const availableIssueCodes = getIssueCodesByDepartment(selectedDepartment);

  const handleAddProductionItem = () => {
    if (!prodJobName.trim()) {
      Alert.alert("Error", "Please enter a job name");
      return;
    }

    const newItem: ProductionItem = {
      id: `temp-${Date.now()}`,
      jobName: prodJobName,
      jobNumber: prodJobNumber || undefined,
      pieceNumber: prodPieceNumber || undefined,
      productType: prodProductType || undefined,
      pourDate: date,
      department: selectedDepartment,
    };

    setProductionItems([...productionItems, newItem]);
    setProdJobName("");
    setProdJobNumber("");
    setProdPieceNumber("");
    setProdProductType("");
    setShowProductionModal(false);
  };

  const handleAddIssue = () => {
    if (!issueCode || !issueTitle.trim() || !issueDescription.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const newIssue: Omit<QualityIssue, "id" | "createdAt" | "updatedAt"> = {
      issueCodeId: issueCodeId || `code-${issueCode}`,
      issueCode: Number(issueCode),
      issueTitle,
      issueDescription,
      status: issueStatus,
      severity: issueSeverity,
      location: issueLocation || undefined,
    };

    setIssues([...issues, { ...newIssue, id: `temp-${Date.now()}`, createdAt: Date.now(), updatedAt: Date.now() }]);
    
    // Reset form
    setIssueCodeId("");
    setIssueCode("");
    setIssueTitle("");
    setIssueDescription("");
    setIssueStatus("Open");
    setIssueSeverity("Minor");
    setIssueLocation("");
    setShowIssueModal(false);

    // Auto-update overall status
    if (issueSeverity === "Critical") {
      setOverallStatus("Critical Issues");
    } else if (overallStatus === "Good") {
      setOverallStatus("Issues Found");
    }
  };

  const handleSave = () => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to create a log");
      return;
    }

    if (productionItems.length === 0) {
      Alert.alert("Warning", "Are you sure you want to save without any production items?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save Anyway",
          onPress: () => performSave(),
        },
      ]);
      return;
    }

    performSave();
  };

  const performSave = () => {
    if (!currentUser) return;

    if (isEditing && logId) {
      updateLog(logId, {
        department: selectedDepartment,
        date,
        productionItems,
        issues,
        overallStatus,
        notes: notes || undefined,
      });
    } else {
      addLog({
        department: selectedDepartment,
        date,
        productionItems,
        issues,
        overallStatus,
        notes: notes || undefined,
        createdBy: currentUser.email,
      });
    }

    navigation.goBack();
  };

  const selectIssueCode = (code: any) => {
    setIssueCodeId(code.id);
    setIssueCode(code.code);
    setIssueTitle(code.title);
    setIssueSeverity(code.severity);
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
            {/* Department & Date */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                Department
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                {selectedDepartment}
              </Text>
            </View>

            {/* Production Items */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  Production Items
                </Text>
                <Pressable
                  onPress={() => setShowProductionModal(true)}
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
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Add Item</Text>
                </Pressable>
              </View>

              {productionItems.length === 0 ? (
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
                  <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
                  <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                    No production items added yet
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {productionItems.map((item, index) => (
                    <View
                      key={item.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                          {item.jobName}
                        </Text>
                        {item.pieceNumber && (
                          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                            Piece: {item.pieceNumber}
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => setProductionItems(productionItems.filter((_, i) => i !== index))}
                        style={{
                          backgroundColor: "#FEE2E2",
                          padding: 8,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Quality Issues */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  Quality Issues
                </Text>
                <Pressable
                  onPress={() => setShowIssueModal(true)}
                  style={{
                    backgroundColor: "#F59E0B",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Add Issue</Text>
                </Pressable>
              </View>

              {issues.length === 0 ? (
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
                  <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
                  <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                    No issues reported
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {issues.map((issue, index) => (
                    <View
                      key={issue.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280" }}>
                              #{issue.issueCode}
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#9333EA" }}>
                              {issue.severity}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 4 }}>
                            {issue.issueTitle}
                          </Text>
                          <Text style={{ fontSize: 13, color: "#6B7280" }} numberOfLines={2}>
                            {issue.issueDescription}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setIssues(issues.filter((_, i) => i !== index))}
                          style={{
                            backgroundColor: "#FEE2E2",
                            padding: 8,
                            borderRadius: 8,
                            marginLeft: 8,
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </Pressable>
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
                Notes (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
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
              onPress={handleSave}
              style={{
                backgroundColor: "#10B981",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                {isEditing ? "Update Log Entry" : "Create Log Entry"}
              </Text>
            </Pressable>
          </View>

          {/* Production Item Modal */}
          <Modal visible={showProductionModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 24,
                  paddingBottom: insets.bottom + 24,
                }}
              >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                      Add Production Item
                    </Text>
                    <Pressable onPress={() => setShowProductionModal(false)}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                    <View style={{ gap: 16 }}>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Job Name *
                        </Text>
                        <TextInput
                          value={prodJobName}
                          onChangeText={setProdJobName}
                          placeholder="Enter job name"
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

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Job Number
                        </Text>
                        <TextInput
                          value={prodJobNumber}
                          onChangeText={setProdJobNumber}
                          placeholder="Enter job number"
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

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Piece Number
                        </Text>
                        <TextInput
                          value={prodPieceNumber}
                          onChangeText={setProdPieceNumber}
                          placeholder="Enter piece number"
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

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Product Type
                        </Text>
                        <TextInput
                          value={prodProductType}
                          onChangeText={setProdProductType}
                          placeholder="e.g., Hollow Core Slab, Wall Panel"
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
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                    <Pressable
                      onPress={() => setShowProductionModal(false)}
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
                      onPress={handleAddProductionItem}
                      style={{
                        flex: 1,
                        backgroundColor: "#3B82F6",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>Add</Text>
                    </Pressable>
                  </View>
                </View>
            </View>
          </Modal>

          {/* Issue Modal */}
          <Modal visible={showIssueModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 24,
                  paddingBottom: insets.bottom + 24,
                }}
              >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                      Add Quality Issue
                    </Text>
                    <Pressable onPress={() => setShowIssueModal(false)}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                    <View style={{ gap: 16 }}>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Issue Code *
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

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Description *
                        </Text>
                        <TextInput
                          value={issueDescription}
                          onChangeText={setIssueDescription}
                          placeholder="Describe the quality issue in detail..."
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

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Location
                        </Text>
                        <TextInput
                          value={issueLocation}
                          onChangeText={setIssueLocation}
                          placeholder="e.g., Bay 3, Line 2"
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

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Severity
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(["Critical", "Major", "Minor", "Observation"] as const).map((sev) => (
                            <Pressable
                              key={sev}
                              onPress={() => setIssueSeverity(sev)}
                              style={{
                                flex: 1,
                                backgroundColor: issueSeverity === sev ? "#9333EA" : "#F3F4F6",
                                paddingVertical: 10,
                                borderRadius: 8,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: issueSeverity === sev ? "#FFFFFF" : "#6B7280",
                                }}
                              >
                                {sev}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>

                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                          Status
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          {(["Open", "In Progress", "Resolved", "Deferred"] as const).map((stat) => (
                            <Pressable
                              key={stat}
                              onPress={() => setIssueStatus(stat)}
                              style={{
                                backgroundColor: issueStatus === stat ? "#3B82F6" : "#F3F4F6",
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color: issueStatus === stat ? "#FFFFFF" : "#6B7280",
                                }}
                              >
                                {stat}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                    <Pressable
                      onPress={() => setShowIssueModal(false)}
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
                      onPress={handleAddIssue}
                      style={{
                        flex: 1,
                        backgroundColor: "#F59E0B",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>Add Issue</Text>
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
                        No issue codes available. Contact admin to add issue codes.
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
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
                              #{code.code}
                            </Text>
                            <View
                              style={{
                                backgroundColor: code.severity === "Critical" ? "#FEE2E2" : code.severity === "Major" ? "#FED7AA" : code.severity === "Minor" ? "#FEF3C7" : "#E0E7FF",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: code.severity === "Critical" ? "#991B1B" : code.severity === "Major" ? "#9A3412" : code.severity === "Minor" ? "#92400E" : "#3730A3",
                                }}
                              >
                                {code.severity}
                              </Text>
                            </View>
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
