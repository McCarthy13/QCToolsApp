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

interface RegistrationScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function RegistrationScreen({
  onBack,
  onSuccess,
}: RegistrationScreenProps) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestAccess = useAuthStore((state) => state.requestAccess);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim()) {
      setError("Please enter your first name");
      return;
    }

    if (!lastName.trim()) {
      setError("Please enter your last name");
      return;
    }

    if (!company.trim()) {
      setError("Please enter your company name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await requestAccess({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        email: email.trim().toLowerCase(),
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to submit request. Please try again.");
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
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
          {/* Header */}
          <View className="px-6 py-4">
            <Pressable
              onPress={onBack}
              className="flex-row items-center active:opacity-70"
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              <Text className="text-white text-base font-medium ml-2">
                Back to Login
              </Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo/Icon */}
            <View className="items-center mb-8 mt-4">
              <View className="bg-white rounded-full p-6 shadow-lg">
                <Ionicons name="person-add" size={48} color="#3B82F6" />
              </View>

              {/* Title */}
              <Text className="text-white text-3xl font-bold mb-2 text-center mt-6">
                Request Access
              </Text>
              <Text className="text-blue-100 text-base text-center">
                Fill out the form to request access to Precast Quality Tools
              </Text>
            </View>

            {/* Registration Card */}
            <View className="bg-white rounded-2xl p-6 shadow-2xl">
              {/* First Name Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                  placeholder="John"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setError("");
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              {/* Last Name Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Last Name
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                  placeholder="Doe"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    setError("");
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              {/* Company Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Company
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                  placeholder="Acme Precast Inc."
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={company}
                  onChangeText={(text) => {
                    setCompany(text);
                    setError("");
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

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
                  onSubmitEditing={handleSubmit}
                  returnKeyType="go"
                />
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Info Message */}
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <Text className="text-blue-700 text-sm">
                  An admin will review your request and send login credentials
                  to your email if approved.
                </Text>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Text className="text-white text-base font-semibold">
                  {loading ? "Submitting..." : "Submit Request"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );
}
