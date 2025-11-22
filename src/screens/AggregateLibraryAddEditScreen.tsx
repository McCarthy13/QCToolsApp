import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateLibraryStore } from '../state/aggregateLibraryStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { AggregateLibraryItem } from '../types/aggregate-library';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { ValidationWarnings } from '../components/ValidationWarnings';
import { validateAggregateData } from '../utils/dataValidation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateLibraryAddEdit'>;
  route: RouteProp<RootStackParamList, 'AggregateLibraryAddEdit'>;
};

const AggregateLibraryAddEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { aggregateId } = route.params;
  const { getAggregate, addAggregate, updateAggregate } = useAggregateLibraryStore();
  
  const isEditing = !!aggregateId;
  const existingAggregate = isEditing ? getAggregate(aggregateId) : undefined;

  // Form state
  const [name, setName] = useState(existingAggregate?.name || '');
  const [type, setType] = useState<'Fine' | 'Coarse'>(existingAggregate?.type || 'Fine');
  
  // Physical Properties
  const [finenessModulus, setFinenessModulus] = useState(existingAggregate?.finenessModulus?.toString() || '');
  const [dryRoddedUnitWeight, setDryRoddedUnitWeight] = useState(existingAggregate?.dryRoddedUnitWeight?.toString() || '');
  const [percentVoids, setPercentVoids] = useState(existingAggregate?.percentVoids?.toString() || '');
  const [absorption, setAbsorption] = useState(existingAggregate?.absorption?.toString() || '');
  const [moistureContent, setMoistureContent] = useState(existingAggregate?.moistureContent?.toString() || '');
  const [maxSize, setMaxSize] = useState(existingAggregate?.maxSize?.toString() || '');
  
  // Specific Gravity
  const [sgBulkSSD, setSgBulkSSD] = useState(existingAggregate?.specificGravityBulkSSD?.toString() || '');
  const [sgBulkDry, setSgBulkDry] = useState(existingAggregate?.specificGravityBulkDry?.toString() || '');
  const [sgApparent, setSgApparent] = useState(existingAggregate?.specificGravityApparent?.toString() || '');
  
  // Optional Properties
  const [colorFamily, setColorFamily] = useState<AggregateLibraryItem['colorFamily']>(existingAggregate?.colorFamily || null);
  const [source, setSource] = useState(existingAggregate?.source || '');
  const [stockpileNumber, setStockpileNumber] = useState(existingAggregate?.stockpileNumber || '');
  
  // Performance Properties
  const [laAbrasion, setLaAbrasion] = useState(existingAggregate?.laAbrasion?.toString() || '');
  const [soundness, setSoundness] = useState(existingAggregate?.soundness?.toString() || '');
  const [deleteriousMaterials, setDeleteriousMaterials] = useState(existingAggregate?.deleteriousMaterials?.toString() || '');
  const [organicImpurities, setOrganicImpurities] = useState(existingAggregate?.organicImpurities || '');
  const [clayLumps, setClayLumps] = useState(existingAggregate?.clayLumps?.toString() || '');
  
  // Chemical Properties
  const [asrReactivity, setAsrReactivity] = useState<AggregateLibraryItem['asrReactivity']>(existingAggregate?.asrReactivity || null);
  const [chlorideContent, setChlorideContent] = useState(existingAggregate?.chlorideContent?.toString() || '');
  const [sulfateContent, setSulfateContent] = useState(existingAggregate?.sulfateContent?.toString() || '');
  
  // Production Data
  const [costPerTon, setCostPerTon] = useState(existingAggregate?.costPerTon?.toString() || '');
  const [costPerYard, setCostPerYard] = useState(existingAggregate?.costPerYard?.toString() || '');
  const [lastTestDate, setLastTestDate] = useState(existingAggregate?.lastTestDate || '');
  const [certifications, setCertifications] = useState(existingAggregate?.certifications || '');
  const [notes, setNotes] = useState(existingAggregate?.notes || '');

  // Real-time validation warnings
  const validationWarnings = useMemo(() => {
    const parseNumber = (value: string) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };

    return validateAggregateData({
      dryRoddedUnitWeight: parseNumber(dryRoddedUnitWeight),
      percentVoids: parseNumber(percentVoids),
      absorption: parseNumber(absorption),
      sgBulkSSD: parseNumber(sgBulkSSD),
      sgBulkOvenDry: parseNumber(sgBulkDry),
      sgApparent: parseNumber(sgApparent),
      finenessModulus: parseNumber(finenessModulus),
    });
  }, [dryRoddedUnitWeight, percentVoids, absorption, sgBulkSSD, sgBulkDry, sgApparent, finenessModulus]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter an aggregate name');
      return;
    }

    const parseNumber = (value: string) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };

    const aggregateData: Omit<AggregateLibraryItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      type,
      finenessModulus: parseNumber(finenessModulus),
      dryRoddedUnitWeight: parseNumber(dryRoddedUnitWeight),
      percentVoids: parseNumber(percentVoids),
      absorption: parseNumber(absorption),
      moistureContent: parseNumber(moistureContent),
      maxSize: parseNumber(maxSize),
      specificGravityBulkSSD: parseNumber(sgBulkSSD),
      specificGravityBulkDry: parseNumber(sgBulkDry),
      specificGravityApparent: parseNumber(sgApparent),
      colorFamily,
      source: source.trim() || undefined,
      stockpileNumber: stockpileNumber.trim() || undefined,
      laAbrasion: parseNumber(laAbrasion),
      soundness: parseNumber(soundness),
      deleteriousMaterials: parseNumber(deleteriousMaterials),
      organicImpurities: organicImpurities.trim() || undefined,
      clayLumps: parseNumber(clayLumps),
      asrReactivity,
      chlorideContent: parseNumber(chlorideContent),
      sulfateContent: parseNumber(sulfateContent),
      costPerTon: parseNumber(costPerTon),
      costPerYard: parseNumber(costPerYard),
      lastTestDate: lastTestDate.trim() || undefined,
      certifications: certifications.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing) {
      updateAggregate(aggregateId, aggregateData);
    } else {
      const newAggregate: AggregateLibraryItem = {
        ...aggregateData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addAggregate(newAggregate);
    }

    navigation.goBack();
  };

  const renderTextInput = (
    label: string,
    value: string,
    setValue: (value: string) => void,
    options: {
      required?: boolean;
      placeholder?: string;
      keyboardType?: 'default' | 'numeric' | 'decimal-pad';
      multiline?: boolean;
    } = {}
  ) => (
    <View className="mb-4">
      <View className="flex-row items-center mb-1">
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
        {options?.required && (
          <Text className="text-red-500 ml-1">*</Text>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={options?.placeholder}
        placeholderTextColor="#9ca3af"
        cursorColor="#000000"
        keyboardType={options?.keyboardType || 'default'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 4 : 1}
        selectTextOnFocus
        className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base ${
          options?.multiline ? 'min-h-[80px]' : ''
        }`}
      />
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode, description?: string) => (
    <View className="mb-6">
      <View className="mb-3">
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        {description && (
          <Text className="text-xs text-gray-600 mt-0.5">{description}</Text>
        )}
      </View>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          {/* Basic Information */}
          {renderSection(
            'Basic Information',
            <>
              {renderTextInput('Name', name, setName, { 
                required: true, 
                placeholder: 'e.g., Keystone #7, Smith Quarry Sand' 
              })}
              
              <View className="mb-4">
                <View className="flex-row items-center mb-1">
                  <Text className="text-sm font-medium text-gray-700">Type</Text>
                  <Text className="text-red-500 ml-1">*</Text>
                </View>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setType('Fine')}
                    className={`flex-1 py-3 rounded-lg border-2 ${
                      type === 'Fine' 
                        ? 'bg-green-50 border-green-600' 
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-center font-semibold ${
                      type === 'Fine' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      Fine
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={() => setType('Coarse')}
                    className={`flex-1 py-3 rounded-lg border-2 ${
                      type === 'Coarse' 
                        ? 'bg-purple-50 border-purple-600' 
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-center font-semibold ${
                      type === 'Coarse' ? 'text-purple-700' : 'text-gray-700'
                    }`}>
                      Coarse
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Color Family</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {['Brown', 'Red', 'Black', 'Grey', 'White', 'Mixed'].map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setColorFamily(color as typeof colorFamily)}
                      className={`px-4 py-2 rounded-full border ${
                        colorFamily === color
                          ? 'bg-gray-800 border-gray-800'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        colorFamily === color ? 'text-white' : 'text-gray-700'
                      }`}>
                        {color}
                      </Text>
                    </Pressable>
                  ))}
                  {colorFamily && (
                    <Pressable
                      onPress={() => setColorFamily(null)}
                      className="px-4 py-2 rounded-full bg-gray-200"
                    >
                      <Text className="text-sm font-medium text-gray-700">Clear</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </View>

              {renderTextInput('Source (Quarry/Supplier)', source, setSource, { 
                placeholder: 'e.g., Smith Quarry, ABC Materials' 
              })}
              
              {renderTextInput('Stockpile Number', stockpileNumber, setStockpileNumber, { 
                placeholder: 'e.g., SP-4, A23' 
              })}
            </>
          )}

          {/* Physical Properties */}
          {renderSection(
            'Physical Properties',
            <>
              {type === 'Fine' && (
                renderTextInput(
                  'Fineness Modulus',
                  finenessModulus,
                  setFinenessModulus,
                  { required: true, keyboardType: 'decimal-pad', placeholder: 'e.g., 2.8' }
                )
              )}
              
              {renderTextInput(
                'Dry-Rodded Unit Weight',
                dryRoddedUnitWeight,
                setDryRoddedUnitWeight,
                { required: true, keyboardType: 'decimal-pad', placeholder: 'lb/ft³' }
              )}
              
              {renderTextInput(
                'Percent Voids',
                percentVoids,
                setPercentVoids,
                { required: true, keyboardType: 'decimal-pad', placeholder: '%' }
              )}
              
              {renderTextInput(
                'Absorption',
                absorption,
                setAbsorption,
                { required: true, keyboardType: 'decimal-pad', placeholder: '%' }
              )}
              
              {renderTextInput(
                'Moisture Content',
                moistureContent,
                setMoistureContent,
                { keyboardType: 'decimal-pad', placeholder: '%' }
              )}
              
              {renderTextInput(
                'Maximum Size',
                maxSize,
                setMaxSize,
                { keyboardType: 'decimal-pad', placeholder: 'inches' }
              )}
            </>
          )}

          {/* Specific Gravity */}
          {renderSection(
            'Specific Gravity',
            <>
              {renderTextInput(
                'Bulk (SSD)',
                sgBulkSSD,
                setSgBulkSSD,
                { required: true, keyboardType: 'decimal-pad', placeholder: 'e.g., 2.65' }
              )}
              
              {renderTextInput(
                'Bulk (Dry)',
                sgBulkDry,
                setSgBulkDry,
                { required: true, keyboardType: 'decimal-pad', placeholder: 'e.g., 2.62' }
              )}
              
              {renderTextInput(
                'Apparent',
                sgApparent,
                setSgApparent,
                { required: true, keyboardType: 'decimal-pad', placeholder: 'e.g., 2.70' }
              )}
            </>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <View className="mb-4">
              <ValidationWarnings warnings={validationWarnings} />
            </View>
          )}

          {/* Performance Properties */}
          {renderSection(
            'Performance Properties',
            <>
              {renderTextInput(
                'LA Abrasion',
                laAbrasion,
                setLaAbrasion,
                { keyboardType: 'decimal-pad', placeholder: '% (for coarse aggregates)' }
              )}
              
              {renderTextInput(
                'Soundness',
                soundness,
                setSoundness,
                { keyboardType: 'decimal-pad', placeholder: '%' }
              )}
              
              {renderTextInput(
                'Deleterious Materials',
                deleteriousMaterials,
                setDeleteriousMaterials,
                { keyboardType: 'decimal-pad', placeholder: '%' }
              )}
              
              {renderTextInput(
                'Organic Impurities',
                organicImpurities,
                setOrganicImpurities,
                { placeholder: 'e.g., Pass, Fail, Light Straw' }
              )}
              
              {renderTextInput(
                'Clay Lumps',
                clayLumps,
                setClayLumps,
                { keyboardType: 'decimal-pad', placeholder: '%' }
              )}
            </>
          )}

          {/* Chemical Properties */}
          {renderSection(
            'Chemical Properties',
            <>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">ASR Reactivity</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['Low', 'Moderate', 'High', 'Not Tested'] as const).map((level) => (
                    <Pressable
                      key={level}
                      onPress={() => setAsrReactivity(level)}
                      className={`px-4 py-2 rounded-full border ${
                        asrReactivity === level
                          ? 'bg-gray-800 border-gray-800'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        asrReactivity === level ? 'text-white' : 'text-gray-700'
                      }`}>
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                  {asrReactivity && (
                    <Pressable
                      onPress={() => setAsrReactivity(null)}
                      className="px-4 py-2 rounded-full bg-gray-200"
                    >
                      <Text className="text-sm font-medium text-gray-700">Clear</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {renderTextInput(
                'Chloride Content',
                chlorideContent,
                setChlorideContent,
                { keyboardType: 'decimal-pad', placeholder: '%' }
              )}
              
              {renderTextInput(
                'Sulfate Content',
                sulfateContent,
                setSulfateContent,
                { keyboardType: 'decimal-pad', placeholder: '%' }
              )}
            </>
          )}

          {/* Production Data */}
          {renderSection(
            'Production & Admin',
            <>
              {renderTextInput(
                'Cost Per Ton',
                costPerTon,
                setCostPerTon,
                { keyboardType: 'decimal-pad', placeholder: '$' }
              )}
              
              {renderTextInput(
                'Cost Per Cubic Yard',
                costPerYard,
                setCostPerYard,
                { keyboardType: 'decimal-pad', placeholder: '$' }
              )}
              
              {renderTextInput(
                'Last Test Date',
                lastTestDate,
                setLastTestDate,
                { placeholder: 'YYYY-MM-DD or MM/DD/YYYY' }
              )}
              
              {renderTextInput(
                'Certifications',
                certifications,
                setCertifications,
                { placeholder: 'e.g., ASTM C33, AASHTO M6' }
              )}
              
              <VoiceTextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                enableVoiceInput
                placeholder="Additional notes or comments"
                autoCapitalize="sentences"
              />
            </>
          )}

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            className="bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700 mb-4"
          >
            <Text className="text-white text-base font-semibold">
              {isEditing ? 'Update Aggregate' : 'Save Aggregate'}
            </Text>
          </Pressable>

          {/* Info Note */}
          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-8">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="flex-1 text-xs text-blue-700 ml-2">
                Incomplete aggregates can be saved and updated later. Required fields: Name, Type, Dry-Rodded Unit Weight, Percent Voids, Absorption, and all Specific Gravity values. Fine aggregates also require Fineness Modulus.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AggregateLibraryAddEditScreen;
