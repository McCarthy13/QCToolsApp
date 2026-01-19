import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { useAuthStore } from '../state/authStore';
import { useStrandPatternStore } from '../state/strandPatternStore';
import {
  QualityLogEntry,
  getStatusFromDisposition,
  DISPOSITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  BED_OPTIONS,
  ISSUE_CODE_OPTIONS,
  REJECT_CODE_OPTIONS,
  STATUS_OPTIONS,
  isValidLocation,
  Disposition,
  ProductType,
  BedNumber,
} from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogDashboard'>;

// Column filter types
type ColumnFilterType = 'pourDate' | 'disposition' | 'status' | 'approvalDate' | 'productType' |
  'jobNumber' | 'markNumber' | 'idNumber' | 'length' | 'width' | 'designStrandPattern' | 'castStrandPattern' | 'bed' | 'location' |
  'qualityComments' | 'engineer' | 'engineerFeedback' | 'issueCodes' | 'rejectCodes';

interface ColumnFilters {
  pourDate: string;
  disposition: string;
  status: string;
  approvalDate: string;
  productType: string;
  jobNumber: string;
  markNumber: string;
  idNumber: string;
  length: string;
  width: string;
  designStrandPattern: string;
  castStrandPattern: string;
  bed: string;
  location: string;
  qualityComments: string;
  engineer: string;
  engineerFeedback: string;
  issueCodes: string;
  rejectCodes: string;
}

