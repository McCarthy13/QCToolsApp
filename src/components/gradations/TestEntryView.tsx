import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGradationsStore } from '../../state/gradationsStore';

const TestEntryView: React.FC = () => {
  const {
    selectedAggregate,
    aggregates,
    activeTests,
    date,
    setDate,
    setCurrentView,
    setSelectedAggregate,
    addActiveTest,
    removeActiveTest,
    updateTestMaterialName,
    updateTestWeight,
    updateTestWashedWeight,
    calculateAllActiveTests,
    saveTests,
    clearActiveTests,
  } = useGradationsStore();

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  const aggregate = aggregates[selectedAggregate];
  if (!aggregate) return null;

  const handleSaveTests = async () => {
    calculateAllActiveTests();
    await saveTests();
    setCurrentView('main');
    setSelectedAggregate('');
  };

  const handleCancel = () => {
    clearActiveTests();
    setCurrentView('main');
    setSelectedAggregate('');
  };

  const focusNextInput = (testIndex: number, sieveIndex: number) => {
    const currentTest = activeTests[testIndex];
    if (sieveIndex < currentTest.sieveData.length - 1) {
      // Next sieve in same test
      const key = `test-${testIndex}-sieve-${sieveIndex + 1}`;
      inputRefs.current[key]?.focus();
    } else {
      // Washed weight if Fine, or next test
      if (aggregate.type === 'Fine') {
        const key = `test-${testIndex}-washed`;
        inputRefs.current[key]?.focus();
      } else if (testIndex < activeTests.length - 1) {
        const key = `test-${testIndex + 1}-sieve-0`;
        inputRefs.current[key]?.focus();
      }
    }
  };

  const focusPreviousInput = (testIndex: number, sieveIndex: number) => {
    if (sieveIndex > 0) {
      const key = `test-${testIndex}-sieve-${sieveIndex - 1}`;
      inputRefs.current[key]?.focus();
    } else if (testIndex > 0) {
      // Previous test's washed weight or last sieve
      if (aggregate.type === 'Fine') {
        const key = `test-${testIndex - 1}-washed`;
        inputRefs.current[key]?.focus();
      } else {
        const prevTest = activeTests[testIndex - 1];
        const key = `test-${testIndex - 1}-sieve-${prevTest.sieveData.length - 1}`;
        inputRefs.current[key]?.focus();
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Pressable onPress={handleCancel} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">
                {selectedAggregate}
              </Text>
              <Text className="text-sm text-gray-500">{aggregate.type} Aggregate</Text>
            </View>
          </View>

          {/* Date Input */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Test Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
            />
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* Active Tests */}
          {activeTests.map((test, testIndex) => (
            <View key={testIndex} className="bg-white m-4 rounded-lg shadow-sm">
              {/* Test Header */}
              <View className="p-4 border-b border-gray-200">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-lg font-semibold text-gray-800">
                    Test {testIndex + 1}
                  </Text>
                  {activeTests.length > 1 && (
                    <Pressable
                      onPress={() => removeActiveTest(testIndex)}
                      className="bg-red-100 rounded-full p-2"
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </Pressable>
                  )}
                </View>

                {/* Material Name */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Material Name
                  </Text>
                  <TextInput
                    value={test.materialName}
                    onChangeText={(text) => updateTestMaterialName(testIndex, text)}
                    placeholder="e.g., Load #123"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                  />
                </View>
              </View>

              {/* Sieve Weights */}
              <View className="p-4">
                <Text className="text-base font-semibold text-gray-800 mb-3">
                  Weight Retained (grams)
                </Text>
                {test.sieveData.map((sieve, sieveIndex) => (
                  <View key={sieveIndex} className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-medium text-gray-700">
                        {sieve.name}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {sieve.size > 0 ? `${sieve.size}mm` : ''}
                      </Text>
                    </View>
                    <TextInput
                      ref={(ref) => {
                        inputRefs.current[`test-${testIndex}-sieve-${sieveIndex}`] = ref;
                      }}
                      value={String(sieve.weightRetained)}
                      onChangeText={(text) => updateTestWeight(testIndex, sieveIndex, text)}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                      onSubmitEditing={() => focusNextInput(testIndex, sieveIndex)}
                      onKeyPress={(e) => {
                        if (e.nativeEvent.key === 'ArrowUp') {
                          focusPreviousInput(testIndex, sieveIndex);
                        } else if (e.nativeEvent.key === 'ArrowDown') {
                          focusNextInput(testIndex, sieveIndex);
                        }
                      }}
                      className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
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
                      ref={(ref) => {
                        inputRefs.current[`test-${testIndex}-washed`] = ref;
                      }}
                      value={test.washedWeight}
                      onChangeText={(text) => updateTestWashedWeight(testIndex, text)}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      returnKeyType={testIndex < activeTests.length - 1 ? 'next' : 'done'}
                      onSubmitEditing={() => {
                        if (testIndex < activeTests.length - 1) {
                          const key = `test-${testIndex + 1}-sieve-0`;
                          inputRefs.current[key]?.focus();
                        }
                      }}
                      className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Add More Tests Button */}
          <View className="mx-4 mb-4">
            <Pressable
              onPress={addActiveTest}
              className="bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg p-4 active:bg-blue-200"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
                <Text className="text-blue-700 font-semibold ml-2">
                  Add Another Test
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Info Box */}
          <View className="mx-4 mb-4">
            <View className="bg-blue-50 rounded-lg p-3">
              <View className="flex-row">
                <Ionicons name="information-circle" size={18} color="#2563eb" />
                <Text className="flex-1 text-sm text-blue-800 ml-2">
                  Enter weight retained on each sieve. Use Tab/Enter to move between
                  fields.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View className="bg-white border-t border-gray-200 p-4 gap-3">
          <Pressable
            onPress={handleSaveTests}
            disabled={activeTests.length === 0}
            className={`rounded-lg py-3 items-center ${
              activeTests.length === 0
                ? 'bg-gray-400'
                : 'bg-green-600 active:bg-green-700'
            }`}
          >
            <Text className="text-white font-semibold text-base">
              Save {activeTests.length} Test{activeTests.length !== 1 ? 's' : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCancel}
            className="border border-gray-300 rounded-lg py-3 items-center active:bg-gray-50"
          >
            <Text className="text-gray-700 font-medium text-base">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default TestEntryView;
