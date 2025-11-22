/**
 * Schedule Review Screen
 * 
 * Review and edit AI-parsed schedule entries before importing
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ParsedScheduleEntry } from '../api/schedule-scanner';
import { usePourScheduleStore } from '../state/pourScheduleStore';
import { useProjectLibraryStore } from '../state/projectLibraryStore';
import JobAutocompleteInput from '../components/JobAutocompleteInput';

type ReviewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScheduleReview'>;
type ReviewRouteProp = RouteProp<RootStackParamList, 'ScheduleReview'>;

export default function ScheduleReviewScreen() {
  const navigation = useNavigation<ReviewNavigationProp>();
  const route = useRoute<ReviewRouteProp>();
  
  const addPourEntry = usePourScheduleStore((s) => s.addPourEntry);
  const forms = usePourScheduleStore((s) => s.forms);
  const getFormsByDepartment = usePourScheduleStore((s) => s.getFormsByDepartment);
  
  // Project Library integration
  const projects = useProjectLibraryStore((s) => s.projects);
  const addProject = useProjectLibraryStore((s) => s.addProject);
  
  const [entries, setEntries] = useState<ParsedScheduleEntry[]>(route.params.entries);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(route.params.date));
  
  // Get the department from route params (passed from scanner)
  const suggestedDepartment = route.params.department;
  
  // Filter forms to show only from suggested department if provided
  const availableForms = suggestedDepartment 
    ? forms.filter(f => f.department === suggestedDepartment && f.isActive)
    : forms.filter(f => f.isActive);

  const handleUpdateEntry = (index: number, field: keyof ParsedScheduleEntry, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleBulkAssignBed = (bedName: string) => {
    const updated = entries.map(entry => ({ ...entry, formBed: bedName }));
    setEntries(updated);
    setShowBulkAssignModal(false);
    
    Alert.alert(
      'Beds Assigned ✓',
      `All ${entries.length} pieces assigned to ${bedName}.\n\nNext: Click "Import All" button below to save these entries.`,
      [{ text: 'Got it' }]
    );
  };

  const handleRemoveEntry = (index: number) => {
    Alert.alert(
      'Remove Entry',
      'Are you sure you want to remove this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = entries.filter((_, i) => i !== index);
            setEntries(updated);
            if (selectedIndex === index) {
              setSelectedIndex(null);
            }
          },
        },
      ]
    );
  };

  const handleImportAll = () => {
    if (entries.length === 0) {
      Alert.alert('No Entries', 'There are no entries to import.');
      return;
    }

    // Check if all entries have formBed assigned
    const missingForms = entries.filter(e => !e.formBed || !e.formBed.trim());
    if (missingForms.length > 0) {
      Alert.alert(
        'Missing Form/Bed Assignments',
        `${missingForms.length} ${missingForms.length === 1 ? 'entry needs' : 'entries need'} a Form/Bed assigned. Please assign forms to all entries before importing.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for job numbers not in Project Library
    const existingJobNumbers = new Set(projects.map(p => p.jobNumber));
    const missingJobNumbers = new Set<string>();
    const missingJobDetails: { jobNumber: string; jobName?: string }[] = [];

    entries.forEach(entry => {
      if (!existingJobNumbers.has(entry.jobNumber)) {
        if (!missingJobNumbers.has(entry.jobNumber)) {
          missingJobNumbers.add(entry.jobNumber);
          missingJobDetails.push({
            jobNumber: entry.jobNumber,
            jobName: entry.jobName,
          });
        }
      }
    });

    // If there are missing job numbers, prompt user
    if (missingJobDetails.length > 0) {
      const jobList = missingJobDetails
        .map(j => `  • ${j.jobNumber}${j.jobName ? ` (${j.jobName})` : ''}`)
        .join('\n');

      Alert.alert(
        'Job(s) Not Found',
        `The following job ${missingJobDetails.length === 1 ? 'number is' : 'numbers are'} not in the Project Library:\n\n${jobList}\n\nDo you want to create ${missingJobDetails.length === 1 ? 'it' : 'them'}?`,
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => {
              // User can stay on review screen to edit entries
            },
          },
          {
            text: 'Yes, Create',
            onPress: () => {
              // Create the missing projects
              missingJobDetails.forEach(job => {
                addProject({
                  jobNumber: job.jobNumber,
                  jobName: job.jobName || `Job ${job.jobNumber}`,
                  location: '',
                  salesperson: '',
                  projectManager: '',
                  assignedEngineer: '',
                  assignedDrafter: '',
                  pieceCountByType: [],
                  createdBy: 'Scanner',
                });
              });

              // Now proceed with import
              proceedWithImport();
            },
          },
        ]
      );
      return;
    }

    // No missing jobs, proceed directly
    proceedWithImport();
  };

  const proceedWithImport = () => {
    let imported = 0;
    const debugInfo: string[] = [];
    
    // Normalize the selected date to midnight to avoid timezone/time issues
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const scheduledDateTimestamp = normalizedDate.getTime();
    
    entries.forEach((entry) => {
      // Find the form to get proper department
      const form = forms.find(f => f.name === entry.formBed || f.id === entry.formBed);
      const department = form?.department || "Precast";
      
      debugInfo.push(
        `Entry: Job ${entry.jobNumber}\n` +
        `  formBed: "${entry.formBed}"\n` +
        `  form found: ${form ? 'YES' : 'NO'}\n` +
        `  formBedId: "${form?.id || entry.formBed}"\n` +
        `  formBedName: "${form?.name || entry.formBed}"\n` +
        `  department: "${department}"\n` +
        `  scheduledDate: ${scheduledDateTimestamp} (${normalizedDate.toLocaleString()})`
      );
      
      addPourEntry({
        formBedId: form?.id || entry.formBed || '',
        formBedName: form?.name || entry.formBed || '',
        department: department,
        scheduledDate: scheduledDateTimestamp,
        scheduledTime: entry.scheduledTime || undefined,
        jobNumber: entry.jobNumber,
        jobName: entry.jobName || undefined,
        idNumber: entry.idNumber || undefined,
        markNumbers: entry.markNumber || undefined, // Single mark
        pieceCount: 1, // Always 1 since we have individual entries
        productType: entry.productType || undefined,
        concreteYards: entry.concreteYards || undefined,
        mixDesign: entry.mixDesign || undefined,
        notes: entry.notes || undefined,
        status: "Scheduled",
        foreman: undefined,
        createdBy: "Scanner",
      });
      imported++;
    });

    if (__DEV__) {
      console.log('Import Debug Info:\n' + debugInfo.join('\n\n'));
    }

    const dateStr = normalizedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    const deptStr = suggestedDepartment || 'schedule';

    Alert.alert(
      'Import Successful! ✓',
      `${imported} ${imported === 1 ? 'piece' : 'pieces'} imported to:\n\n` +
      `📅 Date: ${dateStr}\n` +
      (suggestedDepartment ? `🏭 Department: ${suggestedDepartment}\n\n` : '\n') +
      `You'll be taken to the schedule to view your entries.`,
      [
        {
          text: 'View Schedule',
          onPress: () => {
            navigation.navigate('DailyPourSchedule', {
              date: selectedDate.toISOString(),
              department: suggestedDepartment || undefined,
            });
          },
        },
      ]
    );
  };

  // Render edit form for selected entry
  const renderEditForm = () => {
    if (selectedIndex === null) return null;
    const entry = entries[selectedIndex];

    return (
      <View style={{ flex: 1, backgroundColor: '#111827', padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
            Edit Entry
          </Text>
          <Pressable
            onPress={() => setSelectedIndex(null)}
            style={{ padding: 8 }}
          >
            <Ionicons name="close" size={24} color="#9ca3af" />
          </Pressable>
        </View>

        <ScrollView>
          <View style={{ gap: 16 }}>
            {/* Form / Bed Picker - REQUIRED */}
            <View style={{ backgroundColor: '#374151', padding: 12, borderRadius: 8, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="layers" size={20} color="#60a5fa" style={{ marginRight: 8 }} />
                <Text style={{ color: '#60a5fa', fontSize: 14, fontWeight: '600' }}>
                  Assign Current Form/Bed
                </Text>
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                Where is this piece actually being poured today?
              </Text>
            </View>

            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Select Form / Bed *</Text>
              <View style={{ backgroundColor: '#1f2937', borderRadius: 8, padding: 12, maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled>
                  {availableForms.map((form) => (
                    <Pressable
                      key={form.id}
                      onPress={() => handleUpdateEntry(selectedIndex, 'formBed', form.name)}
                      style={{
                        padding: 12,
                        backgroundColor: entry.formBed === form.name ? '#3b82f6' : '#374151',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: entry.formBed === form.name ? '600' : '400' }}>
                        {form.name} ({form.department})
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              {entry.formBed && (
                <View style={{ backgroundColor: '#065f46', padding: 10, borderRadius: 8, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600' }}>
                    Assigned to: {entry.formBed}
                  </Text>
                </View>
              )}
              {!entry.formBed && (
                <View style={{ backgroundColor: '#78350f', padding: 10, borderRadius: 8, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#f59e0b', fontSize: 13 }}>
                    Required: Select a form/bed above
                  </Text>
                </View>
              )}
            </View>

            {/* Job Number & Name with Autocomplete */}
            <View>
              <JobAutocompleteInput
                jobNumber={entry.jobNumber}
                jobName={entry.jobName || ''}
                onJobNumberChange={(text) => handleUpdateEntry(selectedIndex, 'jobNumber', text)}
                onJobNameChange={(text) => handleUpdateEntry(selectedIndex, 'jobName', text)}
                required={true}
                jobNumberLabel="Job Number"
                jobNameLabel="Job Name"
                theme="dark"
              />
            </View>

            {/* ID Number */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>ID Number</Text>
              <TextInput
                value={entry.idNumber || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'idNumber', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="ID from schedule"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Mark Number (Single) */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Mark Number</Text>
              <TextInput
                value={entry.markNumber || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'markNumber', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., M1, M2"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Length 1 */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Length 1</Text>
              <TextInput
                value={entry.length1 || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'length1', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 28'-6 1/2 inches"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Length 2 */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Length 2</Text>
              <TextInput
                value={entry.length2 || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'length2', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 28'-6 1/2 inches"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Width */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Width (inches)</Text>
              <TextInput
                value={entry.width?.toString() || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'width', parseFloat(text) || undefined)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 48"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Angle */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Angle (degrees)</Text>
              <TextInput
                value={entry.angle?.toString() || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'angle', parseFloat(text) || undefined)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 0"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Cutback */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Cutback</Text>
              <TextInput
                value={entry.cutback || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'cutback', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 0 ft 6 in"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Product Type */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Product Type</Text>
              <TextInput
                value={entry.productType || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'productType', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., Beam, Slab"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Concrete Yards */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Concrete Yards</Text>
              <TextInput
                value={entry.concreteYards?.toString() || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'concreteYards', parseFloat(text) || 0)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="0.0"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Mix Design */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Mix Design</Text>
              <TextInput
                value={entry.mixDesign || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'mixDesign', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 6000 PSI"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Scheduled Time */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Scheduled Time</Text>
              <TextInput
                value={entry.scheduledTime || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'scheduledTime', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }}
                placeholder="e.g., 8:00 AM"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
              />
            </View>

            {/* Notes */}
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Notes</Text>
              <TextInput
                value={entry.notes || ''}
                onChangeText={(text) => handleUpdateEntry(selectedIndex, 'notes', text)}
                style={{ backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16, height: 80 }}
                placeholder="Additional notes"
                placeholderTextColor="#6b7280"
                cursorColor="#000000"
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Confidence */}
            {entry.confidence !== undefined && (
              <View style={{ backgroundColor: '#1f2937', padding: 12, borderRadius: 8 }}>
                <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                  AI Confidence: <Text style={{ color: entry.confidence > 0.7 ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
                    {Math.round(entry.confidence * 100)}%
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Done Button */}
        <Pressable
          onPress={() => setSelectedIndex(null)}
          style={{ backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Done Editing
          </Text>
        </Pressable>
      </View>
    );
  };

  // If editing an entry, show edit form
  if (selectedIndex !== null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }} edges={['top', 'left', 'right']}>
        {renderEditForm()}
      </SafeAreaView>
    );
  }

  // Main list view
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
          Review Entries
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Entry Count */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        {suggestedDepartment && (
          <View style={{ backgroundColor: '#1f2937', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#3b82f6' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="business" size={18} color="#60a5fa" style={{ marginRight: 8 }} />
              <Text style={{ color: '#60a5fa', fontSize: 14, fontWeight: '600' }}>
                Importing to: {suggestedDepartment}
              </Text>
            </View>
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
              Only showing forms from this department
            </Text>
          </View>
        )}
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
          {entries.length} {entries.length === 1 ? 'piece' : 'pieces'} scanned
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 14 }}>
          Assign current Form/Bed for each piece
        </Text>
        {entries.filter(e => !e.formBed).length > 0 && (
          <View style={{ backgroundColor: '#374151', padding: 12, borderRadius: 8, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text style={{ color: '#f59e0b', fontSize: 13, flex: 1 }}>
              {entries.filter(e => !e.formBed).length} {entries.filter(e => !e.formBed).length === 1 ? 'piece needs' : 'pieces need'} bed assignment
            </Text>
          </View>
        )}
      </View>

      {/* Pour Date Selector */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="calendar" size={18} color="#60a5fa" style={{ marginRight: 8 }} />
            <Text style={{ color: '#60a5fa', fontSize: 14, fontWeight: '600' }}>
              Pour Date
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
              style={{ padding: 8, backgroundColor: '#374151', borderRadius: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>

            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' }}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>

            <Pressable
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
              style={{ padding: 8, backgroundColor: '#374151', borderRadius: 8 }}
            >
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          </View>
          <Pressable
            onPress={() => setSelectedDate(new Date())}
            style={{ marginTop: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#60a5fa', fontSize: 13 }}>
              Today
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bulk Assign Button */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Pressable
          onPress={() => setShowBulkAssignModal(true)}
          style={{ backgroundColor: '#8B5CF6', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="copy" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            Assign All to Same Bed
          </Text>
        </Pressable>
      </View>

      {/* Entry List */}
      <ScrollView style={{ flex: 1, padding: 16, paddingTop: 8 }}>
        {entries.map((entry, index) => (
          <View key={index} style={{ backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  {entry.formBed ? (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '600' }}>
                        {entry.formBed}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="alert-circle" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: '600' }}>
                        Bed Not Assigned
                      </Text>
                    </>
                  )}
                </View>
                <Text style={{ color: '#3b82f6', fontSize: 15, fontWeight: '600', marginBottom: 2 }}>
                  Job {entry.jobNumber}{entry.markNumber ? ` • ${entry.markNumber}` : ''}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  {entry.idNumber ? `ID: ${entry.idNumber}` : `Piece ${index + 1}`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setSelectedIndex(index)}
                  style={{ padding: 8, backgroundColor: entry.formBed ? '#374151' : '#78350f', borderRadius: 8 }}
                >
                  <Ionicons name={entry.formBed ? "create-outline" : "add-circle"} size={20} color={entry.formBed ? "#3b82f6" : "#f59e0b"} />
                </Pressable>
                <Pressable
                  onPress={() => handleRemoveEntry(index)}
                  style={{ padding: 8, backgroundColor: '#374151', borderRadius: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              {entry.markNumber && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  🏷️ Mark: {entry.markNumber}
                </Text>
              )}
              {entry.jobName && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  📋 {entry.jobName}
                </Text>
              )}
              {entry.length1 && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  📏 Length 1: {entry.length1}
                </Text>
              )}
              {entry.length2 && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  📏 Length 2: {entry.length2}
                </Text>
              )}
              {entry.width !== undefined && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  ↔️ Width: {entry.width}"
                </Text>
              )}
              {entry.angle !== undefined && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  📐 Angle: {entry.angle}°
                </Text>
              )}
              {entry.cutback && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  ✂️ Cutback: {entry.cutback}
                </Text>
              )}
              {entry.concreteYards && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  🏗️ {entry.concreteYards} yd³
                </Text>
              )}
              {entry.mixDesign && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  🧪 {entry.mixDesign}
                </Text>
              )}
              {entry.scheduledTime && (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  ⏰ {entry.scheduledTime}
                </Text>
              )}
            </View>

            {entry.confidence !== undefined && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#374151' }}>
                <Text style={{ color: entry.confidence > 0.7 ? '#10b981' : '#f59e0b', fontSize: 12 }}>
                  {Math.round(entry.confidence * 100)}% confidence
                </Text>
              </View>
            )}
          </View>
        ))}

        {entries.length === 0 && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Ionicons name="document-outline" size={64} color="#374151" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#9ca3af', fontSize: 16, textAlign: 'center' }}>
              No entries to review
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {entries.length > 0 && (
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#374151', gap: 12 }}>
          <Pressable
            onPress={handleImportAll}
            style={{ backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Import All {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Bulk Assign Modal */}
      <Modal
        visible={showBulkAssignModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBulkAssignModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
                  Assign All to Same Bed
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                  {entries.length} pieces will be assigned
                </Text>
              </View>
              <Pressable onPress={() => setShowBulkAssignModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>

            {/* Form/Bed List */}
            <ScrollView style={{ padding: 16 }}>
              {availableForms.map((form) => (
                <Pressable
                  key={form.id}
                  onPress={() => handleBulkAssignBed(form.name)}
                  style={{ backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#374151' }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                        {form.name}
                      </Text>
                      <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                        {form.department}{form.capacity ? ` • ${form.capacity}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* Cancel Button */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#374151' }}>
              <Pressable
                onPress={() => setShowBulkAssignModal(false)}
                style={{ backgroundColor: '#374151', padding: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#9ca3af', fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
