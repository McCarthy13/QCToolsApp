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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCalculatorStore } from '../state/calculatorStore';
import {
  calculateCamber,
  validateInputs,
  getTypicalMomentOfInertia,
  CamberInputs,
} from '../utils/camber-calculations';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Calculator'>;

const memberTypes = [
  { value: 'beam', label: 'Beam' },
  { value: 'double-tee', label: 'Double Tee' },
  { value: 'hollow-core', label: 'Hollow Core' },
  { value: 'single-tee', label: 'Single Tee' },
] as const;

const calculationMethods = [
  { value: 'pci', label: 'PCI Method' },
  { value: 'aci', label: 'ACI Method' },
  { value: 'simple', label: 'Simple Method' },
] as const;

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { currentInputs, addCalculation } = useCalculatorStore();
  
  const [projectName, setProjectName] = useState('');
  const [spanFeet, setSpanFeet] = useState('');
  const [spanInches, setSpanInches] = useState('');
  const [spanFraction, setSpanFraction] = useState('0');
  const [memberType, setMemberType] = useState(currentInputs.memberType || 'double-tee');
  const [concreteStrength, setConcreteStrength] = useState(
    currentInputs.concreteStrength?.toString() || '5000'
  );
  const [momentOfInertia, setMomentOfInertia] = useState(
    currentInputs.momentOfInertia?.toString() || ''
  );
  const [deadLoad, setDeadLoad] = useState(currentInputs.deadLoad?.toString() || '');
  const [liveLoad, setLiveLoad] = useState(currentInputs.liveLoad?.toString() || '');
  const [calculationMethod, setCalculationMethod] = useState(
    currentInputs.calculationMethod || 'pci'
  );
  const [errors, setErrors] = useState<string[]>([]);

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

  const handleEstimateMomentOfInertia = () => {
    const spanInFeet = getSpanInFeet();
    if (spanInFeet > 0) {
      const estimated = getTypicalMomentOfInertia(memberType, spanInFeet);
      setMomentOfInertia(Math.round(estimated).toString());
    } else {
      setErrors(["Please enter span first to estimate moment of inertia"]);
    }
  };

  const handleCalculate = () => {
    const spanInFeet = getSpanInFeet();
    const inputs: Partial<CamberInputs> = {
      span: spanInFeet,
      memberType: memberType as CamberInputs['memberType'],
      concreteStrength: parseFloat(concreteStrength),
      momentOfInertia: parseFloat(momentOfInertia),
      deadLoad: parseFloat(deadLoad),
      liveLoad: liveLoad ? parseFloat(liveLoad) : undefined,
      calculationMethod: calculationMethod as CamberInputs['calculationMethod'],
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
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Camber Calculator
              </Text>
              <Text className="text-base text-gray-600">
                Calculate precast concrete member camber
              </Text>
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
                value={projectName}
                onChangeText={setProjectName}
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

            {/* Concrete Strength */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Concrete Strength f&apos;c (psi)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 5000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={concreteStrength}
                onChangeText={setConcreteStrength}
              />
            </View>

            {/* Moment of Inertia */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Moment of Inertia I (in⁴)
                </Text>
                <Pressable
                  onPress={handleEstimateMomentOfInertia}
                  className="flex-row items-center"
                >
                  <Ionicons name="calculator-outline" size={16} color="#3B82F6" />
                  <Text className="text-sm font-medium text-blue-500 ml-1">
                    Estimate
                  </Text>
                </Pressable>
              </View>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 15000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={momentOfInertia}
                onChangeText={setMomentOfInertia}
              />
            </View>

            {/* Dead Load */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Dead Load (lb/ft)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 500"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={deadLoad}
                onChangeText={setDeadLoad}
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
                keyboardType="numeric"
                value={liveLoad}
                onChangeText={setLiveLoad}
              />
            </View>

            {/* Calculation Method */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Calculation Method
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {calculationMethods.map((method) => (
                  <Pressable
                    key={method.value}
                    onPress={() => setCalculationMethod(method.value)}
                    className={`px-4 py-3 rounded-xl border ${
                      calculationMethod === method.value
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        calculationMethod === method.value ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {method.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
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

            {/* Info Section */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <View className="flex-1 ml-2">
                  <Text className="text-sm text-blue-900 font-semibold mb-1">
                    About Camber
                  </Text>
                  <Text className="text-sm text-blue-800">
                    Camber is the upward deflection built into precast members to
                    counteract deflection under dead load and provide aesthetically
                    pleasing straight lines.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
