import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGradationsStore } from '../state/gradationsStore';
import TestEntryView from '../components/gradations/TestEntryView';
import RepositoryView from '../components/gradations/RepositoryView';
import AdminView from '../components/gradations/AdminView';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateGradation'>;
};

const AggregateGradationScreen: React.FC<Props> = ({ navigation }) => {
  const {
    currentView,
    selectedAggregate,
    aggregates,
    defaultAggregates,
    error,
    successMessage,
    setCurrentView,
    setSelectedAggregate,
    loadAggregates,
    loadRecords,
    loadDefaultAggregates,
    setError,
    setSuccessMessage,
  } = useGradationsStore();

  useEffect(() => {
    // Load data on mount
    loadAggregates();
    loadRecords();
    loadDefaultAggregates();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const renderMainView = () => {
    const aggregateList = Object.entries(aggregates);
    const defaultAggs = aggregateList.filter(([name]) => defaultAggregates.includes(name));
    const otherAggs = aggregateList.filter(([name]) => !defaultAggregates.includes(name));

    return (
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-blue-600 p-6">
          <Text className="text-2xl font-bold text-white mb-2">
            Aggregate Gradation Testing
          </Text>
          <Text className="text-blue-100">
            Select an aggregate to begin testing
          </Text>
        </View>

        {/* Default Aggregates */}
        {defaultAggs.length > 0 && (
          <View className="p-4">
            <Text className="text-sm font-semibold text-gray-600 mb-3 uppercase">
              Default Aggregates
            </Text>
            <View className="gap-3">
              {defaultAggs.map(([name, config]) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    setSelectedAggregate(name);
                    setCurrentView('main');
                  }}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50 border-l-4 border-blue-600"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">
                        {name}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {config.type} • {config.sieves.length} sieves
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Other Aggregates */}
        {otherAggs.length > 0 && (
          <View className="p-4">
            <Text className="text-sm font-semibold text-gray-600 mb-3 uppercase">
              All Aggregates
            </Text>
            <View className="gap-3">
              {otherAggs.map(([name, config]) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    setSelectedAggregate(name);
                    setCurrentView('main');
                  }}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">
                        {name}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {config.type} • {config.sieves.length} sieves
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {aggregateList.length === 0 && (
          <View className="p-6 items-center">
            <Ionicons name="warning-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-center mt-4">
              No aggregates configured. Visit the Admin panel to add aggregates.
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View className="p-4 gap-3 mb-6">
          <Pressable
            onPress={() => setCurrentView('repository')}
            className="bg-purple-600 rounded-lg p-4 active:bg-purple-700"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="folder-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                View Test Repository
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setCurrentView('admin')}
            className="bg-gray-600 rounded-lg p-4 active:bg-gray-700"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="settings-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Admin Panel
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Status Messages */}
      {error && (
        <View className="bg-red-100 border-l-4 border-red-600 p-3 mx-4 mt-2 rounded">
          <View className="flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text className="text-red-700 ml-2 flex-1">{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <Ionicons name="close" size={20} color="#dc2626" />
            </Pressable>
          </View>
        </View>
      )}

      {successMessage && (
        <View className="bg-green-100 border-l-4 border-green-600 p-3 mx-4 mt-2 rounded">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text className="text-green-700 ml-2 flex-1">{successMessage}</Text>
            <Pressable onPress={() => setSuccessMessage(null)}>
              <Ionicons name="close" size={20} color="#16a34a" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Main Content */}
      {currentView === 'main' && !selectedAggregate && renderMainView()}
      {currentView === 'main' && selectedAggregate && <TestEntryView />}
      {currentView === 'repository' && <RepositoryView />}
      {currentView === 'admin' && <AdminView />}
    </SafeAreaView>
  );
};

export default AggregateGradationScreen;
