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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { AggregateConfig, SieveData } from '../types/aggregate-gradation';
import { STANDARD_SIEVES, getSieveList } from '../utils/aggregate-gradation-constants';

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
  
  // Initialize sieves based on type
  const initializeSieves = (aggType: 'Fine' | 'Coarse'): SieveData[] => {
    if (isEdit && existingAggregate) {
      return existingAggregate.sieves;
    }
    const sieveNames = getSieveList(aggType);
    return sieveNames.map(sieveName => ({
      name: sieveName,
      size: STANDARD_SIEVES[sieveName],
      weightRetained: '',
      c33Lower: '-',
      c33Upper: '-',
    }));
  };

  const [sieves, setSieves] = useState<SieveData[]>(initializeSieves(type));

  const handleTypeChange = (newType: 'Fine' | 'Coarse') => {
    if (newType !== type) {
      Alert.alert(
        'Change Aggregate Type',
        'Changing the type will reset the sieve configuration. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              setType(newType);
              setSieves(initializeSieves(newType));
            },
          },
        ]
      );
    }
  };

  const handleSieveChange = (index: number, field: 'c33Lower' | 'c33Upper', value: string) => {
    const newSieves = [...sieves];
    if (value === '' || value === '-') {
      newSieves[index][field] = '-';
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newSieves[index][field] = numValue;
      }
    }
    setSieves(newSieves);
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
          <Text className="text-lg font-semibold text-gray-800 mb-2">
            Sieve Configuration & C33 Limits
          </Text>
          <Text className="text-sm text-gray-600 mb-4">
            Configure ASTM C33 cumulative passing percentage limits for each sieve. Use "-" for no limit.
          </Text>

          {/* Table Header */}
          <View className="flex-row bg-gray-100 p-2 rounded-t-lg">
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
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800">{sieve.name}</Text>
                <Text className="text-xs text-gray-500">
                  {sieve.size > 0 ? `${sieve.size}mm` : 'Pan'}
                </Text>
              </View>

              <View className="w-24 px-1">
                <TextInput
                  value={
                    sieve.c33Lower === '-' ? '-' : sieve.c33Lower?.toString() || ''
                  }
                  onChangeText={value => handleSieveChange(index, 'c33Lower', value)}
                  placeholder="-"
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                />
              </View>

              <View className="w-24 px-1">
                <TextInput
                  value={
                    sieve.c33Upper === '-' ? '-' : sieve.c33Upper?.toString() || ''
                  }
                  onChangeText={value => handleSieveChange(index, 'c33Upper', value)}
                  placeholder="-"
                  keyboardType="decimal-pad"
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
    </KeyboardAvoidingView>
  );
};

export default GradationAddEditAggregateScreen;
