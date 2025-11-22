import React, { useState, useEffect } from "react";
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
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { Ionicons } from "@expo/vector-icons";
import { parseMeasurementInput } from "../utils/cn";
import { useJobAutocomplete } from "../utils/jobAutocomplete";

type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ProductDetails"
>;

type ProductDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  "ProductDetails"
>;

interface Props {
  navigation: ProductDetailsScreenNavigationProp;
  route: ProductDetailsScreenRouteProp;
}

// Product types/sizes for hollow-core planks
const PRODUCT_TYPES = [
  { id: "8048", label: '8048', height: 8, width: 48 },
  { id: "1047", label: '1047', height: 10, width: 48 },
  { id: "1247", label: '1247', height: 12, width: 48 },
  { id: "1250", label: '1250', height: 12, width: 48 },
  { id: "1648", label: '1648', height: 16, width: 48 },
  { id: "1650", label: '1650', height: 16, width: 48 },
];

export default function ProductDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { customPatterns } = useStrandPatternStore();
  const { findByJobNumber, searchByJobName } = useJobAutocomplete();

  // Check if we're in edit mode
  const editMode = route.params?.editMode ?? false;
  const existingConfig = editMode ? route.params?.existingConfig : undefined;
  const existingSlippages = editMode ? route.params?.existingSlippages : undefined;
  const recordId = editMode ? route.params?.recordId : undefined;

  // Convert span from decimal to feet/inches if it exists
  const convertSpanToFeetInches = (span?: number) => {
    if (!span) return { feet: "", inches: "", fraction: "0" };
    const feet = Math.floor(span / 12);
    const remainingInches = span % 12;
    const inches = Math.floor(remainingInches);
    const fraction = ((remainingInches - inches) * 16).toFixed(0); // Convert to 16ths
    return {
      feet: feet.toString(),
      inches: inches.toString(),
      fraction: fraction
    };
  };

  const spanParts = convertSpanToFeetInches(existingConfig?.span);

  // Optional fields
  const [projectName, setProjectName] = useState(existingConfig?.projectName || "");
  const [projectNumber, setProjectNumber] = useState(existingConfig?.projectNumber || "");
  const [markNumber, setMarkNumber] = useState(existingConfig?.markNumber || "");
  const [idNumber, setIdNumber] = useState(existingConfig?.idNumber || "");
  const [spanFeet, setSpanFeet] = useState(spanParts.feet);
  const [spanInches, setSpanInches] = useState(spanParts.inches);
  const [spanFraction, setSpanFraction] = useState(spanParts.fraction);
  const [pourDate, setPourDate] = useState(existingConfig?.pourDate || "");

  // Required fields
  const [productType, setProductType] = useState(existingConfig?.productType || "");
  const [strandPattern, setStrandPattern] = useState(existingConfig?.strandPattern || "");
  const [castStrandPattern, setCastStrandPattern] = useState(existingConfig?.castStrandPattern || "");

  // Optional field
  const [topStrandPattern, setTopStrandPattern] = useState(existingConfig?.topStrandPattern || "");
  const [topCastStrandPattern, setTopCastStrandPattern] = useState(existingConfig?.topCastStrandPattern || "");
  const [productWidth, setProductWidth] = useState(existingConfig?.productWidth?.toString() || "");
  const [productSide, setProductSide] = useState<'L1' | 'L2' | ''>(existingConfig?.productSide || '');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showCastStrandModal, setShowCastStrandModal] = useState(false);
  const [showTopStrandModal, setShowTopStrandModal] = useState(false);
  const [showTopCastStrandModal, setShowTopCastStrandModal] = useState(false);
  const [showFractionModal, setShowFractionModal] = useState(false);

  // Project Name autocomplete
  const [showProjectNameSuggestions, setShowProjectNameSuggestions] = useState(false);
  const [projectNameSuggestions, setProjectNameSuggestions] = useState<Array<{jobNumber: string, jobName: string}>>([]);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  // Clear strand pattern selections when product type changes
  useEffect(() => {
    // Don't run on initial render or when in edit mode and loading existing config
    if (editMode && existingConfig?.productType === productType) return;

    // Clear strand patterns if they don't match the new product type
    if (productType && strandPattern) {
      const selectedPattern = customPatterns.find(p => p.id === strandPattern);
      if (selectedPattern) {
        const matchesProductType =
          selectedPattern.productType === productType ||
          selectedPattern.name.includes(`(${productType})`);
        if (!matchesProductType) {
          setStrandPattern("");
          setCastStrandPattern("");
        }
      }
    }

    if (productType && castStrandPattern) {
      const selectedPattern = customPatterns.find(p => p.id === castStrandPattern);
      if (selectedPattern) {
        const matchesProductType =
          selectedPattern.productType === productType ||
          selectedPattern.name.includes(`(${productType})`);
        if (!matchesProductType) {
          setCastStrandPattern("");
        }
      }
    }

    if (productType && topStrandPattern) {
      const selectedPattern = customPatterns.find(p => p.id === topStrandPattern);
      if (selectedPattern) {
        const matchesProductType =
          selectedPattern.productType === productType ||
          selectedPattern.name.includes(`(${productType})`);
        if (!matchesProductType) {
          setTopStrandPattern("");
          setTopCastStrandPattern("");
        }
      }
    }

    if (productType && topCastStrandPattern) {
      const selectedPattern = customPatterns.find(p => p.id === topCastStrandPattern);
      if (selectedPattern) {
        const matchesProductType =
          selectedPattern.productType === productType ||
          selectedPattern.name.includes(`(${productType})`);
        if (!matchesProductType) {
          setTopCastStrandPattern("");
        }
      }
    }
  }, [productType, customPatterns]);

  // Auto-populate Project Name when Project Number changes
  useEffect(() => {
    if (projectNumber.trim()) {
      const project = findByJobNumber(projectNumber);
      if (project) {
        setIsAutoFilling(true);
        setProjectName(project.jobName);
        setTimeout(() => setIsAutoFilling(false), 100);
      } else {
        // Clear project name if job number doesn't match any project
        setProjectName("");
      }
    } else {
      // Clear project name if job number is empty
      setProjectName("");
    }
  }, [projectNumber, findByJobNumber]);

  // Filter Project Name suggestions when user types
  useEffect(() => {
    // Don't show suggestions if we're auto-filling from job number
    if (isAutoFilling) return;

    if (projectName.trim().length >= 2) {
      const suggestions = searchByJobName(projectName);
      setProjectNameSuggestions(suggestions);
      setShowProjectNameSuggestions(suggestions.length > 0);
    } else {
      setProjectNameSuggestions([]);
      setShowProjectNameSuggestions(false);
    }
  }, [projectName, searchByJobName, isAutoFilling]);

  // Handle selecting a project name from suggestions
  const handleSelectProjectName = (jobNumber: string, jobName: string) => {
    setIsAutoFilling(true);
    setProjectName(jobName);
    setProjectNumber(jobNumber);
    setShowProjectNameSuggestions(false);
    setTimeout(() => setIsAutoFilling(false), 100);
  };

  // Get bottom patterns (where strands are positioned)
  // Filter by position AND product type if a product type is selected
  const bottomPatterns = customPatterns.filter((p) => {
    const hasCorrectPosition = p.position === "Bottom" || p.position === "Both";
    // If no product type selected yet, show all patterns
    if (!productType) return hasCorrectPosition;
    // Filter by productType field OR check if productType is in pattern name (in parentheses)
    const matchesProductType =
      p.productType === productType ||
      p.name.includes(`(${productType})`);
    return hasCorrectPosition && matchesProductType;
  });

  const topPatterns = customPatterns.filter((p) => {
    const hasCorrectPosition = p.position === "Top" || p.position === "Both";
    // If no product type selected yet, show all patterns
    if (!productType) return hasCorrectPosition;
    // Filter by productType field OR check if productType is in pattern name (in parentheses)
    const matchesProductType =
      p.productType === productType ||
      p.name.includes(`(${productType})`);
    return hasCorrectPosition && matchesProductType;
  });

  const selectedProductType = PRODUCT_TYPES.find((p) => p.id === productType);
  const selectedStrandPattern = customPatterns.find(
    (p) => p.id === strandPattern
  );
  const selectedCastStrandPattern = customPatterns.find(
    (p) => p.id === castStrandPattern
  );
  const selectedTopStrandPattern = customPatterns.find(
    (p) => p.id === topStrandPattern
  );
  const selectedTopCastStrandPattern = customPatterns.find(
    (p) => p.id === topCastStrandPattern
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

  // Validate that a fraction string is a valid 1/8" increment
  const validateFraction = (fractionStr: string): boolean => {
    const validFractions = ["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];
    return validFractions.includes(fractionStr.trim());
  };

  // Handle fraction input change with validation
  const handleFractionChange = (text: string) => {
    setSpanFraction(text);
  };

  // Handle fraction input blur (when user finishes typing)
  const handleFractionBlur = () => {
    const trimmed = spanFraction.trim();

    // If empty, default to "0"
    if (trimmed === "") {
      setSpanFraction("0");
      return;
    }

    // Validate the input
    if (!validateFraction(trimmed)) {
      // Show error alert
      alert("Not a valid value. Please enter 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, or 7/8 or select from the dropdown.");
      setSpanFraction("0"); // Reset to 0
    }
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
      validationErrors.push("Bottom Design Strand Pattern is required");
    }

    // Validate top strand patterns - if either is selected, both must be selected
    if (topStrandPattern || topCastStrandPattern) {
      if (!topStrandPattern) {
        validationErrors.push("Top Design Strand Pattern is required when Top Cast Strand Pattern is selected");
      }
      if (!topCastStrandPattern) {
        validationErrors.push("Top Cast Strand Pattern is required when Top Design Strand Pattern is selected");
      }
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
        pourDate: pourDate || undefined,
        productType: productType,
        strandPattern: strandPattern,
        castStrandPattern: castStrandPattern || undefined,
        topStrandPattern: topStrandPattern || undefined,
        topCastStrandPattern: topCastStrandPattern || undefined,
        productWidth: parsedWidth !== null ? parsedWidth : undefined,
        productSide: isCutWidth && productSide ? productSide : undefined,
      },
      editMode: editMode,
      existingSlippages: existingSlippages,
      recordId: recordId,
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
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-gray-900 text-2xl font-bold">
                Product Details
              </Text>
              <Pressable
                onPress={() => {
                  navigation.navigate("ProductTagScanner", {
                    onDataScanned: (data) => {
                      // Fill all fields from the scanned tag
                      if (data.projectName) setProjectName(data.projectName);
                      if (data.projectNumber) setProjectNumber(data.projectNumber);
                      if (data.markNumber) setMarkNumber(data.markNumber);
                      if (data.idNumber) setIdNumber(data.idNumber);
                      if (data.span) {
                        setSpanFeet(data.span.feet.toString());
                        setSpanInches(data.span.inches.toString());
                        setSpanFraction("0"); // Decimal inches, no fraction
                      }
                      if (data.pourDate) setPourDate(data.pourDate);
                      if (data.productWidth) {
                        setProductWidth(data.productWidth.toString());
                      }
                      if (data.strandPattern) {
                        // Find matching strand pattern by ID or name
                        const matchingPattern = customPatterns.find(
                          p => p.patternId === data.strandPattern || p.name.includes(data.strandPattern || '')
                        );
                        if (matchingPattern) {
                          setStrandPattern(matchingPattern.id);
                        }
                      }
                    },
                  });
                }}
                className="bg-blue-500 rounded-lg px-4 py-2 flex-row items-center"
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text className="text-white text-sm font-semibold ml-2">
                  Scan Product Tag
                </Text>
              </Pressable>
            </View>
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

          {/* Optional Product Details */}
          <View className="px-6 mt-6">
            <Text className="text-gray-900 text-lg font-semibold mb-4">
              Product Details (Optional)
            </Text>

            <View className="mb-4" style={{ zIndex: 10 }}>
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Project Name
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholder="Enter project name"
                  placeholderTextColor="#9CA3AF"
                  cursorColor="#000000"
                  value={projectName}
                  onChangeText={setProjectName}
                  onBlur={() => {
                    // Delay hiding suggestions to allow click events to register
                    setTimeout(() => setShowProjectNameSuggestions(false), 200);
                  }}
                  onFocus={() => {
                    if (projectName.trim().length >= 2 && projectNameSuggestions.length > 0) {
                      setShowProjectNameSuggestions(true);
                    }
                  }}
                />
                {showProjectNameSuggestions && projectNameSuggestions.length > 0 && (
                  <View
                    className="bg-white border border-gray-300 rounded-lg"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      zIndex: 9999,
                      maxHeight: 200,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {projectNameSuggestions.map((suggestion, index) => (
                        <Pressable
                          key={`${suggestion.jobNumber}-${index}`}
                          onPress={() => handleSelectProjectName(suggestion.jobNumber, suggestion.jobName)}
                          className="px-4 py-3 border-b border-gray-200"
                          style={{ backgroundColor: '#fff' }}
                        >
                          <Text className="text-gray-900 text-base font-medium">{suggestion.jobName}</Text>
                          <Text className="text-gray-500 text-sm">Job #: {suggestion.jobNumber}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
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
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                    placeholder="Feet"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    value={spanFeet}
                    onChangeText={setSpanFeet}
                    keyboardType="numeric"
                  />
                </View>
                <Text className="text-gray-600 font-medium">-</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                    placeholder="Inches"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    value={spanInches}
                    onChangeText={setSpanInches}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ minWidth: 90 }}>
                  <Pressable
                    className="bg-white border border-gray-300 rounded-lg px-3 py-3 flex-row items-center justify-between"
                    onPress={() => setShowFractionModal(true)}
                  >
                    <TextInput
                      className="text-gray-900 font-medium text-sm flex-1"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      value={spanFraction}
                      onChangeText={handleFractionChange}
                      onBlur={handleFractionBlur}
                      style={{ padding: 0 }}
                    />
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Pour Date Entry */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Pour Date (Optional)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={pourDate}
                onChangeText={setPourDate}
                keyboardType="default"
              />
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

            {/* Bottom Strand Pattern (Design) */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Bottom Design Strand Pattern <Text className="text-red-500">*</Text>
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                The strand pattern this piece was designed with
              </Text>
              <Pressable
                className={`bg-white border ${
                  errors.includes("Bottom Design Strand Pattern is required")
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
                    : "Select design strand pattern"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </Pressable>
              {bottomPatterns.length === 0 && (
                <Text className="text-orange-600 text-xs mt-1">
                  No bottom patterns available. Create one in Strand Patterns.
                </Text>
              )}
            </View>

            {/* Bottom Cast Strand Pattern */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Bottom Cast Strand Pattern
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Leave as "Matches Design" unless cast with a different pattern
              </Text>
              <Pressable
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row items-center justify-between"
                onPress={() => setShowCastStrandModal(true)}
              >
                <Text
                  className={`text-base ${
                    castStrandPattern ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {selectedCastStrandPattern
                    ? selectedCastStrandPattern.name
                    : "Matches Design"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Top Strand Pattern (Design) (Optional) */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Top Design Strand Pattern (Optional)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                If selected, both top design and cast patterns must be specified
              </Text>
              <Pressable
                className={`bg-white border ${
                  errors.some(e => e.includes("Top Design Strand Pattern"))
                    ? "border-red-500"
                    : "border-gray-300"
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
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

            {/* Top Cast Strand Pattern (Optional) */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Top Cast Strand Pattern (Optional)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Leave as "Matches Design" unless cast with a different pattern
              </Text>
              <Pressable
                className={`bg-white border ${
                  errors.some(e => e.includes("Top Cast Strand Pattern"))
                    ? "border-red-500"
                    : "border-gray-300"
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
                onPress={() => setShowTopCastStrandModal(true)}
              >
                <Text
                  className={`text-base ${
                    topCastStrandPattern ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {selectedTopCastStrandPattern
                    ? selectedTopCastStrandPattern.name
                    : "Matches Design"}
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

      {/* Cast Strand Pattern Modal */}
      <Modal
        visible={showCastStrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCastStrandModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-semibold">
                Select Cast Strand Pattern
              </Text>
              <Pressable onPress={() => setShowCastStrandModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-4">
              {/* Matches Design Option */}
              <Pressable
                className={`p-4 mb-2 rounded-lg border ${
                  castStrandPattern === ""
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => {
                  setCastStrandPattern("");
                  setShowCastStrandModal(false);
                }}
              >
                <Text
                  className={`text-base font-semibold ${
                    castStrandPattern === ""
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  Matches Design
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Cast with the same pattern as designed
                </Text>
              </Pressable>

              {bottomPatterns.map((pattern) => (
                <Pressable
                  key={pattern.id}
                  className={`p-4 mb-2 rounded-lg border ${
                    castStrandPattern === pattern.id
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => {
                    setCastStrandPattern(pattern.id);
                    setShowCastStrandModal(false);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${
                      castStrandPattern === pattern.id
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
                  setTopCastStrandPattern(""); // Clear cast pattern too
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

      {/* Top Cast Strand Pattern Modal */}
      <Modal
        visible={showTopCastStrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopCastStrandModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-semibold">
                Select Top Cast Strand Pattern
              </Text>
              <Pressable onPress={() => setShowTopCastStrandModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-4">
              {/* Matches Design Option */}
              <Pressable
                className={`p-4 mb-2 rounded-lg border ${
                  topCastStrandPattern === ""
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => {
                  setTopCastStrandPattern("");
                  setShowTopCastStrandModal(false);
                }}
              >
                <Text
                  className={`text-base font-semibold ${
                    topCastStrandPattern === ""
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  Matches Design
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Cast with the same pattern as designed
                </Text>
              </Pressable>

              {topPatterns.map((pattern) => (
                <Pressable
                  key={pattern.id}
                  className={`p-4 mb-2 rounded-lg border ${
                    topCastStrandPattern === pattern.id
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => {
                    setTopCastStrandPattern(pattern.id);
                    setShowTopCastStrandModal(false);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${
                      topCastStrandPattern === pattern.id
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

      {/* Fraction Selector Modal */}
      <Modal
        visible={showFractionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFractionModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-semibold">
                Select Fraction
              </Text>
              <Pressable onPress={() => setShowFractionModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="p-4">
              {["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"].map((fraction) => (
                <Pressable
                  key={fraction}
                  className={`p-4 mb-2 rounded-lg border ${
                    spanFraction === fraction
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => {
                    setSpanFraction(fraction);
                    setShowFractionModal(false);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${
                      spanFraction === fraction
                        ? "text-blue-600"
                        : "text-gray-900"
                    }`}
                  >
                    {fraction}″
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
