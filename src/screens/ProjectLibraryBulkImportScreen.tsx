import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { useProjectLibraryStore } from '../state/projectLibraryStore';
import { useAuthStore } from '../state/authStore';
import { ProjectDocument, ProjectDocuments } from '../types/project-library';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectLibraryBulkImport'>;

// Category mapping based on folder names
const FOLDER_CATEGORY_MAP: Record<string, keyof ProjectDocuments> = {
  'documents': 'engineering',
  'engineering': 'engineering',
  'layout dwgs': 'layout',
  'layout drawings': 'layout',
  'layout': 'layout',
  'pieces dwgs': 'pieceTickets',
  'piece dwgs': 'pieceTickets',
  'piece drawings': 'pieceTickets',
  'piece tickets': 'pieceTickets',
  'piecetickets': 'pieceTickets',
  'project management': 'projectManagement',
  'pm': 'projectManagement',
  'embeds': 'embeds',
  'embed dwgs': 'embeds',
  'embed drawings': 'embeds',
};

interface ImportProgress {
  status: 'idle' | 'reading' | 'processing' | 'uploading' | 'complete' | 'error';
  message: string;
  totalFiles: number;
  processedFiles: number;
  projectsFound: number;
  projectsCreated: number;
  filesUploaded: number;
  errors: string[];
}

interface ParsedFile {
  file: File;
  path: string;
  jobNumber: string;
  jobName: string;
  category: keyof ProjectDocuments;
}

export default function ProjectLibraryBulkImportScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    message: 'Select a ZIP file to import',
    totalFiles: 0,
    processedFiles: 0,
    projectsFound: 0,
    projectsCreated: 0,
    filesUploaded: 0,
    errors: [],
  });

  const projects = useProjectLibraryStore((s) => s.projects);
  const addProject = useProjectLibraryStore((s) => s.addProject);
  const addDocument = useProjectLibraryStore((s) => s.addDocument);
  const currentUser = useAuthStore((s) => s.currentUser);

  // Parse job number and name from folder name (e.g., "255096 - Project Name")
  const parseJobFolder = (folderName: string): { jobNumber: string; jobName: string } | null => {
    // Try pattern: "123456 - Project Name" or "123456- Project Name" or "123456 -Project Name"
    const match = folderName.match(/^(\d{6})\s*-\s*(.+)$/);
    if (match) {
      return {
        jobNumber: match[1],
        jobName: match[2].trim(),
      };
    }

    // Try pattern: just 6 digits at start
    const numMatch = folderName.match(/^(\d{6})/);
    if (numMatch) {
      return {
        jobNumber: numMatch[1],
        jobName: folderName.replace(/^\d{6}\s*-?\s*/, '').trim() || `Job ${numMatch[1]}`,
      };
    }

    return null;
  };

  // Determine category from path
  const getCategoryFromPath = (path: string): keyof ProjectDocuments | null => {
    const pathLower = path.toLowerCase();
    const parts = pathLower.split('/');

    for (const part of parts) {
      const cleanPart = part.trim();
      if (FOLDER_CATEGORY_MAP[cleanPart]) {
        return FOLDER_CATEGORY_MAP[cleanPart];
      }
    }

    // Check if any part contains category keywords
    for (const part of parts) {
      if (part.includes('layout')) return 'layout';
      if (part.includes('piece') || part.includes('ticket')) return 'pieceTickets';
      if (part.includes('embed')) return 'embeds';
      if (part.includes('pm') || part.includes('management')) return 'projectManagement';
      if (part.includes('engineering') || part.includes('document')) return 'engineering';
    }

    return null;
  };

  // Find job info from path
  const findJobInfoFromPath = (path: string): { jobNumber: string; jobName: string } | null => {
    const parts = path.split('/');

    for (const part of parts) {
      const jobInfo = parseJobFolder(part);
      if (jobInfo) {
        return jobInfo;
      }
    }

    return null;
  };

  const handleSelectZip = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed', 'application/x-zip'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const zipFile = result.assets[0];

      setProgress({
        status: 'reading',
        message: 'Reading ZIP file...',
        totalFiles: 0,
        processedFiles: 0,
        projectsFound: 0,
        projectsCreated: 0,
        filesUploaded: 0,
        errors: [],
      });

      // For web, we can use JSZip to process the file
      if (Platform.OS === 'web') {
        await processZipFile(zipFile);
      } else {
        // For mobile, we need a different approach - show message
        Alert.alert(
          'ZIP Import',
          'For best results with large folder imports, please use the web version of this app. Mobile ZIP processing has limitations.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setProgress(prev => ({ ...prev, status: 'idle', message: 'Select a ZIP file to import' })) },
            { text: 'Continue Anyway', onPress: () => processZipFile(zipFile) },
          ]
        );
      }
    } catch (error) {
      console.error('Error selecting ZIP:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  const processZipFile = async (zipFile: DocumentPicker.DocumentPickerAsset) => {
    try {
      setProgress(prev => ({ ...prev, message: 'Loading ZIP file...' }));

      const response = await fetch(zipFile.uri);
      const arrayBuffer = await response.arrayBuffer();

      setProgress(prev => ({ ...prev, message: 'Extracting ZIP contents...' }));

      const zip = await JSZip.loadAsync(arrayBuffer);

      // Collect all files and their paths
      const files: { path: string; file: JSZip.JSZipObject }[] = [];

      zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
        if (!file.dir && !relativePath.startsWith('__MACOSX') && !relativePath.includes('.DS_Store')) {
          files.push({ path: relativePath, file });
        }
      });

      setProgress(prev => ({
        ...prev,
        status: 'processing',
        message: `Found ${files.length} files. Analyzing structure...`,
        totalFiles: files.length,
      }));

      // Parse files and group by project
      const projectFiles: Map<string, ParsedFile[]> = new Map();
      const projectInfo: Map<string, { jobNumber: string; jobName: string }> = new Map();

      for (const { path, file } of files) {
        const jobInfo = findJobInfoFromPath(path);
        const category = getCategoryFromPath(path);

        if (jobInfo && category) {
          const key = jobInfo.jobNumber;

          if (!projectFiles.has(key)) {
            projectFiles.set(key, []);
            projectInfo.set(key, jobInfo);
          }

          const blob = await file.async('blob');
          const fileName = path.split('/').pop() || 'file';
          const fileObj = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

          projectFiles.get(key)!.push({
            file: fileObj,
            path,
            jobNumber: jobInfo.jobNumber,
            jobName: jobInfo.jobName,
            category,
          });
        }
      }

      const projectCount = projectFiles.size;

      setProgress(prev => ({
        ...prev,
        projectsFound: projectCount,
        message: `Found ${projectCount} projects. Starting upload...`,
        status: 'uploading',
      }));

      // Process each project
      let projectsCreated = 0;
      let filesUploaded = 0;
      const errors: string[] = [];

      for (const [jobNumber, parsedFiles] of projectFiles) {
        const info = projectInfo.get(jobNumber)!;

        // Check if project exists
        let existingProject = projects.find(p => p.jobNumber === jobNumber);

        if (!existingProject) {
          // Create new project
          try {
            await addProject({
              jobNumber: info.jobNumber,
              jobName: info.jobName,
              pieceCountByType: [],
              createdBy: currentUser?.email || 'bulk-import',
            });
            projectsCreated++;

            // Wait a moment for the store to update
            await new Promise(resolve => setTimeout(resolve, 100));

            // Re-fetch the project
            existingProject = useProjectLibraryStore.getState().projects.find(p => p.jobNumber === jobNumber);
          } catch (error) {
            errors.push(`Failed to create project ${jobNumber}: ${error}`);
            continue;
          }
        }

        if (!existingProject) {
          errors.push(`Could not find or create project ${jobNumber}`);
          continue;
        }

        // Upload files for this project
        for (const parsedFile of parsedFiles) {
          try {
            setProgress(prev => ({
              ...prev,
              message: `Uploading: ${parsedFile.file.name}`,
              processedFiles: prev.processedFiles + 1,
            }));

            const timestamp = Date.now();
            const sanitizedName = parsedFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `project-blueprints/${existingProject.id}/${parsedFile.category}/${timestamp}_${sanitizedName}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, parsedFile.file);
            const downloadUrl = await getDownloadURL(storageRef);

            const doc: ProjectDocument = {
              id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
              name: parsedFile.file.name,
              url: downloadUrl,
              fileSize: parsedFile.file.size,
              uploadedAt: timestamp,
              uploadedBy: currentUser?.email || 'bulk-import',
            };

            await addDocument(existingProject.id, parsedFile.category, doc);
            filesUploaded++;

            setProgress(prev => ({
              ...prev,
              filesUploaded,
              projectsCreated,
            }));
          } catch (error) {
            errors.push(`Failed to upload ${parsedFile.file.name}: ${error}`);
          }
        }
      }

      setProgress(prev => ({
        ...prev,
        status: 'complete',
        message: `Import complete! Created ${projectsCreated} projects, uploaded ${filesUploaded} files.`,
        errors,
      }));

    } catch (error) {
      console.error('Error processing ZIP:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: `Error processing ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'complete': return '#059669';
      case 'error': return '#DC2626';
      case 'idle': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'complete': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'idle': return 'cloud-upload-outline';
      default: return 'sync';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Bulk Import</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1">
        <View className="p-4 gap-4">
          {/* Info Card */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-blue-900 mb-2">
                  How Bulk Import Works
                </Text>
                <Text className="text-sm text-blue-800 mb-2">
                  1. ZIP your year folder (e.g., "2026.zip")
                </Text>
                <Text className="text-sm text-blue-800 mb-2">
                  2. The importer will scan for project folders
                </Text>
                <Text className="text-sm text-blue-800 mb-2">
                  3. Files are categorized based on folder names:
                </Text>
                <View className="ml-4">
                  <Text className="text-xs text-blue-700">• "Layout Dwgs" → Layout</Text>
                  <Text className="text-xs text-blue-700">• "Pieces Dwgs" → Piece Tickets</Text>
                  <Text className="text-xs text-blue-700">• "Documents" → Engineering</Text>
                  <Text className="text-xs text-blue-700">• "Project Management" → PM</Text>
                  <Text className="text-xs text-blue-700">• "Embeds" → Embeds</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Expected Structure */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-500 mb-3">EXPECTED FOLDER STRUCTURE</Text>
            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-xs font-mono text-gray-700">2026/</Text>
              <Text className="text-xs font-mono text-gray-700">├── Documents/</Text>
              <Text className="text-xs font-mono text-gray-600">│   ├── 255096 - Project Name/</Text>
              <Text className="text-xs font-mono text-gray-500">│   │   └── ... files</Text>
              <Text className="text-xs font-mono text-gray-700">├── Layout Dwgs/</Text>
              <Text className="text-xs font-mono text-gray-600">│   ├── 255096 - Project Name/</Text>
              <Text className="text-xs font-mono text-gray-500">│   │   └── ... files</Text>
              <Text className="text-xs font-mono text-gray-700">├── Pieces Dwgs/</Text>
              <Text className="text-xs font-mono text-gray-600">│   ├── 255096 - Project Name/</Text>
              <Text className="text-xs font-mono text-gray-500">│   │   └── ... files</Text>
              <Text className="text-xs font-mono text-gray-700">└── Project Management/</Text>
              <Text className="text-xs font-mono text-gray-600">    └── 255096 - Project Name/</Text>
            </View>
          </View>

          {/* Status Card */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <View className="items-center py-4">
              {progress.status === 'reading' || progress.status === 'processing' || progress.status === 'uploading' ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : (
                <Ionicons name={getStatusIcon() as any} size={48} color={getStatusColor()} />
              )}
              <Text className="text-base font-medium text-gray-900 mt-3 text-center">
                {progress.message}
              </Text>
            </View>

            {/* Progress Stats */}
            {progress.status !== 'idle' && (
              <View className="border-t border-gray-100 pt-4 mt-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-500">Projects Found</Text>
                  <Text className="text-sm font-semibold text-gray-900">{progress.projectsFound}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-500">Projects Created</Text>
                  <Text className="text-sm font-semibold text-gray-900">{progress.projectsCreated}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-500">Files Processed</Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {progress.processedFiles} / {progress.totalFiles}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-500">Files Uploaded</Text>
                  <Text className="text-sm font-semibold text-gray-900">{progress.filesUploaded}</Text>
                </View>
              </View>
            )}

            {/* Errors */}
            {progress.errors.length > 0 && (
              <View className="border-t border-gray-100 pt-4 mt-4">
                <Text className="text-sm font-semibold text-red-600 mb-2">Errors ({progress.errors.length})</Text>
                <ScrollView className="max-h-32">
                  {progress.errors.slice(0, 10).map((error, index) => (
                    <Text key={index} className="text-xs text-red-500 mb-1">• {error}</Text>
                  ))}
                  {progress.errors.length > 10 && (
                    <Text className="text-xs text-red-400">...and {progress.errors.length - 10} more</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Action Button */}
          <Pressable
            onPress={handleSelectZip}
            disabled={progress.status === 'reading' || progress.status === 'processing' || progress.status === 'uploading'}
            className={`py-4 rounded-xl items-center ${
              progress.status === 'reading' || progress.status === 'processing' || progress.status === 'uploading'
                ? 'bg-gray-300'
                : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name={progress.status === 'complete' ? 'refresh' : 'folder-open'}
                size={20}
                color="white"
              />
              <Text className="text-white font-semibold text-base ml-2">
                {progress.status === 'complete' ? 'Import Another ZIP' : 'Select ZIP File'}
              </Text>
            </View>
          </Pressable>

          {/* Done Button */}
          {progress.status === 'complete' && (
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
