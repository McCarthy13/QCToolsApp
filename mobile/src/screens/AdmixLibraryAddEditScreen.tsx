import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmixLibraryStore } from '../state/admixLibraryStore';
import { useContactsStore } from '../state/contactsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { AdmixLibraryItem, AdmixClass } from '../types/admix-library';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { parseSpecificGravity } from '../utils/specificGravityParser';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { PhotoAttachments } from '../components/PhotoAttachments';
import { ValidationWarnings } from '../components/ValidationWarnings';
import { validateAdmixData } from '../utils/dataValidation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdmixLibraryAddEdit'>;
  route: RouteProp<RootStackParamList, 'AdmixLibraryAddEdit'>;
};

const AdmixLibraryAddEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { admixId } = route.params;
  const { getAdmix, addAdmix, updateAdmix } = useAdmixLibraryStore();
  const { getAllContacts } = useContactsStore();
  
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
  const [photoUris, setPhotoUris] = useState<string[]>(existingAdmix?.photoUris || []);

  // Contact picker modal
  const [showContactPicker, setShowContactPicker] = useState(false);
  
  // Quick-add contact modal
  const [showQuickAddContact, setShowQuickAddContact] = useState(false);
  const [quickContactName, setQuickContactName] = useState('');
  const [quickContactCompany, setQuickContactCompany] = useState('');
  const [quickContactRole, setQuickContactRole] = useState('');
  const [quickContactPhone, setQuickContactPhone] = useState('');
  const [quickContactEmail, setQuickContactEmail] = useState('');
  const [quickContactNotes, setQuickContactNotes] = useState('');

  const handlePhoneChange = (value: string) => {
    setSalesRepPhone(formatPhoneNumber(value));
  };

  const handleSpecificGravityChange = (value: string) => {
    // Only allow numbers, decimal point, and dash
    const filtered = value.replace(/[^0-9.\-]/g, '');
    setSpecificGravityInput(filtered);
  };

  const handleSelectContact = (contactId: string) => {
    const { getContact } = useContactsStore.getState();
    const contact = getContact(contactId);
    if (contact) {
      setSalesRepName(contact.name);
      setSalesRepPhone(contact.phone || '');
      setSalesRepEmail(contact.email || '');
      setShowContactPicker(false);
    }
  };

  const handleQuickAddContact = () => {
    const { addContact } = useContactsStore.getState();
    
    if (!quickContactName.trim()) {
      return; // Name is required
    }

    const newContact = {
      id: Date.now().toString(),
      name: quickContactName.trim(),
      company: quickContactCompany.trim() || undefined,
      role: quickContactRole.trim() || undefined,
      phone: quickContactPhone.trim() || undefined,
      email: quickContactEmail.trim() || undefined,
      notes: quickContactNotes.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addContact(newContact);

    // Auto-fill the sales rep fields with the new contact
    setSalesRepName(newContact.name);
    setSalesRepPhone(newContact.phone || '');
    setSalesRepEmail(newContact.email || '');

    // Clear modal fields and close
    setQuickContactName('');
    setQuickContactCompany('');
    setQuickContactRole('');
    setQuickContactPhone('');
    setQuickContactEmail('');
    setQuickContactNotes('');
    setShowQuickAddContact(false);
  };

  // Real-time validation warnings
  const validationWarnings = useMemo(() => {
    const parseNumber = (value: string) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };

    const sgParsed = parseSpecificGravity(specificGravityInput);

    return validateAdmixData({
      specificGravity: sgParsed.calculated,
      costPerGallon: parseNumber(costPerGallon),
      percentWater: parseNumber(percentWater),
    });
  }, [specificGravityInput, costPerGallon, percentWater]);

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
      photoUris: photoUris.length > 0 ? photoUris : undefined,
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
        cursorColor="#000000"
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
                handleSpecificGravityChange,
                { keyboardType: 'default', placeholder: 'e.g., 1.05 or 1.05-1.08' }
              )}
            </>,
            'Required fields marked with *'
          )}

          {/* Product Information */}
          {renderSection(
            'Product Information',
            <>
              <VoiceTextInput
                label="Dosage Rate Recommendations"
                value={dosageRateRecommendations}
                onChangeText={setDosageRateRecommendations}
                multiline
                enableVoiceInput
                placeholder="Paste text from technical data sheet...&#10;e.g., &quot;2-10 oz/cwt (130-650 mL/100 kg) of cementitious material&quot;"
                autoCapitalize="sentences"
              />

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

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <View className="mb-4">
              <ValidationWarnings warnings={validationWarnings} />
            </View>
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
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => setShowContactPicker(true)}
                  className="flex-1 bg-blue-50 border-2 border-blue-600 rounded-lg py-3 px-4 flex-row items-center justify-center active:bg-blue-100"
                >
                  <Ionicons name="people" size={20} color="#2563eb" />
                  <Text className="text-blue-700 font-semibold ml-2">Select Contact</Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowQuickAddContact(true)}
                  className="flex-1 bg-green-50 border-2 border-green-600 rounded-lg py-3 px-4 flex-row items-center justify-center active:bg-green-100"
                >
                  <Ionicons name="person-add" size={20} color="#16a34a" />
                  <Text className="text-green-700 font-semibold ml-2">Quick Add</Text>
                </Pressable>
              </View>

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
              <VoiceTextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                enableVoiceInput
                placeholder="Any additional information..."
                autoCapitalize="sentences"
              />
            </>
          )}

          {/* Photo Attachments */}
          {renderSection(
            'Photo Attachments',
            <>
              <PhotoAttachments
                photoUris={photoUris}
                onPhotosChange={setPhotoUris}
                maxPhotos={10}
              />
            </>,
            'Attach product photos, labels, or documentation'
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

      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white p-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Select Contact</Text>
            <Pressable onPress={() => setShowContactPicker(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </Pressable>
          </View>

          <ScrollView className="flex-1">
            {getAllContacts().length === 0 ? (
              <View className="items-center justify-center p-8 mt-20">
                <Ionicons name="people-outline" size={64} color="#9ca3af" />
                <Text className="text-lg text-gray-600 mt-4 text-center">
                  No contacts yet
                </Text>
                <Text className="text-sm text-gray-500 mt-2 text-center">
                  Add contacts first to select them here
                </Text>
              </View>
            ) : (
              <View className="p-4 gap-3">
                {getAllContacts().map(contact => (
                  <Pressable
                    key={contact.id}
                    onPress={() => handleSelectContact(contact.id)}
                    className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                  >
                    <Text className="text-lg font-semibold text-gray-800">{contact.name}</Text>
                    {contact.company && (
                      <Text className="text-sm text-gray-500 mt-0.5">{contact.company}</Text>
                    )}
                    {contact.role && (
                      <Text className="text-xs text-gray-500 mt-0.5">{contact.role}</Text>
                    )}
                    {(contact.phone || contact.email) && (
                      <View className="flex-row flex-wrap gap-3 mt-2 pt-2 border-t border-gray-100">
                        {contact.phone && (
                          <Text className="text-xs text-gray-600">{contact.phone}</Text>
                        )}
                        {contact.email && (
                          <Text className="text-xs text-gray-600">{contact.email}</Text>
                        )}
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Quick Add Contact Modal */}
      <Modal
        visible={showQuickAddContact}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuickAddContact(false)}
      >
        <KeyboardAvoidingView 
          className="flex-1 bg-gray-50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="bg-white p-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Quick Add Contact</Text>
            <Pressable onPress={() => setShowQuickAddContact(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="p-4">
              {renderTextInput('Name', quickContactName, setQuickContactName, {
                required: true,
                placeholder: 'e.g., John Smith'
              })}

              {renderTextInput('Company', quickContactCompany, setQuickContactCompany, {
                placeholder: 'e.g., BASF Construction Chemicals'
              })}

              {renderTextInput('Role', quickContactRole, setQuickContactRole, {
                placeholder: 'e.g., Sales Representative'
              })}

              {renderTextInput('Phone', quickContactPhone, (value) => {
                setQuickContactPhone(formatPhoneNumber(value));
              }, {
                keyboardType: 'phone-pad',
                placeholder: '(555) 123-4567'
              })}

              {renderTextInput('Email', quickContactEmail, setQuickContactEmail, {
                keyboardType: 'email-address',
                placeholder: 'e.g., john.smith@company.com',
                autoCapitalize: 'none'
              })}

              <VoiceTextInput
                label="Notes"
                value={quickContactNotes}
                onChangeText={setQuickContactNotes}
                multiline
                enableVoiceInput
                placeholder="Additional information..."
                autoCapitalize="sentences"
              />

              <Pressable
                onPress={handleQuickAddContact}
                disabled={!quickContactName.trim()}
                className={`rounded-lg py-4 items-center ${
                  quickContactName.trim()
                    ? 'bg-green-600 active:bg-green-700'
                    : 'bg-gray-300'
                }`}
              >
                <Text className={`text-base font-semibold ${
                  quickContactName.trim() ? 'text-white' : 'text-gray-500'
                }`}>
                  Add Contact & Use
                </Text>
              </Pressable>

              <View className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#3b82f6" />
                  <Text className="flex-1 text-xs text-blue-700 ml-2">
                    This will save the contact and automatically fill in the sales representative fields above.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default AdmixLibraryAddEditScreen;
