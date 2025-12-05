import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGradationsStore } from '../../state/gradationsStore';

const AdminView: React.FC = () => {
  const {
    aggregates,
    defaultAggregates,
    setCurrentView,
    deleteAggregate,
    confirmingDelete,
    setConfirmingDelete,
  } = useGradationsStore();

  const aggregateList = Object.entries(aggregates);

  const handleDeleteAggregate = (name: string) => {
    deleteAggregate(name);
    setConfirmingDelete(null);
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-gray-600 p-4">
        <View className="flex-row items-center">
          <Pressable onPress={() => setCurrentView('main')} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">Admin Panel</Text>
            <Text className="text-gray-200 text-sm">Manage aggregate configurations</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Info Banner */}
        <View className="bg-blue-50 m-4 p-3 rounded-lg">
          <View className="flex-row">
            <Ionicons name="information-circle" size={18} color="#2563eb" />
            <Text className="flex-1 text-sm text-blue-800 ml-2">
              Configure aggregate profiles and manage default selections. Changes are saved automatically.
            </Text>
          </View>
        </View>

        {/* Aggregates List */}
        <View className="mx-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-800">
              Aggregate Profiles ({aggregateList.length})
            </Text>
            <Pressable className="bg-green-600 px-4 py-2 rounded active:bg-green-700">
              <View className="flex-row items-center">
                <Ionicons name="add" size={18} color="white" />
                <Text className="text-white font-medium text-sm ml-1">Add New</Text>
              </View>
            </Pressable>
          </View>

          <View className="gap-3 mb-6">
            {aggregateList.map(([name, config]) => (
              <View key={name} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-base font-semibold text-gray-800">
                          {name}
                        </Text>
                        {defaultAggregates.includes(name) && (
                          <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-blue-700 font-medium">DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm text-gray-500 mt-1">
                        {config.type} • {config.sieves.length} sieves
                      </Text>
                    </View>
                  </View>

                  {/* Sieve List */}
                  <View className="mt-3 bg-gray-50 rounded p-2">
                    <Text className="text-xs font-medium text-gray-600 mb-1">Sieves:</Text>
                    <Text className="text-xs text-gray-600">
                      {config.sieves.map(s => s.name).join(', ')}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="border-t border-gray-200 flex-row">
                  <Pressable className="flex-1 py-3 items-center active:bg-gray-50">
                    <View className="flex-row items-center">
                      <Ionicons name="create-outline" size={16} color="#2563eb" />
                      <Text className="text-blue-600 text-sm font-medium ml-1">Edit</Text>
                    </View>
                  </Pressable>
                  <View className="w-px bg-gray-200" />
                  <Pressable
                    onPress={() => setConfirmingDelete(name)}
                    className="flex-1 py-3 items-center active:bg-gray-50"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      <Text className="text-red-600 text-sm font-medium ml-1">Delete</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Delete Confirmation */}
                {confirmingDelete === name && (
                  <View className="bg-red-50 border-t border-red-200 p-4">
                    <Text className="text-sm text-red-800 mb-3 text-center">
                      Delete "{name}"? This cannot be undone.
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleDeleteAggregate(name)}
                        className="flex-1 bg-red-600 py-2 rounded active:bg-red-700"
                      >
                        <Text className="text-white text-center font-medium">Delete</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirmingDelete(null)}
                        className="flex-1 bg-gray-300 py-2 rounded active:bg-gray-400"
                      >
                        <Text className="text-gray-700 text-center font-medium">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Default Aggregates Section */}
        <View className="mx-4 mb-6">
          <Pressable
            onPress={() => setCurrentView('configureDefaults')}
            className="bg-orange-600 rounded-lg p-4 active:bg-orange-700"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  Configure Default Aggregates
                </Text>
                <Text className="text-orange-100 text-sm mt-1">
                  {defaultAggregates.length} default{defaultAggregates.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default AdminView;
