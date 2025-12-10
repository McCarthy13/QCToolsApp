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
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, PendingRequest } from "../state/authStore";
import { generateTemporaryPassword } from "../utils/passwordValidation";
import ConfirmModal from "../components/ConfirmModal";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminApproval'>;

export default function AdminApprovalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");

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
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-gray-900 text-2xl font-bold">
              User Management
            </Text>
            <Text className="text-gray-600 text-sm mt-1">
              Add Microsoft 365 users and manage access
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddUserModal(true)}
            className="bg-blue-500 rounded-full p-3 active:bg-blue-600"
          >
            <Ionicons name="person-add" size={24} color="white" />
          </Pressable>
        </View>
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <Pressable
            onPress={() => {
              if (!actionLoading) {
                Keyboard.dismiss();
                setShowAddUserModal(false);
                setNewUserEmail("");
                setNewUserName("");
                setNewUserRole("user");
              }
            }}
            className="flex-1"
          >
            <View className="flex-1 justify-center px-6">
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View className="bg-white rounded-2xl p-6 shadow-2xl">
                  <Text className="text-gray-900 text-xl font-bold mb-4">
                    Add Microsoft 365 User
                  </Text>

                  <Text className="text-gray-600 text-sm mb-4">
                    Add a user by their Microsoft 365 email address. They will be able to sign in immediately using their Microsoft account.
                  </Text>

                  {/* Name Input */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                      placeholder="John Doe"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      value={newUserName}
                      onChangeText={setNewUserName}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Email Input */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Microsoft 365 Email
                    </Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                      placeholder="user@company.com"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      value={newUserEmail}
                      onChangeText={setNewUserEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                  </View>

                  {/* Role Selection */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Role
                    </Text>
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => setNewUserRole("user")}
                        className={`flex-1 rounded-xl py-3 border-2 ${
                          newUserRole === "user"
                            ? "bg-blue-50 border-blue-500"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            newUserRole === "user" ? "text-blue-600" : "text-gray-600"
                          }`}
                        >
                          User
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setNewUserRole("admin")}
                        className={`flex-1 rounded-xl py-3 border-2 ${
                          newUserRole === "admin"
                            ? "bg-blue-50 border-blue-500"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            newUserRole === "admin" ? "text-blue-600" : "text-gray-600"
                          }`}
                        >
                          Admin
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Buttons */}
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => {
                        if (!actionLoading) {
                          setShowAddUserModal(false);
                          setNewUserEmail("");
                          setNewUserName("");
                          setNewUserRole("user");
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
                      onPress={() => {
                        // TODO: Implement add user functionality
                        console.log("Add user:", newUserEmail, newUserName, newUserRole);
                        setShowAddUserModal(false);
                        setNewUserEmail("");
                        setNewUserName("");
                        setNewUserRole("user");
                      }}
                      disabled={actionLoading || !newUserEmail.trim() || !newUserName.trim()}
                      className="flex-1 bg-blue-500 rounded-xl py-3 items-center active:bg-blue-600"
                      style={{ opacity: (actionLoading || !newUserEmail.trim() || !newUserName.trim()) ? 0.5 : 1 }}
                    >
                      <Text className="text-white text-base font-semibold">
                        Add User
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
