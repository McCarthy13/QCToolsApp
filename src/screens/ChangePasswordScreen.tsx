import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { validatePassword } from "../utils/passwordValidation";

interface ChangePasswordScreenProps {
  onSuccess: () => void;
}

export default function ChangePasswordScreen({
  onSuccess,
}: ChangePasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const changePassword = useAuthStore((state) => state.changePassword);

  const handleChangePassword = async () => {
    // Validation
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password requirements
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await changePassword(newPassword);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const validation = validatePassword(newPassword);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingTop: 40, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="items-center mb-8">
              <View className="bg-blue-100 rounded-full p-6 mb-4">
                <Ionicons name="lock-closed" size={48} color="#3B82F6" />
              </View>
              <Text className="text-gray-900 text-3xl font-bold mb-2 text-center">
                Change Password
              </Text>
              <Text className="text-gray-600 text-base text-center">
                Welcome, {currentUser?.firstName}! Please set a new password to
                continue.
              </Text>
            </View>

            {/* Password Requirements */}
            <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <Text className="text-gray-900 text-sm font-semibold mb-3">
                Password Requirements:
              </Text>
              <View className="space-y-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name={
                      validation.hasUpper
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={validation.hasUpper ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-gray-700 text-sm ml-2"
                    style={{
                      color: validation.hasUpper ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one uppercase letter
                  </Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name={
                      validation.hasLower
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={validation.hasLower ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-gray-700 text-sm ml-2"
                    style={{
                      color: validation.hasLower ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one lowercase letter
                  </Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name={
                      validation.hasNumber
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={validation.hasNumber ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-gray-700 text-sm ml-2"
                    style={{
                      color: validation.hasNumber ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one number
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name={
                      validation.hasSpecial
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={validation.hasSpecial ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-gray-700 text-sm ml-2"
                    style={{
                      color: validation.hasSpecial ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one special character
                  </Text>
                </View>
              </View>
            </View>

            {/* Form */}
            <View className="bg-white rounded-2xl">
              {/* New Password Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </Text>
                <View className="relative">
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-base text-gray-900"
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setError("");
                    }}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                    textContentType="newPassword"
                    returnKeyType="next"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-3.5"
                  >
                    <Ionicons
                      name={
                        showNewPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={22}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </Text>
                <View className="relative">
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-base text-gray-900"
                    placeholder="Re-enter new password"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError("");
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                    textContentType="newPassword"
                    onSubmitEditing={handleChangePassword}
                    returnKeyType="go"
                  />
                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-4 top-3.5"
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={22}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <Pressable
                onPress={handleChangePassword}
                disabled={loading}
                className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Text className="text-white text-base font-semibold">
                  {loading ? "Changing Password..." : "Change Password"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );
}
