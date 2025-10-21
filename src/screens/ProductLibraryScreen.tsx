import { View, Text, Pressable, ScrollView, TextInput, Modal, Keyboard, TouchableWithoutFeedback, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useProductLibraryStore } from "../state/productLibraryStore";
import { useState, useEffect } from "react";
import { ProductType, ToleranceSpec } from "../types/product-library";

type Props = NativeStackScreenProps<RootStackParamList, "ProductLibrary">;

export default function ProductLibraryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const products = useProductLibraryStore((s) => s.products);
  const addProduct = useProductLibraryStore((s) => s.addProduct);
  const updateProduct = useProductLibraryStore((s) => s.updateProduct);
  const deleteProduct = useProductLibraryStore((s) => s.deleteProduct);
  const initializeDefaultProducts = useProductLibraryStore((s) => s.initializeDefaultProducts);

  // Initialize default products on mount
  useEffect(() => {
    if (products.length === 0) {
      initializeDefaultProducts();
    }
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  
  // Form state
  const [productType, setProductType] = useState<ProductType>("Beams");
  const [description, setDescription] = useState("");
  const [tolerances, setTolerances] = useState<ToleranceSpec[]>([]);
  
  // Tolerance form state
  const [showToleranceModal, setShowToleranceModal] = useState(false);
  const [editingToleranceIndex, setEditingToleranceIndex] = useState<number | null>(null);
  const [dimension, setDimension] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const productTypes: ProductType[] = [
    "Beams",
    "Hollow Core Slabs",
    "Solid Slabs",
    "Stadia",
    "Columns",
    "Wall Panels",
    "Stairs",
  ];

  const handleAddTolerance = () => {
    if (!dimension.trim() || !value.trim()) {
      Alert.alert("Error", "Dimension and value are required");
      return;
    }

    const newTolerance: ToleranceSpec = {
      dimension: dimension.trim(),
      value: value.trim(),
      notes: notes.trim() || undefined,
    };

    if (editingToleranceIndex !== null) {
      setTolerances(tolerances.map((t, i) => (i === editingToleranceIndex ? newTolerance : t)));
    } else {
      setTolerances([...tolerances, newTolerance]);
    }

    // Reset tolerance form
    setDimension("");
    setValue("");
    setNotes("");
    setEditingToleranceIndex(null);
    setShowToleranceModal(false);
  };

  const handleEditTolerance = (index: number) => {
    const tolerance = tolerances[index];
    setDimension(tolerance.dimension);
    setValue(tolerance.value);
    setNotes(tolerance.notes || "");
    setEditingToleranceIndex(index);
    setShowToleranceModal(true);
  };

  const handleDeleteTolerance = (index: number) => {
    setTolerances(tolerances.filter((_, i) => i !== index));
  };

  const handleSaveProduct = () => {
    if (!description.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }

    if (tolerances.length === 0) {
      Alert.alert("Warning", "Are you sure you want to save without any tolerances?", [
        { text: "Cancel", style: "cancel" },
        { text: "Save Anyway", onPress: () => performSave() },
      ]);
      return;
    }

    performSave();
  };

  const performSave = () => {
    // Check if product type already exists
    const existingProduct = products.find((p) => p.name === productType && p.id !== editingId);
    
    if (existingProduct) {
      Alert.alert("Error", `A product of type "${productType}" already exists. Please edit the existing one.`);
      return;
    }

    if (editingId) {
      updateProduct(editingId, {
        name: productType,
        description,
        tolerances,
      });
    } else {
      addProduct({
        name: productType,
        description,
        tolerances,
        isActive: true,
      });
    }

    resetForm();
    setShowAddModal(false);
  };

  const resetForm = () => {
    setProductType("Beams");
    setDescription("");
    setTolerances([]);
    setEditingId(null);
  };

  const handleEdit = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setEditingId(productId);
    setProductType(product.name);
    setDescription(product.description || "");
    setTolerances([...product.tolerances]);
    setShowAddModal(true);
  };

  const handleDelete = (productId: string) => {
    Alert.alert("Delete Product", "Are you sure you want to delete this product? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteProduct(productId),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              Product Library
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Manage product types and their tolerances
            </Text>
          </View>

          {/* Add Button */}
          <Pressable
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
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
              Add Product Type
            </Text>
          </Pressable>

          {/* Products List */}
          {products.length === 0 ? (
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
              <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 12 }}>
                No Products Yet
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
                Add your first product type to start tracking tolerances.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {products
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((product) => {
                  const isExpanded = expandedProductId === product.id;

                  return (
                    <View
                      key={product.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        overflow: "hidden",
                      }}
                    >
                      {/* Product Header */}
                      <Pressable
                        onPress={() => setExpandedProductId(isExpanded ? null : product.id)}
                        style={{ padding: 16 }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 4 }}>
                              {product.name}
                            </Text>
                            <Text style={{ fontSize: 14, color: "#6B7280" }}>
                              {product.description}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
                              <Ionicons name="resize-outline" size={14} color="#6366F1" />
                              <Text style={{ fontSize: 13, color: "#6366F1", fontWeight: "500" }}>
                                {product.tolerances.length} {product.tolerances.length === 1 ? "tolerance" : "tolerances"}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <Pressable
                              onPress={() => handleEdit(product.id)}
                              style={{
                                backgroundColor: "#EFF6FF",
                                padding: 8,
                                borderRadius: 8,
                              }}
                            >
                              <Ionicons name="pencil" size={16} color="#3B82F6" />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(product.id)}
                              style={{
                                backgroundColor: "#FEE2E2",
                                padding: 8,
                                borderRadius: 8,
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </Pressable>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={20}
                              color="#6B7280"
                            />
                          </View>
                        </View>
                      </Pressable>

                      {/* Expanded Tolerances */}
                      {isExpanded && (
                        <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 }}>
                            Tolerances:
                          </Text>
                          {product.tolerances.length === 0 ? (
                            <Text style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>
                              No tolerances defined
                            </Text>
                          ) : (
                            <View style={{ gap: 8 }}>
                              {product.tolerances.map((tolerance, index) => (
                                <View
                                  key={index}
                                  style={{
                                    backgroundColor: "#F9FAFB",
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: "#E5E7EB",
                                  }}
                                >
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                                      {tolerance.dimension}
                                    </Text>
                                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#6366F1" }}>
                                      {tolerance.value}
                                    </Text>
                                  </View>
                                  {tolerance.notes && (
                                    <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                                      {tolerance.notes}
                                    </Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
                maxHeight: "90%",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}>
                  {editingId ? "Edit Product" : "Add Product Type"}
                </Text>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 16 }}>
                  {/* Product Type */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Product Type *
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {productTypes.map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => setProductType(type)}
                          style={{
                            backgroundColor: productType === type ? "#3B82F6" : "#F3F4F6",
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: productType === type ? "#FFFFFF" : "#6B7280",
                            }}
                          >
                            {type}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Description */}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Description *
                    </Text>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Brief description of this product type..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        color: "#111827",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        minHeight: 60,
                      }}
                    />
                  </View>

                  {/* Tolerances */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
                        Tolerances
                      </Text>
                      <Pressable
                        onPress={() => {
                          setDimension("");
                          setValue("");
                          setNotes("");
                          setEditingToleranceIndex(null);
                          setShowToleranceModal(true);
                        }}
                        style={{
                          backgroundColor: "#10B981",
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>Add</Text>
                      </Pressable>
                    </View>

                    {tolerances.length === 0 ? (
                      <View
                        style={{
                          backgroundColor: "#F9FAFB",
                          padding: 16,
                          borderRadius: 8,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
                          No tolerances added yet
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {tolerances.map((tolerance, index) => (
                          <View
                            key={index}
                            style={{
                              backgroundColor: "#F9FAFB",
                              padding: 12,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: "#E5E7EB",
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 }}>
                                  {tolerance.dimension}: {tolerance.value}
                                </Text>
                                {tolerance.notes && (
                                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                    {tolerance.notes}
                                  </Text>
                                )}
                              </View>
                              <View style={{ flexDirection: "row", gap: 8 }}>
                                <Pressable
                                  onPress={() => handleEditTolerance(index)}
                                  style={{ padding: 4 }}
                                >
                                  <Ionicons name="pencil" size={16} color="#3B82F6" />
                                </Pressable>
                                <Pressable
                                  onPress={() => handleDeleteTolerance(index)}
                                  style={{ padding: 4 }}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                <Pressable
                  onPress={() => setShowAddModal(false)}
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
                  onPress={handleSaveProduct}
                  style={{
                    flex: 1,
                    backgroundColor: "#3B82F6",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    {editingId ? "Update" : "Save"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Add/Edit Tolerance Modal */}
      <Modal visible={showToleranceModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                  {editingToleranceIndex !== null ? "Edit Tolerance" : "Add Tolerance"}
                </Text>
                <Pressable onPress={() => setShowToleranceModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                    Dimension *
                  </Text>
                  <TextInput
                    value={dimension}
                    onChangeText={setDimension}
                    placeholder="e.g., Length, Width, Thickness"
                    placeholderTextColor="#9CA3AF"
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
                    Tolerance Value *
                  </Text>
                  <TextInput
                    value={value}
                    onChangeText={setValue}
                    placeholder="e.g., ±1/8 inch, ±3mm"
                    placeholderTextColor="#9CA3AF"
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
                    Notes (Optional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Additional details..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                      color: "#111827",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      minHeight: 60,
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                <Pressable
                  onPress={() => setShowToleranceModal(false)}
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
                  onPress={handleAddTolerance}
                  style={{
                    flex: 1,
                    backgroundColor: "#10B981",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    {editingToleranceIndex !== null ? "Update" : "Add"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
