import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
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
  inferProductTypeFromThickness,
  getAmbiguousProductTypes,
  PRODUCT_TYPE_OPTIONS,
  BED_OPTIONS,
} from '../types/quality-log';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogImport'>;

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
  const [detectedThickness, setDetectedThickness] = useState<number | null>(null);
  const [detectedBed, setDetectedBed] = useState<BedNumber | undefined>();

  // Product type selection state
  const [showProductTypePrompt, setShowProductTypePrompt] = useState(false);
  const [productTypeOptions, setProductTypeOptions] = useState<ProductType[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [manualProductType, setManualProductType] = useState(false);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);

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

        const { entries, pourDate: extractedPourDate, bed, thickness } = response.data;

        if (entries.length === 0) {
          Alert.alert('No Data Found', 'Could not extract any entries from the schedule. Please try a clearer scan.');
          setIsLoading(false);
          return;
        }

        setExtractedEntries(entries);
        setPourDate(extractedPourDate);
        setDetectedBed(bed as BedNumber | undefined);
        setDetectedThickness(thickness || null);

        // Check for duplicate IDs
        const duplicates = entries
          .map((e) => e.idNumber)
          .filter((id) => getEntryByIdNumber(id) !== undefined);
        setDuplicateIds(duplicates);

        // Determine if we need to prompt for product type
        if (thickness) {
          const inferred = inferProductTypeFromThickness(thickness);
          if (inferred === 'ambiguous') {
            // Need user to select between options
            setProductTypeOptions(getAmbiguousProductTypes(thickness));
            setShowProductTypePrompt(true);
          } else if (inferred) {
            // Auto-assign
            setSelectedProductType(inferred);
            setShowReview(true);
          } else {
            // Unknown thickness, manual entry needed
            setManualProductType(true);
            setShowReview(true);
          }
        } else {
          // No thickness detected, manual entry needed
          setManualProductType(true);
          setShowReview(true);
        }

        setIsLoading(false);
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

  const handleProductTypeSelect = (type: ProductType | 'manual') => {
    setShowProductTypePrompt(false);
    if (type === 'manual') {
      setManualProductType(true);
      setSelectedProductType(null);
    } else {
      setSelectedProductType(type);
      setManualProductType(false);
    }
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

      // Create full entries with product type
      const fullEntries: Omit<QualityLogEntry, 'id' | 'importedAt' | 'updatedAt'>[] = entriesToImport.map((entry) => ({
        pourDate: pourDate || entry.pourDate,
        jobNumber: entry.jobNumber,
        markNumber: entry.markNumber,
        idNumber: entry.idNumber,
        length: entry.length,
        width: entry.width,
        thickness: entry.thickness,
        bed: detectedBed || entry.bed,
        productType: manualProductType ? undefined : selectedProductType || undefined,
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
    setDetectedThickness(null);
    setDetectedBed(undefined);
    setSelectedProductType(null);
    setManualProductType(false);
    setShowReview(false);
    setDuplicateIds([]);
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
      {!isLoading && !showReview && (
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
        <ScrollView className="flex-1 px-4">
          {/* Summary Card */}
          <View className="bg-white rounded-xl p-4 mt-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">Import Summary</Text>
            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Pour Date</Text>
                <Text className="text-base font-semibold text-gray-900">{pourDate || 'Unknown'}</Text>
              </View>
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Bed</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {detectedBed ? `Bed ${detectedBed}` : 'Not Detected'}
                </Text>
              </View>
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Product Type</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {manualProductType ? 'Manual Entry' : selectedProductType || 'Unknown'}
                </Text>
              </View>
              <View className="flex-1 min-w-[120px]">
                <Text className="text-xs text-gray-500">Thickness</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {detectedThickness ? `${detectedThickness}"` : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>

          {/* Entries Count */}
          <View className="bg-white rounded-xl p-4 mt-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">Extracted Entries</Text>
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-700 font-semibold">{extractedEntries.length}</Text>
              </View>
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

            {/* Entry List Preview */}
            <View className="border border-gray-200 rounded-lg overflow-hidden">
              <View className="flex-row bg-gray-100 py-2 px-3">
                <Text className="flex-1 text-xs font-semibold text-gray-600">ID #</Text>
                <Text className="flex-1 text-xs font-semibold text-gray-600">Job-Mark</Text>
                <Text className="w-20 text-xs font-semibold text-gray-600 text-right">Size</Text>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {extractedEntries.slice(0, 20).map((entry, index) => {
                  const isDuplicate = duplicateIds.includes(entry.idNumber);
                  return (
                    <View
                      key={entry.idNumber}
                      className={`flex-row py-2 px-3 border-t border-gray-100 ${
                        isDuplicate ? 'bg-red-50' : ''
                      }`}
                    >
                      <Text
                        className={`flex-1 text-sm ${
                          isDuplicate ? 'text-red-400 line-through' : 'text-gray-900'
                        }`}
                      >
                        {entry.idNumber}
                      </Text>
                      <Text
                        className={`flex-1 text-sm ${
                          isDuplicate ? 'text-red-400' : 'text-gray-600'
                        }`}
                      >
                        {entry.jobNumber}-{entry.markNumber}
                      </Text>
                      <Text
                        className={`w-20 text-sm text-right ${
                          isDuplicate ? 'text-red-400' : 'text-gray-600'
                        }`}
                      >
                        {entry.length}
                      </Text>
                    </View>
                  );
                })}
                {extractedEntries.length > 20 && (
                  <View className="py-2 px-3 bg-gray-50">
                    <Text className="text-xs text-gray-500 text-center">
                      And {extractedEntries.length - 20} more entries...
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6 mb-8">
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

      {/* Product Type Selection Modal */}
      <Modal visible={showProductTypePrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Select Product Type
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Detected {detectedThickness}" thickness. Please select the product type:
            </Text>

            <View className="gap-3">
              {productTypeOptions.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => handleProductTypeSelect(type)}
                  className="bg-blue-600 py-4 rounded-xl items-center active:bg-blue-700"
                >
                  <Text className="text-white font-bold text-lg">{type}</Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => handleProductTypeSelect('manual')}
                className="bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300 mt-2"
              >
                <Text className="text-gray-700 font-semibold">Manual Entry</Text>
                <Text className="text-gray-500 text-xs">
                  Mixed product types - enter individually
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
