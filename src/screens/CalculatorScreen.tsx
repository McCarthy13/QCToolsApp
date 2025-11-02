import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { parseMeasurementInput } from '../utils/cn';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Calculator'>;

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { currentInputs, addCalculation } = useCalculatorStore();
  const { customPatterns } = useStrandPatternStore();
  const { products } = useProductLibraryStore();

  const [projectName, setProjectName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [markNumber, setMarkNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [spanFeet, setSpanFeet] = useState('');
  const [spanInches, setSpanInches] = useState('');
  const [spanFraction, setSpanFraction] = useState('0');
  const [productWidth, setProductWidth] = useState('');
  const [offcutSide, setOffcutSide] = useState<'L1' | 'L2' | ''>('');

  // Product selection
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSubProductId, setSelectedSubProductId] = useState<string>('');
  const [showProductModal, setShowProductModal] = useState(false);

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

    // Validate offcut side if cut-width
    if (isCutWidth && !offcutSide) {
      validationErrors.push('Offcut side is required for cut-width products');
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
      offcutSide: isCutWidth && offcutSide ? offcutSide : undefined,
      projectNumber: projectNumber || undefined,
      markNumber: markNumber || undefined,
      idNumber: idNumber || undefined,
    };

    const results = calculateCamber(inputs as CamberInputs);

    const record = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      inputs: inputs as CamberInputs,
      results,
      projectName: projectName || undefined,
    };

    addCalculation(record);
    navigation.navigate('Results', { calculation: record });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              Camber Calculator
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
                    const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
                    const currentIndex = fractions.indexOf(spanFraction);
                    const nextIndex = (currentIndex + 1) % fractions.length;
                    setSpanFraction(fractions[nextIndex]);
                  }}
                >
                  <Text className="text-gray-900 font-medium">
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

            {/* Offcut Side Selector - Only show for cut-width products */}
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
                  Offcut Side <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-xs text-gray-500 mb-3">
                  Which side was removed during cutting?
                </Text>

                {/* Offcut Side Buttons */}
                <View className="flex-row gap-3 mb-3">
                  <Pressable
                    onPress={() => setOffcutSide('L1')}
                    className={`flex-1 rounded-lg py-3 px-4 border-2 ${
                      offcutSide === 'L1'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-center font-semibold text-sm ${
                      offcutSide === 'L1' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      L1 (Left Side)
                    </Text>
                    <Text className="text-center text-xs text-gray-600 mt-1">
                      Left removed, keep right
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setOffcutSide('L2')}
                    className={`flex-1 rounded-lg py-3 px-4 border-2 ${
                      offcutSide === 'L2'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-center font-semibold text-sm ${
                      offcutSide === 'L2' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      L2 (Right Side)
                    </Text>
                    <Text className="text-center text-xs text-gray-600 mt-1">
                      Right removed, keep left
                    </Text>
                  </Pressable>
                </View>

                {/* Visual Diagram */}
                <View className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <Text className="text-xs font-semibold text-gray-700 mb-3 text-center">
                    Visual Guide
                  </Text>

                  {/* L1 Cut Diagram */}
                  <View className="mb-4">
                    <Text className="text-xs text-gray-600 mb-2">L1 Cut (Left removed):</Text>
                    <View className="flex-row items-center">
                      <View className="flex-1 h-12 bg-red-100 border-l-4 border-red-500 items-center justify-center">
                        <Text className="text-xs text-red-700">Cut Edge</Text>
                      </View>
                      <View className="flex-1 h-12 bg-blue-100 border-2 border-blue-500 items-center justify-center">
                        <Text className="text-xs text-blue-700">Keep (L2)</Text>
                      </View>
                    </View>
                  </View>

                  {/* L2 Cut Diagram */}
                  <View>
                    <Text className="text-xs text-gray-600 mb-2">L2 Cut (Right removed):</Text>
                    <View className="flex-row items-center">
                      <View className="flex-1 h-12 bg-blue-100 border-2 border-blue-500 items-center justify-center">
                        <Text className="text-xs text-blue-700">Keep (L1)</Text>
                      </View>
                      <View className="flex-1 h-12 bg-red-100 border-r-4 border-red-500 items-center justify-center">
                        <Text className="text-xs text-red-700">Cut Edge</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {errors.includes('Offcut side is required for cut-width products') && (
                  <Text className="text-red-600 text-xs mt-2">
                    ⚠ Please select which side was cut off
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
                  errors.includes('Product Type/Size is required')
                    ? 'border-red-500'
                    : 'border-gray-300'
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
                onPress={() => setShowProductModal(true)}
              >
                <Text
                  className={`text-base ${
                    selectedSubProduct ? 'text-gray-900' : 'text-gray-400'
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
                className={`bg-white border ${
                  errors.includes('Strand Pattern is required')
                    ? 'border-red-500'
                    : 'border-gray-300'
                } rounded-lg px-4 py-3 flex-row items-center justify-between`}
                onPress={() => setShowStrandModal(true)}
              >
                <Text
                  className={`text-base ${
                    strandPattern ? 'text-gray-900' : 'text-gray-400'
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
                  className={`text-base ${
                    topStrandPattern ? 'text-gray-900' : 'text-gray-400'
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
      </TouchableWithoutFeedback>

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
                          className={`mb-3 p-4 rounded-lg border ${
                            selectedSubProductId === subProduct.id
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className={`text-base font-bold ${
                              selectedSubProductId === subProduct.id ? 'text-blue-600' : 'text-gray-900'
                            }`}>
                              {subProduct.name}
                            </Text>
                            {selectedSubProductId === subProduct.id && (
                              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                            )}
                          </View>

                          {subProduct.description && (
                            <Text className={`text-sm mb-2 ${
                              selectedSubProductId === subProduct.id ? 'text-blue-800' : 'text-gray-600'
                            }`}>
                              {subProduct.description}
                            </Text>
                          )}

                          <View className="mt-2">
                            <Text className={`text-xs font-semibold mb-1 ${
                              selectedSubProductId === subProduct.id ? 'text-blue-800' : 'text-gray-600'
                            }`}>
                              Properties:
                            </Text>
                            <Text className={`text-xs ${
                              selectedSubProductId === subProduct.id ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                              • Moment of Inertia: {subProduct.momentOfInertia?.toLocaleString()} in⁴
                            </Text>
                            <Text className={`text-xs ${
                              selectedSubProductId === subProduct.id ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                              • Dead Load: {subProduct.deadLoadPerLinearFoot?.toLocaleString()} lb/ft
                            </Text>
                            {subProduct.area && (
                              <Text className={`text-xs ${
                                selectedSubProductId === subProduct.id ? 'text-blue-700' : 'text-gray-600'
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
                  <Text className="text-gray-600 text-base mt-4 text-center">
                    No strand patterns available.{'\n'}Create one in Strand Patterns.
                  </Text>
                </View>
              ) : (
                customPatterns.map((pattern) => (
                  <Pressable
                    key={pattern.id}
                    className={`p-4 mb-2 rounded-lg border ${
                      strandPattern === pattern.id
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
                      className={`text-base font-semibold ${
                        strandPattern === pattern.id
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
                className={`p-4 mb-2 rounded-lg border ${
                  topStrandPattern === ''
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => {
                  setTopStrandPattern('');
                  setShowTopStrandModal(false);
                }}
              >
                <Text
                  className={`text-base font-semibold ${
                    topStrandPattern === ''
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
                  className={`p-4 mb-2 rounded-lg border ${
                    topStrandPattern === pattern.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200'
                  }`}
                  onPress={() => {
                    setTopStrandPattern(pattern.id);
                    setShowTopStrandModal(false);
                  }}
                >
                  <Text
                    className={`text-base font-semibold ${
                      topStrandPattern === pattern.id
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
