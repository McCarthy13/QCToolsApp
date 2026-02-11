import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCalculatorStore } from '../state/calculatorStore';
import {
  calculateCamber,
  validateInputs,
  CamberInputs,
} from '../utils/camber-calculations';
import { useStrandPatternStore } from '../state/strandPatternStore';
import { useProductLibraryStore } from '../state/productLibraryStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { parseMeasurementInput } from '../utils/cn';
import { useJobAutocomplete } from '../utils/jobAutocomplete';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Calculator'>;
type CalculatorRouteProp = RouteProp<RootStackParamList, 'Calculator'>;

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CalculatorRouteProp>();
  const { currentInputs, addCalculation, updateCalculation } = useCalculatorStore();
  const editingCalculation = route.params?.editingCalculation;
  const { customPatterns } = useStrandPatternStore();
  const { products } = useProductLibraryStore();
  const { findByJobNumber, searchByJobName } = useJobAutocomplete();

  const [projectName, setProjectName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [markNumber, setMarkNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [spanFeet, setSpanFeet] = useState('');
  const [spanInches, setSpanInches] = useState('');
  const [spanFraction, setSpanFraction] = useState('0');
  const [productWidth, setProductWidth] = useState('');
  const [productSide, setProductSide] = useState<'L1' | 'L2' | ''>('');

  // Product selection
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSubProductId, setSelectedSubProductId] = useState<string>('');
  const [showProductModal, setShowProductModal] = useState(false);

  // Project Name autocomplete
  const [showProjectNameSuggestions, setShowProjectNameSuggestions] = useState(false);
  const [projectNameSuggestions, setProjectNameSuggestions] = useState<Array<{ jobNumber: string, jobName: string }>>([]);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Pre-fill form when editing an existing calculation
  useEffect(() => {
    if (editingCalculation) {
      const calc = editingCalculation;

      // Fill project details
      if (calc.projectName) setProjectName(calc.projectName);
      if (calc.inputs.projectNumber) setProjectNumber(calc.inputs.projectNumber);
      if (calc.inputs.markNumber) setMarkNumber(calc.inputs.markNumber);
      if (calc.inputs.idNumber) setIdNumber(calc.inputs.idNumber);

      // Fill span details
      if (calc.inputs.span) {
        const totalInches = calc.inputs.span * 12;
        const feet = Math.floor(totalInches / 12);
        const remainingInches = totalInches - (feet * 12);
        const inches = Math.floor(remainingInches);
        const fraction = remainingInches - inches;

        setSpanFeet(feet.toString());
        setSpanInches(inches.toString());

        // Convert decimal fraction to nearest 1/8"
        if (fraction > 0) {
          const eighths = Math.round(fraction * 8);
          if (eighths > 0) {
            setSpanFraction(`${eighths}/8`);
          } else {
            setSpanFraction('0');
          }
        } else {
          setSpanFraction('0');
        }
      }

      // Fill product details
      if (calc.inputs.productWidth) {
        setProductWidth(calc.inputs.productWidth.toString());
      }
      if (calc.inputs.productSide) {
        setProductSide(calc.inputs.productSide);
      }

      // Fill strand patterns
      if (calc.inputs.strandPattern) {
        setStrandPattern(calc.inputs.strandPattern);
      }
      if (calc.inputs.topStrandPattern) {
        setTopStrandPattern(calc.inputs.topStrandPattern);
      }

      // Find and set product/sub-product based on momentOfInertia
      const targetMOI = calc.inputs.momentOfInertia;
      for (const product of products) {
        const subProduct = product.subProducts?.find(sp => sp.momentOfInertia === targetMOI);
        if (subProduct) {
          setSelectedProductId(product.id);
          setSelectedSubProductId(subProduct.id);
          break;
        }
      }
    }
  }, [editingCalculation, products]);

  // Auto-populate Project Name when Project Number changes
  useEffect(() => {
    if (projectNumber.trim()) {
      const project = findByJobNumber(projectNumber);
      if (project) {
        setIsAutoFilling(true);
        setProjectName(project.jobName);
        const timeoutId = setTimeout(() => setIsAutoFilling(false), 100);
        return () => clearTimeout(timeoutId);
      } else {
        // Clear project name if job number doesn't match any project
        setProjectName('');
      }
    } else {
      // Clear project name if job number is empty
      setProjectName('');
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

  const [strandPattern, setStrandPattern] = useState<string>('');
  const [topStrandPattern, setTopStrandPattern] = useState<string>('');
  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showTopStrandModal, setShowTopStrandModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Get selected pattern to determine full width from pattern coordinates
  const selectedPattern = customPatterns.find(p => p.id === strandPattern);

  // Get selected product and sub-product
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedSubProduct = selectedProduct?.subProducts?.find(sp => sp.id === selectedSubProductId);

  // Get moment of inertia and dead load from selected sub-product
  const momentOfInertia = selectedSubProduct?.momentOfInertia || 0;
  const deadLoad = selectedSubProduct?.deadLoadPerLinearFoot || 0;

  // Calculate full width from strand coordinates if available, otherwise default to 48"
  const fullWidth = selectedPattern?.strandCoordinates && selectedPattern.strandCoordinates.length > 0
    ? Math.max(...selectedPattern.strandCoordinates.map(c => c.x))
    : 48;

  // Check if this is a cut-width product
  const parsedWidth = productWidth.trim() ? parseMeasurementInput(productWidth) : null;
  const tolerance = 0.001;
  const isCutWidth = parsedWidth !== null && Math.abs(parsedWidth - fullWidth) > tolerance && parsedWidth < fullWidth;

  // Convert feet/inches/fraction to decimal feet
  const getSpanInFeet = (): number => {
    const feet = parseFloat(spanFeet) || 0;
    const inches = parseFloat(spanInches) || 0;
    const fractionValue = parseFraction(spanFraction);
    return feet + (inches + fractionValue) / 12;
  };

  // Parse fraction string like "1/2" to decimal
  const parseFraction = (fraction: string): number => {
    if (!fraction || fraction === '0') return 0;
    const parts = fraction.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (denominator !== 0) {
        return numerator / denominator;
      }
    }
    return 0;
  };

  const handleContinue = () => {
    const validationErrors: string[] = [];

    // Required validations
    if (!selectedSubProductId) {
      validationErrors.push('Product Type/Size is required');
    }
    if (!strandPattern) {
      validationErrors.push('Strand Pattern is required');
    }

    // Validate product side if cut-width
    if (isCutWidth && !productSide) {
      validationErrors.push('Product side is required for cut-width products');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    // Navigate to next screen or continue with calculation
    // For now, we'll keep the existing calculation logic
    const spanInFeet = getSpanInFeet();

    // Get selected custom pattern
    const selectedPattern = customPatterns.find(p => p.id === strandPattern);

    // Parse product width if provided
    const parsedWidth = productWidth.trim() ? parseMeasurementInput(productWidth) : null;

    const inputs: Partial<CamberInputs> = {
      span: spanInFeet,
      memberType: 'hollow-core',
      releaseStrength: 3500,
      concreteStrength: 9000,
      momentOfInertia: momentOfInertia || selectedPattern?.momentOfInertia || 0,
      deadLoad: deadLoad || selectedPattern?.deadLoad || 0,
      liveLoad: undefined,
      strandPattern: strandPattern || undefined,
      strandEValue: selectedPattern?.eValue,
      topStrandPattern: topStrandPattern || undefined,
      productWidth: parsedWidth !== null ? parsedWidth : undefined,
      productSide: isCutWidth && productSide ? productSide : undefined,
      projectNumber: projectNumber || undefined,
      markNumber: markNumber || undefined,
      idNumber: idNumber || undefined,
    };

    const results = calculateCamber(inputs as CamberInputs);

    if (editingCalculation) {
      // Update existing calculation
      updateCalculation(editingCalculation.id, {
        inputs: inputs as CamberInputs,
        results,
        projectName: projectName || undefined,
      });

      const updatedRecord = {
        ...editingCalculation,
        inputs: inputs as CamberInputs,
        results,
        projectName: projectName || undefined,
      };

      navigation.navigate('Results', { calculation: updatedRecord });
    } else {
      // Create new calculation
      const record = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputs: inputs as CamberInputs,
        results,
        projectName: projectName || undefined,
      };

      addCalculation(record);
      navigation.navigate('Results', { calculation: record });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              {editingCalculation ? 'Edit Calculation' : 'Camber Calculator'}
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
              <Pressable
                className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-3 items-center"
                style={{ width: 70 }}
                onPress={() => {
                  const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
                  const currentIndex = fractions.indexOf(spanFraction);
                  const nextIndex = (currentIndex + 1) % fractions.length;
                  setSpanFraction(fractions[nextIndex]);
                }}
              >
                <Text className="text-gray-900 font-medium text-sm">
                  {spanFraction === '0' ? '0' : spanFraction}"
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
                  className={`flex-1 rounded-lg py-3 px-4 border-2 ${productSide === 'L1'
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300'
                    }`}
                >
                  <Text className={`text-center font-semibold text-sm ${productSide === 'L1' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                    L1 (Left Side)
                  </Text>
                  <Text className="text-center text-xs text-gray-600 mt-1">
                    Keep left side
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setProductSide('L2')}
                  className={`flex-1 rounded-lg py-3 px-4 border-2 ${productSide === 'L2'
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300'
                    }`}
                >
                  <Text className={`text-center font-semibold text-sm ${productSide === 'L2' ? 'text-blue-700' : 'text-gray-700'
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

              {errors.includes('Product side is required for cut-width products') && (
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
              className={`bg-white border ${errors.includes('Product Type/Size is required')
                  ? 'border-red-500'
                  : 'border-gray-300'
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
              onPress={() => setShowProductModal(true)}
            >
              <Text
                className={`text-base ${selectedSubProduct ? 'text-gray-900' : 'text-gray-400'
                  }`}
              >
                {selectedSubProduct
                  ? `${selectedProduct?.name} - ${selectedSubProduct.name}`
                  : 'Select product type/size'}
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
              className={`bg-white border ${errors.includes('Strand Pattern is required')
                  ? 'border-red-500'
                  : 'border-gray-300'
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
              onPress={() => setShowStrandModal(true)}
            >
              <Text
                className={`text-base ${strandPattern ? 'text-gray-900' : 'text-gray-400'
                  }`}
              >
                {selectedPattern
                  ? selectedPattern.name
                  : 'Select strand pattern'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </Pressable>
            {customPatterns.length === 0 && (
              <Text className="text-orange-600 text-xs mt-1">
                No patterns available. Create one in Strand Patterns.
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
                className={`text-base ${topStrandPattern ? 'text-gray-900' : 'text-gray-400'
                  }`}
              >
                {topStrandPattern
                  ? customPatterns.find(p => p.id === topStrandPattern)?.name
                  : 'None'}
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

      {/* Product Selection Modal */}
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
              {products.filter(p => p.isActive).map((product) => (
                <View key={product.id} className="mb-4">
                  <Text className="text-base font-bold text-gray-900 mb-3">
                    {product.name}
                  </Text>

                  {product.subProducts && product.subProducts.length > 0 ? (
                    product.subProducts
                      .filter(sp => sp.isActive && sp.momentOfInertia && sp.deadLoadPerLinearFoot)
                      .map((subProduct) => (
                        <Pressable
                          key={subProduct.id}
                          onPress={() => {
                            setSelectedProductId(product.id);
                            setSelectedSubProductId(subProduct.id);
                            setShowProductModal(false);
                            setErrors([]);
                          }}
                          className={`mb-3 p-4 rounded-lg border ${selectedSubProductId === subProduct.id
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-white border-gray-200'
                            }`}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className={`text-base font-bold ${selectedSubProductId === subProduct.id ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                              {subProduct.name}
                            </Text>
                            {selectedSubProductId === subProduct.id && (
                              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                            )}
                          </View>

                          {subProduct.description && (
                            <Text className={`text-sm mb-2 ${selectedSubProductId === subProduct.id ? 'text-blue-800' : 'text-gray-600'
                              }`}>
                              {subProduct.description}
                            </Text>
                          )}

                          <View className="mt-2">
                            <Text className={`text-xs font-semibold mb-1 ${selectedSubProductId === subProduct.id ? 'text-blue-800' : 'text-gray-600'
                              }`}>
                              Properties:
                            </Text>
                            <Text className={`text-xs ${selectedSubProductId === subProduct.id ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                              • Moment of Inertia: {subProduct.momentOfInertia?.toLocaleString()} in⁴
                            </Text>
                            <Text className={`text-xs ${selectedSubProductId === subProduct.id ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                              • Dead Load: {subProduct.deadLoadPerLinearFoot?.toLocaleString()} lb/ft
                            </Text>
                            {subProduct.area && (
                              <Text className={`text-xs ${selectedSubProductId === subProduct.id ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                • Area: {subProduct.area.toLocaleString()} in²
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      ))
                  ) : (
                    <View className="bg-gray-100 rounded-lg p-4">
                      <Text className="text-sm text-gray-600 text-center">
                        No sub-products available
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {products.filter(p => p.isActive).length === 0 && (
                <View className="items-center py-8">
                  <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-600 text-base mt-4 text-center">
                    No products available.{'\n'}Add products in Product Library.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Strand Pattern Selection Modal */}
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
              {customPatterns.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-600 text-base mt-4 mb-4 text-center">
                    No strand patterns available.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowStrandModal(false);
                      navigation.navigate('StrandPatterns');
                    }}
                    className="bg-blue-500 rounded-xl py-3 px-6 items-center active:bg-blue-600"
                  >
                    <Text className="text-white text-sm font-semibold">
                      Go to Strand Library
                    </Text>
                  </Pressable>
                </View>
              ) : (
                customPatterns.map((pattern) => (
                  <Pressable
                    key={pattern.id}
                    className={`p-4 mb-2 rounded-lg border ${strandPattern === pattern.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200'
                      }`}
                    onPress={() => {
                      setStrandPattern(pattern.id);
                      setShowStrandModal(false);
                      setErrors([]);
                    }}
                  >
                    <Text
                      className={`text-base font-semibold ${strandPattern === pattern.id
                          ? 'text-blue-600'
                          : 'text-gray-900'
                        }`}
                    >
                      {pattern.name}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      Pattern ID: {pattern.patternId} • Position: {pattern.position}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Top Strand Pattern Selection Modal */}
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
                className={`p-4 mb-2 rounded-lg border ${topStrandPattern === ''
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200'
                  }`}
                onPress={() => {
                  setTopStrandPattern('');
                  setShowTopStrandModal(false);
                }}
              >
                <Text
                  className={`text-base font-semibold ${topStrandPattern === ''
                      ? 'text-blue-600'
                      : 'text-gray-900'
                    }`}
                >
                  None
                </Text>
              </Pressable>

              {customPatterns.map((pattern) => (
                <Pressable
                  key={pattern.id}
                  className={`p-4 mb-2 rounded-lg border ${topStrandPattern === pattern.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200'
                    }`}
                  onPress={() => {
                    setTopStrandPattern(pattern.id);
                    setShowTopStrandModal(false);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${topStrandPattern === pattern.id
                        ? 'text-blue-600'
                        : 'text-gray-900'
                      }`}
                  >
                    {pattern.name}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Pattern ID: {pattern.patternId} • Position: {pattern.position}
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
