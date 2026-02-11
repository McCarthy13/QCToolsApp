import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../state/authStore";

interface LoginScreenProps {
  onLoginSuccess: (requiresPasswordChange: boolean) => void;
  onRequestAccess: () => void;
}

const EMAIL_STORAGE_KEY = 'precast_email_for_signin';

export default function LoginScreen({
  onLoginSuccess,
  onRequestAccess,
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);

  const loginWithMicrosoft = useAuthStore((state) => state.loginWithMicrosoft);
  const loginWithEmail = useAuthStore((state) => state.login);
  const loginWithEmailLink = useAuthStore((state) => state.loginWithEmailLink);
  const sendEmailLink = useAuthStore((state) => state.sendEmailSignInLink);

  // Check for email sign-in link on mount (web only)
  useEffect(() => {
    const checkEmailSignInLink = async () => {
      if (Platform.OS === 'web') {
        const url = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');

        // Check if this is a sign-in link
        if (url.includes('apiKey') && url.includes('oobCode')) {
          console.log('[LoginScreen] Detected email sign-in link');

          // Get stored email or from URL
          let storedEmail = emailFromUrl;
          if (!storedEmail) {
            storedEmail = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
          }

          if (storedEmail) {
            setLoading(true);
            setError("");

            try {
              const result = await loginWithEmailLink(storedEmail, url);

              if (result.success) {
                // Clear stored email
                await AsyncStorage.removeItem(EMAIL_STORAGE_KEY);
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                onLoginSuccess(false);
              } else {
                setError(result.error || "Failed to sign in with email link");
                // Clean up URL even on error
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            } catch (err) {
              console.error('[LoginScreen] Email link sign-in error:', err);
              setError("An error occurred during sign-in");
              window.history.replaceState({}, document.title, window.location.pathname);
            } finally {
              setLoading(false);
            }
          } else {
            setError("Please enter your email to complete sign-in");
            setShowEmailLogin(true);
          }
        }
      }
      setIsCheckingLink(false);
    };

    checkEmailSignInLink();
  }, [loginWithEmailLink, onLoginSuccess]);

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

  const handleEmailPasswordLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginWithEmail(email.trim(), password);

      if (result.success) {
        onLoginSuccess(result.requiresPasswordChange || false);
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      console.error('[LoginScreen] Email login error:', err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailLink = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Store email for later verification
      await AsyncStorage.setItem(EMAIL_STORAGE_KEY, email.trim());

      const result = await sendEmailLink(email.trim());

      if (result.success) {
        setEmailLinkSent(true);
      } else {
        setError(result.error || "Failed to send login link");
      }
    } catch (err) {
      console.error('[LoginScreen] Send email link error:', err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking for email link
  if (isCheckingLink) {
    return (
      <View className="flex-1 bg-blue-500 items-center justify-center">
        <Ionicons name="hourglass" size={48} color="white" />
        <Text className="text-white text-lg mt-4">Checking sign-in status...</Text>
      </View>
    );
  }

  // Email link sent confirmation
  if (emailLinkSent) {
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
          <View className="items-center mb-8">
            <View className="bg-white rounded-full p-6 shadow-lg">
              <Ionicons name="mail" size={64} color="#10B981" />
            </View>
            <Text className="text-white text-3xl font-bold mb-2 text-center mt-6">
              Check Your Email
            </Text>
            <Text className="text-blue-100 text-base text-center px-4">
              We sent a sign-in link to{"\n"}
              <Text className="font-bold">{email}</Text>
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-2xl">
            <Text className="text-gray-700 text-sm text-center mb-4">
              Click the link in your email to sign in. The link will expire in 1 hour.
            </Text>

            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <Text className="text-blue-700 text-xs text-center">
                Didn't receive the email? Check your spam folder or try again.
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setEmailLinkSent(false);
                setEmail("");
              }}
              className="bg-gray-100 rounded-xl py-4 items-center active:bg-gray-200"
            >
              <Text className="text-gray-700 text-base font-semibold">
                Try Different Email
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Email login form
  if (showEmailLogin) {
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
          <View className="items-center mb-8">
            <View className="bg-white rounded-full p-6 shadow-lg">
              <Ionicons name="mail" size={64} color="#3B82F6" />
            </View>
            <Text className="text-white text-3xl font-bold mb-2 text-center mt-6">
              Email Sign In
            </Text>
            <Text className="text-blue-100 text-base text-center">
              Enter your email to continue
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-2xl">
            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="Enter your email"
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
              />
            </View>

            {/* Password Input (optional - for users who have set a password) */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Password (if you have one)
              </Text>
              <View className="relative">
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-base text-gray-900"
                  placeholder="Enter password or leave blank"
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

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Login with Password Button */}
            {password.length > 0 ? (
              <Pressable
                onPress={handleEmailPasswordLogin}
                disabled={loading}
                className="bg-blue-500 rounded-xl py-4 items-center mb-3 active:bg-blue-600"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Text className="text-white text-base font-semibold">
                  {loading ? "Signing in..." : "Sign In with Password"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSendEmailLink}
                disabled={loading}
                className="bg-blue-500 rounded-xl py-4 items-center mb-3 active:bg-blue-600"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Text className="text-white text-base font-semibold">
                  {loading ? "Sending..." : "Send Sign-In Link"}
                </Text>
              </Pressable>
            )}

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="text-gray-500 text-sm mx-4">or</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Back to Microsoft Login */}
            <Pressable
              onPress={() => {
                setShowEmailLogin(false);
                setEmail("");
                setPassword("");
                setError("");
              }}
              className="bg-gray-100 rounded-xl py-4 flex-row items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
              <Text className="text-gray-700 text-base font-semibold ml-2">
                Back to Microsoft Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Default view - Microsoft login with email option
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

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="text-gray-500 text-sm mx-4">or</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Email Sign In Button */}
            <Pressable
              onPress={() => setShowEmailLogin(true)}
              disabled={loading}
              className="bg-gray-100 rounded-xl py-4 flex-row items-center justify-center mb-4 active:bg-gray-200"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Ionicons name="mail-outline" size={24} color="#374151" />
              <Text className="text-gray-700 text-base font-semibold ml-3">
                Sign in with Email
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
                Use your Microsoft 365 account or email to sign in. Contact an administrator if you need access.
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
