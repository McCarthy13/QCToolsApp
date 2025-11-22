import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import GradationChart from '../components/GradationChart';
import { prepareChartData } from '../utils/aggregate-gradation-calculations';
import ConfirmModal from '../components/ConfirmModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GradationResults'>;
  route: RouteProp<RootStackParamList, 'GradationResults'>;
};

const GradationResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { testId } = route.params;
  const { getTest, deleteTest, aggregates } = useAggregateGradationStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const test = getTest(testId);

  if (!test) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Ionicons name="warning-outline" size={64} color="#9ca3af" />
        <Text className="text-lg text-gray-600 mt-4 text-center">
          Test record not found
        </Text>
        <Pressable
          onPress={() => navigation.navigate('AggregateGradation')}
          className="bg-orange-600 px-6 py-3 rounded-lg mt-6"
        >
          <Text className="text-white font-semibold">Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  const aggregate = aggregates[test.aggregateName];
  const chartData = prepareChartData(test.sieveData);

  const handleShare = async () => {
    try {
      const shareText = `Aggregate Gradation Test Results
      
Aggregate: ${test.aggregateName}
Date: ${test.date}
Total Weight: ${test.totalWeight.toFixed(2)}g
${test.finenessModulus ? `Fineness Modulus: ${test.finenessModulus}` : ''}
${test.decant ? `Decant: ${test.decant}%` : ''}
C33 Compliance: ${test.passC33 ? 'PASS' : 'FAIL'}

Sieve Data:
${test.sieveData.map(s => `${s.name}: ${s.weightRetained}g (${s.percentPassing}% passing)`).join('\n')}`;

      await Share.share({
        message: shareText,
        title: 'Gradation Test Results',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    deleteTest(testId);
    setShowDeleteModal(false);
    navigation.navigate('AggregateGradation');
    Alert.alert('Success', 'Test record deleted successfully');
  };

  const handleNewTest = () => {
    navigation.navigate('GradationTest', { aggregateName: test.aggregateName });
  };

  const handleEdit = () => {
    navigation.navigate('GradationTest', { aggregateName: test.aggregateName, editingTestId: testId });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Pass/Fail Banner */}
        <View className={`p-4 ${test.passC33 ? 'bg-green-100' : 'bg-red-100'}`}>
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons
              name={test.passC33 ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={test.passC33 ? '#16a34a' : '#dc2626'}
            />
            <Text className={`text-lg font-bold ${test.passC33 ? 'text-green-700' : 'text-red-700'}`}>
              {test.passC33 ? 'PASSES' : 'FAILS'} C33 Specifications
            </Text>
          </View>
        </View>

        {/* Key Results */}
        <View className="bg-white p-4 mt-4 mx-4 rounded-lg shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Test Summary</Text>
          
          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-600">Total Weight:</Text>
              <Text className="text-base font-semibold text-gray-800">
                {test.totalWeight.toFixed(2)} g
              </Text>
            </View>

            {test.finenessModulus && (
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600">Fineness Modulus:</Text>
                <Text className="text-base font-semibold text-gray-800">
                  {test.finenessModulus}
                </Text>
              </View>
            )}

            {test.decant && (
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600">Decant:</Text>
                <Text
                  className={`text-base font-semibold ${
                    aggregate?.maxDecant && parseFloat(test.decant) > aggregate.maxDecant
                      ? 'text-red-600'
                      : 'text-gray-800'
                  }`}
                >
                  {test.decant}%
                  {aggregate?.maxDecant && parseFloat(test.decant) > aggregate.maxDecant && ' ⚠️'}
                </Text>
              </View>
            )}

            {test.washedWeight && (
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600">Washed Weight:</Text>
                <Text className="text-base font-semibold text-gray-800">
                  {test.washedWeight.toFixed(2)} g
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chart */}
        <View className="mx-4 mt-4">
          <GradationChart chartData={chartData} showC33Limits={true} />
        </View>

        {/* Detailed Data Table */}
        <View className="bg-white p-4 mt-4 mx-4 rounded-lg shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Sieve Analysis</Text>
          
          {/* Table Header */}
          <View className="flex-row bg-gray-100 p-2 rounded-t-lg">
            <Text className="flex-1 text-xs font-semibold text-gray-700">Sieve</Text>
            <Text className="w-16 text-xs font-semibold text-gray-700 text-right">Retained</Text>
            <Text className="w-16 text-xs font-semibold text-gray-700 text-right">% Ret</Text>
            <Text className="w-16 text-xs font-semibold text-gray-700 text-right">% Pass</Text>
          </View>

          {/* Table Rows */}
          {test.sieveData.map((sieve, index) => {
            const isOutOfSpec =
              sieve.percentPassing &&
              sieve.c33Lower !== '-' &&
              sieve.c33Upper !== '-' &&
              (parseFloat(sieve.percentPassing) < (sieve.c33Lower as number) ||
                parseFloat(sieve.percentPassing) > (sieve.c33Upper as number));

            return (
              <View
                key={index}
                className={`flex-row p-2 border-b border-gray-200 ${isOutOfSpec ? 'bg-red-50' : ''}`}
              >
                <View className="flex-1">
                  <Text className="text-sm text-gray-800 font-medium">{sieve.name}</Text>
                  {sieve.c33Lower !== '-' && sieve.c33Upper !== '-' && (
                    <Text className="text-xs text-gray-500">
                      C33: {sieve.c33Lower}-{sieve.c33Upper}%
                    </Text>
                  )}
                </View>
                <Text className="w-16 text-sm text-gray-800 text-right">
                  {parseFloat(sieve.weightRetained as string).toFixed(0)}
                </Text>
                <Text className="w-16 text-sm text-gray-800 text-right">
                  {sieve.percentRetained || '-'}
                </Text>
                <Text
                  className={`w-16 text-sm text-right font-medium ${
                    isOutOfSpec ? 'text-red-600' : 'text-gray-800'
                  }`}
                >
                  {sieve.percentPassing || '-'}
                  {isOutOfSpec && ' ⚠️'}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View className="bg-white border-t border-gray-200 p-4 gap-3">
        <Pressable
          onPress={handleEdit}
          className="bg-orange-600 rounded-lg py-3 items-center active:bg-orange-700 flex-row justify-center gap-2"
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="text-white font-semibold">Edit Test</Text>
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable
            onPress={handleShare}
            className="flex-1 bg-blue-600 rounded-lg py-3 items-center active:bg-blue-700 flex-row justify-center gap-2"
          >
            <Ionicons name="share-outline" size={20} color="white" />
            <Text className="text-white font-semibold">Share</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            className="flex-1 bg-red-600 rounded-lg py-3 items-center active:bg-red-700 flex-row justify-center gap-2"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="text-white font-semibold">Delete</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleNewTest}
          className="border border-orange-600 rounded-lg py-3 items-center active:bg-orange-50"
        >
          <Text className="text-orange-700 font-semibold">New Test</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('AggregateGradation')}
          className="border border-gray-300 rounded-lg py-3 items-center active:bg-gray-50"
        >
          <Text className="text-gray-700 font-medium">Back to Home</Text>
        </Pressable>
      </View>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Test Record?"
        message="This action cannot be undone. Are you sure you want to delete this test?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        confirmStyle="destructive"
      />
    </View>
  );
};

export default GradationResultsScreen;
