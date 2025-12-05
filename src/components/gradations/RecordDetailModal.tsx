import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TestRecord } from '../../types/aggregate-gradation';

interface RecordDetailModalProps {
  record: TestRecord;
  onClose: () => void;
}

const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record, onClose }) => {
  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">
                {record.aggregateName}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {record.date} • {record.materialName || 'No material name'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="ml-3">
              <Ionicons name="close" size={28} color="#374151" />
            </Pressable>
          </View>

          {/* Pass/Fail Badge */}
          <View className="mt-3">
            <View
              className={`px-3 py-2 rounded-lg self-start ${
                record.passes ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <Text
                className={`font-semibold ${
                  record.passes ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {record.passes ? '✓ PASSES ASTM C-33' : '✗ FAILS ASTM C-33'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* Summary */}
          <View className="bg-white m-4 rounded-lg shadow-sm p-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">
              Test Summary
            </Text>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">Aggregate Type:</Text>
                <Text className="text-sm font-semibold text-gray-800">
                  {record.aggregateType}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">Total Weight:</Text>
                <Text className="text-sm font-semibold text-gray-800">
                  {record.totalWeight.toFixed(2)} g
                </Text>
              </View>

              {record.aggregateType === 'Fine' && (
                <>
                  {record.finenessModulus && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Fineness Modulus:</Text>
                      <Text className="text-sm font-semibold text-gray-800">
                        {record.finenessModulus}
                      </Text>
                    </View>
                  )}

                  {record.decant && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Decant:</Text>
                      <Text className="text-sm font-semibold text-gray-800">
                        {record.decant}%
                      </Text>
                    </View>
                  )}

                  {record.washedWeight && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Washed Weight:</Text>
                      <Text className="text-sm font-semibold text-gray-800">
                        {typeof record.washedWeight === 'number'
                          ? record.washedWeight.toFixed(2)
                          : record.washedWeight}{' '}
                        g
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Sieve Data Table */}
          <View className="bg-white m-4 rounded-lg shadow-sm p-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">
              Gradation Data
            </Text>

            {/* Table Header */}
            <View className="flex-row bg-gray-100 p-2 rounded">
              <Text className="flex-1 text-xs font-semibold text-gray-700">Sieve</Text>
              <Text className="w-16 text-xs font-semibold text-gray-700 text-right">
                Wt. (g)
              </Text>
              <Text className="w-16 text-xs font-semibold text-gray-700 text-right">
                % Ret.
              </Text>
              <Text className="w-16 text-xs font-semibold text-gray-700 text-right">
                Cum. %
              </Text>
              <Text className="w-16 text-xs font-semibold text-gray-700 text-right">
                % Pass
              </Text>
            </View>

            {/* Table Rows */}
            {record.sieveData.map((sieve, index) => {
              const percentPassing = parseFloat(sieve.percentPassing || '0');
              let status = 'normal';

              if (sieve.c33Lower !== '-' && sieve.c33Lower !== null) {
                if (percentPassing < (sieve.c33Lower as number)) {
                  status = 'fail';
                }
              }
              if (sieve.c33Upper !== '-' && sieve.c33Upper !== null) {
                if (percentPassing > (sieve.c33Upper as number)) {
                  status = 'fail';
                }
              }

              return (
                <View
                  key={index}
                  className={`flex-row p-2 border-b border-gray-200 ${
                    status === 'fail' ? 'bg-red-50' : ''
                  }`}
                >
                  <Text className="flex-1 text-sm text-gray-800">{sieve.name}</Text>
                  <Text className="w-16 text-sm text-gray-800 text-right">
                    {typeof sieve.weightRetained === 'number'
                      ? sieve.weightRetained.toFixed(1)
                      : sieve.weightRetained}
                  </Text>
                  <Text className="w-16 text-sm text-gray-800 text-right">
                    {sieve.percentRetained}
                  </Text>
                  <Text className="w-16 text-sm text-gray-800 text-right">
                    {sieve.cumulativeRetained}
                  </Text>
                  <Text
                    className={`w-16 text-sm text-right font-medium ${
                      status === 'fail' ? 'text-red-700' : 'text-gray-800'
                    }`}
                  >
                    {sieve.percentPassing}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ASTM C-33 Limits */}
          <View className="bg-white m-4 rounded-lg shadow-sm p-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">
              ASTM C-33 Specification Limits
            </Text>

            {/* Table Header */}
            <View className="flex-row bg-gray-100 p-2 rounded">
              <Text className="flex-1 text-xs font-semibold text-gray-700">Sieve</Text>
              <Text className="w-20 text-xs font-semibold text-gray-700 text-right">
                Lower
              </Text>
              <Text className="w-20 text-xs font-semibold text-gray-700 text-right">
                Upper
              </Text>
            </View>

            {/* Table Rows */}
            {record.sieveData
              .filter((s) => s.c33Lower !== '-' || s.c33Upper !== '-')
              .map((sieve, index) => (
                <View key={index} className="flex-row p-2 border-b border-gray-200">
                  <Text className="flex-1 text-sm text-gray-800">{sieve.name}</Text>
                  <Text className="w-20 text-sm text-gray-800 text-right">
                    {sieve.c33Lower !== '-' ? sieve.c33Lower : '-'}
                  </Text>
                  <Text className="w-20 text-sm text-gray-800 text-right">
                    {sieve.c33Upper !== '-' ? sieve.c33Upper : '-'}
                  </Text>
                </View>
              ))}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View className="bg-white border-t border-gray-200 p-4 gap-3">
          <Pressable className="bg-blue-600 rounded-lg py-3 items-center active:bg-blue-700">
            <View className="flex-row items-center">
              <Ionicons name="print-outline" size={18} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Print Record</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="border border-gray-300 rounded-lg py-3 items-center active:bg-gray-50"
          >
            <Text className="text-gray-700 font-medium text-base">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default RecordDetailModal;
