import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGradationsStore } from '../../state/gradationsStore';
import { TestRecord } from '../../types/aggregate-gradation';
import RecordDetailModal from './RecordDetailModal';

const RepositoryView: React.FC = () => {
  const {
    savedRecords,
    filterAggregate,
    filterType,
    filterDateFrom,
    filterDateTo,
    filterMaterialName,
    aggregates,
    setCurrentView,
    setFilterAggregate,
    setFilterType,
    setFilterDateFrom,
    setFilterDateTo,
    setFilterMaterialName,
    deleteRecord,
    confirmingDeleteRecord,
    setConfirmingDeleteRecord,
  } = useGradationsStore();

  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);

  // Filter records
  const filteredRecords = savedRecords.filter((record) => {
    if (filterAggregate && record.aggregateName !== filterAggregate) return false;
    if (filterType && record.aggregateType !== filterType) return false;
    if (filterMaterialName && !record.materialName?.toLowerCase().includes(filterMaterialName.toLowerCase())) return false;
    if (filterDateFrom && record.date < filterDateFrom) return false;
    if (filterDateTo && record.date > filterDateTo) return false;
    return true;
  });

  const handleDeleteRecord = (id: string) => {
    deleteRecord(id);
    setConfirmingDeleteRecord(null);
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-purple-600 p-4">
        <View className="flex-row items-center mb-3">
          <Pressable onPress={() => setCurrentView('main')} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">Test Repository</Text>
            <Text className="text-purple-100 text-sm">
              {filteredRecords.length} of {savedRecords.length} records
            </Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white p-4 border-b border-gray-200">
        <Text className="text-sm font-semibold text-gray-700 mb-3">Filters</Text>

        <View className="gap-3">
          {/* Aggregate Filter */}
          <View>
            <Text className="text-xs text-gray-600 mb-1">Aggregate</Text>
            <TextInput
              value={filterAggregate}
              onChangeText={setFilterAggregate}
              placeholder="Filter by aggregate..."
              className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </View>

          {/* Type Filter */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setFilterType('')}
              className={`flex-1 py-2 px-3 rounded ${
                filterType === '' ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  filterType === '' ? 'text-white' : 'text-gray-700'
                }`}
              >
                All
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterType('Fine')}
              className={`flex-1 py-2 px-3 rounded ${
                filterType === 'Fine' ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  filterType === 'Fine' ? 'text-white' : 'text-gray-700'
                }`}
              >
                Fine
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterType('Coarse')}
              className={`flex-1 py-2 px-3 rounded ${
                filterType === 'Coarse' ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  filterType === 'Coarse' ? 'text-white' : 'text-gray-700'
                }`}
              >
                Coarse
              </Text>
            </Pressable>
          </View>

          {/* Material Name Filter */}
          <View>
            <Text className="text-xs text-gray-600 mb-1">Material Name</Text>
            <TextInput
              value={filterMaterialName}
              onChangeText={setFilterMaterialName}
              placeholder="Filter by material..."
              className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </View>

          {/* Clear Filters */}
          {(filterAggregate || filterType || filterMaterialName || filterDateFrom || filterDateTo) && (
            <Pressable
              onPress={() => {
                setFilterAggregate('');
                setFilterType('');
                setFilterMaterialName('');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              className="py-2"
            >
              <Text className="text-purple-600 text-center text-sm font-medium">
                Clear All Filters
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Records List */}
      <ScrollView className="flex-1">
        {filteredRecords.length === 0 ? (
          <View className="p-6 items-center">
            <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-center mt-4">
              {savedRecords.length === 0
                ? 'No test records yet. Start by conducting a test.'
                : 'No records match your filters.'}
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {filteredRecords.map((record) => (
              <View key={record.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <Pressable
                  onPress={() => setSelectedRecord(record)}
                  className="p-4 active:bg-gray-50"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">
                        {record.aggregateName}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {record.materialName || 'No material name'}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded ${
                        record.passes ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          record.passes ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {record.passes ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-4 mt-2">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text className="text-xs text-gray-600 ml-1">{record.date}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="analytics-outline" size={14} color="#6b7280" />
                      <Text className="text-xs text-gray-600 ml-1">
                        {record.aggregateType}
                      </Text>
                    </View>
                    {record.aggregateType === 'Fine' && record.finenessModulus && (
                      <View className="flex-row items-center">
                        <Text className="text-xs text-gray-600">
                          FM: {record.finenessModulus}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {/* Delete Button */}
                <View className="border-t border-gray-200 px-4 py-2">
                  <Pressable
                    onPress={() => setConfirmingDeleteRecord(record.id)}
                    className="flex-row items-center justify-center py-2 active:bg-gray-50"
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    <Text className="text-red-600 text-sm font-medium ml-2">
                      Delete Record
                    </Text>
                  </Pressable>
                </View>

                {/* Delete Confirmation */}
                {confirmingDeleteRecord === record.id && (
                  <View className="bg-red-50 border-t border-red-200 p-4">
                    <Text className="text-sm text-red-800 mb-3 text-center">
                      Are you sure you want to delete this record?
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleDeleteRecord(record.id)}
                        className="flex-1 bg-red-600 py-2 rounded active:bg-red-700"
                      >
                        <Text className="text-white text-center font-medium">
                          Delete
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirmingDeleteRecord(null)}
                        className="flex-1 bg-gray-300 py-2 rounded active:bg-gray-400"
                      >
                        <Text className="text-gray-700 text-center font-medium">
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </View>
  );
};

export default RepositoryView;
