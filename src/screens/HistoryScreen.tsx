import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCalculatorStore, CalculationRecord } from '../state/calculatorStore';
import { useStrandPatternStore } from '../state/strandPatternStore';
import { format } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';
import { formatInchesWithFraction, formatSpanDisplay, decimalToFraction } from '../utils/cn';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

const memberTypes = [
  { value: 'beam', label: 'Beam' },
  { value: 'double-tee', label: 'Double Tee' },
  { value: 'hollow-core', label: 'Hollow Core' },
  { value: 'single-tee', label: 'Single Tee' },
  { value: 'solid-slab', label: 'Solid Slab' },
  { value: 'wall-panel', label: 'Wall Panel' },
  { value: 'stadia', label: 'Stadia' },
] as const;

interface SearchFilters {
  projectName?: string;
  projectNumber?: string;
  markNumber?: string;
  idNumber?: string;
  memberType?: string;
  strandPattern?: string;
  topStrandPattern?: string;
  minSpan?: number;
  maxSpan?: number;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { history, removeCalculation, clearHistory } = useCalculatorStore();
  const { customPatterns } = useStrandPatternStore();
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<SearchFilters>({});
  const [tempFilters, setTempFilters] = useState<SearchFilters>({});

  const handleClearAll = () => {
    clearHistory();
    setShowClearAllModal(false);
  };

  const handleDeleteItem = (id: string) => {
    removeCalculation(id);
    setDeleteItemId(null);
  };

  const handleOpenFilter = () => {
    console.log('Filter button pressed - opening modal');
    setTempFilters(filters);
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilterModal(false);
  };

  // Filter calculations based on active filters
  const filteredHistory = useMemo(() => {
    if (Object.keys(filters).length === 0) {
      return history;
    }

    return history.filter((calc) => {
      // Project Name filter (case insensitive partial match)
      if (filters.projectName && 
          !calc.projectName?.toLowerCase().includes(filters.projectName.toLowerCase())) {
        return false;
      }

      // Project Number filter (case insensitive partial match)
      if (filters.projectNumber && 
          !calc.inputs.projectNumber?.toLowerCase().includes(filters.projectNumber.toLowerCase())) {
        return false;
      }

      // Mark Number filter (case insensitive partial match)
      if (filters.markNumber && 
          !calc.inputs.markNumber?.toLowerCase().includes(filters.markNumber.toLowerCase())) {
        return false;
      }

      // ID Number filter (case insensitive partial match)
      if (filters.idNumber && 
          !calc.inputs.idNumber?.toLowerCase().includes(filters.idNumber.toLowerCase())) {
        return false;
      }

      // Member Type filter (exact match)
      if (filters.memberType && calc.inputs.memberType !== filters.memberType) {
        return false;
      }

      // Strand Pattern filter (exact match)
      if (filters.strandPattern && calc.inputs.strandPattern !== filters.strandPattern) {
        return false;
      }

      // Top Strand Pattern filter (exact match)
      if (filters.topStrandPattern && calc.inputs.topStrandPattern !== filters.topStrandPattern) {
        return false;
      }

      // Min Span filter
      if (filters.minSpan !== undefined && calc.inputs.span < filters.minSpan) {
        return false;
      }

      // Max Span filter
      if (filters.maxSpan !== undefined && calc.inputs.span > filters.maxSpan) {
        return false;
      }

      return true;
    });
  }, [history, filters]);

