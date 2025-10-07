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
import { useStrandPatternStore, CustomStrandPattern } from '../state/strandPatternStore';
import ConfirmModal from '../components/ConfirmModal';

export default function StrandPatternsScreen() {
  const insets = useSafeAreaInsets();
  const { customPatterns, addPattern, removePattern, updatePattern } = useStrandPatternStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<CustomStrandPattern | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddPattern = () => {
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

  const handleExportPatterns = async () => {
    try {
      const jsonData = JSON.stringify(customPatterns, null, 2);
      
      if (Platform.OS === 'web') {
        // Web: Download as file
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
        // Mobile: Share file
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
        // Web: File input
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
                    // Check if pattern already exists
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
        // Mobile: Document picker
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
      Alert.alert('Success', 'Patterns copied to clipboard! You can now paste this text on your computer.');
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
        Alert.alert('Error', 'Invalid data format. Please paste valid JSON array.');
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

      Alert.alert('Success', `Imported ${importedCount} pattern(s). Duplicates were skipped.`);
    } catch (error) {
      console.error('Paste error:', error);
      Alert.alert('Error', 'Failed to parse clipboard data. Make sure you copied valid JSON.');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Strand Patterns
            </Text>
            <Text className="text-base text-gray-600">
              Manage custom prestressing strand configurations
            </Text>
          </View>

          {/* Add New Button */}
          <Pressable
            onPress={handleAddPattern}
            className="bg-blue-500 rounded-xl py-4 items-center mb-3 active:bg-blue-600 flex-row justify-center"
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text className="text-white text-base font-semibold ml-2">
              Add New Pattern
            </Text>
          </Pressable>

          {/* Import/Export Buttons */}
          <View className="flex-row gap-3 mb-3">
            <Pressable
              onPress={handleImportPatterns}
              className="flex-1 bg-green-500 rounded-xl py-3 items-center active:bg-green-600 flex-row justify-center"
            >
              <Ionicons name="cloud-upload-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold ml-2">
                Import JSON
              </Text>
            </Pressable>
            <Pressable
              onPress={handleExportPatterns}
              className="flex-1 bg-purple-500 rounded-xl py-3 items-center active:bg-purple-600 flex-row justify-center"
              disabled={customPatterns.length === 0}
              style={{ opacity: customPatterns.length === 0 ? 0.5 : 1 }}
            >
              <Ionicons name="cloud-download-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold ml-2">
                Export JSON
              </Text>
            </Pressable>
          </View>

          {/* Copy/Paste Buttons - Better for Desktop Transfer */}
          <View className="flex-row gap-3 mb-5">
            <Pressable
              onPress={handleCopyToClipboard}
              className="flex-1 bg-orange-500 rounded-xl py-3 items-center active:bg-orange-600 flex-row justify-center"
              disabled={customPatterns.length === 0}
              style={{ opacity: customPatterns.length === 0 ? 0.5 : 1 }}
            >
              <Ionicons name="copy-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold ml-2">
                Copy Text
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePasteFromClipboard}
              className="flex-1 bg-teal-500 rounded-xl py-3 items-center active:bg-teal-600 flex-row justify-center"
            >
              <Ionicons name="clipboard-outline" size={20} color="white" />
              <Text className="text-white text-sm font-semibold ml-2">
                Paste Text
              </Text>
            </Pressable>
          </View>

          {/* Info Box */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <View className="flex-1 ml-2">
                <Text className="text-sm text-blue-900 font-semibold mb-1">
                  Pattern Format & e Value
                </Text>
                <Text className="text-sm text-blue-800">
                  Pattern ID: [2-3 digit number]-[2 digit pulling force %]{'\n'}
                  Example: 101-75 (Pattern 101, 75% pulling force){'\n\n'}
                  e Value = Section centroid - Strand height from bottom{'\n'}
                  Example: 6" centroid - 2.125" strand height = 3.875" e value{'\n\n'}
                  Desktop Transfer: Use Copy Text on phone, paste into text editor on PC, edit, copy from PC, then use Paste Text on phone
                </Text>
              </View>
            </View>
          </View>

          {/* Custom Patterns List */}
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Custom Patterns ({customPatterns.length})
          </Text>

          {customPatterns.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                No Custom Patterns
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Create your first custom strand pattern to get started
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {customPatterns.map((pattern) => (
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
                    <View className="mb-2">
                      <Text className="text-xs font-semibold text-gray-700 mb-1">
                        Strand Configuration:
                      </Text>
                      {pattern.strand_3_8 > 0 && (
                        <Text className="text-sm text-gray-600">
                          • {pattern.strand_3_8}× 3/8" strands
                        </Text>
                      )}
                      {pattern.strand_1_2 > 0 && (
                        <Text className="text-sm text-gray-600">
                          • {pattern.strand_1_2}× 1/2" strands
                        </Text>
                      )}
                      {pattern.strand_0_6 > 0 && (
                        <Text className="text-sm text-gray-600">
                          • {pattern.strand_0_6}× 0.6" strands
                        </Text>
                      )}
                    </View>

                    <View className="flex-row flex-wrap gap-3 mt-2">
                      <View className="bg-gray-50 rounded-lg px-3 py-2">
                        <Text className="text-xs text-gray-600">e value</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {pattern.eValue}"
                        </Text>
                      </View>
                      <View className="bg-gray-50 rounded-lg px-3 py-2">
                        <Text className="text-xs text-gray-600">Pulling Force</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {pattern.pullingForce}%
                        </Text>
                      </View>
                      <View className="bg-gray-50 rounded-lg px-3 py-2">
                        <Text className="text-xs text-gray-600">Total Area</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {pattern.totalArea.toFixed(3)} in²
                        </Text>
                      </View>
                      <View className="bg-gray-50 rounded-lg px-3 py-2">
                        <Text className="text-xs text-gray-600">Moment of Inertia</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {pattern.momentOfInertia.toLocaleString()} in⁴
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Pattern Modal */}
      {showAddModal && (
        <PatternEditorModal
          pattern={editingPattern}
          onClose={() => setShowAddModal(false)}
          onSave={(pattern) => {
            if (editingPattern) {
              updatePattern(editingPattern.id, pattern);
            } else {
              addPattern(pattern);
            }
            setShowAddModal(false);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={deleteConfirmId !== null}
        title="Delete Pattern"
        message="Are you sure you want to delete this strand pattern? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={() => deleteConfirmId && handleDeletePattern(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </View>
  );
}

interface PatternEditorModalProps {
  pattern: CustomStrandPattern | null;
  onClose: () => void;
  onSave: (pattern: Omit<CustomStrandPattern, 'id'>) => void;
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
  const [centroid, setCentroid] = useState('');
  const [strandHeight, setStrandHeight] = useState('');
  const [eValue, setEValue] = useState(pattern?.eValue.toString() || '');
  const [momentOfInertia, setMomentOfInertia] = useState(pattern?.momentOfInertia.toString() || '');
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
    const e = parseFloat(eValue);
    if (!eValue || isNaN(e) || e <= 0) {
      validationErrors.push('e value must be greater than 0');
    }

    // Validate moment of inertia
    const moi = parseFloat(momentOfInertia);
    if (!momentOfInertia || isNaN(moi) || moi <= 0) {
      validationErrors.push('Moment of inertia must be greater than 0');
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
      eValue: e,
      pullingForce: force,
      totalArea: calculateTotalArea(),
      momentOfInertia: moi,
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
                    keyboardType="number-pad"
                    value={strand_0_6}
                    onChangeText={setStrand_0_6}
                  />
                </View>
              </View>
            </View>

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
                keyboardType="decimal-pad"
                value={eValue}
                onChangeText={setEValue}
              />
            </View>

            {/* Moment of Inertia */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Moment of Inertia (in⁴)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Enter the moment of inertia for the member cross-section
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="e.g., 3804"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={momentOfInertia}
                onChangeText={setMomentOfInertia}
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
