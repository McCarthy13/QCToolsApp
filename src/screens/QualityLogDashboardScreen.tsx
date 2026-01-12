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
    field: 'disposition' | 'productType' | 'bed';
  } | null>(null);

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

  const getRowColor = (entry: QualityLogEntry): string => {
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

  // Render an editable text cell
  const renderEditableTextCell = (
    entry: QualityLogEntry,
    field: string,
    value: string | number | undefined,
    widthClass: string
  ) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell?.field === field;
    const displayValue = value ?? '-';

    if (isEditing) {
      return (
        <View className={`${widthClass} px-2 py-1`}>
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
        className={`${widthClass} px-2 py-3`}
      >
        <Text className="text-xs text-gray-900">{displayValue}</Text>
      </Pressable>
    );
  };

  // Render a picker cell (disposition, product type, bed)
  const renderPickerCell = (
    entry: QualityLogEntry,
    field: 'disposition' | 'productType' | 'bed',
    value: string | undefined,
    widthClass: string
  ) => {
    const displayValue = field === 'bed' && value ? `${value}` : value || '-';

    return (
      <Pressable
        onPress={() => setShowPickerModal({ entryId: entry.id, field })}
        className={`${widthClass} px-2 py-3 flex-row items-center`}
      >
        <Text className="text-xs text-gray-900 flex-1">{displayValue}</Text>
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
      default:
        return '';
    }
  };

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
              <Text className="w-8 px-1 text-xs font-semibold text-white"></Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Pour Date</Text>
              <Text className="w-20 px-2 text-xs font-semibold text-white">Status</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Disposition</Text>
              <Text className="w-16 px-2 text-xs font-semibold text-white">Type</Text>
              <Text className="w-20 px-2 text-xs font-semibold text-white">Job #</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Mark #</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">ID #</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Length</Text>
              <Text className="w-16 px-2 text-xs font-semibold text-white">Width</Text>
              <Text className="w-12 px-2 text-xs font-semibold text-white">Bed</Text>
              <Text className="w-32 px-2 text-xs font-semibold text-white">Engineer</Text>
              <Text className="w-48 px-2 text-xs font-semibold text-white">Comments</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Issue Codes</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Reject Codes</Text>
              <Text className="flex-1 min-w-[112px] px-2 text-xs font-semibold text-white">Approval Date</Text>
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
                  style={{ backgroundColor: getRowColor(entry), minWidth: '100%' }}
                >
                  {/* Detail button */}
                  <Pressable
                    onPress={() => navigation.navigate('QualityLogDetail' as any, { entryId: entry.id })}
                    className="w-8 px-1 py-3 items-center justify-center"
                  >
                    <Ionicons name="open-outline" size={14} color="#6B7280" />
                  </Pressable>

                  {/* Editable cells */}
                  {renderEditableTextCell(entry, 'pourDate', entry.pourDate, 'w-24')}
                  <Text className="w-20 px-2 py-3 text-xs font-bold text-gray-900">
                    {entry.status || '-'}
                  </Text>
                  {renderPickerCell(entry, 'disposition', entry.disposition, 'w-24')}
                  {renderPickerCell(entry, 'productType', entry.productType, 'w-16')}
                  {renderEditableTextCell(entry, 'jobNumber', entry.jobNumber, 'w-20')}
                  {renderEditableTextCell(entry, 'markNumber', entry.markNumber, 'w-24')}
                  {renderEditableTextCell(entry, 'idNumber', entry.idNumber, 'w-24')}
                  {renderEditableTextCell(entry, 'length', entry.length, 'w-24')}
                  {renderEditableTextCell(entry, 'width', entry.width ? `${entry.width}` : '', 'w-16')}
                  {renderPickerCell(entry, 'bed', entry.bed, 'w-12')}
                  {renderEditableTextCell(entry, 'engineer', entry.engineer, 'w-32')}
                  {renderEditableTextCell(entry, 'qualityComments', entry.qualityComments, 'w-48')}
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">
                    {entry.issueCodes.length > 0 ? entry.issueCodes.join(', ') : '-'}
                  </Text>
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">
                    {entry.rejectCodes.length > 0 ? entry.rejectCodes.join(', ') : '-'}
                  </Text>
                  <Text className="flex-1 min-w-[112px] px-2 py-3 text-xs text-gray-900">
                    {entry.approvalRejectionDate || '-'}
                  </Text>
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
          onPress={() => setShowPickerModal(null)}
        >
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-lg font-semibold text-center mb-4">{getPickerTitle()}</Text>
            {getPickerOptions().map((option) => (
              <Pressable
                key={option}
                onPress={() => handlePickerSelect(option)}
                className="py-3 border-b border-gray-100 active:bg-gray-50"
              >
                <Text className="text-center text-base text-gray-900">
                  {showPickerModal?.field === 'bed' ? `Bed ${option}` : option}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowPickerModal(null)} className="py-3 mt-2">
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
