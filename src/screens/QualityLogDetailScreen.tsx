import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "QualityLogDetail">;

export default function QualityLogDetailScreen({ navigation, route }: Props) {
  const { logId } = route.params;
  const getLog = useQualityLogStore((s) => s.getLog);
  const deleteLog = useQualityLogStore((s) => s.deleteLog);
  const resolveIssue = useQualityLogStore((s) => s.resolveIssue);
  const [showOptions, setShowOptions] = useState(false);

  const log = getLog(logId);

  if (!log) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 16 }}>
            Log Not Found
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
            The quality log you are looking for does not exist.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 24,
              backgroundColor: "#3B82F6",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "In Progress":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "Resolved":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "Deferred":
        return { bg: "#E5E7EB", text: "#374151" };
      case "Rejected":
        return { bg: "#FEE2E2", text: "#991B1B" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return { bg: "#FEE2E2", text: "#991B1B", icon: "#EF4444" };
      case "Major":
        return { bg: "#FED7AA", text: "#9A3412", icon: "#F97316" };
      case "Minor":
        return { bg: "#FEF3C7", text: "#92400E", icon: "#F59E0B" };
      case "Observation":
        return { bg: "#E0E7FF", text: "#3730A3", icon: "#6366F1" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", icon: "#9CA3AF" };
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Log Entry",
      "Are you sure you want to delete this log entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLog(logId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const overallStatusColor = {
    Good: { bg: "#D1FAE5", text: "#065F46" },
    "Issues Found": { bg: "#FED7AA", text: "#9A3412" },
    "Critical Issues": { bg: "#FEE2E2", text: "#991B1B" },
  }[log.overallStatus] || { bg: "#F3F4F6", text: "#6B7280" };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Header with Date and Status */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}>
                {log.department}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => navigation.navigate("QualityLogAddEdit", { logId })}
                  style={{
                    backgroundColor: "#DBEAFE",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#1E40AF" />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={{
                    backgroundColor: "#FEE2E2",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#991B1B" />
                </Pressable>
              </View>
            </View>
            <Text style={{ fontSize: 16, color: "#6B7280", marginBottom: 12 }}>
              {formatDate(log.date)}
            </Text>
            <View
              style={{
                backgroundColor: overallStatusColor.bg,
                alignSelf: "flex-start",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: overallStatusColor.text }}>
                {log.overallStatus}
              </Text>
            </View>
          </View>

          {/* Production Items */}
          {log.productionItems && log.productionItems.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                  Production Items
                </Text>
                <View
                  style={{
                    backgroundColor: "#EFF6FF",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#1E40AF" }}>
                    {log.productionItems.length}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {log.productionItems.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Ionicons name="cube-outline" size={20} color="#3B82F6" />
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
                        {item.jobName}
                      </Text>
                    </View>
                    {item.jobNumber && (
                      <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={{ fontSize: 12, color: "#6B7280" }}>Job #:</Text>
                          <Text style={{ fontSize: 12, fontWeight: "500", color: "#111827" }}>
                            {item.jobNumber}
                          </Text>
                        </View>
                        {item.pieceNumber && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>Piece:</Text>
                            <Text style={{ fontSize: 12, fontWeight: "500", color: "#111827" }}>
                              {item.pieceNumber}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    {item.productType && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>Type: {item.productType}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Issues */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                Quality Issues
              </Text>
              <View
                style={{
                  backgroundColor: (log.issues?.length ?? 0) === 0 ? "#D1FAE5" : "#FED7AA",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: (log.issues?.length ?? 0) === 0 ? "#065F46" : "#9A3412",
                  }}
                >
                  {log.issues?.length ?? 0}
                </Text>
              </View>
            </View>

            {(log.issues?.length ?? 0) === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 24,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 12 }}>
                  No Issues Reported
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  All production items passed quality checks
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {log.issues?.map((issue) => {
                  const statusColor = getStatusColor(issue.status);
                  const severityColor = getSeverityColor(issue.severity);

                  return (
                    <View
                      key={issue.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      {/* Issue Header */}
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <View
                              style={{
                                backgroundColor: severityColor.bg,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: "600", color: severityColor.text }}>
                                {issue.severity}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: "#F3F4F6",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: "600", color: "#4B5563" }}>
                                #{issue.issueCode}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 4 }}>
                            {issue.issueTitle}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: statusColor.bg,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: statusColor.text }}>
                            {issue.status}
                          </Text>
                        </View>
                      </View>

                      {/* Issue Description */}
                      <Text style={{ fontSize: 14, color: "#4B5563", marginBottom: 12, lineHeight: 20 }}>
                        {issue.issueDescription}
                      </Text>

                      {/* Location */}
                      {issue.location && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <Ionicons name="location-outline" size={16} color="#6B7280" />
                          <Text style={{ fontSize: 13, color: "#6B7280" }}>{issue.location}</Text>
                        </View>
                      )}

                      {/* Resolution Info */}
                      {issue.status === "Resolved" && issue.actionTaken && (
                        <View
                          style={{
                            backgroundColor: "#F0FDF4",
                            borderRadius: 8,
                            padding: 12,
                            marginTop: 12,
                            borderWidth: 1,
                            borderColor: "#BBF7D0",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#16A34A" }}>
                              Resolved
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, color: "#166534", marginBottom: 4 }}>
                            {issue.actionTaken}
                          </Text>
                          {issue.resolvedBy && (
                            <Text style={{ fontSize: 11, color: "#4D7C0F" }}>
                              By {issue.resolvedBy} • {formatTime(issue.resolvedAt || issue.updatedAt)}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Notes */}
          {log.notes && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
                Notes
              </Text>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Text style={{ fontSize: 14, color: "#4B5563", lineHeight: 20 }}>{log.notes}</Text>
              </View>
            </View>
          )}

          {/* Metadata */}
          <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
              Created by {log.createdBy}
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              {formatDate(log.createdAt)} at {formatTime(log.createdAt)}
            </Text>
            {log.updatedAt !== log.createdAt && (
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                Last updated: {formatDate(log.updatedAt)} at {formatTime(log.updatedAt)}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
