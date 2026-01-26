import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { ISSUE_CODE_DEFINITIONS, getIssueCodeDescription } from '../types/quality-log';
import ScreenHeader from '../components/ScreenHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogAdmin'>;

type TabType = 'columns' | 'codes' | 'email';

// All available columns in the Quality Log table
const ALL_COLUMNS = [
  { key: 'pourDate', label: 'Pour Date', defaultVisible: true },
  { key: 'disposition', label: 'Disposition', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'productType', label: 'Product Type', defaultVisible: true },
  { key: 'jobNumber', label: 'Job #', defaultVisible: true },
  { key: 'markNumber', label: 'Mark #', defaultVisible: true },
  { key: 'pieceTicket', label: 'Piece Ticket (PDF)', defaultVisible: true },
  { key: 'idNumber', label: 'ID #', defaultVisible: true },
  { key: 'length', label: 'Length', defaultVisible: true },
  { key: 'width', label: 'Width', defaultVisible: true },
  { key: 'designStrandPattern', label: 'Design Strand Pattern', defaultVisible: true },
  { key: 'castStrandPattern', label: 'Cast Strand Pattern', defaultVisible: true },
  { key: 'bed', label: 'Bed', defaultVisible: true },
  { key: 'location', label: 'Location', defaultVisible: true },
  { key: 'inspectionNotes', label: 'Inspection Notes', defaultVisible: true },
  { key: 'attachments', label: 'Attachments', defaultVisible: true },
  { key: 'engineer', label: 'Engineer', defaultVisible: true },
  { key: 'engineerFeedback', label: 'Engineer Feedback', defaultVisible: true },
  { key: 'issueCodes', label: 'Issue Codes', defaultVisible: true },
  { key: 'rejectCodes', label: 'Reject Codes', defaultVisible: true },
];

const COLUMN_VISIBILITY_KEY = 'quality_log_column_visibility';
const DEFAULT_RECIPIENTS_KEY = 'daily_report_default_recipients';

interface ColumnVisibility {
  [key: string]: boolean;
}

interface DefaultRecipients {
  to: string;
  cc: string;
}

