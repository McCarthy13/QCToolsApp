import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, PendingRequest } from "../state/authStore";
import { generateTemporaryPassword } from "../utils/passwordValidation";
import ConfirmModal from "../components/ConfirmModal";

interface AdminApprovalScreenProps {
  onBack: () => void;
}

export default function AdminApprovalScreen({
  onBack,
}: AdminApprovalScreenProps) {
  const insets = useSafeAreaInsets();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getPendingRequests = useAuthStore((state) => state.getPendingRequests);
  const approveRequest = useAuthStore((state) => state.approveRequest);
  const denyRequest = useAuthStore((state) => state.denyRequest);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const requests = await getPendingRequests();
    setPendingRequests(requests);
    setLoading(false);
  };

  const handleApprove = (requestId: string) => {
    setSelectedRequest(requestId);
    const newPassword = generateTemporaryPassword();
    setTempPassword(newPassword);
    setShowPasswordModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await approveRequest(selectedRequest, tempPassword);
      setShowPasswordModal(false);
      setSelectedRequest(null);
      setTempPassword("");
      loadRequests();
    } catch (err) {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = (requestId: string) => {
    setSelectedRequest(requestId);
    setShowDenyModal(true);
  };

  const confirmDeny = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await denyRequest(selectedRequest);
      setShowDenyModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (err) {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <Pressable
          onPress={onBack}
          className="flex-row items-center mb-3 active:opacity-70"
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
          <Text className="text-gray-900 text-base font-medium ml-2">
            Back
          </Text>
        </Pressable>
        <Text className="text-gray-900 text-2xl font-bold">
          Access Requests
        </Text>
        <Text className="text-gray-600 text-sm mt-1">
          Review and approve pending access requests
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : pendingRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-gray-100 rounded-full p-6 mb-4">
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text className="text-gray-900 text-xl font-semibold mb-2">
            All Caught Up!
          </Text>
          <Text className="text-gray-600 text-base text-center">
            There are no pending access requests at this time.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 py-4">
          {pendingRequests.map((request) => (
            <View
              key={request.id}
              className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm"
            >
              {/* User Info */}
              <View className="flex-row items-start mb-3">
                <View className="bg-blue-100 rounded-full p-3 mr-3">
                  <Ionicons name="person" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 text-lg font-semibold">
                    {request.firstName} {request.lastName}
                  </Text>
                  <Text className="text-gray-600 text-sm">{request.email}</Text>
                </View>
              </View>

              {/* Company */}
              <View className="bg-gray-50 rounded-xl p-3 mb-3">
                <Text className="text-gray-600 text-xs font-semibold mb-1">
                  COMPANY
                </Text>
                <Text className="text-gray-900 text-base">
                  {request.company}
                </Text>
              </View>

              {/* Timestamp */}
              <Text className="text-gray-500 text-xs mb-3">
                Requested {formatDate(request.requestedAt)}
              </Text>

              {/* Actions */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => handleApprove(request.id)}
                  className="flex-1 bg-green-500 rounded-xl py-3 items-center active:bg-green-600"
                >
                  <Text className="text-white text-base font-semibold">
                    Approve
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeny(request.id)}
                  className="flex-1 bg-red-500 rounded-xl py-3 items-center active:bg-red-600"
                >
                  <Text className="text-white text-base font-semibold">
                    Deny
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Approve Modal */}
      {showPasswordModal && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <Pressable
            onPress={() => {
              if (!actionLoading) {
                Keyboard.dismiss();
                setShowPasswordModal(false);
              }
            }}
            className="flex-1"
          >
            <View className="flex-1 justify-center px-6">
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View className="bg-white rounded-2xl p-6 shadow-2xl">
                  <Text className="text-gray-900 text-xl font-bold mb-4">
                    Approve Access Request
                  </Text>

                  <Text className="text-gray-600 text-sm mb-4">
                    A temporary password has been generated. The user will be
                    required to change it on first login.
                  </Text>

                  {/* Temporary Password Display */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Temporary Password
                    </Text>
                    <View className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5">
                      <Text className="text-gray-900 text-base font-mono">
                        {tempPassword}
                      </Text>
                    </View>
                  </View>

                  {/* Info */}
                  <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                    <Text className="text-blue-700 text-xs">
                      The user will receive an email with their temporary
                      password.
                    </Text>
                  </View>

                  {/* Buttons */}
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => {
                        if (!actionLoading) {
                          setShowPasswordModal(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="flex-1 bg-gray-200 rounded-xl py-3 items-center active:bg-gray-300"
                      style={{ opacity: actionLoading ? 0.5 : 1 }}
                    >
                      <Text className="text-gray-900 text-base font-semibold">
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={confirmApprove}
                      disabled={actionLoading}
                      className="flex-1 bg-green-500 rounded-xl py-3 items-center active:bg-green-600"
                      style={{ opacity: actionLoading ? 0.6 : 1 }}
                    >
                      <Text className="text-white text-base font-semibold">
                        {actionLoading ? "Approving..." : "Confirm"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      )}

      {/* Deny Modal */}
      <ConfirmModal
        visible={showDenyModal}
        title="Deny Access Request"
        message="Are you sure you want to deny this access request? This action cannot be undone."
        confirmText="Deny"
        cancelText="Cancel"
        onConfirm={confirmDeny}
        onCancel={() => setShowDenyModal(false)}
        confirmStyle="destructive"
      />
    </View>
  );
}
