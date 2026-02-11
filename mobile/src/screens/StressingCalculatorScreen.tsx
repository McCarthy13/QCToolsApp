import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useStrandLibraryStore } from "../state/strandLibraryStore";

type StressingCalculatorScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "StressingCalculator"
>;

interface Props {
  navigation: StressingCalculatorScreenNavigationProp;
}

export default function StressingCalculatorScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  
  // Get strands from library
  const strands = useStrandLibraryStore((state) => state.strands);
  const getStrandById = useStrandLibraryStore((state) => state.getStrandById);

  // Input states
  const [jackingForce, setJackingForce] = useState("");
  const [bedLength, setBedLength] = useState("");
  const [selectedStrandId, setSelectedStrandId] = useState<string>(
    strands.length > 0 ? strands[0].id : ""
  );
  const [numberOfStrands, setNumberOfStrands] = useState("");
  const [bedShortening, setBedShortening] = useState("");
  const [frictionLoss, setFrictionLoss] = useState("");
  const [anchorSetLoss, setAnchorSetLoss] = useState("");
  const [showStrandPicker, setShowStrandPicker] = useState(false);

  const handleCalculate = () => {
    // Validate inputs
    if (!jackingForce || !bedLength || !numberOfStrands || !selectedStrandId) {
      // Validation feedback already shown via UI
      return;
    }

    // Navigate to results screen
    navigation.navigate("StressingResults", {
      jackingForce: parseFloat(jackingForce),
      bedLength: parseFloat(bedLength),
      strandId: selectedStrandId,
      numberOfStrands: parseInt(numberOfStrands),
      bedShortening: bedShortening ? parseFloat(bedShortening) : undefined,
      frictionLoss: frictionLoss ? parseFloat(frictionLoss) : undefined,
      anchorSetLoss: anchorSetLoss ? parseFloat(anchorSetLoss) : undefined,
    });
  };
  
  const selectedStrand = selectedStrandId ? getStrandById(selectedStrandId) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-gray-900 text-2xl font-bold">
            Stressing Force & Elongation
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            Calculate expected strand elongation measurement
          </Text>
        </View>

        {/* Info Banner */}
        <View className="px-6 mt-4 mb-3">
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text className="text-blue-900 text-xs ml-2 flex-1">
                Enter the total jacking force, bed dimensions, and strand details to calculate what the elongation gauge should read for a single strand during prestressing.
              </Text>
            </View>
          </View>
        </View>

        {/* Required Inputs */}
        <View className="px-6">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Required Information
          </Text>

          {/* Jacking Force */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Total Jacking Force (kips) *
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 120.5"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={jackingForce}
              onChangeText={setJackingForce}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Total force applied to all strands (1 kip = 1,000 lbs)
            </Text>
          </View>

          {/* Bed Length */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Bed Length (feet) *
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 400"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={bedLength}
              onChangeText={setBedLength}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Distance between anchorages
            </Text>
          </View>

          {/* Strand Selection */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-gray-700 text-sm font-medium">
                Strand Type *
              </Text>
              <Pressable
                onPress={() => navigation.navigate("StrandLibrary")}
                className="flex-row items-center"
              >
                <Ionicons name="library" size={14} color="#3B82F6" />
                <Text className="text-blue-500 text-xs ml-1">Manage Library</Text>
              </Pressable>
            </View>
            
            {strands.length === 0 ? (
              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <Text className="text-yellow-900 text-sm mb-2">
                  No strands available in library
                </Text>
                <Pressable
                  onPress={() => navigation.navigate("StrandLibrary")}
                  className="bg-yellow-500 rounded-lg py-2 px-4 items-center"
                >
                  <Text className="text-white text-sm font-medium">
                    Add Strands to Library
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                onPress={() => setShowStrandPicker(true)}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-gray-900 text-base font-medium">
                      {selectedStrand?.name || "Select a strand"}
                    </Text>
                    {selectedStrand && (
                      <Text className="text-gray-500 text-xs mt-1">
                        {selectedStrand.diameter}" • {selectedStrand.area.toFixed(3)} in² • Grade {selectedStrand.grade}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </View>
              </Pressable>
            )}
          </View>

          {/* Number of Strands */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Number of Strands *
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 7"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={numberOfStrands}
              onChangeText={setNumberOfStrands}
              keyboardType="number-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Total number of strands being stressed
            </Text>
          </View>
        </View>

        {/* Optional Inputs */}
        <View className="px-6 mt-2">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Optional Adjustments
          </Text>

          {/* Bed Shortening */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Bed Shortening (inches)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 0.125"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={bedShortening}
              onChangeText={setBedShortening}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Elastic compression of the bed during stressing
            </Text>
          </View>

          {/* Friction Loss */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Friction Loss (%)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 1.5"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={frictionLoss}
              onChangeText={setFrictionLoss}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Typical range: 0.5-2% for long beds
            </Text>
          </View>

          {/* Anchor Set Loss */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Anchor Set Loss (inches)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 0.25"
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              value={anchorSetLoss}
              onChangeText={setAnchorSetLoss}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Slip at anchorage during lock-off
            </Text>
          </View>
        </View>

        {/* Calculate Button */}
        <View className="px-6 mt-2">
          <Pressable
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
            onPress={handleCalculate}
          >
            <View className="flex-row items-center">
              <Ionicons name="calculator" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                Calculate Elongation
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Strand Picker Modal */}
      <Modal
        visible={showStrandPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStrandPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowStrandPicker(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl" style={{ paddingBottom: insets.bottom + 20 }}>
                {/* Header */}
                <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200">
                  <Text className="text-gray-900 text-lg font-bold">
                    Select Strand
                  </Text>
                  <Pressable onPress={() => setShowStrandPicker(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>

                {/* Strand List */}
                <ScrollView className="max-h-96">
                  {strands.map((strand) => (
                    <Pressable
                      key={strand.id}
                      className={`px-6 py-4 border-b border-gray-100 ${
                        selectedStrandId === strand.id ? "bg-blue-50" : ""
                      }`}
                      onPress={() => {
                        setSelectedStrandId(strand.id);
                        setShowStrandPicker(false);
                      }}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="text-gray-900 text-base font-semibold">
                            {strand.name}
                          </Text>
                          <Text className="text-gray-600 text-sm mt-1">
                            {strand.diameter}" diameter • {strand.area.toFixed(3)} in² • {strand.breakingStrength.toFixed(1)} kips
                          </Text>
                          {strand.isDefault && (
                            <Text className="text-gray-400 text-xs mt-0.5">
                              Standard (ASTM A416)
                            </Text>
                          )}
                        </View>
                        {selectedStrandId === strand.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}
