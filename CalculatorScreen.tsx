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
import { useCalculatorStore } from './src/state/calculatorStore';
import {
  calculateCamber,
  validateInputs,
  getTypicalMomentOfInertia,
  CamberInputs,
} from './src/utils/camber-calculations';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/navigation/types';

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
  const [span, setSpan] = useState(currentInputs.span?.toString() || '');
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

  const handleEstimateMomentOfInertia = () => {
    if (span && !isNaN(parseFloat(span))) {
      const estimated = getTypicalMomentOfInertia(memberType, parseFloat(span));
      setMomentOfInertia(Math.round(estimated).toString());
    } else {
      setErrors(["Please enter span first to estimate moment of inertia"]);
    }
  };

  const handleCalculate = () => {
    const inputs: Partial<CamberInputs> = {
      span: parseFloat(span),
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
                Span (feet)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="e.g., 40"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={span}
                onChangeText={setSpan}
              />
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
