import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { useAuthStore } from '../state/authStore';
import {
  QualityLogEntry,
  getStatusFromDisposition,
  DISPOSITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  BED_OPTIONS,
  ISSUE_CODE_OPTIONS,
  REJECT_CODE_OPTIONS,
  isValidLocation,
  Disposition,
  ProductType,
  BedNumber,
} from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogDashboard'>;

export default function QualityLogDashboardScreen({ navigation }: Props) {
  const entries = useQualityLogStore((s) => s.entries);
  const initialize = useQualityLogStore((s) => s.initialize);
  const setDisposition = useQualityLogStore((s) => s.setDisposition);
  const updateEntry = useQualityLogStore((s) => s.updateEntry);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterBed, setFilterBed] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPickerModal, setShowPickerModal] = useState<{
    entryId: string;
    field: 'disposition' | 'productType' | 'bed' | 'issueCodes' | 'rejectCodes';
  } | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  useEffect(() => {
    initialize();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    initialize();
    setTimeout(() => setRefreshing(false), 1000);
  }, [initialize]);

  // Filter entries based on search and filters
  const filteredEntries = entries.filter((entry) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        entry.idNumber?.toLowerCase().includes(query) ||
        entry.jobNumber?.toLowerCase().includes(query) ||
        entry.markNumber?.toLowerCase().includes(query) ||
        entry.engineer?.toLowerCase().includes(query) ||
        entry.qualityComments?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Bed filter
    if (filterBed && entry.bed !== filterBed) return false;

    // Status filter
    if (filterStatus && entry.status !== filterStatus) return false;

    return true;
  });

  // Sort by pour date (newest first), then by ID number
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    // First sort by pour date
    const dateA = new Date(a.pourDate).getTime();
    const dateB = new Date(b.pourDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    // Then by ID number
    return (b.idNumber || '').localeCompare(a.idNumber || '');
  });

  const getStatusColor = (entry: QualityLogEntry): string => {
    if (!entry.disposition) return '#FFFFFF';
    const { color } = getStatusFromDisposition(entry.disposition);
    return color;
  };

  const handleDispositionChange = async (entry: QualityLogEntry, disposition: Disposition) => {
    try {
      await setDisposition(entry.id, disposition);
    } catch (error) {
      console.error('Error setting disposition:', error);
      Alert.alert('Error', 'Failed to update disposition');
    }
  };

  // Start inline editing for text fields
  const startEditing = (entryId: string, field: string, currentValue: string | number | undefined) => {
    setEditingCell({ entryId, field });
    setEditValue(String(currentValue ?? ''));
  };

  // Save inline edit
  const saveEdit = async () => {
    if (!editingCell) return;

    const { entryId, field } = editingCell;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    try {
      const updates: Partial<QualityLogEntry> = {};

      // Validate location format
      if (field === 'location' && editValue.trim() !== '') {
        if (!isValidLocation(editValue.trim())) {
          Alert.alert('Invalid Location', 'Location must be in format: (1-4)-(1-80)\nExample: 2-45');
          return;
        }
      }

      // Handle numeric fields
      if (field === 'width' || field === 'thickness') {
        (updates as any)[field] = parseFloat(editValue) || 0;
      } else {
        (updates as any)[field] = editValue;
      }

      await updateEntry(entryId, updates);
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }

    setEditingCell(null);
    setEditValue('');
  };

  // Cancel inline edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle picker selection
  const handlePickerSelect = async (value: string) => {
    if (!showPickerModal) return;

    const { entryId, field } = showPickerModal;

    try {
      if (field === 'disposition') {
        await setDisposition(entryId, value as Disposition);
      } else if (field === 'issueCodes' || field === 'rejectCodes') {
        // Multi-select: toggle the code
        setSelectedCodes((prev) =>
          prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
        );
        return; // Don't close modal for multi-select
      } else {
        const updates: Partial<QualityLogEntry> = {};
        (updates as any)[field] = value;
        await updateEntry(entryId, updates);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }

    setShowPickerModal(null);
  };

  // Save multi-select codes
  const saveMultiSelectCodes = async () => {
    if (!showPickerModal) return;

    const { entryId, field } = showPickerModal;

    try {
      const updates: Partial<QualityLogEntry> = {};
      (updates as any)[field] = selectedCodes;
      await updateEntry(entryId, updates);
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }

    setShowPickerModal(null);
    setSelectedCodes([]);
  };

  // Open codes picker with current values
  const openCodesPicker = (entryId: string, field: 'issueCodes' | 'rejectCodes', currentCodes: string[]) => {
    setSelectedCodes([...currentCodes]);
    setShowPickerModal({ entryId, field });
  };

  // Column width definitions (in pixels) for consistent alignment
  const COLUMN_WIDTHS = {
    detail: 32,
    pourDate: 90,
    disposition: 100,
    status: 55,
    approvalDate: 100,
    productType: 60,
    jobNumber: 75,
    markNumber: 90,
    idNumber: 90,
    length: 90,
    width: 60,
    bed: 50,
    location: 75,
    qualityComments: 180,
    engineer: 100,
    engineerFeedback: 180,
    issueCodes: 100,
    rejectCodes: 100,
  };

  // Render an editable text cell
  const renderEditableTextCell = (
    entry: QualityLogEntry,
    field: string,
    value: string | number | undefined,
    width: number
  ) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell?.field === field;
    const displayValue = value ?? '-';

    if (isEditing) {
      return (
        <View style={{ width, paddingHorizontal: 8, paddingVertical: 4 }}>
          <TextInput
            value={editValue}
            onChangeText={setEditValue}
            onBlur={saveEdit}
            onSubmitEditing={saveEdit}
            autoFocus
            className="text-xs bg-blue-50 border border-blue-300 rounded px-1 py-1 text-gray-900"
            style={{ minHeight: 24 }}
          />
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => startEditing(entry.id, field, value)}
        style={{ width, paddingHorizontal: 8, paddingVertical: 12 }}
      >
        <Text className="text-xs text-gray-900" numberOfLines={2}>{displayValue}</Text>
      </Pressable>
    );
  };

  // Render a picker cell (disposition, product type, bed)
  const renderPickerCell = (
    entry: QualityLogEntry,
    field: 'disposition' | 'productType' | 'bed',
    value: string | undefined,
    width: number
  ) => {
    const displayValue = field === 'bed' && value ? `${value}` : value || '-';

    return (
      <Pressable
        onPress={() => setShowPickerModal({ entryId: entry.id, field })}
        style={{ width, paddingHorizontal: 8, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text className="text-xs text-gray-900 flex-1" numberOfLines={1}>{displayValue}</Text>
        <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
      </Pressable>
    );
  };

  const stats = {
    total: entries.length,
    pending: entries.filter((e) => !e.disposition).length,
    okToShip: entries.filter((e) => e.disposition === 'Ok to Ship').length,
    issues: entries.filter((e) => e.issueCodes.length > 0 || e.rejectCodes.length > 0).length,
  };

  // Get picker options based on field
  const getPickerOptions = () => {
    if (!showPickerModal) return [];
    switch (showPickerModal.field) {
      case 'disposition':
        return DISPOSITION_OPTIONS;
      case 'productType':
        return PRODUCT_TYPE_OPTIONS;
      case 'bed':
        return BED_OPTIONS;
      case 'issueCodes':
        return ISSUE_CODE_OPTIONS;
      case 'rejectCodes':
        return REJECT_CODE_OPTIONS;
      default:
        return [];
    }
  };

  const getPickerTitle = () => {
    if (!showPickerModal) return '';
    switch (showPickerModal.field) {
      case 'disposition':
        return 'Select Disposition';
      case 'productType':
        return 'Select Product Type';
      case 'bed':
        return 'Select Bed';
      case 'issueCodes':
        return 'Select Issue Codes (tap to toggle)';
      case 'rejectCodes':
        return 'Select Reject Codes (tap to toggle)';
      default:
        return '';
    }
  };

  const isMultiSelect = showPickerModal?.field === 'issueCodes' || showPickerModal?.field === 'rejectCodes';

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Quality Log</Text>
          <View className="flex-row gap-2">
            {isAdmin && (
              <Pressable
                onPress={() => navigation.navigate('QualityLogAdmin' as any)}
                className="bg-gray-100 rounded-full p-2"
              >
                <Ionicons name="settings-outline" size={22} color="#374151" />
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('QualityLogImport' as any)}
              className="bg-blue-600 rounded-full p-2"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by ID, Job #, Mark #, Engineer..."
            className="flex-1 ml-2 text-base text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-gray-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Total</Text>
            <Text className="text-lg font-bold text-gray-900">{stats.total}</Text>
          </View>
          <View className="flex-1 bg-yellow-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Pending</Text>
            <Text className="text-lg font-bold text-yellow-600">{stats.pending}</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Ok to Ship</Text>
            <Text className="text-lg font-bold text-green-600">{stats.okToShip}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Issues</Text>
            <Text className="text-lg font-bold text-red-600">{stats.issues}</Text>
          </View>
        </View>
      </View>

      {/* Filter Row */}
      <View className="bg-white px-4 py-2 border-b border-gray-200 flex-row gap-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setFilterBed(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!filterBed ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${!filterBed ? 'text-white' : 'text-gray-700'}`}>All Beds</Text>
          </Pressable>
          {BED_OPTIONS.map((bed) => (
            <Pressable
              key={bed}
              onPress={() => setFilterBed(filterBed === bed ? null : bed)}
              className={`px-3 py-1 rounded-full mr-2 ${filterBed === bed ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <Text className={`text-sm ${filterBed === bed ? 'text-white' : 'text-gray-700'}`}>
                Bed {bed}
              </Text>
            </Pressable>
          ))}
          <View className="w-2" />
          <Pressable
            onPress={() => setFilterStatus(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!filterStatus ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${!filterStatus ? 'text-white' : 'text-gray-700'}`}>All Status</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus(filterStatus === '40' ? null : '40')}
            className={`px-3 py-1 rounded-full mr-2 ${filterStatus === '40' ? 'bg-yellow-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${filterStatus === '40' ? 'text-white' : 'text-gray-700'}`}>40</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus(filterStatus === '50' ? null : '50')}
            className={`px-3 py-1 rounded-full mr-2 ${filterStatus === '50' ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${filterStatus === '50' ? 'text-white' : 'text-gray-700'}`}>50</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus(filterStatus === '90' ? null : '90')}
            className={`px-3 py-1 rounded-full mr-2 ${filterStatus === '90' ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${filterStatus === '90' ? 'text-white' : 'text-gray-700'}`}>90</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Editing hint */}
      <View className="bg-blue-50 px-4 py-2 border-b border-blue-100">
        <Text className="text-xs text-blue-600">Tap any cell to edit. Tap row icon for full details.</Text>
      </View>

      {/* Table */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Table Header */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ minWidth: '100%' }}
        >
          <View style={{ minWidth: '100%' }}>
            <View className="flex-row bg-gray-800 py-2" style={{ minWidth: '100%' }}>
              <Text style={{ width: COLUMN_WIDTHS.detail, paddingHorizontal: 4 }} className="text-xs font-semibold text-white"></Text>
              <Text style={{ width: COLUMN_WIDTHS.pourDate, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Pour Date</Text>
              <Text style={{ width: COLUMN_WIDTHS.disposition, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Disposition</Text>
              <Text style={{ width: COLUMN_WIDTHS.status, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Status</Text>
              <Text style={{ width: COLUMN_WIDTHS.approvalDate, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Approval Date</Text>
              <Text style={{ width: COLUMN_WIDTHS.productType, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Type</Text>
              <Text style={{ width: COLUMN_WIDTHS.jobNumber, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Job #</Text>
              <Text style={{ width: COLUMN_WIDTHS.markNumber, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Mark #</Text>
              <Text style={{ width: COLUMN_WIDTHS.idNumber, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">ID #</Text>
              <Text style={{ width: COLUMN_WIDTHS.length, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Length</Text>
              <Text style={{ width: COLUMN_WIDTHS.width, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Width</Text>
              <Text style={{ width: COLUMN_WIDTHS.bed, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Bed</Text>
              <Text style={{ width: COLUMN_WIDTHS.location, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Location</Text>
              <Text style={{ width: COLUMN_WIDTHS.qualityComments, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Quality Comments</Text>
              <Text style={{ width: COLUMN_WIDTHS.engineer, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Engineer</Text>
              <Text style={{ width: COLUMN_WIDTHS.engineerFeedback, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Engineer Feedback</Text>
              <Text style={{ width: COLUMN_WIDTHS.issueCodes, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Issue Codes</Text>
              <Text style={{ width: COLUMN_WIDTHS.rejectCodes, paddingHorizontal: 8 }} className="text-xs font-semibold text-white">Reject Codes</Text>
            </View>

            {/* Table Rows */}
            {sortedEntries.length === 0 ? (
              <View className="py-12 px-4" style={{ minWidth: '100%' }}>
                <Text className="text-gray-500 text-center">
                  {searchQuery || filterBed || filterStatus
                    ? 'No entries match your filters'
                    : 'No entries yet. Tap + to import a schedule.'}
                </Text>
              </View>
            ) : (
              sortedEntries.map((entry, index) => (
                <View
                  key={entry.id}
                  className="flex-row border-b border-gray-200"
                  style={{ backgroundColor: '#FFFFFF', minWidth: '100%' }}
                >
                  {/* Detail button */}
                  <Pressable
                    onPress={() => navigation.navigate('QualityLogDetail' as any, { entryId: entry.id })}
                    style={{ width: COLUMN_WIDTHS.detail, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="open-outline" size={14} color="#6B7280" />
                  </Pressable>

                  {/* Editable cells - New column order */}
                  {renderEditableTextCell(entry, 'pourDate', entry.pourDate, COLUMN_WIDTHS.pourDate)}
                  {renderPickerCell(entry, 'disposition', entry.disposition || 'Scheduled', COLUMN_WIDTHS.disposition)}
                  <Text style={{ width: COLUMN_WIDTHS.status, paddingHorizontal: 8, paddingVertical: 12, backgroundColor: getStatusColor(entry) }} className="text-xs font-bold text-gray-900">
                    {entry.status || '40'}
                  </Text>
                  <Text style={{ width: COLUMN_WIDTHS.approvalDate, paddingHorizontal: 8, paddingVertical: 12 }} className="text-xs text-gray-900">
                    {entry.approvalRejectionDate || '-'}
                  </Text>
                  {renderPickerCell(entry, 'productType', entry.productType, COLUMN_WIDTHS.productType)}
                  {renderEditableTextCell(entry, 'jobNumber', entry.jobNumber, COLUMN_WIDTHS.jobNumber)}
                  {renderEditableTextCell(entry, 'markNumber', entry.markNumber, COLUMN_WIDTHS.markNumber)}
                  {renderEditableTextCell(entry, 'idNumber', entry.idNumber, COLUMN_WIDTHS.idNumber)}
                  {renderEditableTextCell(entry, 'length', entry.length, COLUMN_WIDTHS.length)}
                  {renderEditableTextCell(entry, 'width', entry.width ? `${entry.width}` : '', COLUMN_WIDTHS.width)}
                  {renderPickerCell(entry, 'bed', entry.bed, COLUMN_WIDTHS.bed)}
                  {renderEditableTextCell(entry, 'location', entry.location, COLUMN_WIDTHS.location)}
                  {renderEditableTextCell(entry, 'qualityComments', entry.qualityComments, COLUMN_WIDTHS.qualityComments)}
                  {renderEditableTextCell(entry, 'engineer', entry.engineer, COLUMN_WIDTHS.engineer)}
                  {renderEditableTextCell(entry, 'engineerFeedback', entry.engineerFeedback, COLUMN_WIDTHS.engineerFeedback)}
                  <Pressable
                    onPress={() => openCodesPicker(entry.id, 'issueCodes', entry.issueCodes)}
                    style={{ width: COLUMN_WIDTHS.issueCodes, paddingHorizontal: 8, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text className="text-xs text-gray-900 flex-1" numberOfLines={1}>
                      {entry.issueCodes.length > 0 ? entry.issueCodes.join(', ') : '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
                  </Pressable>
                  <Pressable
                    onPress={() => openCodesPicker(entry.id, 'rejectCodes', entry.rejectCodes)}
                    style={{ width: COLUMN_WIDTHS.rejectCodes, paddingHorizontal: 8, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text className="text-xs text-gray-900 flex-1" numberOfLines={1}>
                      {entry.rejectCodes.length > 0 ? entry.rejectCodes.join(', ') : '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Picker Modal */}
      <Modal visible={!!showPickerModal} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => {
            if (isMultiSelect) {
              saveMultiSelectCodes();
            } else {
              setShowPickerModal(null);
            }
          }}
        >
          <Pressable className="bg-white rounded-t-2xl p-4 max-h-[70%]" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold flex-1 text-center">{getPickerTitle()}</Text>
              {isMultiSelect && (
                <Pressable
                  onPress={saveMultiSelectCodes}
                  className="bg-blue-600 px-4 py-2 rounded-lg absolute right-0"
                >
                  <Text className="text-white font-semibold">Done</Text>
                </Pressable>
              )}
            </View>
            {isMultiSelect && selectedCodes.length > 0 && (
              <View className="mb-3 pb-3 border-b border-gray-200">
                <Text className="text-xs text-gray-500 mb-1">Selected: {selectedCodes.sort((a, b) => Number(a) - Number(b)).join(', ')}</Text>
              </View>
            )}
            <ScrollView className="max-h-80">
              <View className="flex-row flex-wrap">
                {getPickerOptions().map((option) => {
                  const isSelected = isMultiSelect && selectedCodes.includes(option);
                  return (
                    <Pressable
                      key={option}
                      onPress={() => handlePickerSelect(option)}
                      className={`py-2 px-3 m-1 rounded-lg ${
                        isSelected
                          ? 'bg-blue-600'
                          : isMultiSelect
                          ? 'bg-gray-100'
                          : 'border-b border-gray-100'
                      }`}
                      style={!isMultiSelect ? { width: '100%', marginHorizontal: 0 } : {}}
                    >
                      <Text
                        className={`text-center text-base ${isSelected ? 'text-white' : 'text-gray-900'}`}
                      >
                        {showPickerModal?.field === 'bed' ? `Bed ${option}` : option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable
              onPress={() => {
                setShowPickerModal(null);
                setSelectedCodes([]);
              }}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
