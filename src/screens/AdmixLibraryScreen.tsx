import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmixLibraryStore } from '../state/admixLibraryStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AdmixLibraryItem, AdmixClass } from '../types/admix-library';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdmixLibrary'>;
};

const AdmixLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { getAllAdmixes, searchAdmixes, isAdmixComplete } = useAdmixLibraryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<'all' | AdmixClass>('all');
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all');

  const admixes = searchQuery ? searchAdmixes(searchQuery) : getAllAdmixes();

  const filteredAdmixes = useMemo(() => {
    return admixes.filter(admix => {
      if (filterClass !== 'all' && admix.class !== filterClass) return false;
      
      if (filterComplete === 'complete' && !isAdmixComplete(admix.id)) return false;
      if (filterComplete === 'incomplete' && isAdmixComplete(admix.id)) return false;
      
      return true;
    });
  }, [admixes, filterClass, filterComplete, isAdmixComplete]);

  const stats = useMemo(() => {
    const all = getAllAdmixes();
    return {
      total: all.length,
      complete: all.filter(a => isAdmixComplete(a.id)).length,
      incomplete: all.filter(a => !isAdmixComplete(a.id)).length,
    };
  }, [getAllAdmixes, isAdmixComplete]);

  const handleAdmixPress = (admix: AdmixLibraryItem) => {
    navigation.navigate('AdmixLibraryDetail', { admixId: admix.id });
  };

  const handleAddNew = () => {
    navigation.navigate('AdmixLibraryAddEdit', {});
  };

  const classColors: Record<AdmixClass, { bg: string; text: string }> = {
    'Water Reducer': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'High-Range Water Reducer': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'Air Entrainer': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    'Accelerator': { bg: 'bg-red-100', text: 'text-red-700' },
    'Retarder': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Corrosion Inhibitor': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'Shrinkage Reducer': { bg: 'bg-green-100', text: 'text-green-700' },
    'Viscosity Modifier': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'Other': { bg: 'bg-gray-100', text: 'text-gray-700' },
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
            <Text className="text-2xl font-bold text-green-600">{stats.complete}</Text>
            <Text className="text-xs text-green-700">Complete</Text>
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
              placeholder="Search admixes..."
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setFilterClass('all')}
            className={`px-3 py-1.5 rounded-full ${
              filterClass === 'all' ? 'bg-gray-800' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterClass === 'all' ? 'text-white' : 'text-gray-700'
            }`}>All Classes</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setFilterClass('Water Reducer')}
            className={`px-3 py-1.5 rounded-full ${
              filterClass === 'Water Reducer' ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterClass === 'Water Reducer' ? 'text-white' : 'text-gray-700'
            }`}>WR</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterClass('High-Range Water Reducer')}
            className={`px-3 py-1.5 rounded-full ${
              filterClass === 'High-Range Water Reducer' ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterClass === 'High-Range Water Reducer' ? 'text-white' : 'text-gray-700'
            }`}>HRWR</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterClass('Air Entrainer')}
            className={`px-3 py-1.5 rounded-full ${
              filterClass === 'Air Entrainer' ? 'bg-cyan-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterClass === 'Air Entrainer' ? 'text-white' : 'text-gray-700'
            }`}>AE</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterClass('Accelerator')}
            className={`px-3 py-1.5 rounded-full ${
              filterClass === 'Accelerator' ? 'bg-red-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterClass === 'Accelerator' ? 'text-white' : 'text-gray-700'
            }`}>Accel</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterClass('Retarder')}
            className={`px-3 py-1.5 rounded-full ${
              filterClass === 'Retarder' ? 'bg-orange-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterClass === 'Retarder' ? 'text-white' : 'text-gray-700'
            }`}>Retard</Text>
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
        </ScrollView>

        <Text className="text-xs text-gray-600">
          {filteredAdmixes.length} {filteredAdmixes.length === 1 ? 'admixture' : 'admixtures'}
        </Text>
      </View>

      {/* Admix List */}
      <ScrollView className="flex-1">
        {filteredAdmixes.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8 mt-20">
            <Ionicons name="water-outline" size={64} color="#9ca3af" />
            <Text className="text-lg text-gray-600 mt-4 text-center">
              {admixes.length === 0 ? 'No admixtures yet' : 'No admixtures match your filters'}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {admixes.length === 0 ? 'Tap + to add your first admixture' : 'Try adjusting your search or filters'}
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {filteredAdmixes.map(admix => {
              const isComplete = isAdmixComplete(admix.id);
              const colors = classColors[admix.class];
              
              return (
                <Pressable
                  key={admix.id}
                  onPress={() => handleAdmixPress(admix)}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {admix.name}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-0.5">
                        {admix.manufacturer}
                      </Text>
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
                    <View className={`px-2 py-1 rounded ${colors.bg}`}>
                      <Text className={`text-xs font-medium ${colors.text}`}>
                        {admix.class}
                      </Text>
                    </View>

                    {admix.specificGravityDisplay && (
                      <View className="px-2 py-1 rounded bg-gray-100">
                        <Text className="text-xs font-medium text-gray-700">
                          SG: {admix.specificGravityDisplay}
                        </Text>
                      </View>
                    )}

                    {admix.costPerGallon !== undefined && (
                      <View className="px-2 py-1 rounded bg-green-100">
                        <Text className="text-xs font-medium text-green-700">
                          ${admix.costPerGallon}/gal
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-500">
                      Updated {new Date(admix.updatedAt).toLocaleDateString()}
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

export default AdmixLibraryScreen;
