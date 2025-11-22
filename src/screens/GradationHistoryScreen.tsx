import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ConfirmModal from '../components/ConfirmModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GradationHistory'>;
};

const GradationHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { testHistory, aggregates, clearAllTests } = useAggregateGradationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAggregate, setFilterAggregate] = useState<string>('all');
  const [filterCompliance, setFilterCompliance] = useState<string>('all');
  const [showClearModal, setShowClearModal] = useState(false);

  // Get unique aggregate names from history
  const aggregateNames = useMemo(() => {
    const names = new Set(testHistory.map(t => t.aggregateName));
    return Array.from(names).sort();
  }, [testHistory]);

  // Filter tests based on search and filters
  const filteredTests = useMemo(() => {
    return testHistory.filter(test => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          test.aggregateName.toLowerCase().includes(query) ||
          test.date.includes(query) ||
          test.id.includes(query);
        if (!matchesSearch) return false;
      }

      // Aggregate filter
      if (filterAggregate !== 'all' && test.aggregateName !== filterAggregate) {
        return false;
      }

      // Compliance filter
      if (filterCompliance === 'pass' && !test.passC33) return false;
      if (filterCompliance === 'fail' && test.passC33) return false;

      return true;
    });
  }, [testHistory, searchQuery, filterAggregate, filterCompliance]);

  const handleTestPress = (testId: string) => {
    navigation.navigate('GradationResults', { testId });
  };

  const handleClearAll = () => {
    setShowClearModal(true);
  };

  const handleConfirmClear = () => {
    clearAllTests();
    setShowClearModal(false);
    Alert.alert('Success', 'All test records have been cleared');
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="bg-gray-100 rounded-lg flex-row items-center px-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by aggregate, date, or ID..."
            placeholderTextColor="#9ca3af"
            cursorColor="#000000"
            className="flex-1 py-2 px-2 text-base"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row gap-3">
          {/* Aggregate Filter */}
          <View className="flex-1">
            <Text className="text-xs font-medium text-gray-600 mb-1">Aggregate</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setFilterAggregate('all')}
                  className={`px-3 py-1.5 rounded-full ${
                    filterAggregate === 'all' ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      filterAggregate === 'all' ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    All
                  </Text>
                </Pressable>
                {aggregateNames.map(name => (
                  <Pressable
                    key={name}
                    onPress={() => setFilterAggregate(name)}
                    className={`px-3 py-1.5 rounded-full ${
                      filterAggregate === name ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        filterAggregate === name ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Compliance Filter */}
        <View className="flex-row gap-2 mt-3">
          <Pressable
            onPress={() => setFilterCompliance('all')}
            className={`px-4 py-1.5 rounded-full ${
              filterCompliance === 'all' ? 'bg-orange-600' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filterCompliance === 'all' ? 'text-white' : 'text-gray-700'
              }`}
            >
              All Tests
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterCompliance('pass')}
            className={`px-4 py-1.5 rounded-full ${
              filterCompliance === 'pass' ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filterCompliance === 'pass' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Passed
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterCompliance('fail')}
            className={`px-4 py-1.5 rounded-full ${
              filterCompliance === 'fail' ? 'bg-red-600' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filterCompliance === 'fail' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Failed
            </Text>
          </Pressable>
        </View>

        {/* Results Count */}
        <View className="mt-3 flex-row justify-between items-center">
          <Text className="text-sm text-gray-600">
            {filteredTests.length} {filteredTests.length === 1 ? 'test' : 'tests'} found
          </Text>
          {testHistory.length > 0 && (
            <Pressable onPress={handleClearAll} className="flex-row items-center gap-1">
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text className="text-sm text-red-500 font-medium">Clear All</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Test List */}
      <ScrollView className="flex-1">
        {filteredTests.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8 mt-20">
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text className="text-lg text-gray-600 mt-4 text-center">
              {testHistory.length === 0
                ? 'No test records yet'
                : 'No tests match your filters'}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {testHistory.length === 0
                ? 'Start a new test to see it here'
                : 'Try adjusting your search or filters'}
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {filteredTests.map(test => {
              const aggregate = aggregates[test.aggregateName];
              return (
                <Pressable
                  key={test.id}
                  onPress={() => handleTestPress(test.id)}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {test.aggregateName}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-0.5">
                        {test.date} • {formatTimestamp(test.timestamp)}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded ${
                        test.passC33 ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          test.passC33 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {test.passC33 ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-4 mt-2">
                    {aggregate && (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="layers-outline" size={14} color="#6b7280" />
                        <Text className="text-xs text-gray-600">{aggregate.type}</Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="scale-outline" size={14} color="#6b7280" />
                      <Text className="text-xs text-gray-600">
                        {test.totalWeight.toFixed(0)}g
                      </Text>
                    </View>
                    {test.finenessModulus && (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="analytics-outline" size={14} color="#6b7280" />
                        <Text className="text-xs text-gray-600">FM: {test.finenessModulus}</Text>
                      </View>
                    )}
                    {test.decant && (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="water-outline" size={14} color="#6b7280" />
                        <Text className="text-xs text-gray-600">D: {test.decant}%</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-500">ID: {test.id.slice(-8)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        visible={showClearModal}
        title="Clear All Test Records?"
        message="This will permanently delete all test records. This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearModal(false)}
        confirmStyle="destructive"
      />
    </View>
  );
};

export default GradationHistoryScreen;
