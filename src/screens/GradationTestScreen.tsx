import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { SieveData } from '../types/aggregate-gradation';
import { 
  calculateTestData, 
  calculateFinenessModulus, 
  calculateDecant, 
  checkC33Compliance 
} from '../utils/aggregate-gradation-calculations';
import ConfirmModal from '../components/ConfirmModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GradationTest'>;
  route: RouteProp<RootStackParamList, 'GradationTest'>;
};

const GradationTestScreen: React.FC<Props> = ({ navigation, route }) => {
  const { aggregateName, editingTestId } = route.params;
  const { aggregates, addTest, updateTest, getTest } = useAggregateGradationStore();

  const aggregate = aggregates[aggregateName];
  const editingTest = editingTestId ? getTest(editingTestId) : undefined;

  // Format date as MM/DD/YYYY
  const formatDate = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const [date, setDate] = useState(editingTest?.date || formatDate(new Date()));
  const [sieveData, setSieveData] = useState<SieveData[]>(
    editingTest?.sieveData || aggregate.sieves.map(s => ({ ...s, weightRetained: '' }))
  );
  const [washedWeight, setWashedWeight] = useState(editingTest?.washedWeight?.toString() || '');
  const [noProduction, setNoProduction] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Calculate total weight
  const totalWeight = sieveData.reduce((sum, sieve) => {
    const weight = parseFloat(sieve.weightRetained as string);
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  const handleWeightChange = (index: number, value: string) => {
    // Allow only numbers and decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    const newSieveData = [...sieveData];
    newSieveData[index].weightRetained = value;
    setSieveData(newSieveData);
  };

  const handleDateShortcut = (daysAgo: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() - daysAgo);
    setDate(formatDate(newDate));
  };

  const handleSaveTest = () => {
    // Validate that at least one weight is entered
    const hasData = sieveData.some(s => s.weightRetained && parseFloat(s.weightRetained as string) > 0);
    if (!hasData) {
      Alert.alert('Validation Error', 'Please enter at least one sieve weight');
      return;
    }

    // Calculate results
    const calculatedSieves = calculateTestData(sieveData);
    const finenessModulus = calculateFinenessModulus(aggregate.type, calculatedSieves);
    const decant = aggregate.type === 'Fine' && washedWeight
      ? calculateDecant(calculatedSieves, parseFloat(washedWeight))
      : undefined;
    const passC33 = checkC33Compliance(calculatedSieves);

    if (editingTestId) {
      // Update existing test
      updateTest(editingTestId, {
        date,
        sieveData: calculatedSieves,
        totalWeight,
        washedWeight: parseFloat(washedWeight) || undefined,
        finenessModulus,
        decant,
        passC33,
      });
      navigation.replace('GradationResults', { testId: editingTestId });
    } else {
      // Create test record
      const testRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        aggregateName,
        date,
        sieveData: calculatedSieves,
        totalWeight,
        washedWeight: parseFloat(washedWeight) || undefined,
        finenessModulus,
        decant,
        passC33,
      };

      addTest(testRecord);
      navigation.replace('GradationResults', { testId: testRecord.id });
    }
  };

  const handleCancel = () => {
    const hasData = sieveData.some(s => s.weightRetained && parseFloat(s.weightRetained as string) > 0);
    if (hasData) {
      setShowCancelModal(true);
    } else {
      navigation.goBack();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1">
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {/* Date and Production Status */}
            <View className="bg-white p-4 border-b border-gray-200">
              <Text className="text-sm font-medium text-gray-700 mb-2">Test Date</Text>
              <TextInput
                cursorColor="#000000"
                value={date}
                onChangeText={setDate}
                placeholder="MM/DD/YYYY"
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
              
              {/* Date Shortcuts */}
              <View className="flex-row gap-2 mt-2">
                <Pressable
                  onPress={() => handleDateShortcut(0)}
                  className="bg-blue-100 px-3 py-1 rounded active:bg-blue-200"
                >
                  <Text className="text-xs text-blue-700">Today</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDateShortcut(1)}
                  className="bg-blue-100 px-3 py-1 rounded active:bg-blue-200"
                >
                  <Text className="text-xs text-blue-700">Yesterday</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDateShortcut(7)}
                  className="bg-blue-100 px-3 py-1 rounded active:bg-blue-200"
                >
                  <Text className="text-xs text-blue-700">Last Week</Text>
                </Pressable>
              </View>

              {/* No Production Toggle */}
              <Pressable
                onPress={() => setNoProduction(!noProduction)}
                className="flex-row items-center mt-4"
              >
                <View
                  className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
                    noProduction ? 'bg-orange-600 border-orange-600' : 'border-gray-400'
                  }`}
                >
                  {noProduction && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
                <Text className="text-sm text-gray-700">No Production</Text>
              </Pressable>
            </View>

            {/* Sieve Data Entry */}
            <View className="bg-white mt-4 p-4">
              <Text className="text-base font-semibold text-gray-800 mb-3">
                Sieve Data (grams)
              </Text>
              
              {sieveData.map((sieve, index) => (
                <View key={index} className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">
                      {sieve.name}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {sieve.size > 0 ? `${sieve.size}mm` : ''}
                    </Text>
                  </View>
                  <TextInput
                    cursorColor="#000000"
                    ref={ref => { if (ref) inputRefs.current[index] = ref; }}
                    value={sieve.weightRetained as string}
                    onChangeText={value => handleWeightChange(index, value)}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    returnKeyType={index < sieveData.length - 1 ? 'next' : 'done'}
                    onSubmitEditing={() => {
                      if (index < sieveData.length - 1) {
                        inputRefs.current[index + 1]?.focus();
                      }
                    }}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </View>
              ))}

              {/* Washed Weight for Fine Aggregates */}
              {aggregate.type === 'Fine' && (
                <View className="mt-4 pt-4 border-t border-gray-200">
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Washed Weight (g)
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    value={washedWeight}
                    onChangeText={setWashedWeight}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </View>
              )}

              {/* Total Weight Display */}
              <View className="mt-4 pt-4 border-t border-gray-200">
                <View className="flex-row justify-between items-center">
                  <Text className="text-base font-semibold text-gray-800">Total Weight:</Text>
                  <Text className="text-lg font-bold text-orange-600">
                    {totalWeight.toFixed(2)} g
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Box */}
            <View className="p-4">
              <View className="bg-blue-50 rounded-lg p-3">
                <View className="flex-row gap-2">
                  <Ionicons name="information-circle" size={18} color="#2563eb" />
                  <Text className="flex-1 text-sm text-blue-800">
                    Enter the weight retained on each sieve. Press Tab or Next to move between fields.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View className="bg-white border-t border-gray-200 p-4 gap-3">
            <Pressable
              onPress={handleSaveTest}
              className="bg-orange-600 rounded-lg py-3 items-center active:bg-orange-700"
            >
              <Text className="text-white font-semibold text-base">Calculate Results</Text>
            </Pressable>
            
            <Pressable
              onPress={handleCancel}
              className="border border-gray-300 rounded-lg py-3 items-center active:bg-gray-50"
            >
              <Text className="text-gray-700 font-medium text-base">Cancel</Text>
            </Pressable>
          </View>
        </View>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        visible={showCancelModal}
        title="Discard Test Data?"
        message="You have unsaved data. Are you sure you want to cancel?"
        confirmText="Discard"
        cancelText="Continue Editing"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
        confirmStyle="destructive"
      />
    </KeyboardAvoidingView>
  );
};

export default GradationTestScreen;
