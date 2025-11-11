import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useStrandPatternStore, CustomStrandPattern, StrandCoordinate } from '../state/strandPatternStore';
import ConfirmModal from '../components/ConfirmModal';

type Department = 'Wall Panels' | 'Extruded' | 'Flexicore' | 'Precast';

type ProductTypesByDepartment = {
  'Extruded': string[];
  'Wall Panels': string[];
  'Flexicore': string[];
  'Precast': string[];
};

const PRODUCT_TYPES: ProductTypesByDepartment = {
  'Extruded': ['8048', '1048', '1247', '1250', '1648'],
  'Wall Panels': [],
  'Flexicore': [],
  'Precast': [],
};

export default function StrandPatternsScreen() {
  const insets = useSafeAreaInsets();
  const { customPatterns, addPattern, removePattern, updatePattern, clearAllPatterns } = useStrandPatternStore();

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<CustomStrandPattern | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Auto-assign department and productType to existing patterns without them
  React.useEffect(() => {
    customPatterns.forEach(pattern => {
      if (!pattern.department || !pattern.productType) {
        // Try to detect product type from pattern name
        const name = pattern.name.toLowerCase();
        let detectedProductType = '';
        let detectedDepartment: Department = 'Extruded';

        if (name.includes('8048')) {
          detectedProductType = '8048';
          detectedDepartment = 'Extruded';
        } else if (name.includes('1048')) {
          detectedProductType = '1048';
          detectedDepartment = 'Extruded';
        } else if (name.includes('1247')) {
          detectedProductType = '1247';
          detectedDepartment = 'Extruded';
        } else if (name.includes('1250')) {
          detectedProductType = '1250';
          detectedDepartment = 'Extruded';
        } else if (name.includes('1648')) {
          detectedProductType = '1648';
          detectedDepartment = 'Extruded';
        }

        if (detectedProductType) {
          updatePattern(pattern.id, {
            ...pattern,
            department: detectedDepartment,
            productType: detectedProductType,
          });
        }
      }
    });
  }, []);

  const filteredPatterns = customPatterns.filter(pattern => {
    if (!selectedDepartment) return false;
    if (!selectedProductType) return pattern.department === selectedDepartment;
    return pattern.department === selectedDepartment && pattern.productType === selectedProductType;
  });

  // Sort patterns: Bottom strands first (highest to lowest), then Top strands (highest to lowest), then Both
  const sortedPatterns = [...filteredPatterns].sort((a, b) => {
    // First, group by position: Bottom -> Top -> Both
    const positionOrder = { 'Bottom': 0, 'Top': 1, 'Both': 2 };
    const positionDiff = positionOrder[a.position] - positionOrder[b.position];

    if (positionDiff !== 0) {
      return positionDiff;
    }

    // Within same position, sort by pattern number (highest first)
    // Extract numeric part from pattern ID (e.g., "152" from "152-70" or "T40" from "T40-70")
    const getPatternNumber = (patternId: string): number => {
      const match = patternId.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const aNum = getPatternNumber(a.patternId);
    const bNum = getPatternNumber(b.patternId);

    // Sort descending (highest first)
    return bNum - aNum;
  });

  const handleAddPattern = () => {
    if (!selectedDepartment || !selectedProductType) {
      Alert.alert('Error', 'Please select a department and product type first');
      return;
    }
    setEditingPattern(null);
    setShowAddModal(true);
  };

  const handleEditPattern = (pattern: CustomStrandPattern) => {
    setEditingPattern(pattern);
    setShowAddModal(true);
  };

  const handleDeletePattern = (id: string) => {
    removePattern(id);
    setDeleteConfirmId(null);
  };

  const handleSavePattern = async (patternData: Omit<CustomStrandPattern, 'id' | 'department' | 'productType'>) => {
    if (!selectedDepartment || !selectedProductType) {
      Alert.alert('Error', 'Please select a department and product type');
      return;
    }

    const fullPatternData: Omit<CustomStrandPattern, 'id'> = {
      ...patternData,
      department: selectedDepartment,
      productType: selectedProductType,
    };

    if (editingPattern) {
      await updatePattern(editingPattern.id, fullPatternData);
    } else {
      await addPattern(fullPatternData);
    }
    setShowAddModal(false);
  };

  const handleExportPatterns = async () => {
    try {
      const jsonData = JSON.stringify(customPatterns, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strand-patterns-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileName = `strand-patterns-${new Date().toISOString().split('T')[0]}.json`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonData);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleImportPatterns = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
              try {
                const patterns = JSON.parse(event.target.result);
                if (Array.isArray(patterns)) {
                  patterns.forEach((pattern: CustomStrandPattern) => {
                    const exists = customPatterns.find(p => p.id === pattern.id);
                    if (!exists) {
                      addPattern(pattern);
                    }
                  });
                }
              } catch (error) {
                console.error('JSON parse error:', error);
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        if (result.canceled === false && result.assets && result.assets.length > 0) {
          const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
          const patterns = JSON.parse(fileContent);

          if (Array.isArray(patterns)) {
            patterns.forEach((pattern: CustomStrandPattern) => {
              const exists = customPatterns.find(p => p.id === pattern.id);
              if (!exists) {
                addPattern(pattern);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const jsonData = JSON.stringify(customPatterns, null, 2);
      await Clipboard.setStringAsync(jsonData);
      Alert.alert('Success', 'Patterns copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();

      if (!clipboardText) {
        Alert.alert('Error', 'Clipboard is empty');
        return;
      }

      const patterns = JSON.parse(clipboardText);

      if (!Array.isArray(patterns)) {
        Alert.alert('Error', 'Invalid data format');
        return;
      }

      let importedCount = 0;
      patterns.forEach((pattern: CustomStrandPattern) => {
        const exists = customPatterns.find(p => p.id === pattern.id);
        if (!exists) {
          addPattern(pattern);
          importedCount++;
        }
      });

      Alert.alert('Success', `Imported ${importedCount} pattern(s)`);
    } catch (error) {
      console.error('Paste error:', error);
      Alert.alert('Error', 'Failed to parse clipboard data');
    }
  };

  const handleBackToDepartments = () => {
    setSelectedProductType(null);
    setSelectedDepartment(null);
  };

  const handleBackToProductTypes = () => {
    setSelectedProductType(null);
  };

  // Department Selection View
  if (!selectedDepartment) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="p-5">
            <View className="mb-6">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Strand Pattern Manager
              </Text>
              <Text className="text-base text-gray-600">
                Select a department to manage strand patterns
              </Text>
            </View>

            <View className="space-y-3">
              {(['Extruded', 'Wall Panels', 'Flexicore', 'Precast'] as Department[]).map((dept) => (
                <Pressable
                  key={dept}
                  onPress={() => setSelectedDepartment(dept)}
                  className="bg-white rounded-xl p-5 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-gray-900 mb-1">
                        {dept}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {customPatterns.filter(p => p.department === dept).length} patterns
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Action Buttons at Bottom */}
            <View className="mt-8 space-y-3">
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleImportPatterns}
                  className="flex-1 bg-green-500 rounded-xl py-3 items-center active:bg-green-600"
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="white" />
                  <Text className="text-white text-sm font-semibold mt-1">
                    Import JSON
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleExportPatterns}
                  className="flex-1 bg-purple-500 rounded-xl py-3 items-center active:bg-purple-600"
                  disabled={customPatterns.length === 0}
                  style={{ opacity: customPatterns.length === 0 ? 0.5 : 1 }}
                >
                  <Ionicons name="cloud-download-outline" size={20} color="white" />
                  <Text className="text-white text-sm font-semibold mt-1">
                    Export JSON
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleCopyToClipboard}
                  className="flex-1 bg-orange-500 rounded-xl py-3 items-center active:bg-orange-600"
                  disabled={customPatterns.length === 0}
                  style={{ opacity: customPatterns.length === 0 ? 0.5 : 1 }}
                >
                  <Ionicons name="copy-outline" size={20} color="white" />
                  <Text className="text-white text-sm font-semibold mt-1">
                    Copy Text
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handlePasteFromClipboard}
                  className="flex-1 bg-teal-500 rounded-xl py-3 items-center active:bg-teal-600"
                >
                  <Ionicons name="clipboard-outline" size={20} color="white" />
                  <Text className="text-white text-sm font-semibold mt-1">
                    Paste Text
                  </Text>
                </Pressable>
              </View>

              {customPatterns.length > 0 && (
                <Pressable
                  onPress={() => setShowClearConfirm(true)}
                  className="bg-red-500 rounded-xl py-3 items-center active:bg-red-600"
                >
                  <Ionicons name="trash-outline" size={20} color="white" />
                  <Text className="text-white text-sm font-semibold mt-1">
                    Clear All Patterns
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>

        <ConfirmModal
          visible={showClearConfirm}
          title="Clear All Patterns?"
          message="This will permanently delete all custom strand patterns. This action cannot be undone."
          onConfirm={() => {
            clearAllPatterns();
            setShowClearConfirm(false);
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      </View>
    );
  }

  // Product Type Selection View
  if (!selectedProductType) {
    const productTypes = PRODUCT_TYPES[selectedDepartment];

    return (
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="p-5">
            <Pressable
              onPress={handleBackToDepartments}
              className="flex-row items-center mb-4"
            >
              <Ionicons name="chevron-back" size={24} color="#3B82F6" />
              <Text className="text-blue-500 text-base font-semibold ml-1">
                Back to Departments
              </Text>
            </Pressable>

            <View className="mb-6">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                {selectedDepartment}
              </Text>
              <Text className="text-base text-gray-600">
                Select a product type
              </Text>
            </View>

            {productTypes.length > 0 ? (
              <View className="space-y-3">
                {productTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedProductType(type)}
                    className="bg-white rounded-xl p-5 shadow-sm active:bg-gray-50"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900 mb-1">
                          {type}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {customPatterns.filter(p => p.department === selectedDepartment && p.productType === type).length} patterns
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-8 items-center">
                <Ionicons name="construct-outline" size={48} color="#9CA3AF" />
                <Text className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                  No Product Types Yet
                </Text>
                <Text className="text-sm text-gray-600 text-center">
                  Product types for this department will be added soon
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Strand Patterns List View
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          <Pressable
            onPress={handleBackToProductTypes}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="chevron-back" size={24} color="#3B82F6" />
            <Text className="text-blue-500 text-base font-semibold ml-1">
              Back to Product Types
            </Text>
          </Pressable>

          <View className="mb-6">
            <Text className="text-sm text-gray-500 mb-1">
              {selectedDepartment} / {selectedProductType}
            </Text>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Strand Patterns
            </Text>
            <Text className="text-base text-gray-600">
              {sortedPatterns.length} pattern(s) for {selectedProductType}
            </Text>
          </View>

          {/* Patterns List */}
          {sortedPatterns.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center mb-5">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                No Patterns Yet
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Add your first strand pattern for {selectedProductType}
              </Text>
            </View>
          ) : (
            <View className="space-y-3 mb-5">
              {sortedPatterns.map((pattern) => (
                <View
                  key={pattern.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-lg font-bold text-gray-900">
                          {pattern.patternId}
                        </Text>
                        <View className={`px-2 py-1 rounded ${
                          pattern.position === 'Top' ? 'bg-blue-100' :
                          pattern.position === 'Bottom' ? 'bg-green-100' :
                          'bg-purple-100'
                        }`}>
                          <Text className={`text-xs font-semibold ${
                            pattern.position === 'Top' ? 'text-blue-700' :
                            pattern.position === 'Bottom' ? 'text-green-700' :
                            'text-purple-700'
                          }`}>
                            {pattern.position}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm text-gray-600">
                        {pattern.name}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleEditPattern(pattern)}
                        className="bg-blue-50 rounded-full p-2"
                      >
                        <Ionicons name="pencil" size={20} color="#3B82F6" />
                      </Pressable>
                      <Pressable
                        onPress={() => setDeleteConfirmId(pattern.id)}
                        className="bg-red-50 rounded-full p-2"
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>

                  <View className="border-t border-gray-100 pt-3">
                    <Text className="text-xs text-gray-600">
                      {pattern.strand_3_8 > 0 && `${pattern.strand_3_8} × 3/8" `}
                      {pattern.strand_1_2 > 0 && `${pattern.strand_1_2} × 1/2" `}
                      {pattern.strand_0_6 > 0 && `${pattern.strand_0_6} × 0.6" `}
                      • e = {pattern.eValue}" • Force = {pattern.pullingForce}%
                      {pattern.requiredForce && ` • ${pattern.requiredForce.toLocaleString()} lbs`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <Pressable
            onPress={handleAddPattern}
            className="bg-blue-500 rounded-xl py-4 items-center mb-3 active:bg-blue-600 flex-row justify-center"
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text className="text-white text-base font-semibold ml-2">
              Add New Pattern
            </Text>
          </Pressable>

          <View className="flex-row gap-3 mb-3">
            <Pressable
              onPress={handleImportPatterns}
              className="flex-1 bg-green-500 rounded-xl py-3 items-center active:bg-green-600"
            >
              <Ionicons name="cloud-upload-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold mt-1">
                Import JSON
              </Text>
            </Pressable>
            <Pressable
              onPress={handleExportPatterns}
              className="flex-1 bg-purple-500 rounded-xl py-3 items-center active:bg-purple-600"
              disabled={customPatterns.length === 0}
              style={{ opacity: customPatterns.length === 0 ? 0.5 : 1 }}
            >
              <Ionicons name="cloud-download-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold mt-1">
                Export JSON
              </Text>
            </Pressable>
          </View>

          <View className="flex-row gap-3 mb-3">
            <Pressable
              onPress={handleCopyToClipboard}
              className="flex-1 bg-orange-500 rounded-xl py-3 items-center active:bg-orange-600"
              disabled={customPatterns.length === 0}
              style={{ opacity: customPatterns.length === 0 ? 0.5 : 1 }}
            >
              <Ionicons name="copy-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold mt-1">
                Copy Text
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePasteFromClipboard}
              className="flex-1 bg-teal-500 rounded-xl py-3 items-center active:bg-teal-600"
            >
              <Ionicons name="clipboard-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold mt-1">
                Paste Text
              </Text>
            </Pressable>
          </View>

          {customPatterns.length > 0 && (
            <Pressable
              onPress={() => setShowClearConfirm(true)}
              className="bg-red-500 rounded-xl py-3 items-center active:bg-red-600"
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold mt-1">
                Clear All Patterns
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {showAddModal && (
        <PatternEditorModal
          pattern={editingPattern}
          onClose={() => setShowAddModal(false)}
          onSave={handleSavePattern}
        />
      )}

      <ConfirmModal
        visible={deleteConfirmId !== null}
        title="Delete Pattern?"
        message="This will permanently delete this strand pattern. This action cannot be undone."
        onConfirm={() => deleteConfirmId && handleDeletePattern(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmModal
        visible={showClearConfirm}
        title="Clear All Patterns?"
        message="This will permanently delete all custom strand patterns. This action cannot be undone."
        onConfirm={() => {
          clearAllPatterns();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </View>
  );
}
interface PatternEditorModalProps {
  pattern: CustomStrandPattern | null;
  onClose: () => void;
  onSave: (pattern: Omit<CustomStrandPattern, 'id' | 'department' | 'productType'>) => void;
}

function PatternEditorModal({ pattern, onClose, onSave }: PatternEditorModalProps) {
  const [patternNumber, setPatternNumber] = useState(pattern?.patternId.split('-')[0] || '');
  const [pullingForce, setPullingForce] = useState(
    pattern?.pullingForce.toString() || '75'
  );
  const [name, setName] = useState(pattern?.name || '');
  const [position, setPosition] = useState<'Top' | 'Bottom' | 'Both'>(pattern?.position || 'Bottom');
  const [strand_3_8, setStrand_3_8] = useState(pattern?.strand_3_8.toString() || '0');
  const [strand_1_2, setStrand_1_2] = useState(pattern?.strand_1_2.toString() || '0');
  const [strand_0_6, setStrand_0_6] = useState(pattern?.strand_0_6.toString() || '0');
  const [strandSizes, setStrandSizes] = useState<Array<'3/8' | '1/2' | '0.6'>>(pattern?.strandSizes || []);
  const [strandCoordinates, setStrandCoordinates] = useState<Array<{x: string; y: string}>>(
    pattern?.strandCoordinates?.map(coord => ({ x: coord.x.toString(), y: coord.y.toString() })) || []
  );
  const [centroid, setCentroid] = useState('');
  const [strandHeight, setStrandHeight] = useState('');
  const [eValue, setEValue] = useState(pattern?.eValue.toString() || '');
  const [requiredForce, setRequiredForce] = useState(pattern?.requiredForce?.toString() || '');
  const [errors, setErrors] = useState<string[]>([]);

  // Parse fraction or decimal input
  const parseFractionOrDecimal = (input: string): number => {
    if (!input || input.trim() === '') return 0;
    
    // Check if input contains a fraction (e.g., "2 1/8" or "1/8")
    const fractionMatch = input.match(/(\d+)?\s*(\d+)\/(\d+)/);
    if (fractionMatch) {
      const whole = parseInt(fractionMatch[1] || '0');
      const numerator = parseInt(fractionMatch[2]);
      const denominator = parseInt(fractionMatch[3]);
      return whole + (numerator / denominator);
    }
    
    // Otherwise parse as decimal
    return parseFloat(input) || 0;
  };

  // Auto-calculate e value when centroid or strand height changes
  const calculateEValue = () => {
    const centroidValue = parseFractionOrDecimal(centroid);
    const height = parseFractionOrDecimal(strandHeight);
    
    if (centroidValue > 0 && height > 0) {
      const e = centroidValue - height;
      setEValue(e.toFixed(3));
    }
  };

  // Update e value whenever centroid or strand height changes
  React.useEffect(() => {
    calculateEValue();
  }, [centroid, strandHeight]);

  const STRAND_AREAS = {
    '3/8': 0.085,
    '1/2': 0.153,
    '0.6': 0.217,
  };

  const calculateTotalArea = () => {
    const count_3_8 = parseInt(strand_3_8) || 0;
    const count_1_2 = parseInt(strand_1_2) || 0;
    const count_0_6 = parseInt(strand_0_6) || 0;
    
    return (
      count_3_8 * STRAND_AREAS['3/8'] +
      count_1_2 * STRAND_AREAS['1/2'] +
      count_0_6 * STRAND_AREAS['0.6']
    );
  };

  // Get total strand count
  const getTotalStrandCount = () => {
    return (parseInt(strand_3_8) || 0) + (parseInt(strand_1_2) || 0) + (parseInt(strand_0_6) || 0);
  };

  // Update strand sizes array when counts change
  React.useEffect(() => {
    const totalCount = getTotalStrandCount();
    if (totalCount > 0 && strandSizes.length !== totalCount) {
      // Initialize or resize array
      const newSizes: Array<'3/8' | '1/2' | '0.6'> = [];
      for (let i = 0; i < totalCount; i++) {
        newSizes.push(strandSizes[i] || '1/2'); // Default to 1/2"
      }
      setStrandSizes(newSizes);
    } else if (totalCount === 0) {
      setStrandSizes([]);
    }
  }, [strand_3_8, strand_1_2, strand_0_6]);

  // Update a specific strand position's size
  const updateStrandSize = (index: number, size: '3/8' | '1/2' | '0.6') => {
    const newSizes = [...strandSizes];
    newSizes[index] = size;
    setStrandSizes(newSizes);
  };

  // Validate strand size designations match counts
  const validateStrandDesignations = (): boolean => {
    const count_3_8 = parseInt(strand_3_8) || 0;
    const count_1_2 = parseInt(strand_1_2) || 0;
    const count_0_6 = parseInt(strand_0_6) || 0;
    
    const designated_3_8 = strandSizes.filter(s => s === '3/8').length;
    const designated_1_2 = strandSizes.filter(s => s === '1/2').length;
    const designated_0_6 = strandSizes.filter(s => s === '0.6').length;

    return designated_3_8 === count_3_8 && designated_1_2 === count_1_2 && designated_0_6 === count_0_6;
  };

  const handleSave = () => {
    const validationErrors: string[] = [];

    // Validate pattern number
    if (!patternNumber || patternNumber.length < 2 || patternNumber.length > 3) {
      validationErrors.push('Pattern number must be 2-3 digits');
    }

    // Validate pulling force
    const force = parseInt(pullingForce);
    if (!pullingForce || isNaN(force) || force < 1 || force > 99) {
      validationErrors.push('Pulling force must be 1-99%');
    }

    // Validate name
    if (!name.trim()) {
      validationErrors.push('Pattern name is required');
    }

    // Validate at least one strand
    const count_3_8 = parseInt(strand_3_8) || 0;
    const count_1_2 = parseInt(strand_1_2) || 0;
    const count_0_6 = parseInt(strand_0_6) || 0;
    if (count_3_8 + count_1_2 + count_0_6 === 0) {
      validationErrors.push('At least one strand is required');
    }

    // Validate e value
    // For top strands, e can be negative (centroid - strand height can be negative)
    // For bottom strands, e should be positive
    const e = parseFloat(eValue);
    if (!eValue || isNaN(e)) {
      validationErrors.push('e value is required');
    } else if (position === 'Bottom' && e <= 0) {
      validationErrors.push('e value must be greater than 0 for bottom strands');
    }
    // Top strands can have negative e values, so no validation needed for that case

    // Validate strand size designations if strands exist
    if (count_3_8 + count_1_2 + count_0_6 > 0 && !validateStrandDesignations()) {
      const designated_3_8 = strandSizes.filter(s => s === '3/8').length;
      const designated_1_2 = strandSizes.filter(s => s === '1/2').length;
      const designated_0_6 = strandSizes.filter(s => s === '0.6').length;
      validationErrors.push(
        `Strand designations must match counts: Need ${count_3_8} × 3/8", ${count_1_2} × 1/2", ${count_0_6} × 0.6" but have ${designated_3_8}, ${designated_1_2}, ${designated_0_6}`
      );
    }

    // Validate strand coordinates if provided
    let parsedCoordinates: StrandCoordinate[] | undefined;
    if (strandCoordinates.length > 0) {
      const totalCount = getTotalStrandCount();
      
      // Check if all coordinates are filled
      const allFilled = strandCoordinates.every(coord => coord.x.trim() !== '' && coord.y.trim() !== '');
      
      if (!allFilled) {
        validationErrors.push('All strand coordinates must be filled or remove coordinates entirely');
      } else {
        // Parse and validate coordinates
        parsedCoordinates = [];
        for (let i = 0; i < strandCoordinates.length; i++) {
          const xValue = parseFractionOrDecimal(strandCoordinates[i].x);
          const yValue = parseFractionOrDecimal(strandCoordinates[i].y);
          
          if (isNaN(xValue) || isNaN(yValue)) {
            validationErrors.push(`Invalid coordinate for strand ${i + 1}: x="${strandCoordinates[i].x}", y="${strandCoordinates[i].y}"`);
          } else if (xValue < 0 || yValue < 0) {
            validationErrors.push(`Coordinates for strand ${i + 1} must be non-negative`);
          } else {
            parsedCoordinates.push({ x: xValue, y: yValue });
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const patternId = `${patternNumber}-${pullingForce}`;

    onSave({
      patternId,
      name: name.trim(),
      position,
      strand_3_8: count_3_8,
      strand_1_2: count_1_2,
      strand_0_6: count_0_6,
      strandSizes: strandSizes.length > 0 ? strandSizes : undefined,
      strandCoordinates: parsedCoordinates,
      eValue: e,
      pullingForce: force,
      requiredForce: requiredForce ? parseFloat(requiredForce) : undefined,
      totalArea: calculateTotalArea(),
    });
  };

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <View className="bg-white rounded-2xl mx-5 w-full max-w-md">
        <ScrollView className="max-h-96">
          <View className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">
                {pattern ? 'Edit Pattern' : 'New Pattern'}
              </Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Errors */}
            {errors.length > 0 && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                {errors.map((error, idx) => (
                  <Text key={idx} className="text-red-700 text-sm">
                    • {error}
                  </Text>
                ))}
              </View>
            )}

            {/* Pattern ID Section */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Pattern ID
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="101"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  keyboardType="number-pad"
                  maxLength={3}
                  value={patternNumber}
                  onChangeText={setPatternNumber}
                />
                <Text className="text-lg text-gray-600">-</Text>
                <TextInput
                  className="w-20 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="75"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={pullingForce}
                  onChangeText={setPullingForce}
                />
                <Text className="text-sm text-gray-600">%</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                Format: [Number]-[Pulling Force %]
              </Text>
            </View>

            {/* Name */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Pattern Name
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="e.g., Heavy Load Pattern"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Position Selector */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Strand Position
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setPosition('Bottom')}
                  className={`flex-1 rounded-xl py-3 items-center border-2 ${
                    position === 'Bottom' 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`font-semibold ${
                    position === 'Bottom' ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    Bottom
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPosition('Top')}
                  className={`flex-1 rounded-xl py-3 items-center border-2 ${
                    position === 'Top' 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`font-semibold ${
                    position === 'Top' ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    Top
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPosition('Both')}
                  className={`flex-1 rounded-xl py-3 items-center border-2 ${
                    position === 'Both' 
                      ? 'bg-purple-50 border-purple-500' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`font-semibold ${
                    position === 'Both' ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    Both
                  </Text>
                </Pressable>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                Select where these strands are positioned in the member
              </Text>
            </View>

            {/* Strand Counts */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Number of Strands
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Text className="w-16 text-sm text-gray-700">3/8"</Text>
                  <TextInput
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    keyboardType="number-pad"
                    value={strand_3_8}
                    onChangeText={setStrand_3_8}
                  />
                </View>
                
                <View className="flex-row items-center">
                  <Text className="w-16 text-sm text-gray-700">1/2"</Text>
                  <TextInput
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    keyboardType="number-pad"
                    value={strand_1_2}
                    onChangeText={setStrand_1_2}
                  />
                </View>
                
                <View className="flex-row items-center">
                  <Text className="w-16 text-sm text-gray-700">0.6"</Text>
                  <TextInput
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    keyboardType="number-pad"
                    value={strand_0_6}
                    onChangeText={setStrand_0_6}
                  />
                </View>
              </View>
            </View>

            {/* Strand Size Designations */}
            {getTotalStrandCount() > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Designate Strand Sizes (Position 1-{getTotalStrandCount()}, Left to Right)
                </Text>
                <Text className="text-xs text-gray-500 mb-3">
                  Total: {parseInt(strand_3_8) || 0} × 3/8", {parseInt(strand_1_2) || 0} × 1/2", {parseInt(strand_0_6) || 0} × 0.6"
                </Text>
                
                <View className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <View className="flex-row flex-wrap gap-2">
                    {strandSizes.map((size, index) => (
                      <View key={index} className="items-center">
                        <Text className="text-xs text-gray-600 mb-1">
                          Pos {index + 1}
                        </Text>
                        <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
                          <Pressable
                            onPress={() => updateStrandSize(index, '3/8')}
                            className={`px-2 py-1 ${
                              size === '3/8' ? 'bg-blue-500' : 'bg-white'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${
                              size === '3/8' ? 'text-white' : 'text-gray-700'
                            }`}>
                              3/8
                            </Text>
                          </Pressable>
                          <View className="w-px bg-gray-300" />
                          <Pressable
                            onPress={() => updateStrandSize(index, '1/2')}
                            className={`px-2 py-1 ${
                              size === '1/2' ? 'bg-green-500' : 'bg-white'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${
                              size === '1/2' ? 'text-white' : 'text-gray-700'
                            }`}>
                              1/2
                            </Text>
                          </Pressable>
                          <View className="w-px bg-gray-300" />
                          <Pressable
                            onPress={() => updateStrandSize(index, '0.6')}
                            className={`px-2 py-1 ${
                              size === '0.6' ? 'bg-purple-500' : 'bg-white'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${
                              size === '0.6' ? 'text-white' : 'text-gray-700'
                            }`}>
                              0.6
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                  
                  {/* Count verification */}
                  <View className="mt-3 pt-3 border-t border-gray-300">
                    <Text className="text-xs text-gray-600">
                      Designated: {strandSizes.filter(s => s === '3/8').length} × 3/8", {strandSizes.filter(s => s === '1/2').length} × 1/2", {strandSizes.filter(s => s === '0.6').length} × 0.6"
                    </Text>
                    {!validateStrandDesignations() && (
                      <Text className="text-xs text-orange-600 font-semibold mt-1">
                        ⚠ Designations must match strand counts above
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Strand Coordinates (Optional) */}
            {getTotalStrandCount() > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-700">
                    Strand Coordinates (Optional)
                  </Text>
                  <Pressable
                    onPress={() => {
                      const totalCount = getTotalStrandCount();
                      if (strandCoordinates.length === 0) {
                        // Initialize coordinates with default y = 2 1/8"
                        const newCoords = Array(totalCount).fill(null).map(() => ({ x: '', y: '2 1/8' }));
                        setStrandCoordinates(newCoords);
                      } else {
                        // Clear coordinates
                        setStrandCoordinates([]);
                      }
                    }}
                    className="bg-blue-500 rounded-lg px-3 py-1"
                  >
                    <Text className="text-xs font-semibold text-white">
                      {strandCoordinates.length > 0 ? 'Remove' : 'Add Coordinates'}
                    </Text>
                  </Pressable>
                </View>

                <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <View className="flex-row items-start">
                    <Ionicons name="information-circle" size={16} color="#F59E0B" />
                    <Text className="flex-1 text-xs text-amber-800 ml-2">
                      For cut-width products: Enter (x,y) position of each strand from bottom-left corner. x=0 is left edge, y=0 is bottom. Use decimals or fractions (e.g., 2.5 or 2 1/2). App will auto-calculate which strands are active based on product width.
                    </Text>
                  </View>
                </View>

                {strandCoordinates.length > 0 && (
                  <View className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <ScrollView style={{ maxHeight: 300 }}>
                      <View className="space-y-3">
                        {strandCoordinates.map((coord, index) => (
                          <View key={index}>
                            <Text className="text-xs font-semibold text-gray-700 mb-2">
                              Strand {index + 1} ({strandSizes[index]}")
                            </Text>
                            <View className="flex-row gap-2">
                              <View className="flex-1">
                                <Text className="text-xs text-gray-600 mb-1">
                                  x (horizontal, in)
                                </Text>
                                <TextInput
                                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                                  placeholder="e.g., 2.5 or 2 1/2"
                                  placeholderTextColor="#9CA3AF"
                                  cursorColor="#000000"
                                  value={coord.x}
                                  onChangeText={(text) => {
                                    const newCoords = [...strandCoordinates];
                                    newCoords[index] = { ...newCoords[index], x: text };
                                    setStrandCoordinates(newCoords);
                                  }}
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-xs text-gray-600 mb-1">
                                  y (vertical, in)
                                </Text>
                                <TextInput
                                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                                  placeholder="e.g., 3 or 2 7/8"
                                  placeholderTextColor="#9CA3AF"
                                  cursorColor="#000000"
                                  value={coord.y}
                                  onChangeText={(text) => {
                                    const newCoords = [...strandCoordinates];
                                    newCoords[index] = { ...newCoords[index], y: text };
                                    setStrandCoordinates(newCoords);
                                  }}
                                />
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Centroid */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Section Centroid (inches from bottom)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Enter as decimal or fraction (e.g., 6 or 5 7/8)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="e.g., 6 or 5 7/8"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={centroid}
                onChangeText={setCentroid}
              />
            </View>

            {/* Strand Height */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Strand Height from Bottom (inches)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Enter as decimal or fraction (e.g., 2.125 or 2 1/8)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="e.g., 2.125 or 2 1/8"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={strandHeight}
                onChangeText={setStrandHeight}
              />
            </View>

            {/* e Value (Auto-calculated or manual) */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                e Value (inches) - Auto-calculated
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Calculated as: Centroid - Strand height{'\n'}
                Or enter manually
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="e.g., 3.875"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                keyboardType="decimal-pad"
                value={eValue}
                onChangeText={setEValue}
              />
            </View>

            {/* Required Force (lbs) - Optional */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Required Force (lbs) - Optional
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Required force in pounds for this strand pattern
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="e.g., 15000"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                keyboardType="numeric"
                value={requiredForce}
                onChangeText={setRequiredForce}
              />
            </View>

            {/* Total Area Display */}
            <View className="bg-blue-50 rounded-xl p-3 mb-4">
              <Text className="text-xs font-semibold text-blue-900">
                Total Strand Area
              </Text>
              <Text className="text-lg font-bold text-blue-900">
                {calculateTotalArea().toFixed(3)} in²
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="border-t border-gray-200 p-4 flex-row gap-3">
          <Pressable
            onPress={onClose}
            className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
          >
            <Text className="text-gray-700 font-semibold">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
