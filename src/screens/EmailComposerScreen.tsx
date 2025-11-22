import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../state/authStore";
import { 
  sendEmailViaGraphAPI, 
  authenticateWithMicrosoft, 
  isAuthenticated 
} from "../api/microsoft-graph";

type EmailComposerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EmailComposer"
>;
type EmailComposerScreenRouteProp = RouteProp<RootStackParamList, "EmailComposer">;

interface Props {
  navigation: EmailComposerScreenNavigationProp;
  route: EmailComposerScreenRouteProp;
}

export default function EmailComposerScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { subject, body } = route.params;

  const [toEmail, setToEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMicrosoftAuthenticated, setIsMicrosoftAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const fromEmail = currentUser?.email || "";

  // Check Microsoft authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    const authenticated = await isAuthenticated();
    setIsMicrosoftAuthenticated(authenticated);
    setIsCheckingAuth(false);
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setIsSending(true);
      await authenticateWithMicrosoft();
      setIsMicrosoftAuthenticated(true);
      Alert.alert(
        "Success",
        "Successfully signed in with Microsoft. You can now send emails."
      );
    } catch (error: any) {
      // Don't show error if user cancelled authentication
      if (error.name === "AuthCancelledError") {
        // User cancelled - just silently return
        return;
      }

      console.error("Microsoft sign-in error:", error);
      Alert.alert(
        "Sign In Failed",
        error.message || "Unable to sign in with Microsoft. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    // Check if authenticated first
    if (!isMicrosoftAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in with your Microsoft account to send emails.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: handleMicrosoftSignIn,
          },
        ]
      );
      return;
    }

    // Validate recipient
    if (!toEmail.trim()) {
      Alert.alert("Missing Recipient", "Please enter a recipient email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setIsSending(true);

    try {
      await sendEmailViaGraphAPI({
        from: fromEmail,
        to: toEmail.trim(),
        cc: ccEmail.trim() || undefined,
        subject,
        body,
      });

      Alert.alert(
        "Email Sent Successfully",
        "Your report has been sent and will appear in your Outlook Sent folder.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Email send error:", error);
      
      if (error.message?.includes("authentication") || error.message?.includes("token")) {
        setIsMicrosoftAuthenticated(false);
        Alert.alert(
          "Authentication Required",
          "Your session has expired. Please sign in again.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Sign In",
              onPress: handleMicrosoftSignIn,
            },
          ]
        );
      } else {
        Alert.alert(
          "Send Failed",
          `Unable to send email: ${error.message || "Unknown error"}. Please try again.`,
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Microsoft Authentication Status */}
          {isCheckingAuth ? (
            <View style={styles.authCheckContainer}>
              <ActivityIndicator color="#3B82F6" />
              <Text style={styles.authCheckText}>Checking authentication...</Text>
            </View>
          ) : !isMicrosoftAuthenticated ? (
            <View style={styles.authRequiredContainer}>
              <Ionicons name="alert-circle" size={48} color="#F59E0B" />
              <Text style={styles.authRequiredTitle}>Microsoft Sign-In Required</Text>
              <Text style={styles.authRequiredText}>
                To send emails through your Outlook account, please sign in with Microsoft.
              </Text>
              <Pressable
                style={styles.signInButton}
                onPress={handleMicrosoftSignIn}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="logo-microsoft" size={20} color="white" />
                    <Text style={styles.signInButtonText}>Sign in with Microsoft</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <>
              {/* From Field (Read-only) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>From</Text>
                <View style={styles.fromContainer}>
                  <Text style={styles.fromEmail}>{fromEmail}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.verifiedText}>Microsoft</Text>
                  </View>
                </View>
              </View>

          {/* To Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>To *</Text>
            <TextInput
              style={styles.input}
              placeholder="recipient@example.com"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={toEmail}
              onChangeText={setToEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSending}
            />
          </View>

          {/* CC Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>CC (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="cc@example.com"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={ccEmail}
              onChangeText={setCcEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSending}
            />
          </View>

          {/* Subject (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Subject</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{subject}</Text>
            </View>
          </View>

          {/* Preview Toggle */}
          <Pressable
            style={styles.previewButton}
            onPress={() => setShowPreview(!showPreview)}
          >
            <Ionicons
              name={showPreview ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#3B82F6"
            />
            <Text style={styles.previewButtonText}>
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Text>
          </Pressable>

          {/* Body Preview */}
          {showPreview && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Email Body Preview:</Text>
              <ScrollView style={styles.previewScroll}>
                <Text style={styles.previewText}>{body}</Text>
              </ScrollView>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              This email will be sent through your Microsoft 365 account and will
              appear in your Outlook Sent folder.
            </Text>
          </View>

          {/* Send Button */}
          <Pressable
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.sendButtonText}>Send Report</Text>
              </>
            )}
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSending}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  authCheckContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  authCheckText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  authRequiredContainer: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FED7AA",
  },
  authRequiredTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#92400E",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  authRequiredText: {
    fontSize: 14,
    color: "#78350F",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  signInButton: {
    backgroundColor: "#0078D4",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minWidth: 200,
  },
  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  fromContainer: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fromEmail: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  readOnlyField: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  previewButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  previewContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  previewScroll: {
    maxHeight: 200,
  },
  previewText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});
