import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProjectLibraryStore } from '../state/projectLibraryStore';
import { useAuthStore } from '../state/authStore';
import { PieceCountByType } from '../types/project-library';
import { validateJobNumber, getValidationMessage } from '../utils/jobNumberValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectLibraryAddEdit'>;

export default function ProjectLibraryAddEditScreen({ navigation, route }: Props) {
  const { projectId, prefilledJobNumber, prefilledJobName, returnScreen } = route.params;
  const isEditing = !!projectId;
  
  const currentUser = useAuthStore((s) => s.currentUser);
  const getProjectById = useProjectLibraryStore((s) => s.getProjectById);
  const addProject = useProjectLibraryStore((s) => s.addProject);
  const updateProject = useProjectLibraryStore((s) => s.updateProject);
  
  const existingProject = projectId ? getProjectById(projectId) : null;
  
  const [jobNumber, setJobNumber] = useState(
    existingProject?.jobNumber || prefilledJobNumber || ''
  );
  const [jobName, setJobName] = useState(
    existingProject?.jobName || prefilledJobName || ''
  );
  const [location, setLocation] = useState(existingProject?.location || '');
  const [salesperson, setSalesperson] = useState(existingProject?.salesperson || '');
  const [projectManager, setProjectManager] = useState(existingProject?.projectManager || '');
  const [assignedEngineer, setAssignedEngineer] = useState(existingProject?.assignedEngineer || '');
  const [assignedDrafter, setAssignedDrafter] = useState(existingProject?.assignedDrafter || '');
  const [pieceCountByType, setPieceCountByType] = useState<PieceCountByType[]>(
    existingProject?.pieceCountByType || []
  );
  
  // New piece count entry
  const [newProductType, setNewProductType] = useState('');
  const [newCount, setNewCount] = useState('');

  const handleSave = () => {
    if (!jobNumber.trim() || !jobName.trim()) {
      Alert.alert('Required Fields', 'Job Number and Job Name are required.');
      return;
    }

    // Validate job number format
    const validation = validateJobNumber(jobNumber);
    if (!validation.isValid) {
      Alert.alert(
        'Invalid Job Number',
        `${validation.error}\n\nJob number must be:\n• Exactly 6 digits\n• 2nd and 3rd digits must match\n\nExample: 255096, 144523, 366789`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    const projectData = {
      jobNumber: validation.cleaned || jobNumber.trim(),
      jobName: jobName.trim(),
      location: location.trim() || undefined,
      salesperson: salesperson.trim() || undefined,
      projectManager: projectManager.trim() || undefined,
      assignedEngineer: assignedEngineer.trim() || undefined,
      assignedDrafter: assignedDrafter.trim() || undefined,
      pieceCountByType,
      createdBy: currentUser.email,
    };

    if (isEditing) {
      updateProject(projectId, projectData);
    } else {
      addProject(projectData);
    }

    // Navigate back appropriately
    if (returnScreen === 'current') {
      // User came from another screen to create project, go back to that screen
      navigation.goBack();
    } else {
      // Normal flow, go back to list
      navigation.goBack();
    }
  };

  const handleAddPieceCount = () => {
    if (!newProductType.trim()) {
      Alert.alert('Missing Product Type', 'Please enter a product type.');
      return;
    }

    const count = parseInt(newCount);
    if (!count || count < 1) {
      Alert.alert('Invalid Count', 'Please enter a valid piece count.');
      return;
    }

    setPieceCountByType([...pieceCountByType, { productType: newProductType.trim(), count }]);
    setNewProductType('');
    setNewCount('');
  };

  const handleRemovePieceCount = (index: number) => {
    setPieceCountByType(pieceCountByType.filter((_, i) => i !== index));
  };

  const totalPieces = pieceCountByType.reduce((sum, item) => sum + item.count, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="close" size={24} color="#111827" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit Project' : 'New Project'}
          </Text>
          {returnScreen === 'current' && !isEditing && (
            <Text className="text-xs text-gray-500">Creating from job entry</Text>
          )}
        </View>
        <Pressable onPress={handleSave} className="p-2">
          <Text className="text-base font-semibold text-blue-600">Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="p-4 gap-4">
            {/* Info banner when creating from another screen */}
            {returnScreen === 'current' && !isEditing && (
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-blue-900 mb-1">
                      Quick Project Creation
                    </Text>
                    <Text className="text-sm text-blue-700">
                      After saving, you'll return to your previous screen with the job information filled in.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Job Information */}
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <Text className="text-sm font-semibold text-gray-500 mb-3">JOB INFORMATION</Text>
              
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Job Number <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={jobNumber}
                    onChangeText={setJobNumber}
                    placeholder="6 digits (e.g., 255096)"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    keyboardType="number-pad"
                    maxLength={10}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Format: 6 digits, 2nd and 3rd must match
                  </Text>
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Job Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={jobName}
                    onChangeText={setJobName}
                    placeholder="Enter job name"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Location</Text>
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Enter project address"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    multiline
                    numberOfLines={2}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                </View>
              </View>
            </View>

            {/* Team */}
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <Text className="text-sm font-semibold text-gray-500 mb-3">TEAM</Text>
              
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Salesperson</Text>
                  <TextInput
                    value={salesperson}
                    onChangeText={setSalesperson}
                    placeholder="Enter salesperson name"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Project Manager</Text>
                  <TextInput
                    value={projectManager}
                    onChangeText={setProjectManager}
                    placeholder="Enter PM name"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Assigned Engineer</Text>
                  <TextInput
                    value={assignedEngineer}
                    onChangeText={setAssignedEngineer}
                    placeholder="Enter engineer name"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Assigned Drafter</Text>
                  <TextInput
                    value={assignedDrafter}
                    onChangeText={setAssignedDrafter}
                    placeholder="Enter drafter name"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
                  />
                </View>
              </View>
            </View>

            {/* Piece Count by Type */}
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-gray-500">PIECE COUNT BY TYPE</Text>
                {totalPieces > 0 && (
                  <View className="bg-blue-100 px-2 py-1 rounded">
                    <Text className="text-xs font-bold text-blue-700">{totalPieces} Total</Text>
                  </View>
                )}
              </View>

              {/* Existing Piece Counts */}
              {pieceCountByType.length > 0 && (
                <View className="gap-2 mb-4">
                  {pieceCountByType.map((item, index) => (
                    <View 
                      key={index}
                      className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3"
                    >
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900">{item.productType}</Text>
                        <Text className="text-sm text-gray-600">{item.count} pieces</Text>
                      </View>
                      <Pressable onPress={() => handleRemovePieceCount(index)} className="p-2">
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add New Piece Count */}
              <View className="border-t border-gray-200 pt-3">
                <Text className="text-xs font-semibold text-gray-500 mb-2">ADD PIECE COUNT</Text>
                <View className="gap-3">
                  <TextInput
                    value={newProductType}
                    onChangeText={setNewProductType}
                    placeholder="Product type (e.g., Beam, Column)"
                    placeholderTextColor="#9CA3AF"
                    cursorColor="#000000"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900"
                  />
                  <View className="flex-row gap-2">
                    <TextInput
                      value={newCount}
                      onChangeText={setNewCount}
                      placeholder="Count"
                      placeholderTextColor="#9CA3AF"
                      cursorColor="#000000"
                      keyboardType="number-pad"
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900"
                    />
                    <Pressable
                      onPress={handleAddPieceCount}
                      className="bg-blue-600 rounded-lg px-4 py-2 justify-center items-center"
                    >
                      <Text className="text-white font-semibold">Add</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
