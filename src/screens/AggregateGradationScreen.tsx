import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateGradation'>;
};

const AggregateGradationScreen: React.FC<Props> = ({ navigation }) => {
  const { aggregates } = useAggregateGradationStore();
  const aggregateList = Object.entries(aggregates);

  const handleAggregateSelect = (name: string) => {
    navigation.navigate('GradationTest', { aggregateName: name });
  };

  const handleViewHistory = () => {
    navigation.navigate('GradationHistory');
  };

  const handleAdminPanel = () => {
    navigation.navigate('GradationAdmin');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-orange-600 p-6 pb-8">
          <Text className="text-2xl font-bold text-white mb-2">
            Aggregate Gradation Analysis
          </Text>
          <Text className="text-orange-100">
            Select an aggregate to begin testing
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="px-4 py-4 gap-3">
          <Pressable
            onPress={handleViewHistory}
            className="bg-white rounded-lg p-4 flex-row items-center justify-between shadow-sm active:bg-gray-50"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                <Ionicons name="list" size={20} color="#2563eb" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-800">
                  Test Repository
                </Text>
                <Text className="text-sm text-gray-500">
                  View saved test records
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={handleAdminPanel}
            className="bg-white rounded-lg p-4 flex-row items-center justify-between shadow-sm active:bg-gray-50"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                <Ionicons name="settings" size={20} color="#9333ea" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-800">
                  Admin Panel
                </Text>
                <Text className="text-sm text-gray-500">
                  Manage aggregate configurations
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Aggregate List */}
        <View className="px-4 pb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Available Aggregates
          </Text>

          {aggregateList.length === 0 ? (
            <View className="bg-white rounded-lg p-6 items-center">
              <Ionicons name="warning-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-3 text-center">
                No aggregates configured. Visit Admin Panel to add aggregates.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {aggregateList.map(([name, config]) => (
                <Pressable
                  key={name}
                  onPress={() => handleAggregateSelect(name)}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {name}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <View
                          className={`px-2 py-1 rounded ${
                            config.type === 'Fine'
                              ? 'bg-green-100'
                              : 'bg-blue-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              config.type === 'Fine'
                                ? 'text-green-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {config.type}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-500">
                          {config.sieves.length} sieves
                        </Text>
                      </View>
                      {config.maxDecant && (
                        <Text className="text-xs text-gray-500 mt-1">
                          Max Decant: {config.maxDecant}%
                        </Text>
                      )}
                    </View>
                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                      <Ionicons name="chevron-forward" size={20} color="#ea580c" />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View className="px-4 pb-6">
          <View className="bg-blue-50 rounded-lg p-4">
            <View className="flex-row gap-2">
              <Ionicons name="information-circle" size={20} color="#2563eb" />
              <View className="flex-1">
                <Text className="text-sm text-blue-900 font-medium mb-1">
                  About Gradation Testing
                </Text>
                <Text className="text-sm text-blue-800">
                  This tool helps you perform sieve analysis on aggregates to determine their gradation. Results are automatically checked against ASTM C33 specifications.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AggregateGradationScreen;
