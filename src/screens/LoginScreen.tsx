import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const login = useAuthStore((state) => state.login);
  const loginWithMicrosoft = useAuthStore((state) => state.loginWithMicrosoft);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await loginWithMicrosoft();

      if (result.success) {
        onLoginSuccess(false); // Microsoft users don't need password change
      } else {
        setError(result.error || "Microsoft login failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        onLoginSuccess(result.requiresPasswordChange || false);
      } else {
        setError(result.error || "Login failed. Please try again.");
        setPassword("");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
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
            {/* Microsoft Sign In Button - Primary */}
            <Pressable
              onPress={handleMicrosoftLogin}
              disabled={loading}
              className="bg-[#2F2F2F] rounded-xl py-4 flex-row items-center justify-center mb-4 active:bg-[#1F1F1F]"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Ionicons name="logo-microsoft" size={24} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-3">
                {loading ? "Signing in..." : "Sign in with Microsoft"}
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="text-gray-500 text-sm mx-3">OR</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Toggle Email/Password Login */}
            {!showEmailLogin ? (
              <Pressable
                onPress={() => setShowEmailLogin(true)}
                className="py-3 items-center active:opacity-70"
              >
                <Text className="text-blue-600 text-sm font-medium">
                  Sign in with email/password
                </Text>
              </Pressable>
            ) : (
              <>
                {/* Email Input */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                    placeholder="your@email.com"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                  />
                </View>

                {/* Password Input */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </Text>
                  <View className="relative">
                    <TextInput
                      className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-base text-gray-900"
                      placeholder="Enter password"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError("");
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      onSubmitEditing={handleLogin}
                      returnKeyType="go"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5"
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Login Button */}
                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mb-3"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <Text className="text-white text-base font-semibold">
                    {loading ? "Signing in..." : "Sign In"}
                  </Text>
                </Pressable>

                {/* Back to Microsoft */}
                <Pressable
                  onPress={() => setShowEmailLogin(false)}
                  className="py-2 items-center active:opacity-70"
                >
                  <Text className="text-gray-600 text-sm">
                    Back to Microsoft sign-in
                  </Text>
                </Pressable>
              </>
            )}

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Info Message */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
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