  const activeFilterCount = Object.keys(filters).length;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 mb-1">
                History
              </Text>
              <Text className="text-sm text-gray-600">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'calculation' : 'calculations'}
                {activeFilterCount > 0 && ` (${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} active)`}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleOpenFilter}
                className={`${activeFilterCount > 0 ? 'bg-blue-500' : 'bg-gray-200'} rounded-full p-3`}
              >
                <Ionicons 
                  name="filter" 
                  size={20} 
                  color={activeFilterCount > 0 ? "white" : "#6B7280"} 
                />
              </Pressable>
              {history.length > 0 && (
                <Pressable
                  onPress={() => setShowClearAllModal(true)}
                  className="bg-red-50 px-3 py-2 rounded-lg"
                >
                  <Text className="text-red-600 text-sm font-medium">Clear All</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <View className="mb-4">
              <View className="flex-row flex-wrap gap-2">
                {filters.projectName && (
                  <View className="bg-blue-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-blue-700 text-xs font-medium mr-1">
                      Project: {filters.projectName}
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, projectName: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#1D4ED8" />
                    </Pressable>
                  </View>
                )}
                {filters.projectNumber && (
                  <View className="bg-blue-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-blue-700 text-xs font-medium mr-1">
                      Proj #: {filters.projectNumber}
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, projectNumber: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#1D4ED8" />
                    </Pressable>
                  </View>
                )}
                {filters.markNumber && (
                  <View className="bg-blue-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-blue-700 text-xs font-medium mr-1">
                      Mark #: {filters.markNumber}
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, markNumber: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#1D4ED8" />
                    </Pressable>
                  </View>
                )}
                {filters.idNumber && (
                  <View className="bg-blue-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-blue-700 text-xs font-medium mr-1">
                      ID #: {filters.idNumber}
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, idNumber: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#1D4ED8" />
                    </Pressable>
                  </View>
                )}
                {filters.memberType && (
                  <View className="bg-purple-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-purple-700 text-xs font-medium mr-1">
                      Type: {memberTypes.find(t => t.value === filters.memberType)?.label}
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, memberType: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#7C3AED" />
                    </Pressable>
                  </View>
                )}
                {filters.strandPattern && (
                  <View className="bg-green-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-green-700 text-xs font-medium mr-1">
                      Strand: {customPatterns.find(p => p.id === filters.strandPattern)?.name}
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, strandPattern: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#059669" />
                    </Pressable>
                  </View>
                )}
                {(filters.minSpan !== undefined || filters.maxSpan !== undefined) && (
                  <View className="bg-orange-100 px-3 py-1.5 rounded-full flex-row items-center">
                    <Text className="text-orange-700 text-xs font-medium mr-1">
                      Span: {filters.minSpan ?? '0'} - {filters.maxSpan ?? '∞'} ft
                    </Text>
                    <Pressable onPress={() => setFilters(prev => ({ ...prev, minSpan: undefined, maxSpan: undefined }))}>
                      <Ionicons name="close-circle" size={14} color="#EA580C" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <View className="items-center justify-center py-20">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name={activeFilterCount > 0 ? "search-outline" : "calculator-outline"} size={48} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                {activeFilterCount > 0 ? 'No Matching Calculations' : 'No Calculations Yet'}
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-6 px-8">
                {activeFilterCount > 0 
                  ? 'Try adjusting your filters to see more results'
                  : 'Your calculation history will appear here'
                }
              </Text>
              {activeFilterCount > 0 ? (
                <Pressable
                  onPress={handleClearFilters}
                  className="bg-blue-500 px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold">
                    Clear Filters
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => navigation.navigate('Calculator')}
                  className="bg-blue-500 px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold">
                    Create First Calculation
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="space-y-3">
              {filteredHistory.map((calculation) => (
                <Pressable
                  key={calculation.id}
                  onPress={() => navigation.navigate('Results', { calculation })}
                  className="bg-white rounded-xl p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {calculation.projectName || 'Unnamed Project'}
                      </Text>
                      {(calculation.inputs.projectNumber || calculation.inputs.markNumber || calculation.inputs.idNumber) && (
                        <View className="flex-row flex-wrap gap-2 mb-1">
                          {calculation.inputs.projectNumber && (
                            <View className="bg-gray-100 px-2 py-0.5 rounded">
                              <Text className="text-xs text-gray-700">
                                Proj: {calculation.inputs.projectNumber}
                              </Text>
                            </View>
                          )}
                          {calculation.inputs.markNumber && (
                            <View className="bg-gray-100 px-2 py-0.5 rounded">
                              <Text className="text-xs text-gray-700">
                                Mark: {calculation.inputs.markNumber}
                              </Text>
                            </View>
                          )}
                          {calculation.inputs.idNumber && (
                            <View className="bg-gray-100 px-2 py-0.5 rounded">
                              <Text className="text-xs text-gray-700">
                                ID: {calculation.inputs.idNumber}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                      <Text className="text-xs text-gray-500">
                        {format(new Date(calculation.timestamp), 'MMM dd, yyyy • h:mm a')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setDeleteItemId(calculation.id)}
                      className="bg-red-50 rounded-full p-2 ml-2"
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </Pressable>
                  </View>

                  <View className="border-t border-gray-100 pt-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Ionicons name="resize-outline" size={16} color="#6B7280" />
                        <Text className="text-sm text-gray-600 ml-1">
                          {calculation.inputs.memberType}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-600">
                        {formatSpanDisplay(calculation.inputs.span)}
                      </Text>
                    </View>

                    <View className="bg-blue-50 rounded-lg px-3 py-2 mt-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-blue-700 font-medium">
                          Calculated Camber at Release
                        </Text>
                        <Text className="text-base font-bold text-blue-700">
                          {formatInchesWithFraction(calculation.results.netInitialCamber)}
                        </Text>
                      </View>
                    </View>

                    {calculation.actualMeasuredCamber !== undefined && (
                      <View className="bg-green-50 rounded-lg px-3 py-2 mt-2">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-xs text-green-700 font-medium">
                            Measured Camber
                          </Text>
                          <Text className="text-sm font-bold text-green-700">
                            {formatInchesWithFraction(calculation.actualMeasuredCamber)}
                          </Text>
                        </View>
                        {calculation.variance !== undefined && (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs text-gray-600">
                              Variance
                            </Text>
                            <Text className={`text-xs font-semibold ${
                              Math.abs(calculation.variance) < 0.0625 
                                ? 'text-green-600' 
                                : 'text-orange-600'
                            }`}>
                              {calculation.variance >= 0 ? '+' : ''}{calculation.variance.toFixed(3)}" (≈{calculation.variance >= 0 ? '+' : ''}{decimalToFraction(Math.abs(calculation.variance))})
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-end mt-3">
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable onPress={() => setShowFilterModal(false)} className="flex-1" />
          <View className="bg-white rounded-t-3xl overflow-hidden" style={{ height: '85%', flexDirection: 'column' }}>
            <View className="p-5 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">
                  Filter Calculations
                </Text>
                <Pressable onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>
            </View>
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {/* Project Name */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Project Name
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="Search by project name"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={tempFilters.projectName || ''}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, projectName: text || undefined }))}
                />
              </View>

              {/* Project Number */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Project #
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="Search by project number"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={tempFilters.projectNumber || ''}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, projectNumber: text || undefined }))}
                />
              </View>

              {/* Mark Number */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Mark #
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="Search by mark number"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={tempFilters.markNumber || ''}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, markNumber: text || undefined }))}
                />
              </View>

              {/* ID Number */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  ID #
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="Search by ID number"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={tempFilters.idNumber || ''}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, idNumber: text || undefined }))}
                />
              </View>

              {/* Member Type */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Member Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {memberTypes.map((type) => (
                    <Pressable
                      key={type.value}
                      onPress={() => setTempFilters(prev => ({ 
                        ...prev, 
                        memberType: prev.memberType === type.value ? undefined : type.value 
                      }))}
                      className={`px-3 py-2 rounded-xl border ${
                        tempFilters.memberType === type.value
                          ? 'bg-purple-500 border-purple-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          tempFilters.memberType === type.value ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Strand Pattern */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Strand Pattern
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  <Pressable
                    onPress={() => setTempFilters(prev => ({ ...prev, strandPattern: undefined }))}
                    className={`px-3 py-2 rounded-xl border ${
                      !tempFilters.strandPattern
                        ? 'bg-gray-500 border-gray-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      !tempFilters.strandPattern ? 'text-white' : 'text-gray-700'
                    }`}>
                      Any
                    </Text>
                  </Pressable>
                  {customPatterns.map((pattern) => (
                    <Pressable
                      key={pattern.id}
                      onPress={() => setTempFilters(prev => ({ 
                        ...prev, 
                        strandPattern: prev.strandPattern === pattern.id ? undefined : pattern.id 
                      }))}
                      className={`px-3 py-2 rounded-xl border ${
                        tempFilters.strandPattern === pattern.id
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        tempFilters.strandPattern === pattern.id ? 'text-white' : 'text-gray-700'
                      }`}>
                        {pattern.patternId} - {pattern.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Top Strand Pattern */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Top Strand Pattern
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  <Pressable
                    onPress={() => setTempFilters(prev => ({ ...prev, topStrandPattern: undefined }))}
                    className={`px-3 py-2 rounded-xl border ${
                      !tempFilters.topStrandPattern
                        ? 'bg-gray-500 border-gray-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      !tempFilters.topStrandPattern ? 'text-white' : 'text-gray-700'
                    }`}>
                      Any
                    </Text>
                  </Pressable>
                  {customPatterns.map((pattern) => (
                    <Pressable
                      key={pattern.id}
                      onPress={() => setTempFilters(prev => ({ 
                        ...prev, 
                        topStrandPattern: prev.topStrandPattern === pattern.id ? undefined : pattern.id 
                      }))}
                      className={`px-3 py-2 rounded-xl border ${
                        tempFilters.topStrandPattern === pattern.id
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        tempFilters.topStrandPattern === pattern.id ? 'text-white' : 'text-gray-700'
                      }`}>
                        {pattern.patternId} - {pattern.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Span Range */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Span Range (feet)
                </Text>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-600 mb-1">Min</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      keyboardType="decimal-pad"
                      value={tempFilters.minSpan?.toString() || ''}
                      onChangeText={(text) => {
                        const val = parseFloat(text);
                        setTempFilters(prev => ({ ...prev, minSpan: isNaN(val) ? undefined : val }));
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-600 mb-1">Max</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholder="∞"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      keyboardType="decimal-pad"
                      value={tempFilters.maxSpan?.toString() || ''}
                      onChangeText={(text) => {
                        const val = parseFloat(text);
                        setTempFilters(prev => ({ ...prev, maxSpan: isNaN(val) ? undefined : val }));
                      }}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="p-5 border-t border-gray-200">
              <Pressable
                onPress={handleApplyFilters}
                className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mb-3"
              >
                <Text className="text-white text-base font-semibold">
                  Apply Filters
                </Text>
              </Pressable>
              <Pressable
                onPress={handleClearFilters}
                className="bg-white border border-gray-300 rounded-xl py-4 items-center active:bg-gray-50"
              >
                <Text className="text-gray-700 text-base font-semibold">
                  Clear All Filters
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <ConfirmModal
        visible={showClearAllModal}
        title="Clear History"
        message="Are you sure you want to delete all calculations? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearAllModal(false)}
      />

      <ConfirmModal
        visible={deleteItemId !== null}
        title="Delete Calculation"
        message="Are you sure you want to delete this calculation?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={() => deleteItemId && handleDeleteItem(deleteItemId)}
        onCancel={() => setDeleteItemId(null)}
      />
    </View>
  );
}
