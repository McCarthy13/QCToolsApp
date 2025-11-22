import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAggregateLibraryStore } from '../state/aggregateLibraryStore';
import { useAdmixLibraryStore } from '../state/admixLibraryStore';
import { useContactsStore } from '../state/contactsStore';
import { useAuthStore } from '../state/authStore';
import DataImportScreen from './DataImportScreen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route?: keyof RootStackParamList;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: 'camber-calculator',
    name: 'Camber Calculator',
    description: 'Calculate precast concrete member camber with strand patterns',
    icon: 'calculator',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    route: 'Calculator',
  },
  {
    id: 'slippage-identifier',
    name: 'Slippage Identifier',
    description: 'Track and report strand slippage with cross-section templates',
    icon: 'resize',
    color: '#10B981',
    bgColor: '#F0FDF4',
    route: 'ProductDetails',
  },
  {
    id: 'stressing-calculator',
    name: 'Stressing Force & Elongation',
    description: 'Calculate expected strand elongation during prestressing',
    icon: 'git-pull-request',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    route: 'StressingCalculator',
  },
  {
    id: 'aggregate-gradation',
    name: 'Aggregate Gradation Analysis',
    description: 'Perform sieve analysis and verify ASTM C33 compliance',
    icon: 'analytics',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    route: 'AggregateGradation',
  },
  {
    id: 'quality-logs',
    name: 'Quality Logs',
    description: 'Track quality issues and production logs by department',
    icon: 'clipboard',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    route: 'QualityLogDashboard',
  },
  {
    id: 'daily-pour-schedule',
    name: 'Daily Pour Schedule',
    description: 'Manage concrete pours by department and form/bed',
    icon: 'calendar',
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    route: 'DailyPourSchedule',
  },
  {
    id: 'yard-maps',
    name: 'Yard Maps',
    description: 'Track and locate yarded pieces by department',
    icon: 'map',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    route: 'YardMap',
  },
  {
    id: 'product-library',
    name: 'Product Library',
    description: 'Manage product types and tolerance specifications',
    icon: 'cube',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    route: 'ProductLibrary',
  },
  {
    id: 'project-library',
    name: 'Project Library',
    description: 'Manage projects, team assignments, and piece counts',
    icon: 'folder-open',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    route: 'ProjectLibrary',
  },
  {
    id: 'aggregate-library',
    name: 'Aggregate Library',
    description: 'Comprehensive database of aggregate characteristics',
    icon: 'flask',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    route: 'AggregateLibrary',
  },
  {
    id: 'admix-library',
    name: 'Admix Library',
    description: 'Manage admixture products and dosage information',
    icon: 'water',
    color: '#0891B2',
    bgColor: '#ECFEFF',
    route: 'AdmixLibrary',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Manage vendors, suppliers, and sales representatives',
    icon: 'people',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    route: 'Contacts',
  },
  {
    id: 'strand-library',
    name: 'Strand Library',
    description: 'Manage strand definitions and material properties',
    icon: 'library',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    route: 'StrandLibrary',
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  // Search functionality
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDataImport, setShowDataImport] = useState(false);

  const { getAllAggregates } = useAggregateLibraryStore();
  const { getAllAdmixes } = useAdmixLibraryStore();
  const { getAllContacts } = useContactsStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const isAdmin = currentUser?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    // Navigation to login will happen automatically via App.tsx when currentUser becomes null
  };

  const handleToolPress = (tool: Tool) => {
    if (tool.comingSoon) {
      return; // Do nothing for coming soon tools
    }
    if (tool.route) {
      navigation.navigate(tool.route as any);
    }
  };

  // Global search function
  const performSearch = () => {
    if (!searchQuery.trim()) {
      return { aggregates: [], admixes: [], contacts: [] };
    }

    const query = searchQuery.toLowerCase().trim();

    const aggregates = getAllAggregates().filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.source?.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query)
    );

    const admixes = getAllAdmixes().filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.manufacturer.toLowerCase().includes(query) ||
      item.class.toLowerCase().includes(query)
    );

    const contacts = getAllContacts().filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.company?.toLowerCase().includes(query) ||
      item.role?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query)
    );

    return { aggregates, admixes, contacts };
  };

  const searchResults = performSearch();
  const totalResults = searchResults.aggregates.length + searchResults.admixes.length + searchResults.contacts.length;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* Header */}
          <View className="mb-6 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-4xl font-bold text-gray-900">
                Quality Tools
              </Text>
              <View className="flex-row gap-2">
                {isAdmin && (
                  <Pressable
                    onPress={() => setShowDataImport(true)}
                    className="bg-green-600 rounded-full p-3 active:bg-green-700"
                  >
                    <Ionicons name="cloud-upload" size={24} color="white" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowSearch(true)}
                  className="bg-blue-600 rounded-full p-3 active:bg-blue-700"
                >
                  <Ionicons name="search" size={24} color="white" />
                </Pressable>
                <Pressable
                  onPress={handleLogout}
                  className="bg-red-600 rounded-full p-3 active:bg-red-700"
                >
                  <Ionicons name="log-out-outline" size={24} color="white" />
                </Pressable>
              </View>
            </View>
            <Text className="text-base text-gray-600">
              Select a tool to get started
            </Text>
            {currentUser && (
              <Text className="text-sm text-gray-500 mt-1">
                Logged in as: {currentUser.email} ({currentUser.role})
              </Text>
            )}
          </View>

          {/* Tools Grid - 3 Columns */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
            {tools.map((tool) => (
              <View 
                key={tool.id}
                style={{ width: '33.333%', padding: 6 }}
              >
                <Pressable
                  onPress={() => handleToolPress(tool)}
                  disabled={tool.comingSoon}
                  style={{
                    backgroundColor: tool.bgColor,
                    borderRadius: 16,
                    padding: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    opacity: tool.comingSoon ? 0.6 : 1,
                    minHeight: 160,
                  }}
                >
                  {/* Icon */}
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <View 
                      style={{
                        backgroundColor: tool.color,
                        borderRadius: 12,
                        padding: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons name={tool.icon} size={28} color="white" />
                    </View>
                    
                    {tool.comingSoon && (
                      <View style={{ 
                        backgroundColor: '#FEF3C7', 
                        paddingHorizontal: 6, 
                        paddingVertical: 2, 
                        borderRadius: 8,
                        marginBottom: 4,
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#92400E' }}>
                          SOON
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Tool Name */}
                  <Text 
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#111827',
                      textAlign: 'center',
                      marginBottom: 4,
                      lineHeight: 16,
                    }}
                    numberOfLines={2}
                  >
                    {tool.name}
                  </Text>
                  
                  {/* Description */}
                  <Text 
                    style={{
                      fontSize: 10,
                      color: '#6B7280',
                      textAlign: 'center',
                      lineHeight: 13,
                    }}
                    numberOfLines={3}
                  >
                    {tool.description}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>

          {/* Info Section */}
          <View className="mt-8 bg-blue-50 rounded-xl p-5 border border-blue-200">
            <View className="flex-row items-start">
              <View className="bg-blue-500 rounded-full p-2 mr-3">
                <Ionicons name="information" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-900 mb-1">
                  More Tools Coming
                </Text>
                <Text className="text-xs text-blue-700">
                  We are continuously adding new quality control tools to help you work more efficiently. Check back for updates!
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Global Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearch(false)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white p-4 border-b border-gray-200">
            <View className="flex-row items-center gap-3 mb-3">
              <Pressable onPress={() => setShowSearch(false)}>
                <Ionicons name="arrow-back" size={28} color="#111827" />
              </Pressable>
              <Text className="text-xl font-bold text-gray-900 flex-1">
                Global Search
              </Text>
            </View>
            
            <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3">
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search across all libraries..."
                placeholderTextColor="#9ca3af"
                cursorColor="#000000"
                autoFocus
                className="flex-1 ml-3 text-base text-gray-900"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </Pressable>
              )}
            </View>

            {searchQuery.length > 0 && (
              <Text className="text-sm text-gray-600 mt-2">
                {totalResults} {totalResults === 1 ? 'result' : 'results'} found
              </Text>
            )}
          </View>

          <ScrollView className="flex-1">
            {searchQuery.trim().length === 0 ? (
              <View className="items-center justify-center p-8 mt-20">
                <Ionicons name="search-outline" size={64} color="#9ca3af" />
                <Text className="text-lg text-gray-600 mt-4 text-center">
                  Start typing to search
                </Text>
                <Text className="text-sm text-gray-500 mt-2 text-center">
                  Search across Aggregate Library, Admix Library, and Contacts
                </Text>
              </View>
            ) : totalResults === 0 ? (
              <View className="items-center justify-center p-8 mt-20">
                <Ionicons name="sad-outline" size={64} color="#9ca3af" />
                <Text className="text-lg text-gray-600 mt-4 text-center">
                  No results found
                </Text>
                <Text className="text-sm text-gray-500 mt-2 text-center">
                  Try a different search term
                </Text>
              </View>
            ) : (
              <View className="p-4">
                {/* Aggregate Results */}
                {searchResults.aggregates.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="flask" size={20} color="#DC2626" />
                      <Text className="text-lg font-bold text-gray-900 ml-2">
                        Aggregate Library ({searchResults.aggregates.length})
                      </Text>
                    </View>
                    <View className="gap-2">
                      {searchResults.aggregates.map(item => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setShowSearch(false);
                            navigation.navigate('AggregateLibraryDetail', { aggregateId: item.id });
                          }}
                          className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                        >
                          <Text className="text-base font-semibold text-gray-900">
                            {item.name}
                          </Text>
                          {item.source && (
                            <Text className="text-sm text-gray-600 mt-1">
                              Source: {item.source}
                            </Text>
                          )}
                          {item.type && (
                            <Text className="text-xs text-gray-500 mt-0.5">
                              {item.type}
                            </Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Admix Results */}
                {searchResults.admixes.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="water" size={20} color="#0891B2" />
                      <Text className="text-lg font-bold text-gray-900 ml-2">
                        Admix Library ({searchResults.admixes.length})
                      </Text>
                    </View>
                    <View className="gap-2">
                      {searchResults.admixes.map(item => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setShowSearch(false);
                            navigation.navigate('AdmixLibraryDetail', { admixId: item.id });
                          }}
                          className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                        >
                          <Text className="text-base font-semibold text-gray-900">
                            {item.name}
                          </Text>
                          <Text className="text-sm text-gray-600 mt-1">
                            {item.manufacturer}
                          </Text>
                          <Text className="text-xs text-gray-500 mt-0.5">
                            {item.class}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Contact Results */}
                {searchResults.contacts.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="people" size={20} color="#7C3AED" />
                      <Text className="text-lg font-bold text-gray-900 ml-2">
                        Contacts ({searchResults.contacts.length})
                      </Text>
                    </View>
                    <View className="gap-2">
                      {searchResults.contacts.map(item => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setShowSearch(false);
                            navigation.navigate('ContactDetail', { contactId: item.id });
                          }}
                          className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
                        >
                          <Text className="text-base font-semibold text-gray-900">
                            {item.name}
                          </Text>
                          {item.company && (
                            <Text className="text-sm text-gray-600 mt-1">
                              {item.company}
                            </Text>
                          )}
                          {item.role && (
                            <Text className="text-xs text-gray-500 mt-0.5">
                              {item.role}
                            </Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Data Import Modal (Admin Only) */}
      <Modal
        visible={showDataImport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDataImport(false)}
      >
        <DataImportScreen onBack={() => setShowDataImport(false)} />
      </Modal>
    </View>
  );
}
