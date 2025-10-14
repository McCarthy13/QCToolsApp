import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmixLibraryStore } from '../state/admixLibraryStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { AdmixLibraryItem, AdmixClass } from '../types/admix-library';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { parseSpecificGravity } from '../utils/specificGravityParser';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdmixLibraryAddEdit'>;
  route: RouteProp<RootStackParamList, 'AdmixLibraryAddEdit'>;
};

const AdmixLibraryAddEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { admixId } = route.params;
  const { getAdmix, addAdmix, updateAdmix } = useAdmixLibraryStore();
  
  const isEditing = !!admixId;
  const existingAdmix = isEditing ? getAdmix(admixId) : undefined;

  // Form state
  const [name, setName] = useState(existingAdmix?.name || '');
  const [manufacturer, setManufacturer] = useState(existingAdmix?.manufacturer || '');
  const [admixClass, setAdmixClass] = useState<AdmixClass>(existingAdmix?.class || 'Water Reducer');
  const [specificGravityInput, setSpecificGravityInput] = useState(existingAdmix?.specificGravityDisplay || '');
  
  // Optional fields
  const [dosageRateRecommendations, setDosageRateRecommendations] = useState(existingAdmix?.dosageRateRecommendations || '');
  const [costPerGallon, setCostPerGallon] = useState(existingAdmix?.costPerGallon?.toString() || '');
  const [percentWater, setPercentWater] = useState(existingAdmix?.percentWater?.toString() || '');
  const [technicalDataSheetUrl, setTechnicalDataSheetUrl] = useState(existingAdmix?.technicalDataSheetUrl || '');
  const [safetyDataSheetUrl, setSafetyDataSheetUrl] = useState(existingAdmix?.safetyDataSheetUrl || '');
  const [salesRepName, setSalesRepName] = useState(existingAdmix?.salesRepName || '');
  const [salesRepPhone, setSalesRepPhone] = useState(existingAdmix?.salesRepPhone || '');
  const [salesRepEmail, setSalesRepEmail] = useState(existingAdmix?.salesRepEmail || '');
  const [notes, setNotes] = useState(existingAdmix?.notes || '');

  const handlePhoneChange = (value: string) => {
    setSalesRepPhone(formatPhoneNumber(value));
  };

  const handleSave = () => {
    const parseNumber = (value: string) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };

    // Parse specific gravity range/value
    const sgParsed = parseSpecificGravity(specificGravityInput);

    const admixData: Omit<AdmixLibraryItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      class: admixClass,
      specificGravityDisplay: sgParsed.display || undefined,
      specificGravity: sgParsed.calculated,
      dosageRateRecommendations: dosageRateRecommendations.trim() || undefined,
      costPerGallon: parseNumber(costPerGallon),
      percentWater: parseNumber(percentWater),
      technicalDataSheetUrl: technicalDataSheetUrl.trim() || undefined,
      safetyDataSheetUrl: safetyDataSheetUrl.trim() || undefined,
      salesRepName: salesRepName.trim() || undefined,
      salesRepPhone: salesRepPhone.trim() || undefined,
      salesRepEmail: salesRepEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing) {
      updateAdmix(admixId, admixData);
    } else {
      const newAdmix: AdmixLibraryItem = {
        ...admixData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addAdmix(newAdmix);
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
      keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'phone-pad' | 'url';
      multiline?: boolean;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
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
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'sentences'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 6 : 1}
        selectTextOnFocus
        className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base ${
          options?.multiline ? 'min-h-[120px]' : ''
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

  const admixClasses: AdmixClass[] = [
    'Water Reducer',
    'High-Range Water Reducer',
    'Air Entrainer',
    'Accelerator',
    'Retarder',
    'Corrosion Inhibitor',
    'Shrinkage Reducer',
    'Viscosity Modifier',
    'Other',
  ];

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
                placeholder: 'e.g., Glenium 7500, WRDA 64' 
              })}
              
              {renderTextInput('Manufacturer', manufacturer, setManufacturer, { 
                required: true, 
                placeholder: 'e.g., BASF, GCP Applied Technologies' 
              })}

              <View className="mb-4">
                <View className="flex-row items-center mb-1">
                  <Text className="text-sm font-medium text-gray-700">Class of Admixture</Text>
                  <Text className="text-red-500 ml-1">*</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  className="flex-row gap-2"
                  contentContainerStyle={{ paddingBottom: 4 }}
                >
                  {admixClasses.map((cls) => (
                    <Pressable
                      key={cls}
                      onPress={() => setAdmixClass(cls)}
                      className={`px-4 py-2.5 rounded-lg border ${
                        admixClass === cls
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-sm font-medium whitespace-nowrap ${
                        admixClass === cls ? 'text-white' : 'text-gray-700'
                      }`}>
                        {cls}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {renderTextInput(
                'Specific Gravity',
                specificGravityInput,
                setSpecificGravityInput,
                { keyboardType: 'decimal-pad', placeholder: 'e.g., 1.05 or 1.05-1.08' }
              )}
            </>,
            'Required fields marked with *'
          )}

          {/* Product Information */}
          {renderSection(
            'Product Information',
            <>
              {renderTextInput(
                'Dosage Rate Recommendations',
                dosageRateRecommendations,
                setDosageRateRecommendations,
                { 
                  multiline: true, 
                  placeholder: 'Paste text from technical data sheet...\ne.g., "2-10 oz/cwt (130-650 mL/100 kg) of cementitious material"'
                }
              )}

              {renderTextInput(
                'Cost Per Gallon',
                costPerGallon,
                setCostPerGallon,
                { keyboardType: 'decimal-pad', placeholder: '$ per gallon' }
              )}

              {renderTextInput(
                'Percent Water',
                percentWater,
                setPercentWater,
                { keyboardType: 'decimal-pad', placeholder: '% water content' }
              )}
            </>,
            'Optional product details'
          )}

          {/* Technical Documentation */}
          {renderSection(
            'Technical Documentation',
            <>
              {renderTextInput(
                'Technical Data Sheet URL',
                technicalDataSheetUrl,
                setTechnicalDataSheetUrl,
                { 
                  keyboardType: 'url', 
                  placeholder: 'https://...',
                  autoCapitalize: 'none'
                }
              )}

              {renderTextInput(
                'Safety Data Sheet URL',
                safetyDataSheetUrl,
                setSafetyDataSheetUrl,
                { 
                  keyboardType: 'url', 
                  placeholder: 'https://...',
                  autoCapitalize: 'none'
                }
              )}
            </>,
            'Links to product documentation'
          )}

          {/* Sales Representative */}
          {renderSection(
            'Sales Representative',
            <>
              {renderTextInput(
                'Name',
                salesRepName,
                setSalesRepName,
                { placeholder: 'e.g., John Smith' }
              )}

              {renderTextInput(
                'Phone',
                salesRepPhone,
                handlePhoneChange,
                { keyboardType: 'phone-pad', placeholder: '(555) 123-4567' }
              )}

              {renderTextInput(
                'Email',
                salesRepEmail,
                setSalesRepEmail,
                { 
                  keyboardType: 'email-address', 
                  placeholder: 'e.g., john.smith@company.com',
                  autoCapitalize: 'none'
                }
              )}
            </>,
            'Contact information for ordering or support'
          )}

          {/* Notes */}
          {renderSection(
            'Additional Notes',
            <>
              {renderTextInput(
                'Notes',
                notes,
                setNotes,
                { 
                  multiline: true, 
                  placeholder: 'Any additional information...'
                }
              )}
            </>
          )}

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            className="bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700 mb-4"
          >
            <Text className="text-white text-base font-semibold">
              {isEditing ? 'Update Admixture' : 'Save Admixture'}
            </Text>
          </Pressable>

          {/* Info Note */}
          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-8">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="flex-1 text-xs text-blue-700 ml-2">
                Incomplete admixtures can be saved and updated later. Required fields: Name, Manufacturer, Class, and Specific Gravity. All other fields are optional.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AdmixLibraryAddEditScreen;
