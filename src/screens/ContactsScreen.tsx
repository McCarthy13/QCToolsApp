import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContactsStore } from '../state/contactsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ContactItem } from '../types/contacts';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contacts'>;
};

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const { getAllContacts, searchContacts, isContactComplete } = useContactsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all');

  const contacts = searchQuery ? searchContacts(searchQuery) : getAllContacts();

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      if (filterComplete === 'complete' && !isContactComplete(contact.id)) return false;
      if (filterComplete === 'incomplete' && isContactComplete(contact.id)) return false;
      return true;
    });
  }, [contacts, filterComplete, isContactComplete]);

  const stats = useMemo(() => {
    const all = getAllContacts();
    return {
      total: all.length,
      complete: all.filter(c => isContactComplete(c.id)).length,
      incomplete: all.filter(c => !isContactComplete(c.id)).length,
    };
  }, [getAllContacts, isContactComplete]);

  const handleContactPress = (contact: ContactItem) => {
    navigation.navigate('ContactDetail', { contactId: contact.id });
  };

  const handleAddNew = () => {
    navigation.navigate('ContactAddEdit', {});
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Stats Cards */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row gap-2">
          <View className="flex-1 bg-blue-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-blue-600">{stats.total}</Text>
            <Text className="text-xs text-blue-700">Total</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-green-600">{stats.complete}</Text>
            <Text className="text-xs text-green-700">Complete</Text>
          </View>
          <View className="flex-1 bg-orange-50 rounded-lg p-3">
            <Text className="text-2xl font-bold text-orange-600">{stats.incomplete}</Text>
            <Text className="text-xs text-orange-700">Incomplete</Text>
          </View>
        </View>
      </View>

      {/* Search & Add */}
      <View className="bg-white p-4 border-b border-gray-200 gap-3">
        <View className="flex-row gap-2">
          <View className="flex-1 bg-gray-100 rounded-lg flex-row items-center px-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search contacts..."
              placeholderTextColor="#9ca3af"
              cursorColor="#000000"
              className="flex-1 py-2 px-2 text-base"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleAddNew}
            className="bg-blue-600 rounded-lg px-4 items-center justify-center active:bg-blue-700"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>

        {/* Filters */}
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setFilterComplete('all')}
            className={`px-3 py-1.5 rounded-full ${
              filterComplete === 'all' ? 'bg-gray-800' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterComplete === 'all' ? 'text-white' : 'text-gray-700'
            }`}>All</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterComplete(filterComplete === 'incomplete' ? 'all' : 'incomplete')}
            className={`px-3 py-1.5 rounded-full ${
              filterComplete === 'incomplete' ? 'bg-orange-600' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-xs font-medium ${
              filterComplete === 'incomplete' ? 'text-white' : 'text-gray-700'
            }`}>Incomplete</Text>
          </Pressable>
        </View>

        <Text className="text-xs text-gray-600">
          {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
        </Text>
      </View>

      {/* Contact List */}
      <ScrollView className="flex-1">
        {filteredContacts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8 mt-20">
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text className="text-lg text-gray-600 mt-4 text-center">
              {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your filters'}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {contacts.length === 0 ? 'Tap + to add your first contact' : 'Try adjusting your search or filters'}
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {filteredContacts.map(contact => {
              const isComplete = isContactComplete(contact.id);
              
              return (
                <Pressable
                  key={contact.id}
                  onPress={() => handleContactPress(contact)}
                  className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {contact.name}
                      </Text>
                      {contact.company && (
                        <Text className="text-sm text-gray-500 mt-0.5">
                          {contact.company}
                        </Text>
                      )}
                      {contact.role && (
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {contact.role}
                        </Text>
                      )}
                    </View>
                    
                    {!isComplete && (
                      <View className="bg-orange-100 px-2 py-1 rounded">
                        <Text className="text-xs font-semibold text-orange-700">
                          INCOMPLETE
                        </Text>
                      </View>
                    )}
                  </View>

                  {(contact.phone || contact.email) && (
                    <View className="flex-row flex-wrap gap-3 mt-2 pt-2 border-t border-gray-100">
                      {contact.phone && (
                        <View className="flex-row items-center">
                          <Ionicons name="call-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 ml-1">{contact.phone}</Text>
                        </View>
                      )}
                      {contact.email && (
                        <View className="flex-row items-center">
                          <Ionicons name="mail-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 ml-1">{contact.email}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View className="flex-row items-center justify-end mt-2">
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ContactsScreen;