export default function QualityLogAdminScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('columns');
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
  const [recipients, setRecipients] = useState<DefaultRecipients>({ to: '', cc: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load column visibility
      const storedColumns = await AsyncStorage.getItem(COLUMN_VISIBILITY_KEY);
      if (storedColumns) {
        setColumnVisibility(JSON.parse(storedColumns));
      } else {
        // Initialize with defaults
        const defaults: ColumnVisibility = {};
        ALL_COLUMNS.forEach(col => {
          defaults[col.key] = col.defaultVisible;
        });
        setColumnVisibility(defaults);
      }

      // Load email recipients
      const storedRecipients = await AsyncStorage.getItem(DEFAULT_RECIPIENTS_KEY);
      if (storedRecipients) {
        setRecipients(JSON.parse(storedRecipients));
      } else {
        // Initialize with default recipients if none are set
        const defaultRecipients: DefaultRecipients = {
          to: 'patrick.mccarthy@molin.com',
          cc: 'patrick.mccarthy@molin.com',
        };
        setRecipients(defaultRecipients);
        await AsyncStorage.setItem(DEFAULT_RECIPIENTS_KEY, JSON.stringify(defaultRecipients));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleColumn = async (columnKey: string) => {
    const newVisibility = {
      ...columnVisibility,
      [columnKey]: !columnVisibility[columnKey],
    };
    setColumnVisibility(newVisibility);

    try {
      await AsyncStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(newVisibility));
    } catch (error) {
      console.error('Error saving column visibility:', error);
    }
  };

  const resetColumnsToDefault = async () => {
    const defaults: ColumnVisibility = {};
    ALL_COLUMNS.forEach(col => {
      defaults[col.key] = col.defaultVisible;
    });
    setColumnVisibility(defaults);

    try {
      await AsyncStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(defaults));
      Alert.alert('Reset', 'Column visibility reset to defaults.');
    } catch (error) {
      console.error('Error resetting columns:', error);
    }
  };

  const saveRecipients = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(DEFAULT_RECIPIENTS_KEY, JSON.stringify(recipients));
      Alert.alert('Saved', 'Email recipients saved successfully.');
    } catch (error) {
      console.error('Error saving recipients:', error);
      Alert.alert('Error', 'Failed to save recipients.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearRecipients = async () => {
    Alert.alert(
      'Clear Recipients',
      'Are you sure you want to clear all default recipients?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setRecipients({ to: '', cc: '' });
            try {
              await AsyncStorage.removeItem(DEFAULT_RECIPIENTS_KEY);
              Alert.alert('Cleared', 'Default recipients cleared.');
            } catch (error) {
              console.error('Error clearing recipients:', error);
            }
          },
        },
      ]
    );
  };

  const renderColumnsTab = () => (
    <ScrollView className="flex-1 px-4 py-4">
      <Text className="text-sm text-gray-500 mb-4">
        Toggle which columns are visible in the Quality Log table. Changes are saved automatically.
      </Text>

      {ALL_COLUMNS.map((column) => (
        <View
          key={column.key}
          className="flex-row items-center justify-between bg-white rounded-lg p-4 mb-2 border border-gray-200"
        >
          <Text className="text-base text-gray-900 flex-1">{column.label}</Text>
          <Switch
            value={columnVisibility[column.key] !== false}
            onValueChange={() => toggleColumn(column.key)}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={columnVisibility[column.key] !== false ? '#3B82F6' : '#9CA3AF'}
          />
        </View>
      ))}

      <Pressable
        onPress={resetColumnsToDefault}
        className="mt-4 mb-8 py-3 bg-gray-200 rounded-lg items-center"
      >
        <Text className="text-gray-700 font-medium">Reset to Defaults</Text>
      </Pressable>
    </ScrollView>
  );

  const renderCodesTab = () => (
    <ScrollView className="flex-1 px-4 py-4">
      <Text className="text-sm text-gray-500 mb-4">
        Reference list of all Issue Codes and Reject Codes. These codes are used to categorize quality issues.
      </Text>

      {ISSUE_CODE_DEFINITIONS.map((item) => (
        <View
          key={item.code}
          className="flex-row items-center bg-white rounded-lg p-3 mb-2 border border-gray-200"
        >
          <View className="bg-blue-100 rounded-lg px-3 py-1 mr-3">
            <Text className="text-blue-800 font-bold text-base">{item.code}</Text>
          </View>
          <Text className="text-base text-gray-900 flex-1">{item.description}</Text>
        </View>
      ))}

      <View className="h-8" />
    </ScrollView>
  );

  const renderEmailTab = () => (
    <ScrollView className="flex-1 px-4 py-4">
      <Text className="text-sm text-gray-500 mb-4">
        Set default recipients for the "Send Today's Report" email. These will be pre-filled when sending reports.
      </Text>

      <View className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">To (Recipients)</Text>
        <TextInput
          value={recipients.to}
          onChangeText={(text) => setRecipients(prev => ({ ...prev, to: text }))}
          placeholder="email@example.com, email2@example.com"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Text className="text-xs text-gray-400 mt-1">
          Separate multiple emails with commas
        </Text>
      </View>

      <View className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">CC (Carbon Copy)</Text>
        <TextInput
          value={recipients.cc}
          onChangeText={(text) => setRecipients(prev => ({ ...prev, cc: text }))}
          placeholder="cc@example.com, cc2@example.com"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Text className="text-xs text-gray-400 mt-1">
          Separate multiple emails with commas
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={saveRecipients}
          disabled={isSaving}
          className="flex-1 py-3 bg-blue-600 rounded-lg items-center active:bg-blue-700"
        >
          <Text className="text-white font-semibold">
            {isSaving ? 'Saving...' : 'Save Recipients'}
          </Text>
        </Pressable>

        <Pressable
          onPress={clearRecipients}
          className="py-3 px-4 bg-gray-200 rounded-lg items-center active:bg-gray-300"
        >
          <Ionicons name="trash-outline" size={20} color="#6B7280" />
        </Pressable>
      </View>

      <View className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
          <Text className="text-sm text-blue-800 flex-1">
            When you click "Save as Default Recipients" in the Email Composer after clicking "Send Today's Report", it will automatically update the recipients here.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-100">
      <ScreenHeader title="Admin Settings" />

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <Pressable
          onPress={() => setActiveTab('columns')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'columns' ? 'border-blue-500' : 'border-transparent'
          }`}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={activeTab === 'columns' ? '#3B82F6' : '#9CA3AF'}
          />
          <Text
            className={`text-xs mt-1 ${
              activeTab === 'columns' ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
          >
            Columns
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('codes')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'codes' ? 'border-orange-500' : 'border-transparent'
          }`}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={activeTab === 'codes' ? '#F97316' : '#9CA3AF'}
          />
          <Text
            className={`text-xs mt-1 ${
              activeTab === 'codes' ? 'text-orange-600 font-semibold' : 'text-gray-500'
            }`}
          >
            Issue Codes
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('email')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'email' ? 'border-green-500' : 'border-transparent'
          }`}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={activeTab === 'email' ? '#22C55E' : '#9CA3AF'}
          />
          <Text
            className={`text-xs mt-1 ${
              activeTab === 'email' ? 'text-green-600 font-semibold' : 'text-gray-500'
            }`}
          >
            Email
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'columns' && renderColumnsTab()}
      {activeTab === 'codes' && renderCodesTab()}
      {activeTab === 'email' && renderEmailTab()}
    </View>
  );
}
