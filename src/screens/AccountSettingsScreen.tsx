import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { validatePassword } from "../utils/passwordValidation";
import ScreenHeader from "../components/ScreenHeader";

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const currentUser = useAuthStore((state) => state.currentUser);
  const addPassword = useAuthStore((state) => state.addPassword);
  const logout = useAuthStore((state) => state.logout);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async () => {
    // Validation
    if (!newPassword) {
      setError("Please enter a password");
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
    setSuccess("");

    try {
      const result = await addPassword(newPassword);

      if (result.success) {
        setSuccess("Password set successfully! You can now use it to sign in.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(result.error || "Failed to set password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await logout();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: doLogout },
        ]
      );
    }
  };

  const validation = validatePassword(newPassword);

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Account Settings" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* User Info Card */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 rounded-full p-4 mr-4">
                <Ionicons name="person" size={32} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {currentUser?.firstName} {currentUser?.lastName}
                </Text>
                <Text className="text-sm text-gray-600">
                  {currentUser?.email}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        currentUser?.role === "admin"
                          ? "#DBEAFE"
                          : currentUser?.role === "supervisor"
                          ? "#FEF3C7"
                          : "#E5E7EB",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold capitalize"
                      style={{
                        color:
                          currentUser?.role === "admin"
                            ? "#1E40AF"
                            : currentUser?.role === "supervisor"
                            ? "#92400E"
                            : "#374151",
                      }}
                    >
                      {currentUser?.role}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Set Password Section */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="key" size={24} color="#3B82F6" />
              <Text className="text-lg font-bold text-gray-900 ml-3">
                Set Password
              </Text>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Set a password so you can sign in with your email and password in
              addition to email links.
            </Text>

            {/* Password Requirements */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <Text className="text-gray-900 text-sm font-semibold mb-2">
                Password Requirements:
              </Text>
              <View>
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name={
                      validation.hasUpper
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={16}
                    color={validation.hasUpper ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-xs ml-2"
                    style={{
                      color: validation.hasUpper ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one uppercase letter
                  </Text>
                </View>
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name={
                      validation.hasLower
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={16}
                    color={validation.hasLower ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-xs ml-2"
                    style={{
                      color: validation.hasLower ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one lowercase letter
                  </Text>
                </View>
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name={
                      validation.hasNumber
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={16}
                    color={validation.hasNumber ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-xs ml-2"
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
                    size={16}
                    color={validation.hasSpecial ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    className="text-xs ml-2"
                    style={{
                      color: validation.hasSpecial ? "#10B981" : "#6B7280",
                    }}
                  >
                    At least one special character
                  </Text>
                </View>
              </View>
            </View>

            {/* New Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                New Password
              </Text>
              <View className="relative">
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-base text-gray-900"
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setError("");
                    setSuccess("");
                  }}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <Pressable
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-3.5"
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
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
                  placeholder="Re-enter password"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                    setSuccess("");
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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

            {/* Success Message */}
            {success ? (
              <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <Text className="text-green-700 text-sm">{success}</Text>
              </View>
            ) : null}

            {/* Set Password Button */}
            <Pressable
              onPress={handleSetPassword}
              disabled={loading}
              className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Text className="text-white text-base font-semibold">
                {loading ? "Setting Password..." : "Set Password"}
              </Text>
            </Pressable>
          </View>

          {/* Sign Out Section */}
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Pressable
              onPress={handleLogout}
              className="bg-red-50 border border-red-200 rounded-xl py-4 flex-row items-center justify-center active:bg-red-100"
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text className="text-red-600 text-base font-semibold ml-2">
                Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
