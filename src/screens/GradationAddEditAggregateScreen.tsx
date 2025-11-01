import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { AggregateConfig, SieveData } from '../types/aggregate-gradation';
import { STANDARD_SIEVES } from '../utils/aggregate-gradation-constants';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GradationAddEditAggregate'>;
  route: RouteProp<RootStackParamList, 'GradationAddEditAggregate'>;
};

const GradationAddEditAggregateScreen: React.FC<Props> = ({ navigation, route }) => {
  const { aggregateName } = route.params || {};
  const { aggregates, addAggregate, updateAggregate } = useAggregateGradationStore();
  
  const isEdit = !!aggregateName;
  const existingAggregate = isEdit ? aggregates[aggregateName!] : null;

  const [name, setName] = useState(aggregateName || '');
  const [type, setType] = useState<'Fine' | 'Coarse'>(existingAggregate?.type || 'Fine');
  const [maxDecant, setMaxDecant] = useState(existingAggregate?.maxDecant?.toString() || '');
  const [maxFM, setMaxFM] = useState(existingAggregate?.maxFinenessModulus?.toString() || '');
  const [showAddSieveModal, setShowAddSieveModal] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<{ [key: string]: string }>({});
  
  // Initialize sieves based on existing or empty
  const initializeSieves = (): SieveData[] => {
    if (isEdit && existingAggregate) {
      return existingAggregate.sieves;
    }
    // Start with Pan only for new aggregates
    return [{
      name: 'Pan',
      size: 0,
      weightRetained: '',
      c33Lower: '-',
      c33Upper: '-',
    }];
  };

  const [sieves, setSieves] = useState<SieveData[]>(initializeSieves());

  const handleTypeChange = (newType: 'Fine' | 'Coarse') => {
    setType(newType);
  };

  const getAvailableSieves = (): string[] => {
    const usedSieveNames = sieves.map(s => s.name);
    return Object.keys(STANDARD_SIEVES).filter(
      sieveName => sieveName !== 'Pan' && !usedSieveNames.includes(sieveName)
    );
  };

  const handleAddSieve = (sieveName: string) => {
    const newSieve: SieveData = {
      name: sieveName,
      size: STANDARD_SIEVES[sieveName],
      weightRetained: '',
      c33Lower: '-',
      c33Upper: '-',
    };
    
    // Insert in order by size (largest to smallest), before Pan
    const newSieves = [...sieves];
    const panIndex = newSieves.findIndex(s => s.name === 'Pan');
    
    if (panIndex !== -1) {
      // Find correct position before Pan
      let insertIndex = 0;
      for (let i = 0; i < panIndex; i++) {
        if (newSieves[i].size > newSieve.size) {
          insertIndex = i + 1;
        }
      }
      newSieves.splice(insertIndex, 0, newSieve);
    } else {
      newSieves.push(newSieve);
    }
    
    setSieves(newSieves);
    setShowAddSieveModal(false);
  };

  const handleRemoveSieve = (index: number) => {
    const sieve = sieves[index];
    if (sieve.name === 'Pan') {
      Alert.alert('Cannot Remove', 'Pan sieve is required and cannot be removed');
      return;
    }
    
    Alert.alert(
      'Remove Sieve',
      `Remove ${sieve.name} sieve from this aggregate?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newSieves = sieves.filter((_, i) => i !== index);
            setSieves(newSieves);
          },
        },
      ]
    );
  };

  const handleSieveChange = (index: number, field: 'c33Lower' | 'c33Upper', value: string) => {
    const fieldKey = `${index}-${field}`;
    
    // Store temporary value while editing
    setTempValues(prev => ({ ...prev, [fieldKey]: value }));
    
    if (value === '') {
      // Keep empty while typing
      return;
    }
    
    const newSieves = [...sieves];
    if (value === '-') {
      newSieves[index][field] = '-';
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newSieves[index][field] = numValue;
      }
    }
    setSieves(newSieves);
  };

  const handleSieveFocus = (index: number, field: 'c33Lower' | 'c33Upper') => {
    const fieldKey = `${index}-${field}`;
    const currentValue = sieves[index][field];
    const displayValue = currentValue === '-' ? '-' : currentValue?.toString() || '';
    
    setFocusedField(fieldKey);
    setTempValues(prev => ({ ...prev, [fieldKey]: displayValue }));
  };

  const handleSieveBlur = (index: number, field: 'c33Lower' | 'c33Upper') => {
    const fieldKey = `${index}-${field}`;
    const tempValue = tempValues[fieldKey];
    
    setFocusedField(null);
    
    // If empty or just whitespace, revert to previous value or '-'
    if (!tempValue || tempValue.trim() === '') {
      const newSieves = [...sieves];
      // Keep the original value
      setSieves(newSieves);
      setTempValues(prev => {
        const newTemp = { ...prev };
        delete newTemp[fieldKey];
        return newTemp;
      });
      return;
    }
    
    // Otherwise, apply the value
    const newSieves = [...sieves];
    if (tempValue === '-') {
      newSieves[index][field] = '-';
    } else {
      const numValue = parseFloat(tempValue);
      if (!isNaN(numValue)) {
        newSieves[index][field] = numValue;
      } else {
        // Invalid number, revert
        newSieves[index][field] = sieves[index][field];
      }
    }
    setSieves(newSieves);
    
    // Clear temp value
    setTempValues(prev => {
      const newTemp = { ...prev };
      delete newTemp[fieldKey];
      return newTemp;
    });
  };

  const getSieveDisplayValue = (index: number, field: 'c33Lower' | 'c33Upper'): string => {
    const fieldKey = `${index}-${field}`;
    
    // If this field is focused, show temp value
    if (focusedField === fieldKey) {
      return tempValues[fieldKey] || '';
    }
    
    // Otherwise show the actual value
    const value = sieves[index][field];
    return value === '-' ? '-' : value?.toString() || '';
  };

  const handleSave = () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an aggregate name');
      return;
    }

    if (!isEdit && aggregates[name]) {
      Alert.alert('Error', 'An aggregate with this name already exists');
      return;
    }

    const config: AggregateConfig = {
      type,
      sieves,
      maxDecant: maxDecant ? parseFloat(maxDecant) : null,
      maxFinenessModulus: maxFM ? parseFloat(maxFM) : null,
    };

    if (isEdit) {
      updateAggregate(name, config);
      Alert.alert('Success', 'Aggregate updated successfully');
    } else {
      addAggregate(name, config);
      Alert.alert('Success', 'Aggregate added successfully');
    }

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Basic Info Section */}
        <View className="bg-white p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Basic Information
          </Text>

          {/* Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Aggregate Name *
            </Text>
            <TextInput
              cursorColor="#000000"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Concrete Sand"
              editable={!isEdit}
              className={`bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base ${
                isEdit ? 'opacity-50' : ''
              }`}
            />
            {isEdit && (
              <Text className="text-xs text-gray-500 mt-1">
                Name cannot be changed after creation
              </Text>
            )}
          </View>

          {/* Type */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Aggregate Type *
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleTypeChange('Fine')}
                className={`flex-1 py-3 rounded-lg border-2 ${
                  type === 'Fine'
                    ? 'bg-green-50 border-green-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    type === 'Fine' ? 'text-green-700' : 'text-gray-600'
                  }`}
                >
                  Fine Aggregate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleTypeChange('Coarse')}
                className={`flex-1 py-3 rounded-lg border-2 ${
                  type === 'Coarse'
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    type === 'Coarse' ? 'text-blue-700' : 'text-gray-600'
                  }`}
                >
                  Coarse Aggregate
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Max Decant (Fine only) */}
          {type === 'Fine' && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Max Decant (%)
              </Text>
              <TextInput
                cursorColor="#000000"
                value={maxDecant}
                onChangeText={setMaxDecant}
                placeholder="Optional"
                keyboardType="decimal-pad"
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Maximum allowable decant percentage for this aggregate
              </Text>
            </View>
          )}

          {/* Max Fineness Modulus (Fine only) */}
          {type === 'Fine' && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Max Fineness Modulus
              </Text>
              <TextInput
                cursorColor="#000000"
                value={maxFM}
                onChangeText={setMaxFM}
                placeholder="Optional"
                keyboardType="decimal-pad"
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Maximum allowable fineness modulus for this aggregate
              </Text>
            </View>
          )}
        </View>

        {/* Sieve Configuration */}
        <View className="bg-white p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold text-gray-800">
              Sieve Configuration & C33 Limits
            </Text>
            <Pressable
              onPress={() => setShowAddSieveModal(true)}
              className="bg-blue-600 rounded-lg px-3 py-2 flex-row items-center gap-1 active:bg-blue-700"
            >
              <Ionicons name="add-circle" size={16} color="white" />
              <Text className="text-white text-xs font-semibold">Add Sieve</Text>
            </Pressable>
          </View>
          <Text className="text-sm text-gray-600 mb-4">
            Configure ASTM C33 cumulative passing percentage limits for each sieve. Use "-" for no limit.
          </Text>

          {/* Table Header */}
          <View className="flex-row bg-gray-100 p-2 rounded-t-lg">
            <Text className="w-8 text-xs font-semibold text-gray-700"></Text>
            <Text className="flex-1 text-xs font-semibold text-gray-700">Sieve</Text>
            <Text className="w-24 text-xs font-semibold text-gray-700 text-center">
              Lower %
            </Text>
            <Text className="w-24 text-xs font-semibold text-gray-700 text-center">
              Upper %
            </Text>
          </View>

          {/* Sieve Rows */}
          {sieves.map((sieve, index) => (
            <View
              key={index}
              className="flex-row items-center p-2 border-b border-gray-200"
            >
              {/* Remove Button */}
              <View className="w-8">
                {sieve.name !== 'Pan' && (
                  <Pressable onPress={() => handleRemoveSieve(index)} className="p-1">
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </Pressable>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800">{sieve.name}</Text>
                <Text className="text-xs text-gray-500">
                  {sieve.size > 0 ? `${sieve.size}mm` : 'Pan'}
                </Text>
              </View>

              <View className="w-24 px-1">
                <TextInput
                  cursorColor="#000000"
                  value={getSieveDisplayValue(index, 'c33Lower')}
                  onChangeText={value => handleSieveChange(index, 'c33Lower', value)}
                  onFocus={() => handleSieveFocus(index, 'c33Lower')}
                  onBlur={() => handleSieveBlur(index, 'c33Lower')}
                  placeholder="-"
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                />
              </View>

              <View className="w-24 px-1">
                <TextInput
                  cursorColor="#000000"
                  value={getSieveDisplayValue(index, 'c33Upper')}
                  onChangeText={value => handleSieveChange(index, 'c33Upper', value)}
                  onFocus={() => handleSieveFocus(index, 'c33Upper')}
                  onBlur={() => handleSieveBlur(index, 'c33Upper')}
                  placeholder="-"
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Info */}
        <View className="px-4 pb-6">
          <View className="bg-blue-50 rounded-lg p-3">
            <View className="flex-row gap-2">
              <Ionicons name="information-circle" size={18} color="#2563eb" />
              <Text className="flex-1 text-sm text-blue-800">
                C33 limits define the acceptable range for cumulative passing percentages.
                Tests will automatically check compliance against these limits.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white border-t border-gray-200 p-4 gap-3">
        <Pressable
          onPress={handleSave}
          className="bg-orange-600 rounded-lg py-3 items-center active:bg-orange-700"
        >
          <Text className="text-white font-semibold text-base">
            {isEdit ? 'Update Aggregate' : 'Add Aggregate'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          className="border border-gray-300 rounded-lg py-3 items-center active:bg-gray-50"
        >
          <Text className="text-gray-700 font-medium text-base">Cancel</Text>
        </Pressable>
      </View>

      {/* Add Sieve Modal */}
      <Modal
        visible={showAddSieveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSieveModal(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => setShowAddSieveModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl mx-5 w-80 max-h-96"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-5 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Add Sieve</Text>
              <Text className="text-sm text-gray-600 mt-1">
                Select a sieve to add to this aggregate
              </Text>
            </View>

            <ScrollView className="max-h-80">
              {getAvailableSieves().length === 0 ? (
                <View className="p-8 items-center">
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  <Text className="text-gray-600 mt-3 text-center">
                    All available sieves have been added
                  </Text>
                </View>
              ) : (
                <View className="p-2">
                  {getAvailableSieves().map(sieveName => (
                    <Pressable
                      key={sieveName}
                      onPress={() => handleAddSieve(sieveName)}
                      className="p-4 border-b border-gray-200 active:bg-gray-50"
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-base font-semibold text-gray-800">
                            {sieveName}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            {STANDARD_SIEVES[sieveName]}mm
                          </Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            <View className="p-4 border-t border-gray-200">
              <Pressable
                onPress={() => setShowAddSieveModal(false)}
                className="bg-gray-200 rounded-lg py-3 items-center active:bg-gray-300"
              >
                <Text className="text-gray-700 font-semibold">Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default GradationAddEditAggregateScreen;
