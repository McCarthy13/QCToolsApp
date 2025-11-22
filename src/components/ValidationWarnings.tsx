import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ValidationWarning } from '../utils/dataValidation';

interface ValidationWarningsProps {
  warnings: ValidationWarning[];
}

export const ValidationWarnings: React.FC<ValidationWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <View className="mb-4">
      {warnings.map((warning, index) => (
        <View
          key={index}
          className={`rounded-lg p-3 mb-2 flex-row items-start ${
            warning.severity === 'warning'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <Ionicons
            name={warning.severity === 'warning' ? 'warning' : 'information-circle'}
            size={20}
            color={warning.severity === 'warning' ? '#f59e0b' : '#3b82f6'}
            style={{ marginTop: 2 }}
          />
          <View className="flex-1 ml-2">
            <Text
              className={`text-xs font-semibold mb-0.5 ${
                warning.severity === 'warning' ? 'text-yellow-900' : 'text-blue-900'
              }`}
            >
              {warning.field}
            </Text>
            <Text
              className={`text-xs ${
                warning.severity === 'warning' ? 'text-yellow-700' : 'text-blue-700'
              }`}
            >
              {warning.message}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};
