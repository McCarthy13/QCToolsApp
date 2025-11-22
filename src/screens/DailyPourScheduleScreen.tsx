import { View, Text, Pressable, ScrollView, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { usePourScheduleStore } from "../state/pourScheduleStore";
import { useAuthStore } from "../state/authStore";
import { useState, useEffect, useLayoutEffect } from "react";
import { PourDepartment, PourEntry, PourStatus } from "../types/pour-schedule";
import { isEliPlanConfigured } from "../api/eliplan";
import JobAutocompleteInput from "../components/JobAutocompleteInput";
import { Calendar, DateData } from 'react-native-calendars';

type Props = NativeStackScreenProps<RootStackParamList, "DailyPourSchedule">;

export default function DailyPourScheduleScreen({ navigation, route }: Props) {
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

  // Get initial date and department from navigation params (if coming from scanner)
  const initialDate = route.params?.date ? new Date(route.params.date).getTime() : Date.now();
  const initialDepartment = route.params?.department as PourDepartment | null;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewingDepartment, setViewingDepartment] = useState<PourDepartment | null>(initialDepartment);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingPourId, setEditingPourId] = useState<string | null>(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [dateInputText, setDateInputText] = useState("");
  
  // Department for adding/scanning (user must select first)
  const [activeDepartment, setActiveDepartment] = useState<PourDepartment | null>(initialDepartment);
  
  // Form state for pour entry
  const [selectedDepartment, setSelectedDepartment] = useState<PourDepartment>(initialDepartment || "Precast");
  const [selectedFormBedId, setSelectedFormBedId] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [idNumber, setIdNumber] = useState("");
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

  // Update header back button based on viewing department
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable 
          onPress={() => {
            if (viewingDepartment) {
              // If viewing a department, go back to department selector
              setViewingDepartment(null);
            } else {
              // If on department selector, go back to previous screen
              navigation.goBack();
            }
          }} 
          style={{ marginLeft: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation, viewingDepartment]);

  // Listen for route params changes to handle back navigation
  useEffect(() => {
    if (route.params?.department === undefined && viewingDepartment !== null) {
      setViewingDepartment(null);
    }
  }, [route.params]);
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
      department: selectedForm.department,
      jobNumber: jobNumber.trim(),
      jobName: jobName.trim() || undefined,
      idNumber: idNumber.trim() || undefined,
      markNumbers: markNumbers.trim() || undefined,
      pieceCount: 1,
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
    setIdNumber("");
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
    setIdNumber(pour.idNumber || "");
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

  const getDateLabel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays === 1) return 'Tomorrow';
    return null; // No label for other dates
  };

  const openDatePicker = () => {
    // Pre-fill with current selected date in MM/DD/YYYY format
    const currentDate = new Date(selectedDate);
    const formatted = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
    setDateInputText(formatted);
    setShowDatePickerModal(true);
  };

  const handleDateSubmit = () => {
    // Parse date in MM/DD/YYYY format
    const parts = dateInputText.split('/');
    if (parts.length !== 3) {
      Alert.alert('Invalid Date', 'Please enter date in MM/DD/YYYY format');
      return;
    }

    const month = parseInt(parts[0]) - 1; // Month is 0-indexed
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      Alert.alert('Invalid Date', 'Please enter valid numbers for date');
      return;
    }

    if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      Alert.alert('Invalid Date', 'Please enter a valid date');
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

  const handleCalendarDayPress = (day: DateData) => {
    // Convert selected date to timestamp
    const newDate = new Date(day.year, day.month - 1, day.day);
    setSelectedDate(newDate.getTime());
    setShowDatePickerModal(false);
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

  // If no department selected, show department selector
  if (!viewingDepartment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 12 }}>
            <View style={{ marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 2 }}>
                  Daily Pour Schedule
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  Select a department to view and manage
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate("ScheduleSearch")}
                style={{ backgroundColor: "#3B82F6", borderRadius: 10, padding: 12, marginLeft: 8 }}
              >
                <Ionicons name="search" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>
                Schedule Date
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable onPress={() => changeDate(-1)} style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <Ionicons name="chevron-back" size={18} color="#111827" />
                </Pressable>
                <View style={{ flex: 1, marginHorizontal: 8, alignItems: "center" }}>
                  <Pressable onPress={openDatePicker}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                      {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                  </Pressable>
                  {getDateLabel() && (
                    <Pressable onPress={() => setSelectedDate(Date.now())}>
                      <Text style={{ fontSize: 11, color: "#3B82F6", fontWeight: "500" }}>{getDateLabel()}</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={() => changeDate(1)} style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <Ionicons name="chevron-forward" size={18} color="#111827" />
                </Pressable>
              </View>
            </View>

            <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 8 }}>Select Department</Text>
            <View style={{ gap: 8 }}>
              {departments.map((dept) => {
                const deptEntries = todayEntries.filter(e => e.department === dept);
                const deptYards = deptEntries.reduce((sum, e) => sum + (e.concreteYards || 0), 0);
                const colors = getDepartmentColor(dept);
                const deptForms = getFormsByDepartment(dept);

                return (
                  <Pressable
                    key={dept}
                    onPress={() => {
                      setViewingDepartment(dept);
                      setSelectedDepartment(dept);
                      setActiveDepartment(dept);
                    }}
                    style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: "#E5E7EB" }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.color }}>{dept}</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.accent} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6B7280", marginBottom: 1 }}>Forms</Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>{deptForms.length}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6B7280", marginBottom: 1 }}>Pours Today</Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>{deptEntries.length}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6B7280", marginBottom: 1 }}>Yards</Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.accent }}>{deptYards.toFixed(1)}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show only selected department
  const departmentEntries = todayEntries.filter(e => e.department === viewingDepartment);
  const departmentYards = getTotalYardsForDate(selectedDate, viewingDepartment);
  const deptColors = getDepartmentColor(viewingDepartment);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 10 }}>
          {/* Compact Header */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: deptColors.color }}>
                {viewingDepartment}
              </Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <Text style={{ fontSize: 10, color: "#6B7280" }}>Pours</Text>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", textAlign: "center" }}>
                    {departmentEntries.length}
                  </Text>
                </View>
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <Text style={{ fontSize: 10, color: "#6B7280" }}>Yards</Text>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: deptColors.accent, textAlign: "center" }}>
                    {departmentYards.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Compact Date Selector */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Pressable onPress={() => changeDate(-1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={20} color="#111827" />
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Pressable onPress={openDatePicker}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                  {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
              </Pressable>
              {getDateLabel() && (
                <Pressable onPress={() => setSelectedDate(Date.now())}>
                  <Text style={{ fontSize: 10, color: "#3B82F6", fontWeight: "500" }}>{getDateLabel()}</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => changeDate(1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={20} color="#111827" />
            </Pressable>
          </View>

          {/* Compact Action Buttons */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            <Pressable
              onPress={() => {
                resetForm();
                setShowAddModal(true);
              }}
              style={{
                flex: 1,
                backgroundColor: "#3B82F6",
                borderRadius: 8,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginLeft: 4 }}>
                Add Piece
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("ScheduleScanner", { 
                date: new Date(selectedDate).toISOString(),
                department: viewingDepartment,
              })}
              style={{
                flex: 1,
                backgroundColor: "#8B5CF6",
                borderRadius: 8,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="scan" size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginLeft: 4 }}>
                Scan
              </Text>
            </Pressable>
          </View>

          {/* Forms & Pours List */}
          {(() => {
            const deptForms = getFormsByDepartment(viewingDepartment);
            const deptEntries = todayEntries.filter(e => e.department === viewingDepartment);
            const colors = getDepartmentColor(viewingDepartment);

            if (deptForms.length === 0) {
              return (
                <View style={{ padding: 20, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 10 }}>
                  <Ionicons name="construct-outline" size={28} color="#9CA3AF" />
                  <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 6 }}>
                    No forms configured for this department
                  </Text>
                </View>
              );
            }

            return (
              <View style={{ gap: 6 }}>
                {deptForms.map((form) => {
                  const formPours = deptEntries.filter(e => e.formBedId === form.id);
                  
                  return (
                    <View
                      key={form.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 8,
                        padding: 8,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      {/* Form Header - More Compact */}
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: formPours.length > 0 ? 6 : 0 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                            {form.name}
                          </Text>
                          {form.capacity && (
                            <Text style={{ fontSize: 11, color: "#6B7280" }}>
                              Cap: {form.capacity}
                            </Text>
                          )}
                        </View>
                        <View style={{
                          backgroundColor: formPours.length > 0 ? colors.bg : "#F3F4F6",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: formPours.length > 0 ? colors.color : "#6B7280" }}>
                            {formPours.length}
                          </Text>
                        </View>
                      </View>

                      {/* Pour Entries - Ultra Compact */}
                      {formPours.length > 0 && (
                        <View style={{ gap: 4 }}>
                          {formPours.map((pour) => {
                            const statusColors = getStatusColor(pour.status);
                            
                            return (
                              <View
                                key={pour.id}
                                style={{
                                  backgroundColor: "#F9FAFB",
                                  borderRadius: 6,
                                  padding: 8,
                                  borderWidth: 1,
                                  borderColor: "#E5E7EB",
                                }}
                              >
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                  <View style={{ flex: 1 }}>
                                    {/* Job # and Status on one line */}
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                                        #{pour.jobNumber}
                                      </Text>
                                      <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 9, fontWeight: "600", color: statusColors.text }}>
                                          {pour.status}
                                        </Text>
                                      </View>
                                    </View>
                                    {/* Job Name if exists */}
                                    {pour.jobName && (
                                      <Text style={{ fontSize: 12, color: "#374151", marginBottom: 2 }}>
                                        {pour.jobName}
                                      </Text>
                                    )}
                                    {/* Compact details row */}
                                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                      {pour.markNumbers && (
                                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                                          {pour.markNumbers}
                                        </Text>
                                      )}
                                      {pour.idNumber && (
                                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                                          ID: {pour.idNumber}
                                        </Text>
                                      )}
                                      {pour.concreteYards && (
                                        <Text style={{ fontSize: 11, color: colors.accent, fontWeight: "600" }}>
                                          {pour.concreteYards}yd³
                                        </Text>
                                      )}
                                      {pour.scheduledTime && (
                                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                                          {pour.scheduledTime}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  {/* Action buttons - smaller */}
                                  <View style={{ flexDirection: "row", gap: 6 }}>
                                    <Pressable onPress={() => handleEditPour(pour)} style={{ padding: 2 }}>
                                      <Ionicons name="pencil" size={14} color="#3B82F6" />
                                    </Pressable>
                                    <Pressable onPress={() => handleDeletePour(pour.id)} style={{ padding: 2 }}>
                                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
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
            );
          })()}
        </View>
      </ScrollView>

      {/* Add/Edit Pour Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
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
                  {editingPourId ? "Edit Piece" : "Add Piece"}
                </Text>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 16 }}>
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

                  {/* Job Number & Name with Autocomplete */}
                  <JobAutocompleteInput
                    jobNumber={jobNumber}
                    jobName={jobName}
                    onJobNumberChange={setJobNumber}
                    onJobNameChange={setJobName}
                    required={true}
                  />

                  {/* ID Number */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      ID #
                    </Text>
                    <TextInput
                      value={idNumber}
                      onChangeText={setIdNumber}
                      placeholder="ID number"
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

                  {/* Mark Numbers */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Mark #s
                    </Text>
                    <TextInput
                      value={markNumbers}
                      onChangeText={setMarkNumbers}
                      placeholder="e.g., M1-M5"
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

                  {/* Dimensions */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Dimensions
                    </Text>
                    <TextInput
                      value={dimensions}
                      onChangeText={setDimensions}
                      placeholder="e.g., 8x4x6"
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                        Concrete (yds³)
                      </Text>
                      <TextInput
                        value={concreteYards}
                        onChangeText={setConcreteYards}
                        placeholder="0.0"
                        placeholderTextColor="#9CA3AF"
                        cursorColor="#000000"
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
                      cursorColor="#000000"
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
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePickerModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              width: "85%",
              maxWidth: 400,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
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
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Yesterday</Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickDate(0)}
                style={{
                  flex: 1,
                  backgroundColor: "#3B82F6",
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

            {/* Calendar Picker */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              Or select from calendar:
            </Text>
            <Calendar
              current={new Date(selectedDate).toISOString().split('T')[0]}
              onDayPress={handleCalendarDayPress}
              markedDates={{
                [new Date(selectedDate).toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: '#3B82F6',
                },
              }}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#6B7280',
                selectedDayBackgroundColor: '#3B82F6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#3B82F6',
                dayTextColor: '#111827',
                textDisabledColor: '#D1D5DB',
                monthTextColor: '#111827',
                textMonthFontWeight: '600',
                textDayFontSize: 15,
                textMonthFontSize: 17,
              }}
              style={{
                borderRadius: 12,
                marginBottom: 20,
              }}
            />

            {/* Manual Date Input */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              Or type a date:
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
                  backgroundColor: "#3B82F6",
                  borderRadius: 8,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Go to Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
