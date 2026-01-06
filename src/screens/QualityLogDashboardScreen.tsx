import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { useAuthStore } from '../state/authStore';
import {
  QualityLogEntry,
  getStatusFromDisposition,
  DISPOSITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  BED_OPTIONS,
  Disposition,
} from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogDashboard'>;

export default function QualityLogDashboardScreen({ navigation }: Props) {
  const entries = useQualityLogStore((s) => s.entries);
  const initialize = useQualityLogStore((s) => s.initialize);
  const setDisposition = useQualityLogStore((s) => s.setDisposition);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterBed, setFilterBed] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    initialize();
    setTimeout(() => setRefreshing(false), 1000);
  }, [initialize]);

  // Filter entries based on search and filters
  const filteredEntries = entries.filter((entry) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        entry.idNumber?.toLowerCase().includes(query) ||
        entry.jobNumber?.toLowerCase().includes(query) ||
        entry.markNumber?.toLowerCase().includes(query) ||
        entry.engineer?.toLowerCase().includes(query) ||
        entry.qualityComments?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Bed filter
    if (filterBed && entry.bed !== filterBed) return false;

    // Status filter
    if (filterStatus && entry.status !== filterStatus) return false;

    return true;
  });

  // Sort by pour date (newest first), then by ID number
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    // First sort by pour date
    const dateA = new Date(a.pourDate).getTime();
    const dateB = new Date(b.pourDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    // Then by ID number
    return (b.idNumber || '').localeCompare(a.idNumber || '');
  });

  const getRowColor = (entry: QualityLogEntry): string => {
    if (!entry.disposition) return '#FFFFFF';
    const { color } = getStatusFromDisposition(entry.disposition);
    return color;
  };

  const handleDispositionChange = async (entry: QualityLogEntry, disposition: Disposition) => {
    try {
      await setDisposition(entry.id, disposition);
    } catch (error) {
      console.error('Error setting disposition:', error);
      Alert.alert('Error', 'Failed to update disposition');
    }
  };

  const stats = {
    total: entries.length,
    pending: entries.filter((e) => !e.disposition).length,
    okToShip: entries.filter((e) => e.disposition === 'Ok to Ship').length,
    issues: entries.filter((e) => e.issueCodes.length > 0 || e.rejectCodes.length > 0).length,
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Quality Log</Text>
          <View className="flex-row gap-2">
            {isAdmin && (
              <Pressable
                onPress={() => navigation.navigate('QualityLogAdmin' as any)}
                className="bg-gray-100 rounded-full p-2"
              >
                <Ionicons name="settings-outline" size={22} color="#374151" />
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('QualityLogImport' as any)}
              className="bg-blue-600 rounded-full p-2"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by ID, Job #, Mark #, Engineer..."
            className="flex-1 ml-2 text-base text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-gray-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Total</Text>
            <Text className="text-lg font-bold text-gray-900">{stats.total}</Text>
          </View>
          <View className="flex-1 bg-yellow-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Pending</Text>
            <Text className="text-lg font-bold text-yellow-600">{stats.pending}</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Ok to Ship</Text>
            <Text className="text-lg font-bold text-green-600">{stats.okToShip}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-lg p-2">
            <Text className="text-xs text-gray-500">Issues</Text>
            <Text className="text-lg font-bold text-red-600">{stats.issues}</Text>
          </View>
        </View>
      </View>

      {/* Filter Row */}
      <View className="bg-white px-4 py-2 border-b border-gray-200 flex-row gap-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setFilterBed(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!filterBed ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${!filterBed ? 'text-white' : 'text-gray-700'}`}>All Beds</Text>
          </Pressable>
          {BED_OPTIONS.map((bed) => (
            <Pressable
              key={bed}
              onPress={() => setFilterBed(filterBed === bed ? null : bed)}
              className={`px-3 py-1 rounded-full mr-2 ${filterBed === bed ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <Text className={`text-sm ${filterBed === bed ? 'text-white' : 'text-gray-700'}`}>
                Bed {bed}
              </Text>
            </Pressable>
          ))}
          <View className="w-2" />
          <Pressable
            onPress={() => setFilterStatus(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!filterStatus ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${!filterStatus ? 'text-white' : 'text-gray-700'}`}>All Status</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus(filterStatus === '40' ? null : '40')}
            className={`px-3 py-1 rounded-full mr-2 ${filterStatus === '40' ? 'bg-yellow-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${filterStatus === '40' ? 'text-white' : 'text-gray-700'}`}>40</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus(filterStatus === '50' ? null : '50')}
            className={`px-3 py-1 rounded-full mr-2 ${filterStatus === '50' ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${filterStatus === '50' ? 'text-white' : 'text-gray-700'}`}>50</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterStatus(filterStatus === '90' ? null : '90')}
            className={`px-3 py-1 rounded-full mr-2 ${filterStatus === '90' ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm ${filterStatus === '90' ? 'text-white' : 'text-gray-700'}`}>90</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Table */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Table Header */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            <View className="flex-row bg-gray-800 py-2">
              <Text className="w-24 px-2 text-xs font-semibold text-white">Pour Date</Text>
              <Text className="w-20 px-2 text-xs font-semibold text-white">Status</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Disposition</Text>
              <Text className="w-16 px-2 text-xs font-semibold text-white">Type</Text>
              <Text className="w-20 px-2 text-xs font-semibold text-white">Job #</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Mark #</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">ID #</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Length</Text>
              <Text className="w-16 px-2 text-xs font-semibold text-white">Width</Text>
              <Text className="w-12 px-2 text-xs font-semibold text-white">Bed</Text>
              <Text className="w-32 px-2 text-xs font-semibold text-white">Engineer</Text>
              <Text className="w-48 px-2 text-xs font-semibold text-white">Comments</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Issue Codes</Text>
              <Text className="w-24 px-2 text-xs font-semibold text-white">Reject Codes</Text>
              <Text className="w-28 px-2 text-xs font-semibold text-white">Approval Date</Text>
            </View>

            {/* Table Rows */}
            {sortedEntries.length === 0 ? (
              <View className="py-12 px-4">
                <Text className="text-gray-500 text-center">
                  {searchQuery || filterBed || filterStatus
                    ? 'No entries match your filters'
                    : 'No entries yet. Tap + to import a schedule.'}
                </Text>
              </View>
            ) : (
              sortedEntries.map((entry, index) => (
                <Pressable
                  key={entry.id}
                  onPress={() => navigation.navigate('QualityLogDetail' as any, { entryId: entry.id })}
                  className="flex-row border-b border-gray-200 active:opacity-70"
                  style={{ backgroundColor: getRowColor(entry) }}
                >
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">{entry.pourDate}</Text>
                  <Text className="w-20 px-2 py-3 text-xs font-bold text-gray-900">
                    {entry.status || '-'}
                  </Text>
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">
                    {entry.disposition || '-'}
                  </Text>
                  <Text className="w-16 px-2 py-3 text-xs text-gray-900">
                    {entry.productType || '-'}
                  </Text>
                  <Text className="w-20 px-2 py-3 text-xs text-gray-900">{entry.jobNumber}</Text>
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">{entry.markNumber}</Text>
                  <Text className="w-24 px-2 py-3 text-xs font-medium text-gray-900">
                    {entry.idNumber}
                  </Text>
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">{entry.length}</Text>
                  <Text className="w-16 px-2 py-3 text-xs text-gray-900">{entry.width}"</Text>
                  <Text className="w-12 px-2 py-3 text-xs text-gray-900">{entry.bed || '-'}</Text>
                  <Text className="w-32 px-2 py-3 text-xs text-gray-900" numberOfLines={1}>
                    {entry.engineer || '-'}
                  </Text>
                  <Text className="w-48 px-2 py-3 text-xs text-gray-900" numberOfLines={2}>
                    {entry.qualityComments || '-'}
                  </Text>
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">
                    {entry.issueCodes.length > 0 ? entry.issueCodes.join(', ') : '-'}
                  </Text>
                  <Text className="w-24 px-2 py-3 text-xs text-gray-900">
                    {entry.rejectCodes.length > 0 ? entry.rejectCodes.join(', ') : '-'}
                  </Text>
                  <Text className="w-28 px-2 py-3 text-xs text-gray-900">
                    {entry.approvalRejectionDate || '-'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
