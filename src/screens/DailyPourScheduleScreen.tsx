import { View, Text, Pressable, ScrollView, TextInput, Modal, Keyboard, TouchableWithoutFeedback, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { usePourScheduleStore } from "../state/pourScheduleStore";
import { useAuthStore } from "../state/authStore";
import { useState, useEffect } from "react";
import { PourDepartment, PourEntry, PourStatus } from "../types/pour-schedule";
import { isEliPlanConfigured } from "../api/eliplan";

type Props = NativeStackScreenProps<RootStackParamList, "DailyPourSchedule">;

export default function DailyPourScheduleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.currentUser);
  const forms = usePourScheduleStore((s) => s.forms);
  const getFormsByDepartment = usePourScheduleStore((s) => s.getFormsByDepartment);
  const getPourEntriesByDate = usePourScheduleStore((s) => s.getPourEntriesByDate);
  const addPourEntry = usePourScheduleStore((s) => s.addPourEntry);
  const updatePourEntry = usePourScheduleStore((s) => s.updatePourEntry);
  const deletePourEntry = usePourScheduleStore((s) => s.deletePourEntry);
  const getTotalYardsForDate = usePourScheduleStore((s) => s.getTotalYardsForDate);
  const initializeDefaultForms = usePourScheduleStore((s) => s.initializeDefaultForms);
  const syncWithEliPlan = usePourScheduleStore((s) => s.syncWithEliPlan);
  const lastSyncTime = usePourScheduleStore((s) => s.lastSyncTime);

  // Initialize forms on mount (always run to ensure migrations)
  useEffect(() => {
    initializeDefaultForms();
  }, []);

  const [selectedDate, setSelectedDate] = useState(Date.now());
  const [expandedDepartment, setExpandedDepartment] = useState<PourDepartment | null>("Precast");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingPourId, setEditingPourId] = useState<string | null>(null);
  
  // Department for adding/scanning (user must select first)
  const [activeDepartment, setActiveDepartment] = useState<PourDepartment | null>(null);
  
  // Form state for pour entry
  const [selectedDepartment, setSelectedDepartment] = useState<PourDepartment>("Precast");
  const [selectedFormBedId, setSelectedFormBedId] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [markNumbers, setMarkNumbers] = useState("");
  const [pieceCount, setPieceCount] = useState("");
  const [productType, setProductType] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [mixDesign, setMixDesign] = useState("");
  const [concreteYards, setConcreteYards] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] = useState<PourStatus>("Scheduled");
  const [foreman, setForeman] = useState("");
  const [notes, setNotes] = useState("");

  const departments: PourDepartment[] = ["Precast", "Extruded", "Wall Panels", "Flexicore"];

  const getDepartmentColor = (dept: PourDepartment) => {
    switch (dept) {
      case "Precast": return { bg: "#EFF6FF", color: "#1E40AF", accent: "#3B82F6" };
      case "Extruded": return { bg: "#F0FDF4", color: "#166534", accent: "#10B981" };
      case "Wall Panels": return { bg: "#FEF3C7", color: "#92400E", accent: "#F59E0B" };
      case "Flexicore": return { bg: "#FCE7F3", color: "#831843", accent: "#EC4899" };
    }
  };

  const getStatusColor = (st: PourStatus) => {
    switch (st) {
      case "Scheduled": return { bg: "#EFF6FF", text: "#1E40AF" };
      case "In Progress": return { bg: "#FEF3C7", text: "#92400E" };
      case "Completed": return { bg: "#F0FDF4", text: "#166534" };
      case "Delayed": return { bg: "#FEF2F2", text: "#991B1B" };
      case "Cancelled": return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const handleAddPour = () => {
    if (!selectedFormBedId || !jobNumber.trim()) {
      Alert.alert("Error", "Form/Bed and Job Number are required");
      return;
    }

    const selectedForm = forms.find(f => f.id === selectedFormBedId);
    if (!selectedForm) {
      Alert.alert("Error", "Selected form/bed not found");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    const pourData: Omit<PourEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      formBedId: selectedFormBedId,
      formBedName: selectedForm.name,
      department: selectedDepartment,
      jobNumber: jobNumber.trim(),
      jobName: jobName.trim() || undefined,
      markNumbers: markNumbers.trim() || undefined,
      pieceCount: pieceCount ? parseInt(pieceCount) : undefined,
      productType: productType.trim() || undefined,
      dimensions: dimensions.trim() || undefined,
      mixDesign: mixDesign.trim() || undefined,
      concreteYards: concreteYards ? parseFloat(concreteYards) : undefined,
      scheduledDate: selectedDate,
      scheduledTime: scheduledTime.trim() || undefined,
      status,
      foreman: foreman.trim() || undefined,
      notes: notes.trim() || undefined,
      createdBy: currentUser.email,
    };

    if (editingPourId) {
      updatePourEntry(editingPourId, pourData);
    } else {
      addPourEntry(pourData);
    }

    resetForm();
    setShowAddModal(false);
  };

  const resetForm = () => {
    setEditingPourId(null);
    setSelectedFormBedId("");
    setJobNumber("");
    setJobName("");
    setMarkNumbers("");
    setPieceCount("");
    setProductType("");
    setDimensions("");
    setMixDesign("");
    setConcreteYards("");
    setScheduledTime("");
    setStatus("Scheduled");
    setForeman("");
    setNotes("");
  };

  const handleEditPour = (pour: PourEntry) => {
    setEditingPourId(pour.id);
    setSelectedDepartment(pour.department);
    setSelectedFormBedId(pour.formBedId);
    setJobNumber(pour.jobNumber);
    setJobName(pour.jobName || "");
    setMarkNumbers(pour.markNumbers || "");
    setPieceCount(pour.pieceCount?.toString() || "");
    setProductType(pour.productType || "");
    setDimensions(pour.dimensions || "");
    setMixDesign(pour.mixDesign || "");
    setConcreteYards(pour.concreteYards?.toString() || "");
    setScheduledTime(pour.scheduledTime || "");
    setStatus(pour.status);
    setForeman(pour.foreman || "");
    setNotes(pour.notes || "");
    setShowAddModal(true);
  };

  const handleDeletePour = (pourId: string) => {
    Alert.alert("Delete Pour Entry", "Are you sure you want to delete this pour entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePourEntry(pourId),
      },
    ]);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.getTime());
  };

  const handleSyncWithEliPlan = async () => {
    if (!isEliPlanConfigured()) {
      Alert.alert(
        "EliPlan Not Configured",
        "To enable EliPlan sync, add your API credentials to the .env file:\n\n" +
        "EXPO_PUBLIC_ELIPLAN_API_URL=your_api_url\n" +
        "EXPO_PUBLIC_ELIPLAN_API_KEY=your_api_key\n\n" +
        "Contact your administrator or EliPlan support for credentials.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to sync");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncWithEliPlan(new Date(selectedDate), currentUser.email);
      
      if (result.success) {
        Alert.alert(
          "Sync Successful",
          `Imported ${result.imported} pour ${result.imported === 1 ? 'entry' : 'entries'} from EliPlan`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Sync Failed", result.error || "Unknown error occurred");
      }
    } catch (error) {
      Alert.alert(
        "Sync Error",
        error instanceof Error ? error.message : "Failed to connect to EliPlan"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const todayEntries = getPourEntriesByDate(selectedDate);
  const totalYards = getTotalYardsForDate(selectedDate);

  // Debug: Get all entries
  const allEntriesInStore = usePourScheduleStore((s) => s.pourEntries);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              Daily Pour Schedule
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Manage concrete pours by department and form/bed
            </Text>
          </View>

          {/* Date Selector */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Pressable
                onPress={() => changeDate(-1)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#111827" />
              </Pressable>

              <View style={{ flex: 1, marginHorizontal: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  {new Date(selectedDate).toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric",
                    year: "numeric"
                  })}
                </Text>
                <Pressable
                  onPress={() => setSelectedDate(Date.now())}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ fontSize: 13, color: "#3B82F6", fontWeight: "500" }}>
                    Today
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => changeDate(1)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Ionicons name="chevron-forward" size={20} color="#111827" />
              </Pressable>
            </View>

            {/* Summary */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Total Pours</Text>
                <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827" }}>
                  {todayEntries.length}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Total Yards</Text>
                <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827" }}>
                  {totalYards.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Department Selection for Actions */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
              Select Department to Add/Scan Pours
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {departments.map((dept) => {
                const colors = getDepartmentColor(dept);
                const isSelected = activeDepartment === dept;
                
                return (
                  <Pressable
                    key={dept}
                    onPress={() => {
                      setActiveDepartment(dept);
                      setSelectedDepartment(dept);
                    }}
                    style={{
                      flex: 1,
                      minWidth: "45%",
                      backgroundColor: isSelected ? colors.accent : "#FFFFFF",
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.accent : "#E5E7EB",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ 
                      fontSize: 15, 
                      fontWeight: "600", 
                      color: isSelected ? "#FFFFFF" : colors.color 
                    }}>
                      {dept}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Action Buttons - Only show when department is selected */}
          {activeDepartment && (
            <View style={{ gap: 12, marginBottom: 24 }}>
              <View style={{ 
                backgroundColor: getDepartmentColor(activeDepartment).bg, 
                borderRadius: 12, 
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: getDepartmentColor(activeDepartment).accent + "40",
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: "600", 
                  color: getDepartmentColor(activeDepartment).color,
                  textAlign: "center"
                }}>
                  Adding/Scanning for: {activeDepartment}
                </Text>
              </View>

              {/* Top Row: Add Pour */}
              <Pressable
                onPress={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                style={{
                  backgroundColor: "#3B82F6",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
                  Add Pour
                </Text>
              </Pressable>

              {/* Bottom Row: Scan & Sync */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={() => navigation.navigate("ScheduleScanner", { 
                    date: new Date(selectedDate).toISOString(),
                    department: activeDepartment,
                  })}
                  style={{
                    flex: 1,
                    backgroundColor: "#8B5CF6",
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Ionicons name="scan" size={20} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginLeft: 8 }}>
                    Scan Schedule
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSyncWithEliPlan}
                  disabled={isSyncing}
                  style={{
                    flex: 1,
                    backgroundColor: isSyncing ? "#D1D5DB" : isEliPlanConfigured() ? "#10B981" : "#6B7280",
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="sync" size={20} color="#FFFFFF" />
                      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginLeft: 8 }}>
                        {isEliPlanConfigured() ? "Sync" : "Config"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Configuration Status */}
          {!isEliPlanConfigured() && (
            <View style={{ 
              backgroundColor: "#FEF3C7", 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#FDE68A",
              flexDirection: "row",
              alignItems: "center",
            }}>
              <Ionicons name="information-circle" size={20} color="#92400E" />
              <Text style={{ fontSize: 12, color: "#92400E", marginLeft: 8, flex: 1 }}>
                EliPlan sync not configured. Tap "Configure" button for setup instructions.
              </Text>
            </View>
          )}

          {/* Last Sync Info */}
          {lastSyncTime && isEliPlanConfigured() && (
            <View style={{ 
              backgroundColor: "#F0FDF4", 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#BBF7D0",
            }}>
              <Text style={{ fontSize: 12, color: "#166534" }}>
                Last synced: {new Date(lastSyncTime).toLocaleString()}
              </Text>
            </View>
          )}

          {/* Debug Info - Shows all entries count */}
          {__DEV__ && (
            <Pressable
              onPress={() => {
                const allEntries = usePourScheduleStore.getState().pourEntries;
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                const entriesDebug = allEntries.slice(0, 5).map((e, i) => 
                  `${i+1}. Job ${e.jobNumber} - ${e.formBedName}\n` +
                  `   Date: ${new Date(e.scheduledDate).toLocaleString()}\n` +
                  `   Timestamp: ${e.scheduledDate}\n` +
                  `   Dept: ${e.department}`
                ).join('\n\n');
                
                Alert.alert(
                  "Debug Info",
                  `Total entries in store: ${allEntries.length}\n\n` +
                  `Entries for selected date: ${todayEntries.length}\n\n` +
                  `Selected date: ${new Date(selectedDate).toLocaleString()}\n` +
                  `Start of day: ${startOfDay.toLocaleString()} (${startOfDay.getTime()})\n` +
                  `End of day: ${endOfDay.toLocaleString()} (${endOfDay.getTime()})\n\n` +
                  `Extruded forms: ${forms.filter(f => f.department === 'Extruded').map(f => f.name).join(', ')}\n\n` +
                  `Recent entries:\n${entriesDebug || 'None'}`,
                  [{ text: "OK" }]
                );
              }}
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#FCA5A5",
              }}
            >
              <Text style={{ fontSize: 12, color: "#991B1B", fontWeight: "600" }}>
                🐛 Debug: Tap to view entry count and date info
              </Text>
            </Pressable>
          )}

          {/* Departments */}
          <View style={{ gap: 16 }}>
            {departments.map((dept) => {
              const deptForms = getFormsByDepartment(dept);
              const deptEntries = todayEntries.filter(e => e.department === dept);
              const deptYards = deptEntries.reduce((sum, e) => sum + (e.concreteYards || 0), 0);
              const isExpanded = expandedDepartment === dept;
              const colors = getDepartmentColor(dept);

              return (
                <View
                  key={dept}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    overflow: "hidden",
                  }}
                >
                  {/* Department Header */}
                  <Pressable
                    onPress={() => setExpandedDepartment(isExpanded ? null : dept)}
                    style={{
                      backgroundColor: colors.bg,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.color, marginBottom: 4 }}>
                        {dept}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 16 }}>
                        <Text style={{ fontSize: 13, color: colors.color }}>
                          {deptForms.length} Forms
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.color }}>
                          {deptEntries.length} Pours
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.color, fontWeight: "600" }}>
                          {deptYards.toFixed(1)} yds³
                        </Text>
                      </View>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={colors.color} />
                  </Pressable>

                  {/* Expanded Content - Forms and Pours */}
                  {isExpanded && (
                    <View style={{ padding: 16 }}>
                      {deptForms.length === 0 ? (
                        <View style={{ padding: 24, alignItems: "center" }}>
                          <Ionicons name="construct-outline" size={32} color="#9CA3AF" />
                          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                            No forms configured for this department
                          </Text>
                        </View>
                      ) : (
                        <View style={{ gap: 12 }}>
                          {deptForms.map((form) => {
                            const formPours = deptEntries.filter(e => e.formBedId === form.id);
                            
                            return (
                              <View
                                key={form.id}
                                style={{
                                  backgroundColor: "#F9FAFB",
                                  borderRadius: 12,
                                  padding: 12,
                                  borderWidth: 1,
                                  borderColor: "#E5E7EB",
                                }}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: formPours.length > 0 ? 12 : 0 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 2 }}>
                                      {form.name}
                                    </Text>
                                    {form.capacity && (
                                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                        Capacity: {form.capacity}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={{
                                    backgroundColor: formPours.length > 0 ? colors.bg : "#F3F4F6",
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 8,
                                  }}>
                                    <Text style={{ fontSize: 12, fontWeight: "600", color: formPours.length > 0 ? colors.color : "#6B7280" }}>
                                      {formPours.length} {formPours.length === 1 ? "Pour" : "Pours"}
                                    </Text>
                                  </View>
                                </View>

                                {/* Pour Entries for this form */}
                                {formPours.length > 0 && (
                                  <View style={{ gap: 8 }}>
                                    {formPours.map((pour) => {
                                      const statusColors = getStatusColor(pour.status);
                                      
                                      return (
                                        <View
                                          key={pour.id}
                                          style={{
                                            backgroundColor: "#FFFFFF",
                                            borderRadius: 8,
                                            padding: 12,
                                            borderWidth: 1,
                                            borderColor: "#E5E7EB",
                                          }}
                                        >
                                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                            <View style={{ flex: 1 }}>
                                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                                                  Job #{pour.jobNumber}
                                                </Text>
                                                <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                  <Text style={{ fontSize: 10, fontWeight: "600", color: statusColors.text }}>
                                                    {pour.status}
                                                  </Text>
                                                </View>
                                              </View>
                                              {pour.jobName && (
                                                <Text style={{ fontSize: 13, color: "#111827", marginBottom: 4 }}>
                                                  {pour.jobName}
                                                </Text>
                                              )}
                                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                                {pour.markNumbers && (
                                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                                    Marks: {pour.markNumbers}
                                                  </Text>
                                                )}
                                                {pour.pieceCount && (
                                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                                    {pour.pieceCount} pcs
                                                  </Text>
                                                )}
                                                {pour.concreteYards && (
                                                  <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600" }}>
                                                    {pour.concreteYards} yds³
                                                  </Text>
                                                )}
                                                {pour.scheduledTime && (
                                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                                    {pour.scheduledTime}
                                                  </Text>
                                                )}
                                              </View>
                                            </View>
                                            <View style={{ flexDirection: "row", gap: 8 }}>
                                              <Pressable
                                                onPress={() => handleEditPour(pour)}
                                                style={{ padding: 4 }}
                                              >
                                                <Ionicons name="pencil" size={16} color="#3B82F6" />
                                              </Pressable>
                                              <Pressable
                                                onPress={() => handleDeletePour(pour.id)}
                                                style={{ padding: 4 }}
                                              >
                                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                              </Pressable>
                                            </View>
                                          </View>
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Pour Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                  {editingPourId ? "Edit Pour Entry" : "Add Pour Entry"}
                </Text>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 16 }}>
                  {/* Department */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Department *
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {departments.map((dept) => (
                        <Pressable
                          key={dept}
                          onPress={() => {
                            setSelectedDepartment(dept);
                            setSelectedFormBedId(""); // Reset form selection
                          }}
                          style={{
                            backgroundColor: selectedDepartment === dept ? "#3B82F6" : "#F3F4F6",
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: selectedDepartment === dept ? "#FFFFFF" : "#6B7280",
                            }}
                          >
                            {dept}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Form/Bed Selection */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Form/Bed *
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {getFormsByDepartment(selectedDepartment).map((form) => (
                        <Pressable
                          key={form.id}
                          onPress={() => setSelectedFormBedId(form.id)}
                          style={{
                            backgroundColor: selectedFormBedId === form.id ? "#10B981" : "#F3F4F6",
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: selectedFormBedId === form.id ? "#FFFFFF" : "#6B7280",
                            }}
                          >
                            {form.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Job Number */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Job # *
                    </Text>
                    <TextInput
                      value={jobNumber}
                      onChangeText={setJobNumber}
                      placeholder="Enter job number"
                      placeholderTextColor="#9CA3AF"
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

                  {/* Job Name */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Job Name
                    </Text>
                    <TextInput
                      value={jobName}
                      onChangeText={setJobName}
                      placeholder="Enter job name"
                      placeholderTextColor="#9CA3AF"
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

                  {/* Row: Mark Numbers & Piece Count */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Mark #s
                      </Text>
                      <TextInput
                        value={markNumbers}
                        onChangeText={setMarkNumbers}
                        placeholder="e.g., M1-M5"
                        placeholderTextColor="#9CA3AF"
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Piece Count
                      </Text>
                      <TextInput
                        value={pieceCount}
                        onChangeText={setPieceCount}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
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
                    </View>
                  </View>

                  {/* Row: Product Type & Dimensions */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Product Type
                      </Text>
                      <TextInput
                        value={productType}
                        onChangeText={setProductType}
                        placeholder="e.g., Beam"
                        placeholderTextColor="#9CA3AF"
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Dimensions
                      </Text>
                      <TextInput
                        value={dimensions}
                        onChangeText={setDimensions}
                        placeholder="e.g., 8x4x6"
                        placeholderTextColor="#9CA3AF"
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

                  {/* Row: Mix Design & Concrete Yards */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Mix Design
                      </Text>
                      <TextInput
                        value={mixDesign}
                        onChangeText={setMixDesign}
                        placeholder="e.g., 6000 PSI"
                        placeholderTextColor="#9CA3AF"
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Concrete (yds³)
                      </Text>
                      <TextInput
                        value={concreteYards}
                        onChangeText={setConcreteYards}
                        placeholder="0.0"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="decimal-pad"
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

                  {/* Row: Scheduled Time & Status */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Scheduled Time
                      </Text>
                      <TextInput
                        value={scheduledTime}
                        onChangeText={setScheduledTime}
                        placeholder="e.g., 8:00 AM"
                        placeholderTextColor="#9CA3AF"
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Status
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {(["Scheduled", "In Progress", "Completed"] as PourStatus[]).map((st) => (
                          <Pressable
                            key={st}
                            onPress={() => setStatus(st)}
                            style={{
                              backgroundColor: status === st ? "#6366F1" : "#F3F4F6",
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: status === st ? "#FFFFFF" : "#6B7280",
                              }}
                            >
                              {st}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Foreman */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Foreman
                    </Text>
                    <TextInput
                      value={foreman}
                      onChangeText={setForeman}
                      placeholder="Enter foreman name"
                      placeholderTextColor="#9CA3AF"
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

                  {/* Notes */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Notes
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Additional notes..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
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
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                <Pressable
                  onPress={() => setShowAddModal(false)}
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
                  onPress={handleAddPour}
                  style={{
                    flex: 1,
                    backgroundColor: "#3B82F6",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    {editingPourId ? "Update" : "Add"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
