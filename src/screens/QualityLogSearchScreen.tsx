import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { QualityLogEntry, DepartmentType } from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogSearch'>;

interface SearchResult {
  log: QualityLogEntry;
  matchedField: string;
}

export default function QualityLogSearchScreen({ navigation }: Props) {
  const logs = useQualityLogStore((s) => s.logs);
  
  const [jobNumber, setJobNumber] = useState('');
  const [jobName, setJobName] = useState('');
  const [markNumber, setMarkNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [issueCode, setIssueCode] = useState('');
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    // Check if at least one field has input
    const hasInput = jobNumber.trim() || jobName.trim() || markNumber.trim() || idNumber.trim() || issueCode.trim();
    
    if (!hasInput) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const results: SearchResult[] = [];

    logs.forEach(log => {
      let matches = false;
      let matchedField = '';

      // Check Extruded entries (which have the detailed fields)
      if (log.extrudedEntries && log.extrudedEntries.length > 0) {
        log.extrudedEntries.forEach(entry => {
          let entryMatches = true;

          // Check job number (if provided)
          if (jobNumber.trim()) {
            const query = jobNumber.trim().toLowerCase();
            if (!entry.jobNumber.toLowerCase().includes(query)) {
              entryMatches = false;
            } else {
              matchedField = 'Job Number';
            }
          }

          // Check job name (if provided)
          if (jobName.trim() && entryMatches) {
            const query = jobName.trim().toLowerCase();
            const entryJobName = (entry.jobName || '').toLowerCase();
            if (!entryJobName.includes(query)) {
              entryMatches = false;
            } else {
              matchedField = 'Job Name';
            }
          }

          // Check mark number (if provided)
          if (markNumber.trim() && entryMatches) {
            const query = markNumber.trim().toLowerCase();
            if (!entry.markNumber.toLowerCase().includes(query)) {
              entryMatches = false;
            } else {
              matchedField = 'Mark Number';
            }
          }

          // Check ID number (if provided)
          if (idNumber.trim() && entryMatches) {
            const query = idNumber.trim().toLowerCase();
            if (!entry.idNumber.toLowerCase().includes(query)) {
              entryMatches = false;
            } else {
              matchedField = 'ID Number';
            }
          }

          // Check issue code (if provided)
          if (issueCode.trim() && entryMatches) {
            const query = issueCode.trim().toLowerCase();
            const codeStr = entry.issueCode?.toString() || '';
            const titleStr = entry.issueTitle || '';
            if (!codeStr.includes(query) && !titleStr.toLowerCase().includes(query)) {
              entryMatches = false;
            } else {
              matchedField = 'Issue Code';
            }
          }

          if (entryMatches && !matches) {
            matches = true;
          }
        });
      }

      // Also check legacy productionItems if they exist
      if (!matches && log.productionItems && log.productionItems.length > 0) {
        log.productionItems.forEach(item => {
          let itemMatches = true;

          // Check job number
          if (jobNumber.trim()) {
            const query = jobNumber.trim().toLowerCase();
            const itemJobNumber = item.jobNumber || '';
            if (!itemJobNumber.toLowerCase().includes(query)) {
              itemMatches = false;
            } else {
              matchedField = 'Job Number';
            }
          }

          // Check job name
          if (jobName.trim() && itemMatches) {
            const query = jobName.trim().toLowerCase();
            if (!item.jobName.toLowerCase().includes(query)) {
              itemMatches = false;
            } else {
              matchedField = 'Job Name';
            }
          }

          // Check mark number
          if (markNumber.trim() && itemMatches) {
            const query = markNumber.trim().toLowerCase();
            const itemMarkNumber = item.markNumber || '';
            if (!itemMarkNumber.toLowerCase().includes(query)) {
              itemMatches = false;
            } else {
              matchedField = 'Mark Number';
            }
          }

          if (itemMatches && !matches) {
            matches = true;
          }
        });
      }

      // Check issues for issue code search
      if (!matches && issueCode.trim() && log.issues && log.issues.length > 0) {
        const query = issueCode.trim().toLowerCase();
        log.issues.forEach(issue => {
          const codeStr = issue.issueCode?.toString() || '';
          const titleStr = issue.issueTitle || '';
          if (codeStr.includes(query) || titleStr.toLowerCase().includes(query)) {
            matches = true;
            matchedField = 'Issue Code';
          }
        });
      }

      if (matches) {
        results.push({
          log,
          matchedField,
        });
      }
    });

    // Sort by date (most recent first)
    results.sort((a, b) => b.log.date - a.log.date);

    setSearchResults(results);
    setHasSearched(true);
  };

  const handleClear = () => {
    setJobNumber('');
    setJobName('');
    setMarkNumber('');
    setIdNumber('');
    setIssueCode('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'Issues Found':
        return { bg: '#FED7AA', text: '#9A3412' };
      case 'Critical Issues':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const getDepartmentColor = (dept: DepartmentType) => {
    switch (dept) {
      case 'Flexicore':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'Wall Panels':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'Extruded':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'Precast':
        return { bg: '#E0E7FF', text: '#3730A3' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
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
            Search Quality Logs
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
              cursorColor="#000000"
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
              cursorColor="#000000"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            />
          </View>

          {/* Mark Number */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Mark Number</Text>
            <TextInput
              value={markNumber}
              onChangeText={setMarkNumber}
              placeholder="e.g., M1, H105"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
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
              cursorColor="#000000"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            />
          </View>

          {/* Issue Code */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Issue Code</Text>
            <TextInput
              value={issueCode}
              onChangeText={setIssueCode}
              placeholder="Code number or title"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
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
              Search Quality Logs
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              Fill in one or more fields above and tap Search to find quality log entries
            </Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View className="items-center justify-center p-8 mt-12">
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-base mt-4 text-center font-semibold">
              No Matches Found
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              No quality logs match your search criteria
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            <Text className="text-sm font-semibold text-gray-500 mb-1">
              Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
            </Text>

            {searchResults.map((result, index) => {
              const statusColor = getStatusColor(result.log.overallStatus);
              const deptColor = getDepartmentColor(result.log.department);
              const openIssues = result.log.issues?.filter((i) => i.status === 'Open').length || 0;
              const criticalIssues = result.log.issues?.filter((i) => i.severity === 'Critical').length || 0;
              
              return (
                <Pressable
                  key={`${result.log.id}-${index}`}
                  onPress={() => navigation.navigate('QualityLogDetail', { logId: result.log.id })}
                  className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50"
                >
                  {/* Header with Date and Department */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                      <Text className="text-base font-bold text-gray-900">
                        {formatDate(result.log.date)}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: deptColor.bg }} className="px-3 py-1 rounded-full">
                      <Text style={{ color: deptColor.text }} className="text-xs font-bold">
                        {result.log.department}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={{ backgroundColor: statusColor.bg }}
                    className="self-start px-3 py-1 rounded-full mb-3"
                  >
                    <Text style={{ color: statusColor.text }} className="text-xs font-bold">
                      {result.log.overallStatus}
                    </Text>
                  </View>

                  {/* Matched Field Indicator */}
                  {result.matchedField && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text className="text-xs text-gray-600 ml-1">
                        Matched: {result.matchedField}
                      </Text>
                    </View>
                  )}

                  {/* Production Items Count or Extruded Entries Count */}
                  {result.log.extrudedEntries && result.log.extrudedEntries.length > 0 ? (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="cube-outline" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        {result.log.extrudedEntries.length} extruded {result.log.extrudedEntries.length === 1 ? 'entry' : 'entries'}
                      </Text>
                    </View>
                  ) : result.log.productionItems && result.log.productionItems.length > 0 ? (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="cube-outline" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        {result.log.productionItems.length} production {result.log.productionItems.length === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  ) : null}

                  {/* Issue Stats */}
                  {result.log.issues && result.log.issues.length > 0 && (
                    <View className="flex-row gap-4 mt-3 pt-3 border-t border-gray-100">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="alert-circle-outline" size={16} color="#6B7280" />
                        <Text className="text-sm text-gray-600">
                          {result.log.issues.length} {result.log.issues.length === 1 ? 'issue' : 'issues'}
                        </Text>
                      </View>
                      {openIssues > 0 && (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="time-outline" size={16} color="#F59E0B" />
                          <Text className="text-sm text-amber-600 font-semibold">
                            {openIssues} open
                          </Text>
                        </View>
                      )}
                      {criticalIssues > 0 && (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="warning" size={16} color="#EF4444" />
                          <Text className="text-sm text-red-600 font-semibold">
                            {criticalIssues} critical
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Tap to view hint */}
                  <View className="flex-row items-center justify-center mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-blue-600 font-medium">
                      Tap to view details
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
