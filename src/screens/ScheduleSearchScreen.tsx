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

type JobNameSearchType = 'equals' | 'contains';

export default function ScheduleSearchScreen({ navigation }: Props) {
  const allEntries = usePourScheduleStore((s) => s.pourEntries);
  
  const [jobNumber, setJobNumber] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobNameSearchType, setJobNameSearchType] = useState<JobNameSearchType>('contains');
  const [markNumber, setMarkNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    // Check if at least one field has input
    const hasInput = jobNumber.trim() || jobName.trim() || markNumber.trim() || idNumber.trim();
    
    if (!hasInput) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Search through all entries
    const results: SearchResult[] = [];

    allEntries.forEach(entry => {
      let matches = true;

      // Check job number (if provided)
      if (jobNumber.trim()) {
        const query = jobNumber.trim().toLowerCase();
        if (!entry.jobNumber.toLowerCase().includes(query)) {
          matches = false;
        }
      }

      // Check job name (if provided)
      if (jobName.trim() && matches) {
        const query = jobName.trim().toLowerCase();
        const entryJobName = (entry.jobName || '').toLowerCase();
        
        if (jobNameSearchType === 'equals') {
          if (entryJobName !== query) {
            matches = false;
          }
        } else { // contains
          if (!entryJobName.includes(query)) {
            matches = false;
          }
        }
      }

      // Check mark number (if provided)
      if (markNumber.trim() && matches) {
        const query = markNumber.trim().toLowerCase();
        const entryMarkNumbers = (entry.markNumbers || '').toLowerCase();
        if (!entryMarkNumbers.includes(query)) {
          matches = false;
        }
      }

      // Check ID number (if provided)
      if (idNumber.trim() && matches) {
        const query = idNumber.trim().toLowerCase();
        const entryIdNumber = (entry.idNumber || '').toLowerCase();
        if (!entryIdNumber.includes(query)) {
          matches = false;
        }
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

  const handleClear = () => {
    setJobNumber('');
    setJobName('');
    setJobNameSearchType('contains');
    setMarkNumber('');
    setIdNumber('');
    setSearchResults([]);
    setHasSearched(false);
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
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900 flex-1 ml-2">
            Search Schedule
          </Text>
          <Pressable onPress={handleClear} className="px-3 py-2">
            <Text className="text-sm font-semibold text-gray-600">Clear</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Search Fields */}
        <View className="bg-white border-b border-gray-200 p-4 gap-4">
          {/* Job Number */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Job Number</Text>
            <TextInput
              value={jobNumber}
              onChangeText={setJobNumber}
              placeholder="Enter job number"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            />
          </View>

          {/* Job Name */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Job Name</Text>
            <TextInput
              value={jobName}
              onChangeText={setJobName}
              placeholder="Enter job name"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            />
            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={() => setJobNameSearchType('equals')}
                className={`flex-1 rounded-lg py-2 border ${
                  jobNameSearchType === 'equals' 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-center text-sm font-semibold ${
                  jobNameSearchType === 'equals' ? 'text-white' : 'text-gray-700'
                }`}>
                  Equals
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setJobNameSearchType('contains')}
                className={`flex-1 rounded-lg py-2 border ${
                  jobNameSearchType === 'contains' 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-center text-sm font-semibold ${
                  jobNameSearchType === 'contains' ? 'text-white' : 'text-gray-700'
                }`}>
                  Contains
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Mark Number */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Mark Number</Text>
            <TextInput
              value={markNumber}
              onChangeText={setMarkNumber}
              placeholder="e.g., M1, H105"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            />
          </View>

          {/* ID Number */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">ID Number</Text>
            <TextInput
              value={idNumber}
              onChangeText={setIdNumber}
              placeholder="Enter ID number"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            />
          </View>

          {/* Search Button */}
          <Pressable
            onPress={handleSearch}
            className="bg-blue-600 rounded-lg py-3 items-center"
          >
            <Text className="text-white text-base font-semibold">Search</Text>
          </Pressable>
        </View>

        {/* Results */}
        {!hasSearched ? (
          <View className="items-center justify-center p-8 mt-12">
            <Ionicons name="search-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-base mt-4 text-center font-semibold">
              Search for Pieces
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              Fill in one or more fields above and tap Search to find pieces
            </Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View className="items-center justify-center p-8 mt-12">
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-base mt-4 text-center font-semibold">
              No Matches Found
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              No pieces match your search criteria
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
