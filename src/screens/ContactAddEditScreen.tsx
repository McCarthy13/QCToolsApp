import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContactsStore } from '../state/contactsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { ContactItem } from '../types/contacts';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { VoiceTextInput } from '../components/VoiceTextInput';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ContactAddEdit'>;
  route: RouteProp<RootStackParamList, 'ContactAddEdit'>;
};

const ContactAddEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { contactId } = route.params;
  const { getContact, addContact, updateContact } = useContactsStore();
  
  const isEditing = !!contactId;
  const existingContact = isEditing ? getContact(contactId) : undefined;

  // Form state
  const [name, setName] = useState(existingContact?.name || '');
  const [company, setCompany] = useState(existingContact?.company || '');
  const [role, setRole] = useState(existingContact?.role || '');
  const [phone, setPhone] = useState(existingContact?.phone || '');
  const [email, setEmail] = useState(existingContact?.email || '');
  const [notes, setNotes] = useState(existingContact?.notes || '');

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneNumber(value));
  };

  const handleSave = () => {
    const contactData: Omit<ContactItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing) {
      updateContact(contactId, contactData);
    } else {
      const newContact: ContactItem = {
        ...contactData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addContact(newContact);
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
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
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
        numberOfLines={options?.multiline ? 4 : 1}
        selectTextOnFocus
        className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base ${
          options?.multiline ? 'min-h-[80px]' : ''
        }`}
      />
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
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Basic Information</Text>
            
            {renderTextInput('Name', name, setName, { 
              required: true,
              placeholder: 'e.g., John Smith',
              autoCapitalize: 'words'
            })}
            
            {renderTextInput('Company', company, setCompany, { 
              placeholder: 'e.g., BASF Corporation',
              autoCapitalize: 'words'
            })}
            
            {renderTextInput('Role', role, setRole, { 
              placeholder: 'e.g., Admix Salesperson, Aggregate Supplier',
            })}
          </View>

          {/* Contact Information */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Contact Information</Text>
            
            {renderTextInput('Phone', phone, handlePhoneChange, { 
              required: true,
              keyboardType: 'phone-pad',
              placeholder: '(555) 123-4567'
            })}
            
            {renderTextInput('Email', email, setEmail, { 
              required: true,
              keyboardType: 'email-address',
              placeholder: 'john.smith@company.com',
              autoCapitalize: 'none'
            })}
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Additional Notes</Text>
            
            <VoiceTextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              enableVoiceInput
              placeholder="Any additional information..."
              autoCapitalize="sentences"
            />
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            className="bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700 mb-4"
          >
            <Text className="text-white text-base font-semibold">
              {isEditing ? 'Update Contact' : 'Save Contact'}
            </Text>
          </Pressable>

          {/* Info Note */}
          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-8">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="flex-1 text-xs text-blue-700 ml-2">
                Incomplete contacts can be saved and updated later. Required fields: Name, Phone, and Email. All other fields are optional.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ContactAddEditScreen;
