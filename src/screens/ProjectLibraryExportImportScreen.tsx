import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProjectLibraryStore } from '../state/projectLibraryStore';
import * as Clipboard from 'expo-clipboard';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectLibraryExportImport'>;

export default function ProjectLibraryExportImportScreen({ navigation }: Props) {
  const projects = useProjectLibraryStore((s) => s.projects);
  const exportProjects = useProjectLibraryStore((s) => s.exportProjects);
  const importProjects = useProjectLibraryStore((s) => s.importProjects);
  const clearAllProjects = useProjectLibraryStore((s) => s.clearAllProjects);

  const [importData, setImportData] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const jsonData = exportProjects();
      
      // Copy to clipboard
      await Clipboard.setStringAsync(jsonData);
      
      setStatusMessage({ type: 'success', text: 'Projects exported to clipboard!' });
      
      // Also offer to share
      setTimeout(() => {
        Share.share({
          message: jsonData,
          title: 'Project Library Export',
        }).catch(() => {
          // User cancelled share, that's okay
        });
      }, 500);
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Export failed: ${error}` });
    }
  };

  const handleImport = () => {
    if (!importData.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste JSON data to import' });
      return;
    }

    const result = importProjects(importData);
    
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      setImportData('');
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      setImportData(clipboardContent);
      setStatusMessage({ type: 'success', text: 'Pasted from clipboard' });
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Failed to paste from clipboard' });
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Projects',
      `Are you sure you want to delete all ${projects.length} projects? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            clearAllProjects();
            setStatusMessage({ type: 'success', text: 'All projects cleared' });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900 flex-1 ml-2">
            Export / Import Projects
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4 gap-6">
          {/* Status Message */}
          {statusMessage && (
            <View
              className={`rounded-lg p-4 ${
                statusMessage.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={statusMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={statusMessage.type === 'success' ? '#065F46' : '#991B1B'}
                />
                <Text
                  className={`flex-1 text-sm font-medium ${
                    statusMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {statusMessage.text}
                </Text>
                <Pressable onPress={() => setStatusMessage(null)}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Export Section */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="bg-blue-100 rounded-full p-2">
                <Ionicons name="arrow-up-circle" size={24} color="#3B82F6" />
              </View>
              <Text className="text-lg font-bold text-gray-900">Export Projects</Text>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Export all {projects.length} projects as JSON data. You can share this data or save it as a backup.
            </Text>

            <Pressable
              onPress={handleExport}
              disabled={projects.length === 0}
              className={`rounded-lg py-3 items-center ${
                projects.length === 0 ? 'bg-gray-300' : 'bg-blue-600'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                <Text className="text-white text-base font-semibold">
                  Export {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </Text>
              </View>
            </Pressable>

            {projects.length === 0 && (
              <Text className="text-xs text-gray-500 mt-2 text-center">
                No projects to export
              </Text>
            )}
          </View>

          {/* Import Section */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="bg-green-100 rounded-full p-2">
                <Ionicons name="arrow-down-circle" size={24} color="#10B981" />
              </View>
              <Text className="text-lg font-bold text-gray-900">Import Projects</Text>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Paste JSON data below to import projects. Existing projects (same job number) will be skipped.
            </Text>

            <TextInput
              value={importData}
              onChangeText={setImportData}
              placeholder="Paste JSON data here..."
              placeholderTextColor="#9CA3AF"
              cursorColor="#000000"
              multiline
              numberOfLines={8}
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 mb-3"
              style={{ minHeight: 150, textAlignVertical: 'top' }}
            />

            <View className="gap-2">
              <Pressable
                onPress={handlePasteFromClipboard}
                className="bg-gray-600 rounded-lg py-3 items-center"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
                  <Text className="text-white text-base font-semibold">
                    Paste from Clipboard
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleImport}
                disabled={!importData.trim()}
                className={`rounded-lg py-3 items-center ${
                  !importData.trim() ? 'bg-gray-300' : 'bg-green-600'
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                  <Text className="text-white text-base font-semibold">
                    Import Projects
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Danger Zone */}
          <View className="bg-white rounded-xl p-4 border-2 border-red-200">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="bg-red-100 rounded-full p-2">
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Text className="text-lg font-bold text-red-900">Danger Zone</Text>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Permanently delete all projects from the library. This action cannot be undone.
            </Text>

            <Pressable
              onPress={handleClearAll}
              disabled={projects.length === 0}
              className={`rounded-lg py-3 items-center border-2 ${
                projects.length === 0
                  ? 'bg-gray-100 border-gray-300'
                  : 'bg-red-50 border-red-600'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={projects.length === 0 ? '#9CA3AF' : '#DC2626'}
                />
                <Text
                  className={`text-base font-semibold ${
                    projects.length === 0 ? 'text-gray-400' : 'text-red-600'
                  }`}
                >
                  Clear All Projects
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Info Section */}
          <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <View className="flex-row items-start gap-3">
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-900 mb-2">
                  How to use Export/Import
                </Text>
                <Text className="text-xs text-blue-800 mb-1">
                  • Export creates a JSON backup of all your projects
                </Text>
                <Text className="text-xs text-blue-800 mb-1">
                  • Share exported data via email, messages, or save to files
                </Text>
                <Text className="text-xs text-blue-800 mb-1">
                  • Import merges new projects without duplicating existing ones
                </Text>
                <Text className="text-xs text-blue-800">
                  • Use this to backup data or transfer between devices
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
