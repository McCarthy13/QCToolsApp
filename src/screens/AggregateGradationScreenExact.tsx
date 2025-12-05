import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useGradationsStore } from '../state/gradationsStore';
import { calculateTestData } from '../utils/aggregate-gradation-calculations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateGradation'>;
};

const AggregateGradationScreen: React.FC<Props> = ({ navigation }) => {
  const store = useGradationsStore();

  useEffect(() => {
    store.loadAggregates();
    store.loadRecords();
    store.loadDefaultAggregates();

    // Initialize with default tests
    if (store.activeTests.length === 0 && store.defaultAggregates.length > 0) {
      store.defaultAggregates.forEach(aggName => {
        const agg = store.aggregates[aggName];
        if (agg) {
          const newTest = {
            aggregateName: aggName,
            date: new Date().toISOString().split('T')[0],
            materialName: '',
            sieveData: agg.sieves.map(s => ({
              ...s,
              weightRetained: '',
              percentRetained: '0',
              cumulativeRetained: '0',
              percentPassing: '100'
            })),
            washedWeight: '',
            decant: '0.00',
            finenessModulus: 'N/A',
            totalWeight: 0,
            passes: true
          };
          store.activeTests.push(newTest);
        }
      });
    }
  }, []);

  if (store.currentView === 'repository') {
    return <RepositoryView />;
  }

  if (store.currentView === 'admin') {
    return <AdminView />;
  }

  if (store.currentView === 'configureDefaults') {
    return <ConfigureDefaultsView />;
  }

  // Main view
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-3">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-bold text-gray-800">
            Aggregate Gradation Analysis
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => store.setShowPrintModal(true)}
              className="px-3 py-1.5 bg-blue-600 rounded active:bg-blue-700"
            >
              <Text className="text-white text-sm">Print Forms</Text>
            </Pressable>
            <Pressable
              onPress={() => store.setCurrentView('repository')}
              className="px-3 py-1.5 bg-green-600 rounded active:bg-green-700"
            >
              <Text className="text-white text-sm">View Records</Text>
            </Pressable>
            <Pressable
              onPress={() => store.setCurrentView('admin')}
              className="px-3 py-1.5 bg-purple-600 rounded active:bg-purple-700"
            >
              <Text className="text-white text-sm">Configure</Text>
            </Pressable>
          </View>
        </View>

        {/* Set All Dates Section */}
        {store.activeTests.length > 0 && (
          <View className="bg-white rounded-lg shadow-md p-3 mb-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-medium text-gray-700">
                  Set all test dates:
                </Text>
                <TextInput
                  value={store.date}
                  onChangeText={store.setDate}
                  placeholder="YYYY-MM-DD"
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-44"
                />
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => store.setDate(new Date().toISOString().split('T')[0])}
                    className="px-2 py-1 bg-blue-600 rounded active:bg-blue-700"
                  >
                    <Text className="text-white text-sm">Today</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      store.activeTests.forEach((test, i) => {
                        test.date = store.date;
                      });
                    }}
                    className="px-3 py-1 bg-gray-600 rounded active:bg-gray-700"
                  >
                    <Text className="text-white text-sm">Apply to All</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => store.setShowNoProductionDateRange(true)}
                    className="px-3 py-1 bg-orange-600 rounded active:bg-orange-700"
                  >
                    <Text className="text-white text-sm">No Production</Text>
                  </Pressable>
                </View>
              </View>
              <Text className="text-xs text-gray-500">
                Individual test dates can still be changed below
              </Text>
            </View>
          </View>
        )}

        {/* Error/Success Messages */}
        {store.error && (
          <View className="bg-red-100 border border-red-400 px-3 py-2 rounded mb-3">
            <Text className="text-red-700 text-sm">{store.error}</Text>
          </View>
        )}
        {store.successMessage && (
          <View className="bg-green-100 border border-green-400 px-3 py-2 rounded mb-3">
            <Text className="text-green-700 text-sm">{store.successMessage}</Text>
          </View>
        )}

        {/* Active Tests Grid */}
        {store.activeTests.length === 0 ? (
          <View className="bg-white rounded-lg shadow-md p-4 mb-4 items-center">
            <Text className="text-gray-600 mb-4">
              No active tests. Configure your default aggregates to get started.
            </Text>
            <Pressable
              onPress={() => store.setCurrentView('configureDefaults')}
              className="px-3 py-1.5 bg-orange-600 rounded active:bg-orange-700"
            >
              <Text className="text-white text-sm">Configure Defaults</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {store.activeTests.map((test, index) => (
              <TestTable key={index} test={test} testIndex={index} />
            ))}
          </View>
        )}

        {/* Add More Section */}
        <View className="bg-white rounded-lg shadow-md p-4 mb-4 mt-3">
          {!store.showAddMore ? (
            <Pressable
              onPress={() => store.setShowAddMore(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg"
            >
              <Text className="text-gray-600 text-center text-sm">
                + Add More Aggregates
              </Text>
            </Pressable>
          ) : (
            <View>
              <Text className="text-base font-semibold mb-3">Add Another Test</Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Aggregate
                  </Text>
                  {/* TODO: Dropdown picker */}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Date</Text>
                  <TextInput
                    value={store.date}
                    onChangeText={store.setDate}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </View>
                <View className="flex-row items-end gap-2">
                  <Pressable className="px-3 py-1.5 bg-green-600 rounded active:bg-green-700">
                    <Text className="text-white text-sm">Add</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => store.setShowAddMore(false)}
                    className="px-3 py-1.5 bg-gray-400 rounded active:bg-gray-500"
                  >
                    <Text className="text-white text-sm">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Test Table Component - EXACT replica of HTML table
const TestTable: React.FC<{ test: any; testIndex: number }> = ({ test, testIndex }) => {
  const store = useGradationsStore();
  const aggregate = store.aggregates[test.aggregateName];
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  if (!aggregate) return null;

  const totalWeight = test.sieveData.reduce(
    (sum: number, row: any) => sum + (parseFloat(row.weightRetained) || 0),
    0
  );

  const handleWeightChange = (sieveIndex: number, value: string) => {
    const newTests = [...store.activeTests];
    newTests[testIndex].sieveData[sieveIndex].weightRetained = value;
    newTests[testIndex].sieveData = calculateTestData(newTests[testIndex].sieveData);
    // Update store
  };

  return (
    <View className="bg-white rounded-lg shadow-md p-2" style={{ width: '49%' }}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-semibold">{test.aggregateName}</Text>
        <View className="flex-row gap-1">
          <TextInput
            value={test.date}
            onChangeText={(val) => {
              store.activeTests[testIndex].date = val;
            }}
            className="px-1 py-0.5 text-xs border border-gray-300 rounded"
            style={{ width: 120 }}
          />
          {store.activeTests.length > 1 && (
            <Pressable
              onPress={() => store.removeActiveTest(testIndex)}
              className="px-2 py-0.5 bg-red-600 rounded active:bg-red-700"
            >
              <Text className="text-white text-xs">Remove</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* TABLE - This needs to be scrollable */}
      <ScrollView horizontal>
        <View>
          {/* Table Header */}
          <View className="flex-row bg-gray-100 border border-gray-300">
            <Text className="border-r border-gray-300 px-1 py-0.5 text-xs w-16">Sieve</Text>
            <Text className="border-r border-gray-300 px-1 py-0.5 text-xs w-12">Weight</Text>
            <Text className="border-r border-gray-300 px-1 py-0.5 text-xs w-16">% Ret.</Text>
            <Text className="border-r border-gray-300 px-1 py-0.5 text-xs w-16">Cum. %</Text>
            <Text className="border-r border-gray-300 px-1 py-0.5 text-xs w-12">Pass %</Text>
            <Text className="border-r border-gray-300 px-1 py-0.5 text-xs w-12">Lower</Text>
            <Text className="px-1 py-0.5 text-xs w-12">Upper</Text>
          </View>

          {/* Table Body */}
          {test.sieveData.map((row: any, sieveIndex: number) => (
            <View
              key={sieveIndex}
              className={`flex-row border-b border-gray-300 ${
                sieveIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <Text className="border-r border-gray-300 px-1 py-0 text-xs w-16 bg-gray-100">
                {row.name}
              </Text>
              <View className="border-r border-gray-300 w-12">
                <TextInput
                  ref={(ref) => { inputRefs.current[`${testIndex}-${sieveIndex}`] = ref; }}
                  value={String(row.weightRetained)}
                  onChangeText={(val) => handleWeightChange(sieveIndex, val)}
                  keyboardType="numeric"
                  className="w-full px-0.5 py-0 text-xs"
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    // Move to next input
                    const nextRef =
                      inputRefs.current[`${testIndex}-${sieveIndex + 1}`];
                    if (nextRef) nextRef.focus();
                  }}
                />
              </View>
              <Text className="border-r border-gray-300 px-1 py-0 text-center text-xs w-16 bg-gray-100">
                {row.percentRetained}
              </Text>
              <Text className="border-r border-gray-300 px-1 py-0 text-center text-xs w-16 bg-gray-100">
                {row.cumulativeRetained}
              </Text>
              <Text className="border-r border-gray-300 px-1 py-0 text-center text-xs w-12 bg-gray-100">
                {row.percentPassing}
              </Text>
              <Text className="border-r border-gray-300 px-1 py-0 text-center text-xs w-12 bg-gray-100">
                {row.c33Lower === '-' ? '-' : row.c33Lower}
              </Text>
              <Text className="px-1 py-0 text-center text-xs w-12 bg-gray-100">
                {row.c33Upper === '-' ? '-' : row.c33Upper}
              </Text>
            </View>
          ))}

          {/* Footer Row */}
          <View className="flex-row bg-yellow-100 border-t border-gray-300">
            <Text className="border-r border-gray-300 px-1 py-0.5 font-semibold text-xs w-16 bg-gray-100">
              Total
            </Text>
            <Text className="border-r border-gray-300 px-1 py-0.5 text-center font-semibold text-xs w-12 bg-gray-100">
              {totalWeight.toFixed(1)}
            </Text>
            <View className="border-r border-gray-300 w-16 bg-gray-100 flex-row items-center">
              <Text className="text-gray-600 text-xs px-1">F.M.:</Text>
              <Text className="font-bold text-xs">{test.finenessModulus}</Text>
            </View>
            <View className="border-r border-gray-300 w-16 flex-row items-center justify-center">
              <Text className="text-gray-600 text-xs">Washed:</Text>
              <TextInput
                value={test.washedWeight}
                onChangeText={(val) => {
                  store.activeTests[testIndex].washedWeight = val;
                }}
                keyboardType="numeric"
                placeholder="g"
                className="text-xs text-center w-12"
              />
            </View>
            <View className="w-36 bg-gray-100 flex-row items-center justify-center">
              <Text className="text-gray-600 text-xs">Decant:</Text>
              <Text className="font-bold text-xs ml-1">{test.decant}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View className="mt-1 flex-row gap-1">
        <Pressable
          onPress={() => {
            // Submit test
          }}
          className="px-2 py-0.5 bg-blue-600 rounded active:bg-blue-700"
        >
          <Text className="text-white text-xs">Submit {test.aggregateName}</Text>
        </Pressable>
        <Pressable className="px-2 py-0.5 bg-purple-600 rounded active:bg-purple-700">
          <Text className="text-white text-xs">View Chart</Text>
        </Pressable>
      </View>
    </View>
  );
};

// Placeholder components
const RepositoryView = () => <View><Text>Repository View</Text></View>;
const AdminView = () => <View><Text>Admin View</Text></View>;
const ConfigureDefaultsView = () => <View><Text>Configure Defaults</Text></View>;

export default AggregateGradationScreen;
