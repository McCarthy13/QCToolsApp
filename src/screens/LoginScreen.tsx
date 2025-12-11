import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";

interface LoginScreenProps {
  onLoginSuccess: (requiresPasswordChange: boolean) => void;
  onRequestAccess: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onRequestAccess,
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginWithMicrosoft = useAuthStore((state) => state.loginWithMicrosoft);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError("");

    try {
      console.log('[LoginScreen] Starting Microsoft login...');
      const result = await loginWithMicrosoft();
      console.log('[LoginScreen] Microsoft login result:', result);

      if (result.success) {
        onLoginSuccess(false); // Microsoft users don't need password change
      } else {
        setError(result.error || "Microsoft login failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error('[LoginScreen] Microsoft login error:', err);
      setError("An unexpected error occurred during Microsoft sign-in");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600"
      style={{ backgroundColor: "#3B82F6" }}
    >
      <View
        className="flex-1 justify-center px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
          {/* Logo/Icon */}
          <View className="items-center mb-8">
            <View className="bg-white rounded-full p-6 shadow-lg">
              <Ionicons name="construct" size={64} color="#3B82F6" />
            </View>

            {/* Title */}
            <Text className="text-white text-4xl font-bold mb-2 text-center mt-6">
              Precast Quality Tools
            </Text>
            <Text className="text-blue-100 text-base text-center">
              Sign in to continue
            </Text>
          </View>

          {/* Login Card */}
          <View className="bg-white rounded-2xl p-6 shadow-2xl">
            {/* Microsoft Sign In Button */}
            <Pressable
              onPress={handleMicrosoftLogin}
              disabled={loading}
              className="rounded-xl py-4 flex-row items-center justify-center mb-4"
              style={{
                backgroundColor: loading ? '#3F3F3F' : '#2F2F2F',
                opacity: loading ? 0.6 : 1
              }}
            >
              <Ionicons name="logo-microsoft" size={24} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-3">
                {loading ? "Signing in..." : "Sign in with Microsoft 365"}
              </Text>
            </Pressable>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Info Message */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <Text className="text-blue-700 text-xs text-center">
                Use your Microsoft 365 account to sign in. If you don't have access yet, contact an administrator.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <Text className="text-blue-100 text-xs mt-8 text-center">
            For authorized use only
          </Text>
        </View>
    </KeyboardAvoidingView>
  );
}
