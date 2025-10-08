import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLogin: () => void;
}

// Company access code - change this to your preferred password
const COMPANY_ACCESS_CODE = 'camber2025';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (accessCode.toLowerCase().trim() === COMPANY_ACCESS_CODE) {
      setError('');
      onLogin();
    } else {
      setError('Invalid access code. Please try again.');
      setAccessCode('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600"
      style={{ backgroundColor: '#3B82F6' }}
    >
      <View
        className="flex-1 justify-center items-center px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* Logo/Icon */}
        <View className="bg-white rounded-full p-6 mb-8 shadow-lg">
          <Ionicons name="construct" size={64} color="#3B82F6" />
        </View>

        {/* Title */}
        <Text className="text-white text-4xl font-bold mb-2 text-center">
          Precast Quality Tools
        </Text>
        <Text className="text-blue-100 text-base mb-12 text-center">
          Company Internal Tools
        </Text>

        {/* Login Card */}
        <View className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <Text className="text-gray-900 text-xl font-semibold mb-2">
            Access Required
          </Text>
          <Text className="text-gray-600 text-sm mb-6">
            Enter your company access code to continue
          </Text>

          {/* Access Code Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Access Code
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
              placeholder="Enter access code"
              placeholderTextColor="#9CA3AF"
              value={accessCode}
              onChangeText={(text) => {
                setAccessCode(text);
                setError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
          >
            <Text className="text-white text-base font-semibold">
              Access App
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text className="text-blue-100 text-xs mt-12 text-center">
          For authorized company use only
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
