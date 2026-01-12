import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import {
  QualityLogEntry,
  ProductType,
  BedNumber,
  BED_OPTIONS,
} from '../types/quality-log';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogImport'>;

// All product type options for selection
const ALL_PRODUCT_TYPES: ProductType[] = ['8048', '1047', '1247', '1250', '1647', '1648'];

interface ExtractedEntry {
  pourDate: string;
  jobNumber: string;
  markNumber: string;
  idNumber: string;
  length: string;
  width: number;
  thickness: number;
  bed?: BedNumber;
}

interface ParsedScheduleResult {
  success: boolean;
  entries: ExtractedEntry[];
  pourDate: string;
  bed?: string;
  thickness?: number;
  error?: string;
}

export default function QualityLogImportScreen({ navigation }: Props) {
  const addEntries = useQualityLogStore((s) => s.addEntries);
  const getEntryByIdNumber = useQualityLogStore((s) => s.getEntryByIdNumber);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [pourDate, setPourDate] = useState<string>('');
  const [selectedBed, setSelectedBed] = useState<BedNumber | undefined>();

  // Selection flow state
  const [showBedPrompt, setShowBedPrompt] = useState(false);
  const [showProductTypePrompt, setShowProductTypePrompt] = useState(false);
  const [showMissingValuesPrompt, setShowMissingValuesPrompt] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | 'Mixed' | null>(null);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);

  // Editing state
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Calculate missing values
  const missingValuesInfo = useMemo(() => {
    const missing: { field: string; count: number; indices: number[] }[] = [];

    const fieldsToCheck = [
      { key: 'jobNumber', label: 'Job #' },
      { key: 'markNumber', label: 'Mark #' },
      { key: 'idNumber', label: 'ID #' },
      { key: 'length', label: 'Length' },
      { key: 'width', label: 'Width' },
      { key: 'thickness', label: 'Thickness' },
    ];

    for (const field of fieldsToCheck) {
      const indices: number[] = [];
      extractedEntries.forEach((entry, idx) => {
        const value = entry[field.key as keyof ExtractedEntry];
        if (value === undefined || value === null || value === '' || value === 0) {
          indices.push(idx);
        }
      });
      if (indices.length > 0) {
        missing.push({ field: field.label, count: indices.length, indices });
      }
    }

    return missing;
  }, [extractedEntries]);

  const handlePickDocument = async () => {
    console.log('[QualityLogImport] handlePickDocument called');
    try {
      console.log('[QualityLogImport] Opening document picker...');

      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        console.log('[QualityLogImport] Picker returned');
      } catch (pickerError: any) {
        console.log('[QualityLogImport] Picker threw error:', pickerError?.message || pickerError);
        Alert.alert('Picker Error', `Document picker failed: ${pickerError?.message || 'Unknown error'}`);
        return;
      }

      console.log('[QualityLogImport] Picker result type:', typeof result);
      console.log('[QualityLogImport] Picker result canceled:', result?.canceled);
      console.log('[QualityLogImport] Picker result assets:', result?.assets?.length);
      console.log('[QualityLogImport] Picker result full:', JSON.stringify(result, null, 2));

      if (result.canceled) {
        console.log('[QualityLogImport] User canceled picker');
        return;
      }

      const file = result.assets?.[0];
      if (!file) {
        console.log('[QualityLogImport] No file in assets');
        Alert.alert('Error', 'No file was selected. Please try again.');
        return;
      }

      console.log('[QualityLogImport] Selected file:', {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });

      setIsLoading(true);
      setLoadingMessage('Reading file...');

      // Read file as base64
      console.log('[QualityLogImport] Reading file as base64...');
      let base64;
      try {
        // On web, we need to fetch the blob and convert it manually
        // expo-file-system doesn't work with blob URLs on web
        if (Platform.OS === 'web') {
          console.log('[QualityLogImport] Using web-specific file reading...');
          const response = await fetch(file.uri);
          const blob = await response.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });
          console.log('[QualityLogImport] Web file read successfully, base64 length:', base64.length);
        } else {
          base64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('[QualityLogImport] File read successfully, base64 length:', base64.length);
        }
      } catch (fileError: any) {
        console.log('[QualityLogImport] File read error:', fileError?.message || fileError);
        Alert.alert('File Read Error', `Could not read file: ${fileError?.message || 'Unknown error'}`);
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Extracting data from schedule...');

      // Call Cloud Function to parse the PDF/image
      console.log('[QualityLogImport] Calling parseSchedulePDF Cloud Function...');
      console.log('[QualityLogImport] File size (base64 length):', base64.length);

      try {
        const functions = getFunctions(app);
        const parseSchedule = httpsCallable<
          { fileBase64: string; fileName: string; mimeType: string },
          ParsedScheduleResult
        >(functions, 'parseSchedulePDF');

        console.log('[QualityLogImport] Sending request to Cloud Function...');
        const response = await parseSchedule({
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.mimeType || 'application/pdf',
        });
        console.log('[QualityLogImport] Cloud Function response received:', JSON.stringify(response.data, null, 2));

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to parse schedule');
        }

        const { entries, pourDate: extractedPourDate } = response.data;

        if (entries.length === 0) {
          Alert.alert('No Data Found', 'Could not extract any entries from the schedule. Please try a clearer scan.');
          setIsLoading(false);
          return;
        }

        setExtractedEntries(entries);
        setPourDate(extractedPourDate);

        // Check for duplicate IDs
        const duplicates = entries
          .map((e) => e.idNumber)
          .filter((id) => getEntryByIdNumber(id) !== undefined);
        setDuplicateIds(duplicates);

        setIsLoading(false);

        // Start the selection flow - first ask for bed number
        setShowBedPrompt(true);

      } catch (cloudFunctionError: any) {
        console.error('[QualityLogImport] Cloud Function error:', cloudFunctionError);
        console.error('[QualityLogImport] Error code:', cloudFunctionError?.code);
        console.error('[QualityLogImport] Error message:', cloudFunctionError?.message);
        console.error('[QualityLogImport] Error details:', cloudFunctionError?.details);
        setIsLoading(false);
        Alert.alert(
          'Import Error',
          `Failed to process schedule: ${cloudFunctionError?.message || 'Unknown error'}. Please try again.`
        );
        return;
      }
    } catch (error: any) {
      console.error('Error importing schedule:', error);
      setIsLoading(false);
      Alert.alert('Import Error', error.message || 'Failed to import schedule. Please try again.');
    }
  };

  const handleBedSelect = (bed: BedNumber) => {
    setSelectedBed(bed);
    setShowBedPrompt(false);
    // Next, ask for product type
    setShowProductTypePrompt(true);
  };

  const handleProductTypeSelect = (type: ProductType | 'Mixed') => {
    setShowProductTypePrompt(false);
    setSelectedProductType(type);

    // Check if there are missing values - if so, show warning
    if (missingValuesInfo.length > 0) {
      setShowMissingValuesPrompt(true);
    } else {
      setShowReview(true);
    }
  };

  const handleMissingValuesAcknowledged = () => {
    setShowMissingValuesPrompt(false);
    setShowReview(true);
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Importing entries...');

      // Filter out duplicates
      const entriesToImport = extractedEntries.filter(
        (e) => !duplicateIds.includes(e.idNumber)
      );

      if (entriesToImport.length === 0) {
        Alert.alert('No New Entries', 'All entries already exist in the system.');
        setIsLoading(false);
        return;
      }

      // Create full entries with product type and bed
      // If "Mixed" was selected, don't set a product type (user will set individually)
      const fullEntries: Omit<QualityLogEntry, 'id' | 'importedAt' | 'updatedAt'>[] = entriesToImport.map((entry) => ({
        pourDate: pourDate || entry.pourDate,
        jobNumber: entry.jobNumber,
        markNumber: entry.markNumber,
        idNumber: entry.idNumber,
        length: entry.length,
        width: entry.width,
        thickness: entry.thickness,
        bed: selectedBed, // Use user-selected bed for all entries
        productType: selectedProductType === 'Mixed' ? undefined : (selectedProductType as ProductType) || undefined,
        issueCodes: [],
        rejectCodes: [],
        importedBy: '', // Will be set by store
      }));

      const importedIds = await addEntries(fullEntries);

      setIsLoading(false);

      Alert.alert(
        'Import Complete',
        `Successfully imported ${importedIds.length} entries.${
          duplicateIds.length > 0
            ? `\n\n${duplicateIds.length} duplicate entries were skipped.`
            : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving entries:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save entries. Please try again.');
    }
  };

  const resetImport = () => {
    setExtractedEntries([]);
    setPourDate('');
    setSelectedBed(undefined);
    setSelectedProductType(null);
    setShowReview(false);
    setShowBedPrompt(false);
    setShowProductTypePrompt(false);
    setShowMissingValuesPrompt(false);
    setDuplicateIds([]);
    setEditingCell(null);
    setEditValue('');
  };

  // Start editing a cell
  const startEditing = (index: number, field: string, currentValue: string | number) => {
    setEditingCell({ index, field });
    setEditValue(String(currentValue ?? ''));
  };

  // Save edited value
  const saveEdit = () => {
    if (!editingCell) return;

    const { index, field } = editingCell;
    const updatedEntries = [...extractedEntries];
    const entry = { ...updatedEntries[index] };

    // Update the field based on type
    if (field === 'width' || field === 'thickness') {
      entry[field] = parseFloat(editValue) || 0;
    } else {
      (entry as any)[field] = editValue;
    }

    updatedEntries[index] = entry;
    setExtractedEntries(updatedEntries);
    setEditingCell(null);
    setEditValue('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Render an editable cell
  const renderEditableCell = (
    index: number,
    field: string,
    value: string | number | undefined,
    className: string,
    isDuplicate: boolean
  ) => {
    const isEditing = editingCell?.index === index && editingCell?.field === field;
    const displayValue = value ?? '-';
    const isMissing = value === undefined || value === null || value === '' || value === 0;

    if (isEditing) {
      return (
        <View className={className}>
          <TextInput
            value={editValue}
            onChangeText={setEditValue}
            onBlur={saveEdit}
            onSubmitEditing={saveEdit}
            autoFocus
            className="text-xs bg-blue-50 border border-blue-300 rounded px-1 py-0.5 text-gray-900"
            style={{ minHeight: 20 }}
          />
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => !isDuplicate && startEditing(index, field, value ?? '')}
        className={className}
      >
        <Text
          className={`text-xs ${
            isDuplicate
              ? 'text-red-400'
              : isMissing
              ? 'text-orange-500 italic'
              : 'text-gray-900'
          }`}
        >
          {isMissing ? '(tap to edit)' : displayValue}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Import Schedule</Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">{loadingMessage}</Text>
        </View>
      )}

      {/* Initial State - Upload Button */}
      {!isLoading && !showReview && !showBedPrompt && !showProductTypePrompt && !showMissingValuesPrompt && (
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-8 shadow-sm items-center max-w-md w-full">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={40} color="#3B82F6" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
              Import Pour Schedule
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Upload a scanned PDF or photo of your pour schedule. The app will extract piece information automatically.
            </Text>
            <Pressable
              onPress={handlePickDocument}
              className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center active:bg-blue-700"
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">Select File</Text>
            </Pressable>
            <Text className="text-xs text-gray-400 mt-4 text-center">
              Supports PDF and image files (JPG, PNG)
            </Text>
          </View>
        </View>
      )}

      {/* Review State */}
      {!isLoading && showReview && (
        <ScrollView className="flex-1">
          {/* Summary Card */}
          <View className="bg-white rounded-xl p-4 mt-4 mx-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">Import Summary</Text>
            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Pour Date</Text>
                <Text className="text-base font-semibold text-gray-900">{pourDate || 'Unknown'}</Text>
              </View>
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Bed</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {selectedBed ? `Bed ${selectedBed}` : 'Not Set'}
                </Text>
              </View>
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Product Type</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {selectedProductType === 'Mixed' ? 'Mixed/Manual' : selectedProductType || 'Unknown'}
                </Text>
              </View>
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Entries</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {extractedEntries.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Entries Header */}
          <View className="px-4 mt-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">Extracted Entries</Text>
              <Text className="text-xs text-gray-500">Tap cells to edit</Text>
            </View>

            {duplicateIds.length > 0 && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={18} color="#D97706" />
                  <Text className="text-yellow-700 ml-2 font-medium">
                    {duplicateIds.length} duplicate(s) will be skipped
                  </Text>
                </View>
                <Text className="text-yellow-600 text-xs mt-1">
                  IDs: {duplicateIds.join(', ')}
                </Text>
              </View>
            )}

            {missingValuesInfo.length > 0 && (
              <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color="#EA580C" />
                  <Text className="text-orange-700 ml-2 font-medium">
                    Some values could not be extracted
                  </Text>
                </View>
                <Text className="text-orange-600 text-xs mt-1">
                  {missingValuesInfo.map((m) => `${m.field}: ${m.count}`).join(', ')}
                </Text>
              </View>
            )}
          </View>

          {/* Entry List Preview - Full width horizontal scrolling table */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ flex: 1, minWidth: '100%' }}>
              {/* Header Row */}
              <View className="flex-row bg-gray-800 py-2 px-2">
                <Text className="w-24 text-xs font-semibold text-white px-1">Pour Date</Text>
                <Text className="w-20 text-xs font-semibold text-white px-1">Job #</Text>
                <Text className="w-16 text-xs font-semibold text-white px-1">Mark #</Text>
                <Text className="w-24 text-xs font-semibold text-white px-1">ID #</Text>
                <Text className="w-24 text-xs font-semibold text-white px-1">Length</Text>
                <Text className="w-16 text-xs font-semibold text-white px-1">Width</Text>
                <Text className="w-16 text-xs font-semibold text-white px-1">Thk</Text>
                <Text className="flex-1 min-w-[48px] text-xs font-semibold text-white px-1">Bed</Text>
              </View>
              {/* Data Rows */}
              {extractedEntries.map((entry, index) => {
                const isDuplicate = duplicateIds.includes(entry.idNumber);
                return (
                  <View
                    key={entry.idNumber || index}
                    className={`flex-row py-2 px-2 border-b border-gray-200 ${
                      isDuplicate ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    {renderEditableCell(index, 'pourDate', pourDate || entry.pourDate, 'w-24 px-1', isDuplicate)}
                    {renderEditableCell(index, 'jobNumber', entry.jobNumber, 'w-20 px-1', isDuplicate)}
                    {renderEditableCell(index, 'markNumber', entry.markNumber, 'w-16 px-1', isDuplicate)}
                    {renderEditableCell(index, 'idNumber', entry.idNumber, 'w-24 px-1', isDuplicate)}
                    {renderEditableCell(index, 'length', entry.length, 'w-24 px-1', isDuplicate)}
                    {renderEditableCell(index, 'width', entry.width ? `${entry.width}` : '', 'w-16 px-1', isDuplicate)}
                    {renderEditableCell(index, 'thickness', entry.thickness ? `${entry.thickness}` : '', 'w-16 px-1', isDuplicate)}
                    <View className="flex-1 min-w-[48px] px-1">
                      <Text className={`text-xs ${isDuplicate ? 'text-red-400' : 'text-gray-600'}`}>
                        {selectedBed || '-'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6 mb-8 px-4">
            <Pressable
              onPress={resetImport}
              className="flex-1 bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleImport}
              disabled={extractedEntries.length - duplicateIds.length === 0}
              className={`flex-1 py-4 rounded-xl items-center ${
                extractedEntries.length - duplicateIds.length > 0
                  ? 'bg-blue-600 active:bg-blue-700'
                  : 'bg-gray-300'
              }`}
            >
              <Text
                className={`font-semibold ${
                  extractedEntries.length - duplicateIds.length > 0
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                Import {extractedEntries.length - duplicateIds.length} Entries
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Bed Selection Modal */}
      <Modal visible={showBedPrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Select Bed Number
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              {extractedEntries.length} entries extracted. Which bed was this schedule for?
            </Text>

            <View className="flex-row flex-wrap justify-center gap-3">
              {BED_OPTIONS.map((bed) => (
                <Pressable
                  key={bed}
                  onPress={() => handleBedSelect(bed)}
                  className="w-16 h-16 bg-blue-600 rounded-xl items-center justify-center active:bg-blue-700"
                >
                  <Text className="text-white font-bold text-2xl">{bed}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Type Selection Modal */}
      <Modal visible={showProductTypePrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Select Product Type
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Please select the product type for this batch:
            </Text>

            <View className="gap-3">
              {ALL_PRODUCT_TYPES.map((type: ProductType) => (
                <Pressable
                  key={type}
                  onPress={() => handleProductTypeSelect(type)}
                  className="bg-blue-600 py-4 rounded-xl items-center active:bg-blue-700"
                >
                  <Text className="text-white font-bold text-lg">{type}</Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => handleProductTypeSelect('Mixed')}
                className="bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300 mt-2"
              >
                <Text className="text-gray-700 font-semibold">Mixed/Manual</Text>
                <Text className="text-gray-500 text-xs">
                  Mixed product types - enter individually
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Missing Values Warning Modal */}
      <Modal visible={showMissingValuesPrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center">
                <Ionicons name="alert-circle" size={40} color="#EA580C" />
              </View>
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Missing Values Detected
            </Text>
            <Text className="text-gray-600 text-center mb-4">
              Some values could not be extracted from the schedule. You can edit them in the review screen.
            </Text>

            <View className="bg-orange-50 rounded-lg p-4 mb-6">
              {missingValuesInfo.map((info, idx) => (
                <View key={idx} className="flex-row justify-between py-1">
                  <Text className="text-orange-800 font-medium">{info.field}</Text>
                  <Text className="text-orange-600">{info.count} missing</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleMissingValuesAcknowledged}
              className="bg-blue-600 py-4 rounded-xl items-center active:bg-blue-700"
            >
              <Text className="text-white font-bold">Continue to Review</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
