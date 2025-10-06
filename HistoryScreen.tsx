import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCalculatorStore } from '../state/calculatorStore';
import { format } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { history, removeCalculation, clearHistory } = useCalculatorStore();
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const handleClearAll = () => {
    clearHistory();
    setShowClearAllModal(false);
  };

  const handleDeleteItem = (id: string) => {
    removeCalculation(id);
    setDeleteItemId(null);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-3xl font-bold text-gray-900 mb-1">
                History
              </Text>
              <Text className="text-sm text-gray-600">
                {history.length} {history.length === 1 ? 'calculation' : 'calculations'}
              </Text>
            </View>
            {history.length > 0 && (
              <Pressable
                onPress={() => setShowClearAllModal(true)}
                className="bg-red-50 px-3 py-2 rounded-lg"
              >
                <Text className="text-red-600 text-sm font-medium">Clear All</Text>
              </Pressable>
            )}
          </View>

          {/* History List */}
          {history.length === 0 ? (
            <View className="items-center justify-center py-20">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="calculator-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                No Calculations Yet
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-6 px-8">
                Your calculation history will appear here
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Calculator')}
                className="bg-blue-500 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">
                  Create First Calculation
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="space-y-3">
              {history.map((calculation) => (
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
                        {calculation.inputs.span} ft span
                      </Text>
                    </View>

                    <View className="bg-blue-50 rounded-lg px-3 py-2 mt-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-blue-700 font-medium">
                          Recommended Camber
                        </Text>
                        <Text className="text-base font-bold text-blue-700">
                          {calculation.results.recommendedCamber.toFixed(3)} in
                        </Text>
                      </View>
                    </View>
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
