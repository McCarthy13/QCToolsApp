import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStrandLibraryStore, StrandDefinition } from "../state/strandLibraryStore";
import ConfirmModal from "../components/ConfirmModal";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

export default function StrandLibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { strands, loading, initialize, addStrand, updateStrand, removeStrand } = useStrandLibraryStore();

  // Initialize Firebase sync
  useEffect(() => {
    initialize();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStrand, setEditingStrand] = useState<StrandDefinition | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDiameter, setFormDiameter] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formElasticModulus, setFormElasticModulus] = useState("28500");
  const [formBreakingStrength, setFormBreakingStrength] = useState("");
  const [formGrade, setFormGrade] = useState("270");

  const resetForm = () => {
    setFormName("");
    setFormDiameter("");
    setFormArea("");
    setFormElasticModulus("28500");
    setFormBreakingStrength("");
    setFormGrade("270");
  };

  const handleAdd = () => {
    setEditingStrand(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (strand: StrandDefinition) => {
    setEditingStrand(strand);
    setFormName(strand.name);
    setFormDiameter(strand.diameter.toString());
    setFormArea(strand.area.toString());
    setFormElasticModulus(strand.elasticModulus.toString());
    setFormBreakingStrength(strand.breakingStrength.toString());
    setFormGrade(strand.grade || "");
    setShowAddModal(true);
  };

  const handleSave = () => {
    // Validation
    if (!formName || !formDiameter || !formArea || !formElasticModulus || !formBreakingStrength) {
      alert("Please fill in all required fields");
      return;
    }

    const strandData = {
      name: formName,
      diameter: parseFloat(formDiameter),
      area: parseFloat(formArea),
      elasticModulus: parseFloat(formElasticModulus),
      breakingStrength: parseFloat(formBreakingStrength),
      grade: formGrade || undefined,
      isDefault: false,
    };

    if (editingStrand) {
      updateStrand(editingStrand.id, strandData);
    } else {
      addStrand(strandData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    removeStrand(id);
    setDeleteConfirmId(null);
  };

  // Separate default and custom strands
  const defaultStrands = strands.filter((s) => s.isDefault);
  const customStrands = strands.filter((s) => !s.isDefault);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <Text className="text-gray-900 text-2xl font-bold">Strand Library</Text>
          <Text className="text-gray-600 text-sm mt-1">
            Manage strand definitions and properties
          </Text>
        </View>

        {/* Add Button */}
        <View className="px-6 mt-4">
          <Pressable
            className="bg-blue-500 rounded-xl py-3 items-center active:bg-blue-600 flex-row justify-center"
            onPress={handleAdd}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-white text-base font-semibold ml-2">
              Add Custom Strand
            </Text>
          </Pressable>
        </View>

        {/* Navigate to Strand Patterns Button */}
        <View className="px-6 mt-3">
          <Pressable
            className="bg-purple-500 rounded-xl py-3 items-center active:bg-purple-600 flex-row justify-center"
            onPress={() => navigation.navigate("StrandPatterns")}
          >
            <Ionicons name="albums-outline" size={20} color="white" />
            <Text className="text-white text-base font-semibold ml-2">
              Manage Strand Patterns
            </Text>
          </Pressable>
          <Text className="text-gray-500 text-xs mt-2 text-center">
            Strand patterns define configurations of multiple strands used in tools
          </Text>
        </View>

        {/* Default Strands */}
        <View className="px-6 mt-4">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Standard Strands (ASTM A416)
          </Text>

          {defaultStrands.map((strand) => (
            <View
              key={strand.id}
              className="bg-white rounded-lg p-4 mb-3 border border-gray-200"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-gray-900 text-base font-bold">
                    {strand.name}
                  </Text>
                  {strand.grade && (
                    <Text className="text-gray-500 text-xs mt-0.5">
                      Grade {strand.grade} ksi
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row flex-wrap gap-3 mt-2">
                <View className="bg-gray-50 rounded px-3 py-1.5">
                  <Text className="text-gray-500 text-xs">Diameter</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {strand.diameter}"
                  </Text>
                </View>

                <View className="bg-gray-50 rounded px-3 py-1.5">
                  <Text className="text-gray-500 text-xs">Area</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {strand.area} in²
                  </Text>
                </View>

                <View className="bg-gray-50 rounded px-3 py-1.5">
                  <Text className="text-gray-500 text-xs">Elastic Modulus</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {strand.elasticModulus.toLocaleString()} ksi
                  </Text>
                </View>

                <View className="bg-gray-50 rounded px-3 py-1.5">
                  <Text className="text-gray-500 text-xs">Breaking Strength</Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {strand.breakingStrength} kips ({(strand.breakingStrength * 1000).toLocaleString()} lbs)
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Custom Strands */}
        {customStrands.length > 0 && (
          <View className="px-6 mt-4">
            <Text className="text-gray-900 text-lg font-semibold mb-3">
              Custom Strands
            </Text>

            {customStrands.map((strand) => (
              <View
                key={strand.id}
                className="bg-white rounded-lg p-4 mb-3 border border-gray-200"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-gray-900 text-base font-bold">
                      {strand.name}
                    </Text>
                    {strand.grade && (
                      <Text className="text-gray-500 text-xs mt-0.5">
                        Grade {strand.grade} ksi
                      </Text>
                    )}
                  </View>

                  <View className="flex-row gap-2">
                    <Pressable
                      className="bg-blue-100 rounded-full p-2"
                      onPress={() => handleEdit(strand)}
                    >
                      <Ionicons name="pencil" size={16} color="#3B82F6" />
                    </Pressable>

                    <Pressable
                      className="bg-red-100 rounded-full p-2"
                      onPress={() => setDeleteConfirmId(strand.id)}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-3 mt-2">
                  <View className="bg-gray-50 rounded px-3 py-1.5">
                    <Text className="text-gray-500 text-xs">Diameter</Text>
                    <Text className="text-gray-900 text-sm font-semibold">
                      {strand.diameter}"
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded px-3 py-1.5">
                    <Text className="text-gray-500 text-xs">Area</Text>
                    <Text className="text-gray-900 text-sm font-semibold">
                      {strand.area} in²
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded px-3 py-1.5">
                    <Text className="text-gray-500 text-xs">Elastic Modulus</Text>
                    <Text className="text-gray-900 text-sm font-semibold">
                      {strand.elasticModulus.toLocaleString()} ksi
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded px-3 py-1.5">
                    <Text className="text-gray-500 text-xs">Breaking Strength</Text>
                    <Text className="text-gray-900 text-sm font-semibold">
                      {strand.breakingStrength} kips ({(strand.breakingStrength * 1000).toLocaleString()} lbs)
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-11/12 max-w-lg"
          >
            <View className="bg-white rounded-xl p-6">
              <Text className="text-gray-900 text-xl font-bold mb-4">
                {editingStrand ? "Edit Strand" : "Add Custom Strand"}
              </Text>

              <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                {/* Name */}
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm font-medium mb-1">
                    Name *
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder='e.g., "1/2 inch Grade 270"'
                    value={formName}
                    onChangeText={setFormName}
                  />
                </View>

                {/* Diameter */}
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm font-medium mb-1">
                    Diameter (inches) *
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 0.5"
                    value={formDiameter}
                    onChangeText={setFormDiameter}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Area */}
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm font-medium mb-1">
                    Cross-Sectional Area (in²) *
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 0.153"
                    value={formArea}
                    onChangeText={setFormArea}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Elastic Modulus */}
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm font-medium mb-1">
                    Elastic Modulus (ksi) *
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 28500"
                    value={formElasticModulus}
                    onChangeText={setFormElasticModulus}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Breaking Strength */}
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm font-medium mb-1">
                    Minimum Breaking Strength (kips) *
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 41.3"
                    value={formBreakingStrength}
                    onChangeText={setFormBreakingStrength}
                    keyboardType="decimal-pad"
                  />
                  <Text className="text-gray-500 text-xs mt-1">
                    1 kip = 1,000 lbs
                  </Text>
                </View>

                {/* Grade */}
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm font-medium mb-1">
                    Grade (optional)
                  </Text>
                  <TextInput
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 270"
                    value={formGrade}
                    onChangeText={setFormGrade}
                  />
                </View>
              </ScrollView>

              {/* Buttons */}
              <View className="flex-row gap-3 mt-4">
                <Pressable
                  className="flex-1 bg-gray-100 rounded-lg py-3 items-center"
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </Pressable>

                <Pressable
                  className="flex-1 bg-blue-500 rounded-lg py-3 items-center active:bg-blue-600"
                  onPress={handleSave}
                >
                  <Text className="text-white font-semibold">
                    {editingStrand ? "Update" : "Add"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={deleteConfirmId !== null}
        title="Delete Strand"
        message="Are you sure you want to delete this strand definition? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </View>
  );
}
