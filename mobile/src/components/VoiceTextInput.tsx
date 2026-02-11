import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { VoiceInputButton } from './VoiceInputButton';

interface VoiceTextInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
  enableVoiceInput?: boolean;
}

export const VoiceTextInput: React.FC<VoiceTextInputProps> = ({
  label,
  value,
  onChangeText,
  required = false,
  placeholder,
  multiline = false,
  enableVoiceInput = false,
  ...textInputProps
}) => {
  const handleVoiceTranscription = (transcription: string) => {
    // Append to existing text if there is any
    if (value.trim()) {
      onChangeText(`${value}\n${transcription}`);
    } else {
      onChangeText(transcription);
    }
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center">
          <Text className="text-sm font-medium text-gray-700">{label}</Text>
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </View>
        
        {enableVoiceInput && multiline && (
          <VoiceInputButton
            onTranscriptionComplete={handleVoiceTranscription}
            buttonSize={32}
            buttonColor="#3B82F6"
          />
        )}
      </View>
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        numberOfLines={multiline ? 6 : 1}
        selectTextOnFocus
        cursorColor="#000000"
        className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base ${
          multiline ? 'min-h-[120px]' : ''
        }`}
        {...textInputProps}
      />
      
      {enableVoiceInput && multiline && (
        <Text className="text-xs text-gray-500 mt-1">
          Tap the microphone to record voice input
        </Text>
      )}
    </View>
  );
};
