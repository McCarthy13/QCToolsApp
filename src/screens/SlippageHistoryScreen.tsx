import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useSlippageHistoryStore, SlippageRecord, PublishedSlippageRecord } from "../state/slippageHistoryStore";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { useAuthStore } from "../state/authStore";
import { format } from "date-fns";
import ConfirmModal from "../components/ConfirmModal";
import { decimalToFraction, parseMeasurementInput } from "../utils/cn";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "SlippageHistory">;

export default function SlippageHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { userRecords, publishedRecords, removeUserRecord, removePublishedRecord, clearUserRecords, clearPublishedRecords } = useSlippageHistoryStore();
  const { customPatterns } = useStrandPatternStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const [activeTab, setActiveTab] = useState<"my-records" | "published">("my-records");
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const handleClearAll = () => {
    if (activeTab === "my-records") {
      clearUserRecords();
    } else {
      // Only admins can clear published records
      if (currentUser?.role === "admin") {
        clearPublishedRecords();
      }
    }
    setShowClearAllModal(false);
  };

  const handleDeleteItem = (id: string) => {
    if (activeTab === "my-records") {
      removeUserRecord(id);
    } else {
      // Only admins can delete published records
      if (currentUser?.role === "admin") {
        removePublishedRecord(id);
      }
    }
    setDeleteItemId(null);
  };

  const handleRecordPress = (record: SlippageRecord | PublishedSlippageRecord) => {
    // Navigate to summary screen with the record data
    navigation.navigate("SlippageSummary", {
      slippages: record.slippages,
      config: record.config,
    });
  };

  const currentRecords = activeTab === "my-records" ? userRecords : publishedRecords;
  const canDelete = activeTab === "my-records" || currentUser?.role === "admin";

  // Calculate total slippage for a record
  const calculateTotalSlippage = (record: SlippageRecord | PublishedSlippageRecord) => {
    let total = 0;
    let hasExceeds = false;
    
    record.slippages.forEach((s) => {
      const left = parseMeasurementInput(s.leftSlippage) ?? 0;
      const right = parseMeasurementInput(s.rightSlippage) ?? 0;
      total += left + right;
      if (s.leftExceedsOne || s.rightExceedsOne) {
        hasExceeds = true;
      }
    });
    
    return { total, hasExceeds };
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 mb-1">
                Slippage History
              </Text>
              <Text className="text-sm text-gray-600">
                {currentRecords.length} {currentRecords.length === 1 ? "record" : "records"}
              </Text>
            </View>
            {currentRecords.length > 0 && canDelete && (
              <Pressable
                onPress={() => setShowClearAllModal(true)}
                className="bg-red-50 px-3 py-2 rounded-lg"
              >
                <Text className="text-red-600 text-sm font-medium">Clear All</Text>
              </Pressable>
            )}
          </View>

          {/* Tabs */}
          <View className="flex-row mb-6 bg-gray-200 rounded-xl p-1">
            <Pressable
              onPress={() => setActiveTab("my-records")}
              className={`flex-1 py-3 rounded-lg ${
                activeTab === "my-records" ? "bg-white shadow-sm" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "my-records" ? "text-gray-900" : "text-gray-500"
                }`}
              >
                My Records
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => setActiveTab("published")}
              className={`flex-1 py-3 rounded-lg ${
                activeTab === "published" ? "bg-white shadow-sm" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "published" ? "text-gray-900" : "text-gray-500"
                }`}
              >
                Published Records
              </Text>
            </Pressable>
          </View>

          {/* Records List */}
          {currentRecords.length === 0 ? (
            <View className="items-center justify-center py-20">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons
                  name={activeTab === "my-records" ? "folder-outline" : "cloud-outline"}
                  size={48}
                  color="#9CA3AF"
                />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === "my-records" ? "No Records Yet" : "No Published Records"}
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-6 px-8">
                {activeTab === "my-records"
                  ? "Your saved slippage records will appear here"
                  : "Published slippage records from all users will appear here"}
              </Text>
              <Pressable
                onPress={() => navigation.navigate("ProductDetails")}
                className="bg-blue-500 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">
                  Create New Record
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="space-y-3">
              {currentRecords.map((record) => {
                const { total, hasExceeds } = calculateTotalSlippage(record);
                const pattern = customPatterns.find((p) => p.id === record.config.strandPattern);
                const isPublished = "publishedAt" in record;

                return (
                  <Pressable
                    key={record.id}
                    onPress={() => handleRecordPress(record)}
                    className="bg-white rounded-xl p-4 shadow-sm active:bg-gray-50"
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-base font-semibold text-gray-900">
                            {record.config.projectName || "Unnamed Project"}
                          </Text>
                          {isPublished && (
                            <View className="bg-purple-100 px-2 py-0.5 rounded ml-2">
                              <Text className="text-xs font-bold text-purple-700">
                                PUBLISHED
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {(record.config.projectNumber || record.config.markNumber || record.config.idNumber) && (
                          <View className="flex-row flex-wrap gap-2 mb-1">
                            {record.config.projectNumber && (
                              <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-700">
                                  Proj: {record.config.projectNumber}
                                </Text>
                              </View>
                            )}
                            {record.config.markNumber && (
                              <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-700">
                                  Mark: {record.config.markNumber}
                                </Text>
                              </View>
                            )}
                            {record.config.idNumber && (
                              <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-700">
                                  ID: {record.config.idNumber}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                        
                        <Text className="text-xs text-gray-500">
                          {format(new Date(record.timestamp), "MMM dd, yyyy • h:mm a")}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          By: {record.createdBy}
                        </Text>
                        {isPublished && (
                          <Text className="text-xs text-purple-600">
                            Published: {format(new Date((record as PublishedSlippageRecord).publishedAt), "MMM dd, yyyy")}
                          </Text>
                        )}
                      </View>
                      
                      {canDelete && (
                        <Pressable
                          onPress={() => setDeleteItemId(record.id)}
                          className="bg-red-50 rounded-full p-2 ml-2"
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>

                    <View className="border-t border-gray-100 pt-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="cube-outline" size={16} color="#6B7280" />
                          <Text className="text-sm text-gray-600 ml-1">
                            {record.config.productType}
                          </Text>
                        </View>
                        {record.config.span && (
                          <Text className="text-sm text-gray-600">
                            {record.config.span}" span
                          </Text>
                        )}
                      </View>

                      {pattern && (
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="albums-outline" size={16} color="#6B7280" />
                          <Text className="text-sm text-gray-600 ml-1">
                            Pattern: {pattern.name}
                          </Text>
                        </View>
                      )}

                      <View className="bg-blue-50 rounded-lg px-3 py-2 mt-2">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-blue-700 font-medium">
                            Total Slippage
                          </Text>
                          <Text className="text-base font-bold text-blue-700">
                            {hasExceeds && ">"}
                            {total.toFixed(3)}" (≈{hasExceeds && ">"}
                            {decimalToFraction(total)})
                          </Text>
                        </View>
                        {hasExceeds && (
                          <Text className="text-orange-600 text-xs mt-1 font-semibold">
                            ⚠ Contains values exceeding 1"
                          </Text>
                        )}
                      </View>
                    </View>

                    <View className="flex-row items-center justify-end mt-3">
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <ConfirmModal
        visible={showClearAllModal}
        title={`Clear ${activeTab === "my-records" ? "My Records" : "Published Records"}`}
        message={`Are you sure you want to delete all ${
          activeTab === "my-records" ? "your" : "published"
        } records? This action cannot be undone.`}
        confirmText="Clear All"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearAllModal(false)}
      />

      <ConfirmModal
        visible={deleteItemId !== null}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={() => deleteItemId && handleDeleteItem(deleteItemId)}
        onCancel={() => setDeleteItemId(null)}
      />
    </View>
  );
}
