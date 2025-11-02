import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateLibraryStore } from '../state/aggregateLibraryStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AggregateLibraryItem } from '../types/aggregate-library';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateLibrary'>;
};

const AggregateLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { getAllAggregates, searchAggregates, isAggregateComplete } = useAggregateLibraryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Fine' | 'Coarse'>('all');
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all');

  const aggregates = searchQuery ? searchAggregates(searchQuery) : getAllAggregates();

  const filteredAggregates = useMemo(() => {
    return aggregates.filter(agg => {
      if (filterType !== 'all' && agg.type !== filterType) return false;
      
      if (filterComplete === 'complete' && !isAggregateComplete(agg.id)) return false;
      if (filterComplete === 'incomplete' && isAggregateComplete(agg.id)) return false;
      
      return true;
    });
  }, [aggregates, filterType, filterComplete, isAggregateComplete]);

  const stats = useMemo(() => {
    const all = getAllAggregates();
    return {
      total: all.length,
      fine: all.filter(a => a.type === 'Fine').length,
      coarse: all.filter(a => a.type === 'Coarse').length,
      complete: all.filter(a => isAggregateComplete(a.id)).length,
      incomplete: all.filter(a => !isAggregateComplete(a.id)).length,
    };
  }, [getAllAggregates, isAggregateComplete]);

  const handleAggregatePress = (aggregate: AggregateLibraryItem) => {
    navigation.navigate('AggregateLibraryDetail', { aggregateId: aggregate.id });
  };

  const handleAddNew = () => {
    navigation.navigate('AggregateLibraryAddEdit', {});
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Stats Cards */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row gap-2">
          <View className="flex-1 bg-blue-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-blue-600">{stats.total}</Text>
            <Text className="text-xs text-blue-700">Total</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-green-600">{stats.fine}</Text>
            <Text className="text-xs text-green-700">Fine</Text>
          </View>
          <View className="flex-1 bg-purple-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-purple-600">{stats.coarse}</Text>
            <Text className="text-xs text-purple-700">Coarse</Text>
          </View>
          <View className="flex-1 bg-orange-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-orange-600">{stats.incomplete}</Text>
            <Text className="text-xs text-orange-700">Incomplete</Text>
          </View>
        </View>
      </View>

      {/* Search & Add */}
      <View className="bg-white p-4 border-b border-gray-200 gap-3">
        <View className="flex-row gap-2">
          <View className="flex-1 bg-gray-100 rounded-lg flex-row items-center px-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search aggregates..."
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

          <Pressable
            onPress={handleAddNew}
            className="bg-blue-600 rounded-lg px-4 items-center justify-center active:bg-blue-700"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>

        {/* Filters */}
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full ${
              filterType === 'all' ? 'bg-gray-800' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterType === 'all' ? 'text-white' : 'text-gray-700'
            }`}>All Types</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setFilterType('Fine')}
            className={`px-3 py-1.5 rounded-full ${
              filterType === 'Fine' ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterType === 'Fine' ? 'text-white' : 'text-gray-700'
            }`}>Fine</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setFilterType('Coarse')}
            className={`px-3 py-1.5 rounded-full ${
              filterType === 'Coarse' ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterType === 'Coarse' ? 'text-white' : 'text-gray-700'
            }`}>Coarse</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterComplete(filterComplete === 'incomplete' ? 'all' : 'incomplete')}
            className={`px-3 py-1.5 rounded-full ${
              filterComplete === 'incomplete' ? 'bg-orange-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterComplete === 'incomplete' ? 'text-white' : 'text-gray-700'
            }`}>Incomplete</Text>
          </Pressable>
        </View>

        <Text className="text-xs text-gray-600">
          {filteredAggregates.length} {filteredAggregates.length === 1 ? 'aggregate' : 'aggregates'}
        </Text>
      </View>

      {/* Aggregate List */}
      <ScrollView className="flex-1">
        {filteredAggregates.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8 mt-20">
            <Ionicons name="flask-outline" size={64} color="#9ca3af" />
            <Text className="text-lg text-gray-600 mt-4 text-center">
              {aggregates.length === 0 ? 'No aggregates yet' : 'No aggregates match your filters'}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {aggregates.length === 0 ? 'Tap + to add your first aggregate' : 'Try adjusting your search or filters'}
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {filteredAggregates.map(aggregate => {
              const isComplete = isAggregateComplete(aggregate.id);
              
              return (
                <Pressable
                  key={aggregate.id}
                  onPress={() => handleAggregatePress(aggregate)}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {aggregate.name}
                      </Text>
                      {aggregate.source && (
                        <Text className="text-sm text-gray-500 mt-0.5">
                          {aggregate.source}
                        </Text>
                      )}
                    </View>
                    
                    {!isComplete && (
                      <View className="bg-orange-100 px-2 py-1 rounded">
                        <Text className="text-xs font-semibold text-orange-700">
                          INCOMPLETE
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row flex-wrap gap-2 mt-2">
                    <View className={`px-2 py-1 rounded ${
                      aggregate.type === 'Fine' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      <Text className={`text-xs font-medium ${
                        aggregate.type === 'Fine' ? 'text-green-700' : 'text-purple-700'
                      }`}>
                        {aggregate.type}
                      </Text>
                    </View>

                    {aggregate.colorFamily && (
                      <View className="px-2 py-1 rounded bg-gray-100">
                        <Text className="text-xs font-medium text-gray-700">
                          {aggregate.colorFamily}
                        </Text>
                      </View>
                    )}

                    {aggregate.finenessModulus !== undefined && (
                      <View className="px-2 py-1 rounded bg-blue-100">
                        <Text className="text-xs font-medium text-blue-700">
                          FM: {aggregate.finenessModulus}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-500">
                      Updated {new Date(aggregate.updatedAt).toLocaleDateString()}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AggregateLibraryScreen;
