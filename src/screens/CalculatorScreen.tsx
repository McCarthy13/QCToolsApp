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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { parseMeasurementInput } from '../utils/cn';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Calculator'>;

const memberTypes = [
  { value: 'beam', label: 'Beam' },
  { value: 'double-tee', label: 'Double Tee' },
  { value: 'hollow-core', label: 'Hollow Core' },
  { value: 'single-tee', label: 'Single Tee' },
  { value: 'solid-slab', label: 'Solid Slab' },
  { value: 'wall-panel', label: 'Wall Panel' },
  { value: 'stadia', label: 'Stadia' },
] as const;

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { currentInputs, addCalculation } = useCalculatorStore();
  const { customPatterns } = useStrandPatternStore();
  
  const [projectName, setProjectName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [markNumber, setMarkNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [spanFeet, setSpanFeet] = useState('');
  const [spanInches, setSpanInches] = useState('');
  const [spanFraction, setSpanFraction] = useState('0');
  const [productWidth, setProductWidth] = useState('');
  const [offcutSide, setOffcutSide] = useState<'L1' | 'L2' | ''>('');
  const [memberType, setMemberType] = useState(currentInputs.memberType || 'hollow-core');
  const [releaseStrength, setReleaseStrength] = useState('3500');
  const [concreteStrength, setConcreteStrength] = useState(
    currentInputs.concreteStrength?.toString() || '9000'
  );
  const [liveLoad, setLiveLoad] = useState(currentInputs.liveLoad?.toString() || '');
  const [strandPattern, setStrandPattern] = useState<string>('');
  const [topStrandPattern, setTopStrandPattern] = useState<string>('');
  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showTopStrandModal, setShowTopStrandModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Get selected pattern to determine full width from pattern coordinates
  const selectedPattern = customPatterns.find(p => p.id === strandPattern);
  
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

  const handleCalculate = () => {
    const spanInFeet = getSpanInFeet();
    
    // Get selected custom pattern
    const selectedPattern = customPatterns.find(p => p.id === strandPattern);
    
    // Parse product width if provided
    const parsedWidth = productWidth.trim() ? parseMeasurementInput(productWidth) : null;
    
    // Validate offcut side if cut-width
    if (isCutWidth && !offcutSide) {
      setErrors(['Offcut side is required for cut-width products']);
      return;
    }
    
    const inputs: Partial<CamberInputs> = {
      span: spanInFeet,
      memberType: memberType as CamberInputs['memberType'],
      releaseStrength: parseFloat(releaseStrength),
      concreteStrength: parseFloat(concreteStrength),
      momentOfInertia: selectedPattern?.momentOfInertia || 0,
      deadLoad: selectedPattern?.deadLoad || 0,
      liveLoad: liveLoad ? parseFloat(liveLoad) : undefined,
      strandPattern: strandPattern || undefined,
      strandEValue: selectedPattern?.eValue,
      topStrandPattern: topStrandPattern || undefined,
      productWidth: parsedWidth !== null ? parsedWidth : undefined,
      offcutSide: isCutWidth && offcutSide ? offcutSide : undefined,
      projectNumber: projectNumber || undefined,
      markNumber: markNumber || undefined,
      idNumber: idNumber || undefined,
    };

    const validationErrors = validateInputs(inputs);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
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

  const renderStrandPatternSelector = (
    label: string,
    isTopStrand: boolean
  ) => {
    const selectedId = isTopStrand ? topStrandPattern : strandPattern;
    const selectedPattern = customPatterns.find(p => p.id === selectedId);
    const setModal = isTopStrand ? setShowTopStrandModal : setShowStrandModal;
    
    return (
      <View className="mb-5">
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          {label}
        </Text>
        <Text className="text-xs text-gray-500 mb-2">
          Select prestressing strand configuration
        </Text>
        <Pressable
          onPress={() => setModal(true)}
          className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        >
          <View className="flex-1 flex-row items-center gap-2">
            <Text className={`text-base ${selectedId ? 'text-gray-900' : 'text-gray-400'}`}>
              {selectedId && selectedPattern ? `${selectedPattern.patternId} - ${selectedPattern.name}` : 'Select strand pattern'}
            </Text>
            {selectedId && selectedPattern && (
              <View className={`px-2 py-1 rounded ${
                selectedPattern.position === 'Top' ? 'bg-blue-100' : 
                selectedPattern.position === 'Bottom' ? 'bg-green-100' : 
                'bg-purple-100'
              }`}>
                <Text className={`text-xs font-semibold ${
                  selectedPattern.position === 'Top' ? 'text-blue-700' : 
                  selectedPattern.position === 'Bottom' ? 'text-green-700' : 
                  'text-purple-700'
                }`}>
                  {selectedPattern.position}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>
        {selectedId && selectedPattern && (
          <View className="mt-2 bg-purple-50 rounded-lg p-3">
            <Text className="text-xs font-semibold text-purple-900 mb-1">Pattern Details:</Text>
            {selectedPattern.strand_3_8 > 0 && (
              <Text className="text-xs text-purple-800">
                • {selectedPattern.strand_3_8}× 3/8" strands
              </Text>
            )}
            {selectedPattern.strand_1_2 > 0 && (
              <Text className="text-xs text-purple-800">
                • {selectedPattern.strand_1_2}× 1/2" strands
              </Text>
            )}
            {selectedPattern.strand_0_6 > 0 && (
              <Text className="text-xs text-purple-800">
                • {selectedPattern.strand_0_6}× 0.6" strands
              </Text>
            )}
            <Text className="text-xs text-purple-800 mt-1">
              • e value: {selectedPattern.eValue}"
            </Text>
            <Text className="text-xs text-purple-800">
              • Moment of inertia: {selectedPattern.momentOfInertia.toLocaleString()} in⁴
            </Text>
            <Text className="text-xs text-purple-800">
              • Dead load: {selectedPattern.deadLoad.toLocaleString()} lb/ft
            </Text>
            <Text className="text-xs text-purple-800">
              • Pulling force: {selectedPattern.pullingForce}%
            </Text>
            <Text className="text-xs text-purple-800">
              • Total area: {selectedPattern.totalArea.toFixed(3)} in²
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-5">
            {/* Header */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-gray-900 mb-2">
                    Camber Calculator
                  </Text>
                  <Text className="text-base text-gray-600">
                    Calculate precast concrete member camber
                  </Text>
                </View>
                <Pressable
                  onPress={() => navigation.navigate('History')}
                  className="bg-blue-500 rounded-full p-3 ml-3"
                >
                  <Ionicons name="time-outline" size={24} color="white" />
                </Pressable>
              </View>
            </View>

            {/* Error Messages */}
            {errors.length > 0 && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                {errors.map((error, index) => (
                  <Text key={index} className="text-red-700 text-sm mb-1">
                    • {error}
                  </Text>
                ))}
              </View>
            )}

            {/* Project Name (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Project Name (Optional)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="Enter project name"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={projectName}
                onChangeText={setProjectName}
              />
            </View>

            {/* Project Number (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Project # (Optional)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="Enter project number"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={projectNumber}
                onChangeText={setProjectNumber}
              />
            </View>

            {/* Mark Number (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Mark # (Optional)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="Enter mark number"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={markNumber}
                onChangeText={setMarkNumber}
              />
            </View>

            {/* ID Number (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                ID # (Optional)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="Enter ID number"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={idNumber}
                onChangeText={setIdNumber}
              />
            </View>

            {/* Member Type Selection */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Member Type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {memberTypes.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() => setMemberType(type.value)}
                    className={`px-4 py-3 rounded-xl border ${
                      memberType === type.value
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        memberType === type.value ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Span Input */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Span
              </Text>
              <View className="flex-row gap-2">
                {/* Feet */}
                <View className="flex-1">
                  <Text className="text-xs text-gray-600 mb-1">Feet</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                    placeholder="40"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    keyboardType="numeric"
                    value={spanFeet}
                    onChangeText={setSpanFeet}
                  />
                </View>
                
                {/* Inches */}
                <View className="flex-1">
                  <Text className="text-xs text-gray-600 mb-1">Inches</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    keyboardType="numeric"
                    value={spanInches}
                    onChangeText={setSpanInches}
                  />
                </View>
                
                {/* Fraction */}
                <View className="flex-1">
                  <Text className="text-xs text-gray-600 mb-1">Fraction</Text>
                  <Pressable
                    onPress={() => {
                      const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
                      const currentIndex = fractions.indexOf(spanFraction);
                      const nextIndex = (currentIndex + 1) % fractions.length;
                      setSpanFraction(fractions[nextIndex]);
                    }}
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 items-center justify-center"
                  >
                    <Text className="text-base text-gray-900 font-medium">
                      {spanFraction === '0' ? '0' : spanFraction}
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Display total in decimal */}
              {(spanFeet || spanInches || spanFraction !== '0') && (
                <Text className="text-xs text-gray-500 mt-2">
                  Total: {getSpanInFeet().toFixed(3)} feet
                </Text>
              )}
            </View>

            {/* Product Width Input */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Product Width (Optional)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                For cut-width products, enter actual width in inches (decimal or fraction)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 28 or 28 1/2 or 28.5"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                value={productWidth}
                onChangeText={setProductWidth}
                keyboardType="default"
              />
            </View>

            {/* Offcut Side Selector - Only show for cut-width products */}
            {isCutWidth && (
              <View className="mb-5">
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
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

                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Offcut Side <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-xs text-gray-500 mb-3">
                  Which side was removed during cutting?
                </Text>

                {/* Offcut Side Buttons */}
                <View className="flex-row gap-3 mb-3">
                  <Pressable
                    onPress={() => setOffcutSide('L1')}
                    className={`flex-1 rounded-xl py-3 px-4 border-2 ${
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
                    className={`flex-1 rounded-xl py-3 px-4 border-2 ${
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
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
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

            {/* Strand Pattern (Required) */}
            {renderStrandPatternSelector('Strand Pattern', false)}

            {/* Top Strand Pattern (Optional) */}
            {renderStrandPatternSelector('Top Strand Pattern (Optional)', true)}

            {/* Release Strength */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Release Strength f&apos;ci (psi)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Concrete strength at time of release/detensioning
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 3500"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                keyboardType="numeric"
                value={releaseStrength}
                onChangeText={setReleaseStrength}
              />
            </View>

            {/* 28-Day Concrete Strength */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                28-Day Strength f&apos;c (psi)
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Design concrete strength at 28 days
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 9000"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                keyboardType="numeric"
                value={concreteStrength}
                onChangeText={setConcreteStrength}
              />
            </View>

            {/* Live Load (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Live Load (lb/ft) - Optional
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 200"
                placeholderTextColor="#9CA3AF"
                cursorColor="#000000"
                keyboardType="numeric"
                value={liveLoad}
                onChangeText={setLiveLoad}
              />
            </View>

            {/* Calculate Button */}
            <Pressable
              onPress={handleCalculate}
              className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
            >
              <Text className="text-white text-base font-semibold">
                Calculate Camber
              </Text>
            </Pressable>

            {/* View History Button */}
            <Pressable
              onPress={() => navigation.navigate('History')}
              className="bg-white border border-gray-300 rounded-xl py-4 items-center active:bg-gray-50 mt-3"
            >
              <Text className="text-gray-700 text-base font-semibold">
                View History
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Strand Pattern Selection Modal */}
      <Modal
        visible={showStrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStrandModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable onPress={() => setShowStrandModal(false)} className="flex-1" />
          <View className="bg-white rounded-t-3xl" style={{ height: '75%' }}>
            <View className="p-5 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">
                  Select Strand Pattern
                </Text>
                <Pressable onPress={() => setShowStrandModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>
            </View>
            
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
              {customPatterns.length > 0 ? (
                <>
                  <Text className="text-sm font-bold text-gray-900 mb-3">Strand Patterns</Text>
                  {customPatterns.map((pattern) => (
                      <Pressable
                        key={pattern.id}
                        onPress={() => {
                          setStrandPattern(pattern.id);
                          setShowStrandModal(false);
                        }}
                        className={`mb-3 p-4 rounded-xl border ${
                          strandPattern === pattern.id
                            ? 'bg-purple-50 border-purple-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-1 flex-row items-center gap-2">
                            <Text className={`text-base font-semibold ${
                              strandPattern === pattern.id ? 'text-purple-900' : 'text-gray-900'
                            }`}>
                              {pattern.patternId} - {pattern.name}
                            </Text>
                            <View className={`px-2 py-1 rounded ${
                              pattern.position === 'Top' ? 'bg-blue-100' : 
                              pattern.position === 'Bottom' ? 'bg-green-100' : 
                              'bg-purple-100'
                            }`}>
                              <Text className={`text-xs font-semibold ${
                                pattern.position === 'Top' ? 'text-blue-700' : 
                                pattern.position === 'Bottom' ? 'text-green-700' : 
                                'text-purple-700'
                              }`}>
                                {pattern.position}
                              </Text>
                            </View>
                          </View>
                          {strandPattern === pattern.id && (
                            <Ionicons name="checkmark-circle" size={24} color="#9333EA" />
                          )}
                        </View>
                        
                        <View className="mt-2">
                          <Text className={`text-xs font-semibold mb-1 ${
                            strandPattern === pattern.id ? 'text-purple-800' : 'text-gray-600'
                          }`}>
                            Configuration:
                          </Text>
                          {pattern.strand_3_8 > 0 && (
                            <Text className={`text-xs ${
                              strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                            }`}>
                              • {pattern.strand_3_8} strands of 3/8" diameter
                            </Text>
                          )}
                          {pattern.strand_1_2 > 0 && (
                            <Text className={`text-xs ${
                              strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                            }`}>
                              • {pattern.strand_1_2} strands of 1/2" diameter
                            </Text>
                          )}
                          {pattern.strand_0_6 > 0 && (
                            <Text className={`text-xs ${
                              strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                            }`}>
                              • {pattern.strand_0_6} strands of 0.6" diameter
                            </Text>
                          )}
                          <Text className={`text-xs mt-1 ${
                            strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • e value: {pattern.eValue}"
                          </Text>
                          <Text className={`text-xs ${
                            strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Moment of inertia: {pattern.momentOfInertia.toLocaleString()} in⁴
                          </Text>
                          <Text className={`text-xs ${
                            strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Dead load: {pattern.deadLoad.toLocaleString()} lb/ft
                          </Text>
                          <Text className={`text-xs ${
                            strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Pulling force: {pattern.pullingForce}%
                          </Text>
                          <Text className={`text-xs ${
                            strandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Total strand area: {pattern.totalArea.toFixed(3)} in²
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <View className="items-center py-12">
                    <View className="bg-gray-100 rounded-full p-6 mb-4">
                      <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                      No Strand Patterns
                    </Text>
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      Create custom strand patterns in the{'\n'}Strand Patterns tab
                    </Text>
                  </View>
                )}
                
                {/* Clear Selection Button */}
                {strandPattern && (
                  <Pressable
                    onPress={() => {
                      setStrandPattern('');
                      setShowStrandModal(false);
                    }}
                    className="mt-2 p-4 rounded-xl border border-red-300 bg-red-50"
                  >
                    <Text className="text-center text-red-600 font-semibold">
                      Clear Selection
                    </Text>
                  </Pressable>
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
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable onPress={() => setShowTopStrandModal(false)} className="flex-1" />
          <View className="bg-white rounded-t-3xl" style={{ height: '75%' }}>
            <View className="p-5 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">
                  Select Top Strand Pattern
                </Text>
                <Pressable onPress={() => setShowTopStrandModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>
            </View>
            
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
              {customPatterns.length > 0 ? (
                <>
                  <Text className="text-sm font-bold text-gray-900 mb-3">Top Strand Patterns</Text>
                  {customPatterns.map((pattern) => (
                      <Pressable
                        key={pattern.id}
                        onPress={() => {
                          setTopStrandPattern(pattern.id);
                          setShowTopStrandModal(false);
                        }}
                        className={`mb-3 p-4 rounded-xl border ${
                          topStrandPattern === pattern.id
                            ? 'bg-purple-50 border-purple-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-1 flex-row items-center gap-2">
                            <Text className={`text-base font-semibold ${
                              topStrandPattern === pattern.id ? 'text-purple-900' : 'text-gray-900'
                            }`}>
                              {pattern.patternId} - {pattern.name}
                            </Text>
                            <View className={`px-2 py-1 rounded ${
                              pattern.position === 'Top' ? 'bg-blue-100' : 
                              pattern.position === 'Bottom' ? 'bg-green-100' : 
                              'bg-purple-100'
                            }`}>
                              <Text className={`text-xs font-semibold ${
                                pattern.position === 'Top' ? 'text-blue-700' : 
                                pattern.position === 'Bottom' ? 'text-green-700' : 
                                'text-purple-700'
                              }`}>
                                {pattern.position}
                              </Text>
                            </View>
                          </View>
                          {topStrandPattern === pattern.id && (
                            <Ionicons name="checkmark-circle" size={24} color="#9333EA" />
                          )}
                        </View>
                        
                        <View className="mt-2">
                          <Text className={`text-xs font-semibold mb-1 ${
                            topStrandPattern === pattern.id ? 'text-purple-800' : 'text-gray-600'
                          }`}>
                            Configuration:
                          </Text>
                          {pattern.strand_3_8 > 0 && (
                            <Text className={`text-xs ${
                              topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                            }`}>
                              • {pattern.strand_3_8} strands of 3/8" diameter
                            </Text>
                          )}
                          {pattern.strand_1_2 > 0 && (
                            <Text className={`text-xs ${
                              topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                            }`}>
                              • {pattern.strand_1_2} strands of 1/2" diameter
                            </Text>
                          )}
                          {pattern.strand_0_6 > 0 && (
                            <Text className={`text-xs ${
                              topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                            }`}>
                              • {pattern.strand_0_6} strands of 0.6" diameter
                            </Text>
                          )}
                          <Text className={`text-xs mt-1 ${
                            topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • e value: {pattern.eValue}"
                          </Text>
                          <Text className={`text-xs ${
                            topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Moment of inertia: {pattern.momentOfInertia.toLocaleString()} in⁴
                          </Text>
                          <Text className={`text-xs ${
                            topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Dead load: {pattern.deadLoad.toLocaleString()} lb/ft
                          </Text>
                          <Text className={`text-xs ${
                            topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Pulling force: {pattern.pullingForce}%
                          </Text>
                          <Text className={`text-xs ${
                            topStrandPattern === pattern.id ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            • Total strand area: {pattern.totalArea.toFixed(3)} in²
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <View className="items-center py-12">
                    <View className="bg-gray-100 rounded-full p-6 mb-4">
                      <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                      No Strand Patterns
                    </Text>
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      Create custom strand patterns in the{'\n'}Strand Patterns tab
                    </Text>
                  </View>
                )}
                
                {/* Clear Selection Button */}
                {topStrandPattern && (
                  <Pressable
                    onPress={() => {
                      setTopStrandPattern('');
                      setShowTopStrandModal(false);
                    }}
                    className="mt-2 p-4 rounded-xl border border-red-300 bg-red-50"
                  >
                    <Text className="text-center text-red-600 font-semibold">
                      Clear Selection
                    </Text>
                  </Pressable>
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
