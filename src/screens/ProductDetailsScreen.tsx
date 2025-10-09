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
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { Ionicons } from "@expo/vector-icons";

type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ProductDetails"
>;

interface Props {
  navigation: ProductDetailsScreenNavigationProp;
}

// Product types/sizes for hollow-core planks
const PRODUCT_TYPES = [
  { id: "8024", label: '8" x 24"', height: 8, width: 24 },
  { id: "8032", label: '8" x 32"', height: 8, width: 32 },
  { id: "8048", label: '8" x 48"', height: 8, width: 48 },
  { id: "10024", label: '10" x 24"', height: 10, width: 24 },
  { id: "10032", label: '10" x 32"', height: 10, width: 32 },
  { id: "10048", label: '10" x 48"', height: 10, width: 48 },
  { id: "12024", label: '12" x 24"', height: 12, width: 24 },
  { id: "12032", label: '12" x 32"', height: 12, width: 32 },
  { id: "12048", label: '12" x 48"', height: 12, width: 48 },
];

export default function ProductDetailsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { customPatterns } = useStrandPatternStore();

  // Optional fields
  const [projectName, setProjectName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [markNumber, setMarkNumber] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [spanFeet, setSpanFeet] = useState("");
  const [spanInches, setSpanInches] = useState("");
  const [spanFraction, setSpanFraction] = useState("0");

  // Required fields
  const [productType, setProductType] = useState("");
  const [strandPattern, setStrandPattern] = useState("");

  // Optional field
  const [topStrandPattern, setTopStrandPattern] = useState("");

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showTopStrandModal, setShowTopStrandModal] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  // Get bottom patterns (where strands are positioned)
  const bottomPatterns = customPatterns.filter(
    (p) => p.position === "Bottom" || p.position === "Both"
  );
  const topPatterns = customPatterns.filter(
    (p) => p.position === "Top" || p.position === "Both"
  );

  const selectedProductType = PRODUCT_TYPES.find((p) => p.id === productType);
  const selectedStrandPattern = customPatterns.find(
    (p) => p.id === strandPattern
  );
  const selectedTopStrandPattern = customPatterns.find(
    (p) => p.id === topStrandPattern
  );

  const parseFraction = (fraction: string): number => {
    if (!fraction || fraction === "0") return 0;
    const parts = fraction.split("/");
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (denominator !== 0) {
        return numerator / denominator;
      }
    }
    return 0;
  };

  const getSpanInFeet = (): number => {
    const feet = parseFloat(spanFeet) || 0;
    const inches = parseFloat(spanInches) || 0;
    const fractionValue = parseFraction(spanFraction);
    return feet + (inches + fractionValue) / 12;
  };

  const handleContinue = () => {
    const validationErrors: string[] = [];

    // Required validations
    if (!productType) {
      validationErrors.push("Product Type/Size is required");
    }
    if (!strandPattern) {
      validationErrors.push("Strand Pattern is required");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Navigate to slippage identifier with configuration
    navigation.navigate("SlippageIdentifier", {
      config: {
        projectName: projectName || undefined,
        projectNumber: projectNumber || undefined,
        markNumber: markNumber || undefined,
        idNumber: idNumber || undefined,
        span: spanFeet || spanInches || spanFraction !== "0" ? getSpanInFeet() : undefined,
        productType: productType,
        strandPattern: strandPattern,
        topStrandPattern: topStrandPattern || undefined,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-200">
            <Text className="text-gray-900 text-2xl font-bold">
              Product Details
            </Text>
            <Text className="text-gray-600 text-sm mt-1">
              Configure project details and select strand pattern
            </Text>
          </View>

          {/* Error Display */}
          {errors.length > 0 && (
            <View className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <View className="flex-row items-start">
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <View className="ml-2 flex-1">
                  <Text className="text-red-800 font-semibold text-sm mb-1">
                    Please fix the following:
                  </Text>
                  {errors.map((error, index) => (
                    <Text key={index} className="text-red-700 text-sm">
                      • {error}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Optional Project Information */}
          <View className="px-6 mt-6">
            <Text className="text-gray-900 text-lg font-semibold mb-4">
              Project Information (Optional)
            </Text>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Project Name
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="Enter project name"
                placeholderTextColor="#9CA3AF"
                value={projectName}
                onChangeText={setProjectName}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Project Number
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="Enter project number"
                placeholderTextColor="#9CA3AF"
                value={projectNumber}
                onChangeText={setProjectNumber}
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-gray-700 text-sm font-medium mb-2">
                  Mark Number
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholder="Mark #"
                  placeholderTextColor="#9CA3AF"
                  value={markNumber}
                  onChangeText={setMarkNumber}
                />
              </View>

              <View className="flex-1">
                <Text className="text-gray-700 text-sm font-medium mb-2">
                  ID Number
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholder="ID #"
                  placeholderTextColor="#9CA3AF"
                  value={idNumber}
                  onChangeText={setIdNumber}
                />
              </View>
            </View>

            {/* Span Entry */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Span (Optional)
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholder="Feet"
                  placeholderTextColor="#9CA3AF"
                  value={spanFeet}
                  onChangeText={setSpanFeet}
                  keyboardType="numeric"
                />
                <Text className="text-gray-600 font-medium">-</Text>
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholder="Inches"
                  placeholderTextColor="#9CA3AF"
                  value={spanInches}
                  onChangeText={setSpanInches}
                  keyboardType="numeric"
                />
                <Pressable
                  className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 min-w-[80px] items-center"
                  onPress={() => {
                    const fractions = ["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];
                    const currentIndex = fractions.indexOf(spanFraction);
                    const nextIndex = (currentIndex + 1) % fractions.length;
                    setSpanFraction(fractions[nextIndex]);
                  }}
                >
                  <Text className="text-gray-900 font-medium">
                    {spanFraction === "0" ? "0" : spanFraction}″
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Required Configuration */}
          <View className="px-6 mb-6">
            <Text className="text-gray-900 text-lg font-semibold mb-4">
              Configuration <Text className="text-red-500">*</Text>
            </Text>

            {/* Product Type/Size */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Product Type/Size <Text className="text-red-500">*</Text>
              </Text>
              <Pressable
                className={`bg-white border ${
                  errors.includes("Product Type/Size is required")
                    ? "border-red-500"
                    : "border-gray-300"
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
                onPress={() => setShowProductModal(true)}
              >
                <Text
                  className={`text-base ${
                    productType ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {selectedProductType
                    ? selectedProductType.label
                    : "Select product type/size"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Strand Pattern */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-700 text-sm font-medium">
                  Strand Pattern <Text className="text-red-500">*</Text>
                </Text>
                <Pressable
                  onPress={() => navigation.navigate("StrandPatterns")}
                  className="flex-row items-center"
                >
                  <Ionicons name="add-circle-outline" size={16} color="#3B82F6" />
                  <Text className="text-blue-500 text-xs ml-1">
                    Manage Patterns
                  </Text>
                </Pressable>
              </View>
              <Pressable
                className={`bg-white border ${
                  errors.includes("Strand Pattern is required")
                    ? "border-red-500"
                    : "border-gray-300"
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
                onPress={() => setShowStrandModal(true)}
              >
                <Text
                  className={`text-base ${
                    strandPattern ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {selectedStrandPattern
                    ? selectedStrandPattern.name
                    : "Select strand pattern"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </Pressable>
              {bottomPatterns.length === 0 && (
                <Text className="text-orange-600 text-xs mt-1">
                  No bottom patterns available. Create one in Strand Patterns.
                </Text>
              )}
            </View>

            {/* Top Strand Pattern (Optional) */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Top Strand Pattern (Optional)
              </Text>
              <Pressable
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row items-center justify-between"
                onPress={() => setShowTopStrandModal(true)}
              >
                <Text
                  className={`text-base ${
                    topStrandPattern ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {selectedTopStrandPattern
                    ? selectedTopStrandPattern.name
                    : "None"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          {/* Continue Button */}
          <View className="px-6">
            <Pressable
              className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
              onPress={handleContinue}
            >
              <Text className="text-white text-base font-semibold">
                Continue to Input Values
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Product Type Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-semibold">
                Select Product Type/Size
              </Text>
              <Pressable onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-4">
              {PRODUCT_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  className={`p-4 mb-2 rounded-lg border ${
                    productType === type.id
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => {
                    setProductType(type.id);
                    setShowProductModal(false);
                    setErrors([]);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${
                      productType === type.id
                        ? "text-blue-600"
                        : "text-gray-900"
                    }`}
                  >
                    {type.label}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Height: {type.height}" • Width: {type.width}"
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Strand Pattern Modal */}
      <Modal
        visible={showStrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStrandModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-semibold">
                Select Strand Pattern
              </Text>
              <Pressable onPress={() => setShowStrandModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-4">
              {bottomPatterns.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-600 text-base mt-4 text-center">
                    No bottom strand patterns available.{"\n"}Create one in
                    Strand Patterns.
                  </Text>
                </View>
              ) : (
                bottomPatterns.map((pattern) => (
                  <Pressable
                    key={pattern.id}
                    className={`p-4 mb-2 rounded-lg border ${
                      strandPattern === pattern.id
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-200"
                    }`}
                    onPress={() => {
                      setStrandPattern(pattern.id);
                      setShowStrandModal(false);
                      setErrors([]);
                    }}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        strandPattern === pattern.id
                          ? "text-blue-600"
                          : "text-gray-900"
                      }`}
                    >
                      {pattern.name}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      Pattern ID: {pattern.patternId} • Position:{" "}
                      {pattern.position}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Top Strand Pattern Modal */}
      <Modal
        visible={showTopStrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopStrandModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-semibold">
                Select Top Strand Pattern
              </Text>
              <Pressable onPress={() => setShowTopStrandModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-4">
              {/* None Option */}
              <Pressable
                className={`p-4 mb-2 rounded-lg border ${
                  topStrandPattern === ""
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => {
                  setTopStrandPattern("");
                  setShowTopStrandModal(false);
                }}
              >
                <Text
                  className={`text-base font-semibold ${
                    topStrandPattern === ""
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  None
                </Text>
              </Pressable>

              {topPatterns.map((pattern) => (
                <Pressable
                  key={pattern.id}
                  className={`p-4 mb-2 rounded-lg border ${
                    topStrandPattern === pattern.id
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => {
                    setTopStrandPattern(pattern.id);
                    setShowTopStrandModal(false);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${
                      topStrandPattern === pattern.id
                        ? "text-blue-600"
                        : "text-gray-900"
                    }`}
                  >
                    {pattern.name}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Pattern ID: {pattern.patternId} • Position:{" "}
                    {pattern.position}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
