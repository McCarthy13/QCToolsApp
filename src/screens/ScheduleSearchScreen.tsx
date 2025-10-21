import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePourScheduleStore } from '../state/pourScheduleStore';
import { PourEntry } from '../types/pour-schedule';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleSearch'>;

interface SearchResult {
  entry: PourEntry;
  scheduledDate: Date;
  status: 'scheduled' | 'in-progress' | 'poured';
  daysFromNow: number;
}

export default function ScheduleSearchScreen({ navigation }: Props) {
  const allEntries = usePourScheduleStore((s) => s.pourEntries);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Search through all entries
    const results: SearchResult[] = [];

    allEntries.forEach(entry => {
      let matches = false;

      // Check job number
      if (entry.jobNumber.toLowerCase().includes(query)) {
        matches = true;
      }

      // Check job name
      if (entry.jobName && entry.jobName.toLowerCase().includes(query)) {
        matches = true;
      }

      // Check ID number
      if (entry.idNumber && entry.idNumber.toLowerCase().includes(query)) {
        matches = true;
      }

      // Check mark numbers
      if (entry.markNumbers && entry.markNumbers.toLowerCase().includes(query)) {
        matches = true;
      }

      if (matches) {
        const entryDate = new Date(entry.scheduledDate);
        entryDate.setHours(0, 0, 0, 0);
        const entryTime = entryDate.getTime();

        const daysDiff = Math.floor((entryTime - todayTime) / (1000 * 60 * 60 * 24));

        let status: 'scheduled' | 'in-progress' | 'poured';
        if (entryTime < todayTime) {
          status = 'poured';
        } else if (entryTime === todayTime) {
          status = 'in-progress';
        } else {
          status = 'scheduled';
        }

        results.push({
          entry,
          scheduledDate: entryDate,
          status,
          daysFromNow: daysDiff,
        });
      }
    });

    // Sort by date (closest first)
    results.sort((a, b) => Math.abs(a.daysFromNow) - Math.abs(b.daysFromNow));

    setSearchResults(results);
    setHasSearched(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Scheduled' };
      case 'in-progress':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Today' };
      case 'poured':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Poured' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: status };
    }
  };

  const getDateLabel = (result: SearchResult) => {
    if (result.daysFromNow === 0) {
      return 'Today';
    } else if (result.daysFromNow === 1) {
      return 'Tomorrow';
    } else if (result.daysFromNow === -1) {
      return 'Yesterday';
    } else if (result.daysFromNow > 0) {
      return `In ${result.daysFromNow} days`;
    } else {
      return `${Math.abs(result.daysFromNow)} days ago`;
    }
  };

  const navigateToDate = (result: SearchResult) => {
    navigation.navigate('DailyPourSchedule', {
      date: result.scheduledDate.toISOString(),
      department: result.entry.department,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center mb-3">
          <Pressable onPress={() => navigation.goBack()} className="p-2 mr-2">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900 flex-1">
            Search Schedule
          </Text>
        </View>

        {/* Search Input */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholder="Job #, Job Name, Mark #, ID #..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-900"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setHasSearched(false);
              }}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={handleSearch}
            className="bg-blue-600 rounded-lg px-4 py-3"
          >
            <Text className="text-white font-semibold">Search</Text>
          </Pressable>
        </View>
      </View>

      {/* Results */}
      <ScrollView className="flex-1">
        {!hasSearched ? (
          <View className="items-center justify-center p-8 mt-12">
            <Ionicons name="search-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-base mt-4 text-center font-semibold">
              Search for Pieces
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              Find scheduled, in-progress, or completed pours by Job #, Job Name, Mark #, or ID #
            </Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View className="items-center justify-center p-8 mt-12">
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-base mt-4 text-center font-semibold">
              No Results Found
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              No pieces match "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            <Text className="text-sm font-semibold text-gray-500 mb-1">
              Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
            </Text>

            {searchResults.map((result, index) => {
              const statusInfo = getStatusColor(result.status);
              
              return (
                <Pressable
                  key={`${result.entry.id}-${index}`}
                  onPress={() => navigateToDate(result)}
                  className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50"
                >
                  {/* Header with Job Number and Status */}
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-bold text-blue-600">
                      {result.entry.jobNumber}
                    </Text>
                    <View style={{ backgroundColor: statusInfo.bg }} className="px-3 py-1 rounded-full">
                      <Text style={{ color: statusInfo.text }} className="text-xs font-bold">
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Job Name */}
                  {result.entry.jobName && (
                    <Text className="text-base font-semibold text-gray-900 mb-2">
                      {result.entry.jobName}
                    </Text>
                  )}

                  {/* Details Grid */}
                  <View className="gap-2 mb-3">
                    {result.entry.idNumber && (
                      <View className="flex-row items-center">
                        <Ionicons name="key-outline" size={14} color="#6B7280" />
                        <Text className="text-sm text-gray-600 ml-2">
                          ID: {result.entry.idNumber}
                        </Text>
                      </View>
                    )}
                    
                    {result.entry.markNumbers && (
                      <View className="flex-row items-center">
                        <Ionicons name="bookmark-outline" size={14} color="#6B7280" />
                        <Text className="text-sm text-gray-600 ml-2">
                          Mark: {result.entry.markNumbers}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center">
                      <Ionicons name="cube-outline" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        {result.entry.formBedName}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons name="business-outline" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        {result.entry.department}
                      </Text>
                    </View>
                  </View>

                  {/* Date Information */}
                  <View className="border-t border-gray-100 pt-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                      <Text className="text-sm text-gray-700 ml-2 font-medium">
                        {result.scheduledDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-gray-500">
                      {getDateLabel(result)}
                    </Text>
                  </View>

                  {/* Tap to navigate hint */}
                  <View className="flex-row items-center justify-center mt-2 pt-2 border-t border-gray-100">
                    <Text className="text-xs text-blue-600 font-medium">
                      Tap to view in schedule
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
