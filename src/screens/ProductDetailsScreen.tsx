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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { Ionicons } from "@expo/vector-icons";
import { parseMeasurementInput } from "../utils/cn";

type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ProductDetails"
>;

interface Props {
  navigation: ProductDetailsScreenNavigationProp;
}

// Product types/sizes for hollow-core planks
const PRODUCT_TYPES = [
  { id: "8048", label: '8048', height: 8, width: 48 },
  { id: "1048", label: '1048', height: 10, width: 48 },
  { id: "1248", label: '1248', height: 12, width: 48 },
  { id: "1250", label: '1250', height: 12, width: 48 },
  { id: "1648", label: '1648', height: 16, width: 48 },
  { id: "1650", label: '1650', height: 16, width: 48 },
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
  const [productWidth, setProductWidth] = useState("");
  const [productSide, setProductSide] = useState<'L1' | 'L2' | ''>('');

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

  // Check if this is a cut-width product
  const fullWidth = selectedProductType?.width || 48;
  const parsedWidth = productWidth.trim() ? parseMeasurementInput(productWidth) : null;
  const tolerance = 0.001;
  const isCutWidth = parsedWidth !== null && Math.abs(parsedWidth - fullWidth) > tolerance && parsedWidth < fullWidth;

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

    // Validate product side if product is cut-width
    if (isCutWidth && !productSide) {
      validationErrors.push("Product side is required for cut-width products");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Parse product width if provided
    const parsedWidth = productWidth.trim() ? parseMeasurementInput(productWidth) : null;

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
        productWidth: parsedWidth !== null ? parsedWidth : undefined,
        productSide: isCutWidth && productSide ? productSide : undefined,
      },
    });
  };

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
                cursorColor="#000000"
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
                cursorColor="#000000"
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
                  cursorColor="#000000"
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
                  cursorColor="#000000"
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
                  cursorColor="#000000"
                  value={spanFeet}
                  onChangeText={setSpanFeet}
                  keyboardType="numeric"
                />
                <Text className="text-gray-600 font-medium">-</Text>
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholder="Inches"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
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

            {/* Product Width Entry */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Product Width (Optional)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                For cut-width products, enter actual width in inches (decimal or fraction)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: '#111827',
                }}
                placeholder="e.g., 28 or 28 1/2 or 28.5"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                selectionColor="#000000"
                value={productWidth}
                onChangeText={setProductWidth}
                keyboardType="default"
              />
            </View>

            {/* Product Side Selector - Only show for cut-width products */}
            {isCutWidth && (
              <View className="mb-6">
                <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                  <View className="flex-row items-start">
                    <Ionicons name="cut" size={20} color="#F59E0B" />
                    <View className="flex-1 ml-3">
                      <Text className="text-amber-900 font-semibold text-sm mb-1">
                        Cut-Width Product Detected
                      </Text>
                      <Text className="text-amber-800 text-xs">
                        Product: {parsedWidth}" (cut from {fullWidth}")
                      </Text>
                    </View>
                  </View>
                </View>

                <Text className="text-gray-700 text-sm font-medium mb-2">
                  Product Side <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-xs text-gray-500 mb-3">
                  Which side is the keeper side (product side)?
                </Text>

                {/* Product Side Buttons */}
                <View className="flex-row gap-3 mb-3">
                  <Pressable
                    onPress={() => setProductSide('L1')}
                    className={`flex-1 rounded-lg py-3 px-4 border-2 ${
                      productSide === 'L1'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-center font-semibold text-sm ${
                      productSide === 'L1' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      L1 (Left Side)
                    </Text>
                    <Text className="text-center text-xs text-gray-600 mt-1">
                      Keep left side
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setProductSide('L2')}
                    className={`flex-1 rounded-lg py-3 px-4 border-2 ${
                      productSide === 'L2'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-center font-semibold text-sm ${
                      productSide === 'L2' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      L2 (Right Side)
                    </Text>
                    <Text className="text-center text-xs text-gray-600 mt-1">
                      Keep right side
                    </Text>
                  </Pressable>
                </View>

                {/* Visual Diagram */}
                <View className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <Text className="text-xs font-semibold text-gray-700 mb-3 text-center">
                    Visual Guide
                  </Text>
                  
                  {/* L1 Product Side Diagram */}
                  <View className="mb-4">
                    <Text className="text-xs text-gray-600 mb-2">L1 Product Side (Keep left):</Text>
                    <View className="flex-row items-center">
                      <View className="flex-1 h-12 bg-blue-100 border-2 border-blue-500 items-center justify-center">
                        <Text className="text-xs text-blue-700">Keep (L1)</Text>
                      </View>
                      <View className="flex-1 h-12 bg-red-100 border-r-4 border-red-500 items-center justify-center">
                        <Text className="text-xs text-red-700">Cut Edge</Text>
                      </View>
                    </View>
                  </View>

                  {/* L2 Product Side Diagram */}
                  <View>
                    <Text className="text-xs text-gray-600 mb-2">L2 Product Side (Keep right):</Text>
                    <View className="flex-row items-center">
                      <View className="flex-1 h-12 bg-red-100 border-l-4 border-red-500 items-center justify-center">
                        <Text className="text-xs text-red-700">Cut Edge</Text>
                      </View>
                      <View className="flex-1 h-12 bg-blue-100 border-2 border-blue-500 items-center justify-center">
                        <Text className="text-xs text-blue-700">Keep (L2)</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {errors.includes("Product side is required for cut-width products") && (
                  <Text className="text-red-600 text-xs mt-2">
                    ⚠ Please select which side is the product side (keeper side)
                  </Text>
                )}
              </View>
            )}
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
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Strand Pattern <Text className="text-red-500">*</Text>
              </Text>
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
                    {type.height}" thick × {type.width}" wide hollow core slab
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
                  <Text className="text-gray-600 text-base mt-4 mb-4 text-center">
                    No bottom strand patterns available.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowStrandModal(false);
                      navigation.navigate("StrandPatterns");
                    }}
                    className="bg-blue-500 rounded-xl py-3 px-6 items-center active:bg-blue-600"
                  >
                    <Text className="text-white text-sm font-semibold">
                      Go to Strand Library
                    </Text>
                  </Pressable>
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
