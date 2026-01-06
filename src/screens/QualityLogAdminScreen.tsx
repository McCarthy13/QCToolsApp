import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { QualityCode } from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogAdmin'>;

type CodeType = 'issue' | 'reject';

export default function QualityLogAdminScreen({ navigation }: Props) {
  const issueCodes = useQualityLogStore((s) => s.issueCodes);
  const rejectCodes = useQualityLogStore((s) => s.rejectCodes);
  const addIssueCode = useQualityLogStore((s) => s.addIssueCode);
  const updateIssueCode = useQualityLogStore((s) => s.updateIssueCode);
  const deleteIssueCode = useQualityLogStore((s) => s.deleteIssueCode);
  const addRejectCode = useQualityLogStore((s) => s.addRejectCode);
  const updateRejectCode = useQualityLogStore((s) => s.updateRejectCode);
  const deleteRejectCode = useQualityLogStore((s) => s.deleteRejectCode);

  const [activeTab, setActiveTab] = useState<CodeType>('issue');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCode, setEditingCode] = useState<QualityCode | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const currentCodes = activeTab === 'issue' ? issueCodes : rejectCodes;

  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormIsActive(true);
    setEditingCode(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (code: QualityCode) => {
    setEditingCode(code);
    setFormCode(code.code);
    setFormDescription(code.description);
    setFormIsActive(code.isActive);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formCode.trim()) {
      Alert.alert('Error', 'Please enter a code');
      return;
    }

    if (!formDescription.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    try {
      if (editingCode) {
        // Update existing
        if (activeTab === 'issue') {
          await updateIssueCode(editingCode.id, {
            code: formCode.trim(),
            description: formDescription.trim(),
            isActive: formIsActive,
          });
        } else {
          await updateRejectCode(editingCode.id, {
            code: formCode.trim(),
            description: formDescription.trim(),
            isActive: formIsActive,
          });
        }
      } else {
        // Add new
        const newCode = {
          code: formCode.trim(),
          description: formDescription.trim(),
          isActive: formIsActive,
        };

        if (activeTab === 'issue') {
          await addIssueCode(newCode);
        } else {
          await addRejectCode(newCode);
        }
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving code:', error);
      Alert.alert('Error', 'Failed to save code. Please try again.');
    }
  };

  const handleDelete = (code: QualityCode) => {
    Alert.alert(
      'Delete Code',
      `Are you sure you want to delete "${code.code}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTab === 'issue') {
                await deleteIssueCode(code.id);
              } else {
                await deleteRejectCode(code.id);
              }
            } catch (error) {
              console.error('Error deleting code:', error);
              Alert.alert('Error', 'Failed to delete code. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (code: QualityCode) => {
    try {
      if (activeTab === 'issue') {
        await updateIssueCode(code.id, { isActive: !code.isActive });
      } else {
        await updateRejectCode(code.id, { isActive: !code.isActive });
      }
    } catch (error) {
      console.error('Error toggling code:', error);
      Alert.alert('Error', 'Failed to update code. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Quality Log Settings</Text>
          <Pressable onPress={handleOpenAdd} className="p-1">
            <Ionicons name="add-circle" size={28} color="#3B82F6" />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <Pressable
          onPress={() => setActiveTab('issue')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'issue' ? 'border-orange-500' : 'border-transparent'
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === 'issue' ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            Issue Codes
          </Text>
          <Text
            className={`text-xs ${
              activeTab === 'issue' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            {issueCodes.length} codes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('reject')}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'reject' ? 'border-red-500' : 'border-transparent'
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === 'reject' ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            Reject Codes
          </Text>
          <Text
            className={`text-xs ${
              activeTab === 'reject' ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {rejectCodes.length} codes
          </Text>
        </Pressable>
      </View>

      {/* Code List */}
      <ScrollView className="flex-1">
        {currentCodes.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name={activeTab === 'issue' ? 'warning-outline' : 'close-circle-outline'}
              size={48}
              color="#9CA3AF"
            />
            <Text className="text-gray-500 mt-4">
              No {activeTab === 'issue' ? 'issue' : 'reject'} codes yet
            </Text>
            <Pressable
              onPress={handleOpenAdd}
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Add First Code</Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-4 py-4">
            {currentCodes.map((code) => (
              <View
                key={code.id}
                className={`bg-white rounded-xl p-4 mb-3 border-l-4 ${
                  code.isActive
                    ? activeTab === 'issue'
                      ? 'border-l-orange-500'
                      : 'border-l-red-500'
                    : 'border-l-gray-300'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text
                        className={`text-lg font-bold ${
                          code.isActive ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {code.code}
                      </Text>
                      {!code.isActive && (
                        <View className="ml-2 bg-gray-200 px-2 py-0.5 rounded">
                          <Text className="text-xs text-gray-500">Inactive</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-sm mt-1 ${
                        code.isActive ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      {code.description}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Switch
                      value={code.isActive}
                      onValueChange={() => handleToggleActive(code)}
                      trackColor={{
                        false: '#D1D5DB',
                        true: activeTab === 'issue' ? '#FDBA74' : '#FCA5A5',
                      }}
                      thumbColor={
                        code.isActive
                          ? activeTab === 'issue'
                            ? '#EA580C'
                            : '#DC2626'
                          : '#9CA3AF'
                      }
                    />
                    <Pressable
                      onPress={() => handleOpenEdit(code)}
                      className="p-2 active:bg-gray-100 rounded-lg"
                    >
                      <Ionicons name="pencil" size={18} color="#6B7280" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(code)}
                      className="p-2 active:bg-red-50 rounded-lg"
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {editingCode ? 'Edit' : 'Add'} {activeTab === 'issue' ? 'Issue' : 'Reject'} Code
              </Text>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Code Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Code</Text>
              <TextInput
                value={formCode}
                onChangeText={setFormCode}
                placeholder="e.g., 1, R1, A"
                className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900"
                autoCapitalize="characters"
              />
            </View>

            {/* Description Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Describe what this code means"
                className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Active Toggle */}
            <View className="flex-row items-center justify-between mb-6 py-3">
              <View>
                <Text className="text-sm font-medium text-gray-700">Active</Text>
                <Text className="text-xs text-gray-500">
                  Inactive codes won't appear in selection
                </Text>
              </View>
              <Switch
                value={formIsActive}
                onValueChange={setFormIsActive}
                trackColor={{
                  false: '#D1D5DB',
                  true: activeTab === 'issue' ? '#FDBA74' : '#FCA5A5',
                }}
                thumbColor={
                  formIsActive
                    ? activeTab === 'issue'
                      ? '#EA580C'
                      : '#DC2626'
                    : '#9CA3AF'
                }
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              className={`py-4 rounded-xl items-center ${
                activeTab === 'issue' ? 'bg-orange-500' : 'bg-red-500'
              } active:opacity-80`}
            >
              <Text className="text-white font-bold text-base">
                {editingCode ? 'Update' : 'Add'} Code
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
