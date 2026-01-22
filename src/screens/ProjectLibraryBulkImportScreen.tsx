import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProjectLibraryStore } from '../state/projectLibraryStore';
import { useAuthStore } from '../state/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectLibraryBulkImport'>;

interface ImportResult {
  status: 'idle' | 'processing' | 'complete' | 'error';
  message: string;
  projectsFound: number;
  projectsCreated: number;
  projectsSkipped: number;
  errors: string[];
}

interface ParsedProject {
  jobNumber: string;
  jobName: string;
  originalLine: string;
}

export default function ProjectLibraryBulkImportScreen({ navigation }: Props) {
  const [folderListText, setFolderListText] = useState('');
  const [result, setResult] = useState<ImportResult>({
    status: 'idle',
    message: '',
    projectsFound: 0,
    projectsCreated: 0,
    projectsSkipped: 0,
    errors: [],
  });

  const projects = useProjectLibraryStore((s) => s.projects);
  const addProject = useProjectLibraryStore((s) => s.addProject);
  const currentUser = useAuthStore((s) => s.currentUser);

  // Parse job number and name from folder name
  // Formats supported:
  // - "26-6000 - Project Name" → jobNumber: "266000"
  // - "26-6000- Project Name" → jobNumber: "266000"
  // - "266000 - Project Name" → jobNumber: "266000"
  const parseJobFolder = (folderName: string): { jobNumber: string; jobName: string } | null => {
    const trimmed = folderName.trim();
    if (!trimmed) return null;

    // Try pattern: "XX-XXXX - Project Name" (2 digits, hyphen, 4 digits)
    const hyphenatedMatch = trimmed.match(/^(\d{2})-(\d{4})\s*-\s*(.+)$/);
    if (hyphenatedMatch) {
      return {
        jobNumber: hyphenatedMatch[1] + hyphenatedMatch[2],
        jobName: hyphenatedMatch[3].trim(),
      };
    }

    // Try pattern: "XX-XXXX" without project name
    const hyphenatedOnlyMatch = trimmed.match(/^(\d{2})-(\d{4})$/);
    if (hyphenatedOnlyMatch) {
      const jobNum = hyphenatedOnlyMatch[1] + hyphenatedOnlyMatch[2];
      return {
        jobNumber: jobNum,
        jobName: `Job ${jobNum}`,
      };
    }

    // Try pattern: "123456 - Project Name" (6 digits without hyphen)
    const sixDigitMatch = trimmed.match(/^(\d{6})\s*-\s*(.+)$/);
    if (sixDigitMatch) {
      return {
        jobNumber: sixDigitMatch[1],
        jobName: sixDigitMatch[2].trim(),
      };
    }

    // Try pattern: just 6 digits at start
    const numMatch = trimmed.match(/^(\d{6})/);
    if (numMatch) {
      return {
        jobNumber: numMatch[1],
        jobName: trimmed.replace(/^\d{6}\s*-?\s*/, '').trim() || `Job ${numMatch[1]}`,
      };
    }

    // Try pattern: XX-XXXX anywhere in the name
    const flexMatch = trimmed.match(/(\d{2})-(\d{4})/);
    if (flexMatch) {
      const jobNum = flexMatch[1] + flexMatch[2];
      const nameAfter = trimmed.replace(/\d{2}-\d{4}\s*-?\s*/, '').trim();
      return {
        jobNumber: jobNum,
        jobName: nameAfter || `Job ${jobNum}`,
      };
    }

    return null;
  };

  const handleImport = async () => {
    if (!folderListText.trim()) {
      Alert.alert('No Input', 'Please paste a list of folder names to import.');
      return;
    }

    setResult({
      status: 'processing',
      message: 'Processing folder list...',
      projectsFound: 0,
      projectsCreated: 0,
      projectsSkipped: 0,
      errors: [],
    });

    try {
      // Parse each line
      const lines = folderListText.split('\n').filter(line => line.trim());
      const parsedProjects: ParsedProject[] = [];

      for (const line of lines) {
        const parsed = parseJobFolder(line);
        if (parsed) {
          parsedProjects.push({
            ...parsed,
            originalLine: line.trim(),
          });
        }
      }

      setResult(prev => ({
        ...prev,
        projectsFound: parsedProjects.length,
        message: `Found ${parsedProjects.length} valid project folders. Creating projects...`,
      }));

      // Get existing job numbers (to skip duplicates)
      const existingJobNumbers = new Set(projects.map(p => p.jobNumber));

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const parsed of parsedProjects) {
        // IMPORTANT: Only create if doesn't exist - never modify existing
        if (existingJobNumbers.has(parsed.jobNumber)) {
          skipped++;
          continue;
        }

        try {
          await addProject({
            jobNumber: parsed.jobNumber,
            jobName: parsed.jobName,
            pieceCountByType: [],
            createdBy: currentUser?.email || 'bulk-import',
          });
          created++;
          existingJobNumbers.add(parsed.jobNumber); // Track newly created ones too

          setResult(prev => ({
            ...prev,
            projectsCreated: created,
            projectsSkipped: skipped,
            message: `Creating projects... ${created} created, ${skipped} skipped`,
          }));

          // Small delay to avoid overwhelming Firebase
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          errors.push(`Failed to create ${parsed.jobNumber}: ${error}`);
        }
      }

      setResult({
        status: 'complete',
        message: `Import complete! Created ${created} new projects.`,
        projectsFound: parsedProjects.length,
        projectsCreated: created,
        projectsSkipped: skipped,
        errors,
      });

    } catch (error) {
      setResult(prev => ({
        ...prev,
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  const handleClear = () => {
    setFolderListText('');
    setResult({
      status: 'idle',
      message: '',
      projectsFound: 0,
      projectsCreated: 0,
      projectsSkipped: 0,
      errors: [],
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Bulk Import Projects</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          {/* Info Card */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-blue-900 mb-2">
                  How to Import Projects
                </Text>
                <Text className="text-sm text-blue-800 mb-2">
                  1. On your computer, get a folder listing:
                </Text>
                <View className="bg-blue-100 rounded p-2 mb-2">
                  <Text className="text-xs font-mono text-blue-900">Windows: dir /b "path\to\2025"</Text>
                  <Text className="text-xs font-mono text-blue-900">Mac/Linux: ls "path/to/2025"</Text>
                </View>
                <Text className="text-sm text-blue-800 mb-2">
                  2. Copy the folder names and paste below
                </Text>
                <Text className="text-sm text-blue-800">
                  3. Projects will be created (existing ones are skipped)
                </Text>
              </View>
            </View>
          </View>

          {/* Important Note */}
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              <View className="flex-1 ml-2">
                <Text className="text-sm font-semibold text-amber-900">Safe Import</Text>
                <Text className="text-xs text-amber-800 mt-1">
                  This only creates NEW projects. Existing projects are never modified or deleted.
                </Text>
              </View>
            </View>
          </View>

          {/* Expected Format */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-500 mb-2">EXPECTED FORMAT</Text>
            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-xs font-mono text-gray-700">26-6000 - Main Street Building</Text>
              <Text className="text-xs font-mono text-gray-700">26-6001 - City Hall Renovation</Text>
              <Text className="text-xs font-mono text-gray-700">26-6002 - Hospital Wing Addition</Text>
              <Text className="text-xs font-mono text-gray-500 mt-2">↓ Converts to ↓</Text>
              <Text className="text-xs font-mono text-green-700 mt-1">Job #266000: Main Street Building</Text>
              <Text className="text-xs font-mono text-green-700">Job #266001: City Hall Renovation</Text>
              <Text className="text-xs font-mono text-green-700">Job #266002: Hospital Wing Addition</Text>
            </View>
          </View>

          {/* Input Area */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-500 mb-2">PASTE FOLDER NAMES</Text>
            <TextInput
              value={folderListText}
              onChangeText={setFolderListText}
              placeholder="Paste folder names here, one per line..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 min-h-[200px]"
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-gray-500">
                {folderListText.split('\n').filter(l => l.trim()).length} lines
              </Text>
              {folderListText.length > 0 && (
                <Pressable onPress={handleClear}>
                  <Text className="text-xs text-red-600 font-medium">Clear</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Result Card */}
          {result.status !== 'idle' && (
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <View className="items-center py-2">
                {result.status === 'processing' ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : result.status === 'complete' ? (
                  <Ionicons name="checkmark-circle" size={32} color="#059669" />
                ) : (
                  <Ionicons name="alert-circle" size={32} color="#DC2626" />
                )}
                <Text className="text-sm font-medium text-gray-900 mt-2 text-center">
                  {result.message}
                </Text>
              </View>

              {result.projectsFound > 0 && (
                <View className="border-t border-gray-100 pt-3 mt-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-500">Projects Found</Text>
                    <Text className="text-sm font-semibold text-gray-900">{result.projectsFound}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-500">New Projects Created</Text>
                    <Text className="text-sm font-semibold text-green-600">{result.projectsCreated}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Already Existed (Skipped)</Text>
                    <Text className="text-sm font-semibold text-gray-500">{result.projectsSkipped}</Text>
                  </View>
                </View>
              )}

              {result.errors.length > 0 && (
                <View className="border-t border-gray-100 pt-3 mt-3">
                  <Text className="text-sm font-semibold text-red-600 mb-1">Errors</Text>
                  {result.errors.slice(0, 5).map((error, i) => (
                    <Text key={i} className="text-xs text-red-500">• {error}</Text>
                  ))}
                  {result.errors.length > 5 && (
                    <Text className="text-xs text-red-400">...and {result.errors.length - 5} more</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <Pressable
            onPress={handleImport}
            disabled={result.status === 'processing' || !folderListText.trim()}
            className={`py-4 rounded-xl items-center ${
              result.status === 'processing' || !folderListText.trim()
                ? 'bg-gray-300'
                : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                {result.status === 'processing' ? 'Importing...' : 'Import Projects'}
              </Text>
            </View>
          </Pressable>

          {result.status === 'complete' && (
            <Pressable
              onPress={() => navigation.goBack()}
              className="py-4 rounded-xl items-center bg-gray-100 border border-gray-300"
            >
              <Text className="text-gray-700 font-semibold text-base">Done</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
