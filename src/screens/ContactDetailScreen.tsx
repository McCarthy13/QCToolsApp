import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContactsStore } from '../state/contactsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ContactDetail'>;
  route: RouteProp<RootStackParamList, 'ContactDetail'>;
};

const ContactDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { contactId } = route.params;
  const { getContact, deleteContact, isContactComplete, toggleFavorite, duplicateContact, trackAccess } = useContactsStore();
  
  const contact = getContact(contactId);

  // Track access when viewing
  React.useEffect(() => {
    if (contactId) {
      trackAccess(contactId);
    }
  }, [contactId, trackAccess]);

  if (!contact) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-8">
        <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
        <Text className="text-lg text-gray-600 mt-4 text-center">
          Contact not found
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-6 bg-blue-600 rounded-lg px-6 py-3 active:bg-blue-700"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isComplete = isContactComplete(contactId);

  const handleEdit = () => {
    navigation.navigate('ContactAddEdit', { contactId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${contact.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteContact(contactId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleCallPhone = () => {
    if (contact.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const handleSendEmail = () => {
    if (contact.email) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  const handleDuplicate = async () => {
    const duplicated = await duplicateContact(contactId);
    if (duplicated) {
      Alert.alert(
        'Duplicate Created',
        `"${duplicated.name}" has been created. Would you like to edit it now?`,
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => navigation.replace('ContactAddEdit', { contactId: duplicated.id }),
          },
        ]
      );
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(contactId);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header Card */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {contact.name}
              </Text>
              {contact.company && (
                <Text className="text-base text-gray-600">{contact.company}</Text>
              )}
              {contact.role && (
                <Text className="text-sm text-gray-500 mt-1">{contact.role}</Text>
              )}
            </View>
            
            {!isComplete && (
              <View className="bg-orange-100 px-3 py-1.5 rounded-lg">
                <Text className="text-xs font-semibold text-orange-700">
                  INCOMPLETE
                </Text>
              </View>
            )}
          </View>

          {!isComplete && (
            <View className="mt-4 bg-orange-50 rounded-lg p-3 border border-orange-200">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={18} color="#c2410c" />
                <Text className="flex-1 text-xs text-orange-700 ml-2">
                  This contact is missing required data (phone and email). Tap Edit to complete the profile.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="p-4">
          {/* Contact Information */}
          <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Contact Information</Text>
            
            {contact.phone && (
              <Pressable
                onPress={handleCallPhone}
                className="flex-row items-center justify-between bg-blue-50 rounded-lg p-3 mb-2 active:bg-blue-100"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="call" size={20} color="#2563eb" />
                  <Text className="text-blue-700 font-medium ml-3 flex-1">
                    {contact.phone}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#2563eb" />
              </Pressable>
            )}

            {contact.email && (
              <Pressable
                onPress={handleSendEmail}
                className="flex-row items-center justify-between bg-green-50 rounded-lg p-3 active:bg-green-100"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="mail" size={20} color="#059669" />
                  <Text className="text-green-700 font-medium ml-3 flex-1">
                    {contact.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#059669" />
              </Pressable>
            )}
          </View>

          {/* Notes */}
          {contact.notes && (
            <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Notes</Text>
              <Text className="text-base text-gray-700">{contact.notes}</Text>
            </View>
          )}

          {/* Metadata */}
          <View className="bg-gray-100 rounded-lg p-3 mt-2">
            <Text className="text-xs text-gray-600">
              Created: {new Date(contact.createdAt).toLocaleDateString()} at {new Date(contact.createdAt).toLocaleTimeString()}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Last Updated: {new Date(contact.updatedAt).toLocaleDateString()} at {new Date(contact.updatedAt).toLocaleTimeString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mt-6 mb-8">
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleEdit}
                className="flex-1 bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700 flex-row justify-center"
              >
                <Ionicons name="pencil" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Edit</Text>
              </Pressable>

              <Pressable
                onPress={handleToggleFavorite}
                className={`rounded-lg px-6 py-4 items-center flex-row ${
                  contact.isFavorite ? 'bg-yellow-500 active:bg-yellow-600' : 'bg-gray-400 active:bg-gray-500'
                }`}
              >
                <Ionicons name={contact.isFavorite ? "star" : "star-outline"} size={20} color="white" />
              </Pressable>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDuplicate}
                className="flex-1 bg-green-600 rounded-lg py-4 items-center active:bg-green-700 flex-row justify-center"
              >
                <Ionicons name="copy" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Duplicate</Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                className="bg-red-600 rounded-lg px-6 py-4 items-center active:bg-red-700 flex-row"
              >
                <Ionicons name="trash" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ContactDetailScreen;
