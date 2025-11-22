import { View, Text, Pressable, ScrollView, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useQualityLogStore } from "../state/qualityLogStore";
import { useProductLibraryStore } from "../state/productLibraryStore";
import { useState } from "react";
import { IssueSeverity, DepartmentType } from "../types/quality-log";
import { ProductType } from "../types/product-library";

type Props = NativeStackScreenProps<RootStackParamList, "IssueCodeLibrary">;

export default function IssueCodeLibraryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const issueCodes = useQualityLogStore((s) => s.issueCodes);
  const addIssueCode = useQualityLogStore((s) => s.addIssueCode);
  const deleteIssueCode = useQualityLogStore((s) => s.deleteIssueCode);
  const products = useProductLibraryStore((s) => s.products);

  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("Minor");
  const [department, setDepartment] = useState<DepartmentType | undefined>();
  const [selectedProducts, setSelectedProducts] = useState<ProductType[]>([]);

  const handleAdd = () => {
    if (!code.trim() || !title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const codeNum = parseInt(code);
    if (isNaN(codeNum)) {
      Alert.alert("Error", "Issue code must be a number");
      return;
    }

    if (selectedProducts.length === 0) {
      Alert.alert("Warning", "No products selected. This issue code will not have tolerance references.", [
        { text: "Cancel", style: "cancel" },
        { text: "Save Anyway", onPress: () => performAdd(codeNum) },
      ]);
      return;
    }

    performAdd(codeNum);
  };

  const performAdd = (codeNum: number) => {
    addIssueCode({
      code: codeNum,
      title,
      description,
      severity,
      department,
      applicableProducts: selectedProducts,
    });

    // Reset form
    setCode("");
    setTitle("");
    setDescription("");
    setSeverity("Minor");
    setDepartment(undefined);
    setSelectedProducts([]);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Issue Code", "Are you sure you want to delete this issue code?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteIssueCode(id),
      },
    ]);
  };

  const getSeverityColor = (sev: IssueSeverity) => {
    switch (sev) {
      case "Critical":
        return { bg: "#FEE2E2", text: "#991B1B" };
      case "Major":
        return { bg: "#FED7AA", text: "#9A3412" };
      case "Minor":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "Observation":
        return { bg: "#E0E7FF", text: "#3730A3" };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              Issue Code Library
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Manage standard issue codes for quality logging
            </Text>
          </View>

          {/* Add Button */}
          <Pressable
            onPress={() => setShowModal(true)}
            style={{
              backgroundColor: "#3B82F6",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              Add Issue Code
            </Text>
          </Pressable>

          {/* Issue Codes */}
          {issueCodes.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 32,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Ionicons name="code-slash-outline" size={48} color="#9CA3AF" />
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 12 }}>
                No Issue Codes Yet
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
                Add your first issue code to start standardizing quality issue tracking.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {issueCodes
                .sort((a, b) => a.code - b.code)
                .map((issueCode) => {
                  const severityColor = getSeverityColor(issueCode.severity);

                  return (
                    <View
                      key={issueCode.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <View
                              style={{
                                backgroundColor: "#F3F4F6",
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 8,
                              }}
                            >
                              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
                                #{issueCode.code}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: severityColor.bg,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: "600", color: severityColor.text }}>
                                {issueCode.severity}
                              </Text>
                            </View>
                            {issueCode.department && (
                              <View
                                style={{
                                  backgroundColor: "#E0E7FF",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: "600", color: "#3730A3" }}>
                                  {issueCode.department}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 6 }}>
                            {issueCode.title}
                          </Text>
                          <Text style={{ fontSize: 14, color: "#6B7280", lineHeight: 20 }}>
                            {issueCode.description}
                          </Text>
                          {issueCode.applicableProducts && issueCode.applicableProducts.length > 0 && (
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 4 }}>
                              <Ionicons name="cube-outline" size={14} color="#6366F1" />
                              <Text style={{ fontSize: 13, color: "#6366F1", fontWeight: "500" }}>
                                Products:
                              </Text>
                              {issueCode.applicableProducts.map((product, idx) => (
                                <Text key={idx} style={{ fontSize: 12, color: "#6366F1" }}>
                                  {product}{idx < issueCode.applicableProducts.length - 1 ? "," : ""}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                        <Pressable
                          onPress={() => handleDelete(issueCode.id)}
                          style={{
                            backgroundColor: "#FEE2E2",
                            padding: 8,
                            borderRadius: 8,
                            marginLeft: 8,
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: insets.bottom + 24,
            }}
          >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                  Add Issue Code
                </Text>
                <Pressable onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 16 }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Issue Code Number *
                    </Text>
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      placeholder="e.g., 101"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        color: "#111827",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Title *
                    </Text>
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g., Concrete Segregation"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        color: "#111827",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Description *
                    </Text>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Describe the issue in detail..."
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        color: "#111827",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        minHeight: 80,
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Severity *
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["Critical", "Major", "Minor", "Observation"] as const).map((sev) => (
                        <Pressable
                          key={sev}
                          onPress={() => setSeverity(sev)}
                          style={{
                            flex: 1,
                            backgroundColor: severity === sev ? "#9333EA" : "#F3F4F6",
                            paddingVertical: 10,
                            borderRadius: 8,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: severity === sev ? "#FFFFFF" : "#6B7280",
                            }}
                          >
                            {sev}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Department (Optional)
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      {(["Flexicore", "Wall Panels", "Extruded", "Precast"] as const).map((dept) => (
                        <Pressable
                          key={dept}
                          onPress={() => setDepartment(department === dept ? undefined : dept)}
                          style={{
                            backgroundColor: department === dept ? "#3B82F6" : "#F3F4F6",
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: department === dept ? "#FFFFFF" : "#6B7280",
                            }}
                          >
                            {dept}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>
                      Leave unselected for global availability
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Applicable Products
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {products.map((product) => {
                        const isSelected = selectedProducts.includes(product.name);
                        return (
                          <Pressable
                            key={product.id}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedProducts(selectedProducts.filter((p) => p !== product.name));
                              } else {
                                setSelectedProducts([...selectedProducts, product.name]);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? "#6366F1" : "#F3F4F6",
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: isSelected ? "#FFFFFF" : "#6B7280",
                              }}
                            >
                              {product.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                        Select products this issue applies to
                      </Text>
                      <Pressable
                        onPress={() => navigation.navigate("ProductLibrary")}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#3B82F6" />
                        <Text style={{ fontSize: 12, color: "#3B82F6", fontWeight: "500" }}>
                          Manage Products
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: "#F3F4F6",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAdd}
                  style={{
                    flex: 1,
                    backgroundColor: "#3B82F6",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>Add Code</Text>
                </Pressable>
              </View>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