export default function QualityLogDashboardScreen({ navigation }: Props) {
  const entries = useQualityLogStore((s) => s.entries);
  const initialize = useQualityLogStore((s) => s.initialize);
  const setDisposition = useQualityLogStore((s) => s.setDisposition);
  const updateEntry = useQualityLogStore((s) => s.updateEntry);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const customPatterns = useStrandPatternStore((s) => s.customPatterns);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    pourDate: '',
    disposition: '',
    status: '',
    approvalDate: '',
    productType: '',
    jobNumber: '',
    markNumber: '',
    idNumber: '',
    length: '',
    width: '',
    designStrandPattern: '',
    castStrandPattern: '',
    bed: '',
    location: '',
    qualityComments: '',
    engineer: '',
    engineerFeedback: '',
    issueCodes: '',
    rejectCodes: '',
  });

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState<ColumnFilterType | null>(null);
  const [filterInputValue, setFilterInputValue] = useState('');

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPickerModal, setShowPickerModal] = useState<{
    entryId: string;
    field: 'disposition' | 'productType' | 'bed' | 'castStrandPattern' | 'issueCodes' | 'rejectCodes';
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

  // Filter entries based on search and column filters
  const filteredEntries = entries.filter((entry) => {
    // Global search filter
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

    // Column filters
    if (columnFilters.pourDate && !entry.pourDate?.toLowerCase().includes(columnFilters.pourDate.toLowerCase())) return false;
    if (columnFilters.disposition && entry.disposition !== columnFilters.disposition) return false;
    if (columnFilters.status && entry.status !== columnFilters.status) return false;
    if (columnFilters.approvalDate && !entry.approvalRejectionDate?.toLowerCase().includes(columnFilters.approvalDate.toLowerCase())) return false;
    if (columnFilters.productType && entry.productType !== columnFilters.productType) return false;
    if (columnFilters.jobNumber && !entry.jobNumber?.toLowerCase().includes(columnFilters.jobNumber.toLowerCase())) return false;
    if (columnFilters.markNumber && !entry.markNumber?.toLowerCase().includes(columnFilters.markNumber.toLowerCase())) return false;
    if (columnFilters.idNumber && !entry.idNumber?.toLowerCase().includes(columnFilters.idNumber.toLowerCase())) return false;
    if (columnFilters.length && !entry.length?.toLowerCase().includes(columnFilters.length.toLowerCase())) return false;
    if (columnFilters.width && entry.width?.toString() !== columnFilters.width) return false;
    if (columnFilters.designStrandPattern && !entry.designStrandPattern?.toLowerCase().includes(columnFilters.designStrandPattern.toLowerCase())) return false;
    if (columnFilters.castStrandPattern && !entry.castStrandPattern?.toLowerCase().includes(columnFilters.castStrandPattern.toLowerCase())) return false;
    if (columnFilters.bed && entry.bed !== columnFilters.bed) return false;
    if (columnFilters.location && !entry.location?.toLowerCase().includes(columnFilters.location.toLowerCase())) return false;
    if (columnFilters.qualityComments && !entry.qualityComments?.toLowerCase().includes(columnFilters.qualityComments.toLowerCase())) return false;
    if (columnFilters.engineer && !entry.engineer?.toLowerCase().includes(columnFilters.engineer.toLowerCase())) return false;
    if (columnFilters.engineerFeedback && !entry.engineerFeedback?.toLowerCase().includes(columnFilters.engineerFeedback.toLowerCase())) return false;
    if (columnFilters.issueCodes && !entry.issueCodes.some(code => code.includes(columnFilters.issueCodes))) return false;
    if (columnFilters.rejectCodes && !entry.rejectCodes.some(code => code.includes(columnFilters.rejectCodes))) return false;

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

  // Upload photo to Firebase Storage
  const uploadPhoto = async (uri: string, entryId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `quality-log-photos/${entryId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  // Handle taking a photo with camera
  const handleTakePhoto = async (entry: QualityLogEntry) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      try {
        const downloadUrl = await uploadPhoto(result.assets[0].uri, entry.id);
        const existingPhotos = entry.photoUrls || [];
        await updateEntry(entry.id, { photoUrls: [...existingPhotos, downloadUrl] });
        Alert.alert('Success', 'Photo added successfully');
      } catch (error) {
        console.error('Error uploading photo:', error);
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  // Handle selecting photo from gallery
  const handleSelectFromGallery = async (entry: QualityLogEntry) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      try {
        const existingPhotos = entry.photoUrls || [];
        const uploadPromises = result.assets.map(asset => uploadPhoto(asset.uri, entry.id));
        const downloadUrls = await Promise.all(uploadPromises);
        await updateEntry(entry.id, { photoUrls: [...existingPhotos, ...downloadUrls] });
        Alert.alert('Success', `${downloadUrls.length} photo(s) added successfully`);
      } catch (error) {
        console.error('Error uploading photos:', error);
        Alert.alert('Error', 'Failed to upload photos');
      }
    }
  };

  // Parse length string to number (e.g., "24'-3.75\"" -> 24.3125)
  const parseLengthToFeet = (lengthStr: string | undefined): number | undefined => {
    if (!lengthStr) return undefined;
    const match = lengthStr.match(/(\d+)'[-\s]*(\d+(?:\.\d+)?)"?/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseFloat(match[2]);
      return feet + (inches / 12);
    }
    return undefined;
  };

  // Convert feet to total inches for span (ProductDetails expects inches)
  const convertLengthToInches = (lengthStr: string | undefined): number | undefined => {
    const feet = parseLengthToFeet(lengthStr);
    if (feet === undefined) return undefined;
    return feet * 12;
  };

  // Navigate to Product Details (Slippage Identifier entry point) with pre-filled data
  const handleOpenSlippageIdentifier = (entry: QualityLogEntry) => {
    navigation.navigate('ProductDetails', {
      prefillData: {
        projectNumber: entry.jobNumber,
        markNumber: entry.markNumber,
        idNumber: entry.idNumber,
        span: convertLengthToInches(entry.length),
        pourDate: entry.pourDate,
        productType: entry.productType,
        productWidth: entry.width,
      },
      fromQualityLog: true,
      qualityEntryId: entry.id,
    });
  };

  // Column width definitions (in pixels) for consistent alignment
  const COLUMN_WIDTHS = {
    detail: 28,
    actions: 90, // Camera, gallery, slippage buttons
    pourDate: 78,
    disposition: 85,
    status: 48,
    approvalDate: 85,
    productType: 50,
    jobNumber: 62,
    markNumber: 72,
    pieceTicket: 28,
    idNumber: 72,
    length: 72,
    width: 48,
    designStrandPattern: 70,
    castStrandPattern: 70,
    bed: 40,
    location: 58,
    qualityComments: 140,
    engineer: 80,
    engineerFeedback: 140,
    issueCodes: 80,
    rejectCodes: 80,
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
        <View style={{ width, paddingHorizontal: 6, paddingVertical: 4 }}>
          <TextInput
            value={editValue}
            onChangeText={setEditValue}
            onBlur={saveEdit}
            onSubmitEditing={saveEdit}
            autoFocus
            className="text-sm bg-blue-50 border border-blue-300 rounded px-1 py-1 text-gray-900"
            style={{ minHeight: 24 }}
          />
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => startEditing(entry.id, field, value)}
        style={{ width, paddingHorizontal: 6, paddingVertical: 10 }}
      >
        <Text className="text-sm text-gray-900" numberOfLines={2}>{displayValue}</Text>
      </Pressable>
    );
  };

  // Render a picker cell (disposition, product type, bed, castStrandPattern)
  const renderPickerCell = (
    entry: QualityLogEntry,
    field: 'disposition' | 'productType' | 'bed' | 'castStrandPattern',
    value: string | undefined,
    width: number
  ) => {
    const displayValue = field === 'bed' && value ? `${value}` : value || '-';

    return (
      <Pressable
        onPress={() => setShowPickerModal({ entryId: entry.id, field })}
        style={{ width, paddingHorizontal: 6, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text className="text-sm text-gray-900 flex-1" numberOfLines={1}>{displayValue}</Text>
        <Ionicons name="chevron-down" size={10} color="#9CA3AF" />
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
      case 'castStrandPattern':
        // Return unique strand pattern IDs from customPatterns
        return [...new Set(customPatterns.map(p => p.patternId))].sort();
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
      case 'castStrandPattern':
        return 'Select Cast Strand Pattern';
      case 'issueCodes':
        return 'Select Issue Codes (tap to toggle)';
      case 'rejectCodes':
        return 'Select Reject Codes (tap to toggle)';
      default:
        return '';
    }
  };

  const isMultiSelect = showPickerModal?.field === 'issueCodes' || showPickerModal?.field === 'rejectCodes';

  // Get filter options for dropdown columns
  const getFilterOptions = (column: ColumnFilterType): string[] => {
    switch (column) {
      case 'disposition':
        return ['', ...DISPOSITION_OPTIONS];
      case 'status':
        return ['', ...STATUS_OPTIONS];
      case 'productType':
        return ['', ...PRODUCT_TYPE_OPTIONS];
      case 'bed':
        return ['', ...BED_OPTIONS];
      default:
        return [];
    }
  };

  // Check if column uses dropdown filter
  const isDropdownFilter = (column: ColumnFilterType): boolean => {
    return ['disposition', 'status', 'productType', 'bed'].includes(column);
  };

  // Open filter modal
  const openFilterModal = (column: ColumnFilterType) => {
    setFilterInputValue(columnFilters[column]);
    setShowFilterModal(column);
  };

  // Apply filter
  const applyFilter = (value: string) => {
    if (showFilterModal) {
      setColumnFilters(prev => ({ ...prev, [showFilterModal]: value }));
    }
    setShowFilterModal(null);
    setFilterInputValue('');
  };

  // Render filterable header cell
  const renderFilterableHeader = (column: ColumnFilterType, label: string, width: number) => {
    const hasFilter = columnFilters[column] !== '';
    return (
      <Pressable
        onPress={() => openFilterModal(column)}
        style={{ width, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text className="text-xs font-semibold text-white flex-1" style={{ flexWrap: 'wrap' }}>{label}</Text>
        <Ionicons
          name={hasFilter ? 'funnel' : 'funnel-outline'}
          size={10}
          color={hasFilter ? '#60a5fa' : '#9CA3AF'}
        />
      </Pressable>
    );
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

      {/* Active Filters Row */}
      {Object.values(columnFilters).some(v => v !== '') && (
        <View className="bg-white px-4 py-2 border-b border-gray-200">
          <View className="flex-row items-center flex-wrap gap-2">
            <Text className="text-xs text-gray-500 mr-1">Filters:</Text>
            {Object.entries(columnFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <Pressable
                  key={key}
                  onPress={() => setColumnFilters(prev => ({ ...prev, [key]: '' }))}
                  className="flex-row items-center bg-blue-100 rounded-full px-2 py-1"
                >
                  <Text className="text-xs text-blue-800 mr-1">{key}: {value}</Text>
                  <Ionicons name="close-circle" size={14} color="#1e40af" />
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setColumnFilters({
                pourDate: '', disposition: '', status: '', approvalDate: '', productType: '',
                jobNumber: '', markNumber: '', idNumber: '', length: '', width: '',
                designStrandPattern: '', castStrandPattern: '', bed: '',
                location: '', qualityComments: '', engineer: '', engineerFeedback: '',
                issueCodes: '', rejectCodes: '',
              })}
              className="ml-2"
            >
              <Text className="text-xs text-red-600">Clear All</Text>
            </Pressable>
          </View>
        </View>
      )}

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
            <View className="flex-row bg-gray-800 py-2 items-center" style={{ minWidth: '100%' }}>
              <Text style={{ width: COLUMN_WIDTHS.detail, paddingHorizontal: 4, paddingVertical: 4 }} className="text-xs font-semibold text-white"></Text>
              <Text style={{ width: COLUMN_WIDTHS.actions, paddingHorizontal: 8, paddingVertical: 4 }} className="text-xs font-semibold text-white">Actions</Text>
              {renderFilterableHeader('pourDate', 'Pour Date', COLUMN_WIDTHS.pourDate)}
              {renderFilterableHeader('disposition', 'Disposition', COLUMN_WIDTHS.disposition)}
              {renderFilterableHeader('status', 'Status', COLUMN_WIDTHS.status)}
              {renderFilterableHeader('approvalDate', 'Approval Date', COLUMN_WIDTHS.approvalDate)}
              {renderFilterableHeader('productType', 'Type', COLUMN_WIDTHS.productType)}
              {renderFilterableHeader('jobNumber', 'Job #', COLUMN_WIDTHS.jobNumber)}
              {renderFilterableHeader('markNumber', 'Mark #', COLUMN_WIDTHS.markNumber)}
              <Text style={{ width: COLUMN_WIDTHS.pieceTicket, paddingHorizontal: 4, paddingVertical: 4 }} className="text-xs font-semibold text-white"></Text>
              {renderFilterableHeader('idNumber', 'ID #', COLUMN_WIDTHS.idNumber)}
              {renderFilterableHeader('length', 'Length', COLUMN_WIDTHS.length)}
              {renderFilterableHeader('width', 'Width', COLUMN_WIDTHS.width)}
              {renderFilterableHeader('designStrandPattern', 'Design Strand Pattern', COLUMN_WIDTHS.designStrandPattern)}
              {renderFilterableHeader('castStrandPattern', 'Cast Strand Pattern', COLUMN_WIDTHS.castStrandPattern)}
              {renderFilterableHeader('bed', 'Bed', COLUMN_WIDTHS.bed)}
              {renderFilterableHeader('location', 'Location', COLUMN_WIDTHS.location)}
              {renderFilterableHeader('qualityComments', 'Quality Comments', COLUMN_WIDTHS.qualityComments)}
              {renderFilterableHeader('engineer', 'Engineer', COLUMN_WIDTHS.engineer)}
              {renderFilterableHeader('engineerFeedback', 'Engineer Feedback', COLUMN_WIDTHS.engineerFeedback)}
              {renderFilterableHeader('issueCodes', 'Issue Codes', COLUMN_WIDTHS.issueCodes)}
              {renderFilterableHeader('rejectCodes', 'Reject Codes', COLUMN_WIDTHS.rejectCodes)}
            </View>

            {/* Table Rows */}
            {sortedEntries.length === 0 ? (
              <View className="py-12 px-4" style={{ minWidth: '100%' }}>
                <Text className="text-gray-500 text-center">
                  {searchQuery || Object.values(columnFilters).some(v => v !== '')
                    ? 'No entries match your filters'
                    : 'No entries yet. Tap + to import a schedule.'}
                </Text>
              </View>
            ) : (
              sortedEntries.map((entry, index) => (
                <View
                  key={entry.id}
                  className="flex-row border-b border-gray-200"
                  style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F3F4F6', minWidth: '100%' }}
                >
                  {/* Detail button */}
                  <Pressable
                    onPress={() => navigation.navigate('QualityLogDetail' as any, { entryId: entry.id })}
                    style={{ width: COLUMN_WIDTHS.detail, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="open-outline" size={14} color="#6B7280" />
                  </Pressable>

                  {/* Action buttons - Camera, Gallery, Slippage */}
                  <View style={{ width: COLUMN_WIDTHS.actions, paddingHorizontal: 4, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
                    <Pressable
                      onPress={() => handleTakePhoto(entry)}
                      className="bg-blue-100 rounded-full p-1.5 active:bg-blue-200"
                    >
                      <Ionicons name="camera" size={16} color="#2563EB" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleSelectFromGallery(entry)}
                      className="bg-green-100 rounded-full p-1.5 active:bg-green-200"
                    >
                      <Ionicons name="images" size={16} color="#16A34A" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenSlippageIdentifier(entry)}
                      className="bg-purple-100 rounded-full p-1.5 active:bg-purple-200"
                    >
                      <Ionicons name="git-compare" size={16} color="#9333EA" />
                    </Pressable>
                  </View>

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
                  {/* Piece Ticket PDF Icon */}
                  <Pressable
                    onPress={() => {
                      if (entry.pieceTicketUrl) {
                        Linking.openURL(entry.pieceTicketUrl);
                      }
                    }}
                    style={{ width: COLUMN_WIDTHS.pieceTicket, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
                    disabled={!entry.pieceTicketUrl}
                  >
                    {entry.pieceTicketUrl ? (
                      <Ionicons name="document-text" size={16} color="#3B82F6" />
                    ) : (
                      <View style={{ width: 16, height: 16 }} />
                    )}
                  </Pressable>
                  {renderEditableTextCell(entry, 'idNumber', entry.idNumber, COLUMN_WIDTHS.idNumber)}
                  {renderEditableTextCell(entry, 'length', entry.length, COLUMN_WIDTHS.length)}
                  {renderEditableTextCell(entry, 'width', entry.width ? `${entry.width}` : '', COLUMN_WIDTHS.width)}
                  {renderEditableTextCell(entry, 'designStrandPattern', entry.designStrandPattern, COLUMN_WIDTHS.designStrandPattern)}
                  {renderPickerCell(entry, 'castStrandPattern', entry.castStrandPattern, COLUMN_WIDTHS.castStrandPattern)}
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

      {/* Column Filter Modal */}
      <Modal visible={!!showFilterModal} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => {
            setShowFilterModal(null);
            setFilterInputValue('');
          }}
        >
          <Pressable className="bg-white rounded-t-2xl p-4" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-semibold text-center mb-4">
              Filter by {showFilterModal?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Text>

            {showFilterModal && isDropdownFilter(showFilterModal) ? (
              // Dropdown filter for predefined options
              <ScrollView className="max-h-80">
                {getFilterOptions(showFilterModal).map((option) => (
                  <Pressable
                    key={option || 'all'}
                    onPress={() => applyFilter(option)}
                    className={`py-3 px-4 border-b border-gray-100 ${
                      columnFilters[showFilterModal] === option ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Text className={`text-base ${
                      columnFilters[showFilterModal] === option ? 'text-blue-600 font-semibold' : 'text-gray-900'
                    }`}>
                      {option || 'All (No Filter)'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              // Text input filter for free-text columns
              <View>
                <TextInput
                  value={filterInputValue}
                  onChangeText={setFilterInputValue}
                  placeholder="Enter filter value..."
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 mb-4"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => applyFilter('')}
                    className="flex-1 py-3 bg-gray-200 rounded-lg"
                  >
                    <Text className="text-center text-base text-gray-700">Clear</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => applyFilter(filterInputValue)}
                    className="flex-1 py-3 bg-blue-600 rounded-lg"
                  >
                    <Text className="text-center text-base text-white font-semibold">Apply</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable
              onPress={() => {
                setShowFilterModal(null);
                setFilterInputValue('');
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
