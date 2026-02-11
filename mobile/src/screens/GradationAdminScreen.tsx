import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateGradationStore } from '../state/aggregateGradationStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { DEFAULT_AGGREGATES } from '../utils/aggregate-gradation-constants';
import ConfirmModal from '../components/ConfirmModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GradationAdmin'>;
};

const GradationAdminScreen: React.FC<Props> = ({ navigation }) => {
  const { aggregates, deleteAggregate, addAggregate } = useAggregateGradationStore();
  const [expandedAggregate, setExpandedAggregate] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aggregateToDelete, setAggregateToDelete] = useState<string | null>(null);

  const aggregateList = Object.entries(aggregates);
  const defaultAggregateNames = Object.keys(DEFAULT_AGGREGATES);

  const handleDeleteAggregate = (name: string) => {
    setAggregateToDelete(name);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (aggregateToDelete) {
      deleteAggregate(aggregateToDelete);
      setShowDeleteModal(false);
      setAggregateToDelete(null);
      Alert.alert('Success', 'Aggregate configuration deleted');
    }
  };

  const handleRestoreDefaults = () => {
    Alert.alert(
      'Restore Default Aggregates',
      'This will restore all 4 default aggregate configurations. Custom aggregates will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            Object.entries(DEFAULT_AGGREGATES).forEach(([name, config]) => {
              addAggregate(name, config);
            });
            Alert.alert('Success', 'Default aggregates restored');
          },
        },
      ]
    );
  };

  const toggleExpanded = (name: string) => {
    setExpandedAggregate(expandedAggregate === name ? null : name);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Action Buttons */}
        <View className="p-4 gap-3">
          <Pressable
            onPress={() => navigation.navigate('GradationAddEditAggregate', {})}
            className="bg-orange-600 rounded-lg p-4 flex-row items-center justify-center gap-2 active:bg-orange-700"
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text className="text-white font-semibold">Add New Aggregate</Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreDefaults}
            className="bg-blue-600 rounded-lg p-4 flex-row items-center justify-center gap-2 active:bg-blue-700"
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text className="text-white font-semibold">Restore Default Aggregates</Text>
          </Pressable>

          <View className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <View className="flex-row gap-2">
              <Ionicons name="information-circle" size={18} color="#d97706" />
              <Text className="flex-1 text-sm text-yellow-800">
                Default aggregates are: {defaultAggregateNames.join(', ')}. You can delete and restore them as needed.
              </Text>
            </View>
          </View>
        </View>

        {/* Aggregates List */}
        <View className="px-4 pb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Configured Aggregates ({aggregateList.length})
          </Text>

          {aggregateList.length === 0 ? (
            <View className="bg-white rounded-lg p-6 items-center">
              <Ionicons name="warning-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-3 text-center">
                No aggregates configured. Restore defaults to get started.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {aggregateList.map(([name, config]) => {
                const isExpanded = expandedAggregate === name;
                const isDefault = defaultAggregateNames.includes(name);

                return (
                  <View key={name} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Header */}
                    <Pressable
                      onPress={() => toggleExpanded(name)}
                      className="p-4 active:bg-gray-50"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-lg font-semibold text-gray-800">{name}</Text>
                            {isDefault && (
                              <View className="bg-blue-100 px-2 py-0.5 rounded">
                                <Text className="text-xs font-medium text-blue-700">Default</Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center gap-3 mt-1">
                            <View
                              className={`px-2 py-1 rounded ${
                                config.type === 'Fine' ? 'bg-green-100' : 'bg-blue-100'
                              }`}
                            >
                              <Text
                                className={`text-xs font-medium ${
                                  config.type === 'Fine' ? 'text-green-700' : 'text-blue-700'
                                }`}
                              >
                                {config.type}
                              </Text>
                            </View>
                            <Text className="text-sm text-gray-600">
                              {config.sieves.length} sieves
                            </Text>
                            {config.maxDecant && (
                              <Text className="text-sm text-gray-600">
                                Max Decant: {config.maxDecant}%
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={24}
                          color="#9ca3af"
                        />
                      </View>
                    </Pressable>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <View className="border-t border-gray-200">
                        {/* Sieve Configuration Table */}
                        <View className="p-4">
                          <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Sieve Configuration
                          </Text>

                          {/* Table Header */}
                          <View className="flex-row bg-gray-100 p-2 rounded-t-lg">
                            <Text className="flex-1 text-xs font-semibold text-gray-700">
                              Sieve
                            </Text>
                            <Text className="w-20 text-xs font-semibold text-gray-700 text-right">
                              Size (mm)
                            </Text>
                            <Text className="w-24 text-xs font-semibold text-gray-700 text-right">
                              C33 Lower
                            </Text>
                            <Text className="w-24 text-xs font-semibold text-gray-700 text-right">
                              C33 Upper
                            </Text>
                          </View>

                          {/* Table Rows */}
                          {config.sieves.map((sieve, index) => (
                            <View
                              key={index}
                              className="flex-row p-2 border-b border-gray-200"
                            >
                              <Text className="flex-1 text-sm text-gray-800 font-medium">
                                {sieve.name}
                              </Text>
                              <Text className="w-20 text-sm text-gray-600 text-right">
                                {sieve.size > 0 ? sieve.size : '-'}
                              </Text>
                              <Text className="w-24 text-sm text-gray-600 text-right">
                                {sieve.c33Lower !== '-' ? `${sieve.c33Lower}%` : '-'}
                              </Text>
                              <Text className="w-24 text-sm text-gray-600 text-right">
                                {sieve.c33Upper !== '-' ? `${sieve.c33Upper}%` : '-'}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Actions */}
                        <View className="p-4 border-t border-gray-200 bg-gray-50 flex-row gap-3">
                          <Pressable
                            onPress={() => navigation.navigate('GradationAddEditAggregate', { aggregateName: name })}
                            className="flex-1 bg-blue-600 rounded-lg py-2 px-4 flex-row items-center justify-center gap-2 active:bg-blue-700"
                          >
                            <Ionicons name="create-outline" size={18} color="white" />
                            <Text className="text-white font-semibold">Edit</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleDeleteAggregate(name)}
                            className="flex-1 bg-red-600 rounded-lg py-2 px-4 flex-row items-center justify-center gap-2 active:bg-red-700"
                          >
                            <Ionicons name="trash-outline" size={18} color="white" />
                            <Text className="text-white font-semibold">Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
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
                  About Aggregate Configuration
                </Text>
                <Text className="text-sm text-blue-800">
                  Each aggregate has specific sieve sizes and C33 specification limits (ASTM C33). The gradation test results are automatically checked against these limits.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Aggregate?"
        message={`Are you sure you want to delete "${aggregateToDelete}"? This will not affect existing test records.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setAggregateToDelete(null);
        }}
        confirmStyle="destructive"
      />
    </View>
  );
};

export default GradationAdminScreen;
