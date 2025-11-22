import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
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
  const {
    userRecords,
    publishedRecords,
    removeUserRecord,
    removePublishedRecord,
    clearUserRecords,
    clearPublishedRecords,
    syncUserRecords,
    syncPublishedRecords,
    subscribeToPublishedRecords,
    isSyncing,
  } = useSlippageHistoryStore();
  const { customPatterns } = useStrandPatternStore();
  const currentUser = useAuthStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<"my-records" | "published">("my-records");
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Sync data from Firebase when component mounts
  useEffect(() => {
    syncUserRecords();
    syncPublishedRecords();

    // Subscribe to real-time updates for published records
    const unsubscribe = subscribeToPublishedRecords();
    return () => unsubscribe();
  }, [syncUserRecords, syncPublishedRecords, subscribeToPublishedRecords]);

  // Re-sync user records when tab changes
  useEffect(() => {
    if (activeTab === "my-records") {
      syncUserRecords();
    }
  }, [activeTab, syncUserRecords]);

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

  const handleEditRecord = (record: SlippageRecord | PublishedSlippageRecord) => {
    // Navigate to Product Details screen with existing data
    navigation.navigate("ProductDetails", {
      editMode: true,
      existingConfig: record.config,
      existingSlippages: record.slippages,
      recordId: record.id,
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Slippage History</Text>
              <Text style={styles.subtitle}>
                {currentRecords.length} {currentRecords.length === 1 ? "record" : "records"}
              </Text>
            </View>
            {currentRecords.length > 0 && canDelete && (
              <Pressable
                onPress={() => setShowClearAllModal(true)}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </Pressable>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => setActiveTab("my-records")}
              style={[styles.tab, activeTab === "my-records" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "my-records" && styles.activeTabText]}>
                My Records
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => setActiveTab("published")}
              style={[styles.tab, activeTab === "published" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "published" && styles.activeTabText]}>
                Published Records
              </Text>
            </Pressable>
          </View>

          {/* Records List */}
          {currentRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={activeTab === "my-records" ? "folder-outline" : "cloud-outline"}
                  size={48}
                  color="#9CA3AF"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "my-records" ? "No Records Yet" : "No Published Records"}
              </Text>
              <Text style={styles.emptyMessage}>
                {activeTab === "my-records"
                  ? "Your saved slippage records will appear here"
                  : "Published slippage records from all users will appear here"}
              </Text>
              <Pressable
                onPress={() => navigation.navigate("ProductDetails")}
                style={styles.createButton}
              >
                <Text style={styles.createButtonText}>Create New Record</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {currentRecords.map((record) => {
                const { total, hasExceeds } = calculateTotalSlippage(record);
                const pattern = customPatterns.find((p) => p.id === record.config.strandPattern);
                const isPublished = "publishedAt" in record;

                return (
                  <Pressable
                    key={record.id}
                    onPress={() => handleRecordPress(record)}
                    style={styles.recordCard}
                  >
                    <View style={styles.recordHeader}>
                      <View style={styles.recordHeaderLeft}>
                        <View style={styles.recordTitleRow}>
                          <Text style={styles.recordTitle}>
                            {record.config.projectName || "Unnamed Project"}
                          </Text>
                          {isPublished && (
                            <View style={styles.publishedBadge}>
                              <Text style={styles.publishedBadgeText}>PUBLISHED</Text>
                            </View>
                          )}
                        </View>

                        {(record.config.projectNumber || record.config.markNumber || record.config.idNumber) && (
                          <View style={styles.recordMetaRow}>
                            {record.config.projectNumber && (
                              <View style={styles.metaBadge}>
                                <Text style={styles.metaBadgeText}>
                                  Proj: {record.config.projectNumber}
                                </Text>
                              </View>
                            )}
                            {record.config.markNumber && (
                              <View style={styles.metaBadge}>
                                <Text style={styles.metaBadgeText}>
                                  Mark: {record.config.markNumber}
                                </Text>
                              </View>
                            )}
                            {record.config.idNumber && (
                              <View style={styles.metaBadge}>
                                <Text style={styles.metaBadgeText}>
                                  ID: {record.config.idNumber}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        <Text style={styles.recordDate}>
                          {format(new Date(record.timestamp), "MMM dd, yyyy • h:mm a")}
                        </Text>
                        <Text style={styles.recordCreator}>By: {record.createdBy}</Text>
                        {isPublished && (
                          <Text style={styles.recordPublished}>
                            Published: {format(new Date((record as PublishedSlippageRecord).publishedAt), "MMM dd, yyyy")}
                          </Text>
                        )}
                      </View>

                      <View style={styles.actionButtons}>
                        <Pressable
                          onPress={() => handleEditRecord(record)}
                          style={styles.editButton}
                        >
                          <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
                        </Pressable>
                        {canDelete && (
                          <Pressable
                            onPress={() => setDeleteItemId(record.id)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    <View style={styles.recordDivider} />

                    <View style={styles.recordDetails}>
                      <View style={styles.recordDetailRow}>
                        <View style={styles.recordDetailLeft}>
                          <Ionicons name="cube-outline" size={16} color="#6B7280" />
                          <Text style={styles.recordDetailText}>
                            {record.config.productType}
                          </Text>
                        </View>
                        {record.config.span && (
                          <Text style={styles.recordDetailText}>
                            {record.config.span}" span
                          </Text>
                        )}
                      </View>

                      {pattern && (
                        <View style={styles.recordDetailLeft}>
                          <Ionicons name="albums-outline" size={16} color="#6B7280" />
                          <Text style={styles.recordDetailText}>
                            Pattern: {pattern.name}
                          </Text>
                        </View>
                      )}

                      <View style={styles.totalSlippageCard}>
                        <View style={styles.totalSlippageRow}>
                          <Text style={styles.totalSlippageLabel}>Total Slippage</Text>
                          <Text style={styles.totalSlippageValue}>
                            {hasExceeds && ">"}
                            {total.toFixed(3)}" (≈{hasExceeds && ">"}
                            {decimalToFraction(total)})
                          </Text>
                        </View>
                        {hasExceeds && (
                          <Text style={styles.warningText}>
                            ⚠ Contains values exceeding 1"
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.recordFooter}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  clearButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    backgroundColor: '#F3F4F6',
    borderRadius: 9999,
    padding: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordHeaderLeft: {
    flex: 1,
  },
  recordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  publishedBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  publishedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  recordMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  metaBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaBadgeText: {
    fontSize: 12,
    color: '#374151',
  },
  recordDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  recordCreator: {
    fontSize: 12,
    color: '#6B7280',
  },
  recordPublished: {
    fontSize: 12,
    color: '#7C3AED',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 9999,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 9999,
    padding: 8,
  },
  recordDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  recordDetails: {
    gap: 8,
  },
  recordDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalSlippageCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  totalSlippageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalSlippageLabel: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  totalSlippageValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  warningText: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '600',
    marginTop: 4,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
});
