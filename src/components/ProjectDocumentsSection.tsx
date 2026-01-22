import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { ProjectDocument, ProjectDocuments } from '../types/project-library';

type DocumentCategoryKey = 'pieceTickets' | 'layout' | 'embeds' | 'projectManagement' | 'engineering';

interface CategoryConfig {
  key: DocumentCategoryKey;
  label: string;
  icon: string;
  color: string;
}

interface MainCategoryConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  subcategories?: CategoryConfig[];
}

const DOCUMENT_CATEGORIES: MainCategoryConfig[] = [
  {
    key: 'drawings',
    label: 'Drawings',
    icon: 'document-text',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    subcategories: [
      { key: 'pieceTickets', label: 'Piece Tickets', icon: 'ticket-outline', color: '#3B82F6' },
      { key: 'layout', label: 'Layout', icon: 'grid-outline', color: '#3B82F6' },
      { key: 'embeds', label: 'Embeds', icon: 'cube-outline', color: '#3B82F6' },
    ],
  },
  {
    key: 'projectManagement',
    label: 'Project Management',
    icon: 'briefcase',
    color: '#059669',
    bgColor: 'bg-emerald-50',
  },
  {
    key: 'engineering',
    label: 'Engineering',
    icon: 'construct',
    color: '#7C3AED',
    bgColor: 'bg-purple-50',
  },
];

interface ProjectDocumentsSectionProps {
  projectId: string;
  documents: ProjectDocuments;
  userEmail: string;
  onAddDocument: (category: DocumentCategoryKey, doc: ProjectDocument) => Promise<void>;
  onRemoveDocument: (category: DocumentCategoryKey, docId: string) => Promise<void>;
}

export default function ProjectDocumentsSection({
  projectId,
  documents,
  userEmail,
  onAddDocument,
  onRemoveDocument,
}: ProjectDocumentsSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<DocumentCategoryKey | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const getDocumentCount = (category: MainCategoryConfig): number => {
    if (category.subcategories) {
      return category.subcategories.reduce((sum, sub) => {
        return sum + (documents[sub.key]?.length || 0);
      }, 0);
    }
    return documents[category.key as DocumentCategoryKey]?.length || 0;
  };

  const handleUpload = async (category: DocumentCategoryKey) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        setUploadProgress(`Uploading ${i + 1} of ${result.assets.length}...`);

        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();

          const timestamp = Date.now();
          const sanitizedName = asset.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `project-blueprints/${projectId}/${category}/${timestamp}_${sanitizedName}`;
          const storageRef = ref(storage, filename);

          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);

          const doc: ProjectDocument = {
            id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            name: asset.name,
            url: downloadUrl,
            fileSize: asset.size,
            uploadedAt: timestamp,
            uploadedBy: userEmail,
          };

          await onAddDocument(category, doc);
        } catch (error) {
          console.error('Error uploading document:', error);
          Alert.alert('Upload Error', `Failed to upload ${asset.name}`);
        }
      }

      setUploading(false);
      setUploadProgress(null);
    } catch (error) {
      console.error('Error picking document:', error);
      setUploading(false);
      setUploadProgress(null);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleTakePhoto = async (category: DocumentCategoryKey) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      setUploadProgress('Uploading photo...');

      const asset = result.assets[0];

      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const timestamp = Date.now();
        const filename = `project-blueprints/${projectId}/${category}/${timestamp}_photo.jpg`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        const doc: ProjectDocument = {
          id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
          name: `Photo ${new Date().toLocaleDateString()}.jpg`,
          url: downloadUrl,
          fileSize: asset.fileSize,
          uploadedAt: timestamp,
          uploadedBy: userEmail,
        };

        await onAddDocument(category, doc);
      } catch (error) {
        console.error('Error uploading photo:', error);
        Alert.alert('Upload Error', 'Failed to upload photo');
      }

      setUploading(false);
      setUploadProgress(null);
    } catch (error) {
      console.error('Error taking photo:', error);
      setUploading(false);
      setUploadProgress(null);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemove = (category: DocumentCategoryKey, doc: ProjectDocument) => {
    Alert.alert(
      'Remove Document',
      `Are you sure you want to remove "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveDocument(category, doc.id),
        },
      ]
    );
  };

  const handleView = (doc: ProjectDocument) => {
    Linking.openURL(doc.url).catch(() => {
      Alert.alert('Error', 'Unable to open document');
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'document-text';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    return 'document';
  };

  const renderDocumentList = (category: DocumentCategoryKey, categoryDocs: ProjectDocument[]) => (
    <View className="mt-3 gap-2">
      {categoryDocs.map((doc) => (
        <Pressable
          key={doc.id}
          onPress={() => handleView(doc)}
          className="flex-row items-center bg-white rounded-lg p-3 border border-gray-200 active:bg-gray-50"
        >
          <View className="w-9 h-9 bg-gray-100 rounded-lg items-center justify-center mr-3">
            <Ionicons name={getFileIcon(doc.name) as any} size={18} color="#6B7280" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
              {doc.name}
            </Text>
            <Text className="text-xs text-gray-500">
              {new Date(doc.uploadedAt).toLocaleDateString()}
              {doc.fileSize ? ` • ${formatFileSize(doc.fileSize)}` : ''}
            </Text>
          </View>
          <Pressable onPress={() => handleRemove(category, doc)} className="p-2">
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );

  const renderUploadButtons = (category: DocumentCategoryKey) => (
    <View className="flex-row gap-2 mt-3">
      <Pressable
        onPress={() => handleUpload(category)}
        disabled={uploading}
        className="flex-1 flex-row items-center justify-center bg-gray-100 rounded-lg py-2 px-3 active:bg-gray-200"
      >
        <Ionicons name="cloud-upload-outline" size={18} color="#374151" />
        <Text className="text-sm font-medium text-gray-700 ml-2">Upload</Text>
      </Pressable>
      <Pressable
        onPress={() => handleTakePhoto(category)}
        disabled={uploading}
        className="flex-row items-center justify-center bg-gray-100 rounded-lg py-2 px-3 active:bg-gray-200"
      >
        <Ionicons name="camera-outline" size={18} color="#374151" />
      </Pressable>
    </View>
  );

  const renderSubcategory = (sub: CategoryConfig, isLast: boolean) => {
    const categoryDocs = documents[sub.key] || [];
    const isExpanded = expandedSubcategory === sub.key;

    return (
      <View key={sub.key} className={`${!isLast ? 'border-b border-gray-100' : ''}`}>
        <Pressable
          onPress={() => setExpandedSubcategory(isExpanded ? null : sub.key)}
          className="flex-row items-center py-3 px-2"
        >
          <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name={sub.icon as any} size={16} color={sub.color} />
          </View>
          <Text className="flex-1 text-sm font-medium text-gray-800">{sub.label}</Text>
          {categoryDocs.length > 0 && (
            <View className="bg-blue-100 px-2 py-0.5 rounded-full mr-2">
              <Text className="text-xs font-semibold text-blue-700">{categoryDocs.length}</Text>
            </View>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#9CA3AF"
          />
        </Pressable>

        {isExpanded && (
          <View className="pb-3 px-2">
            {uploading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-sm text-gray-500 mt-2">{uploadProgress || 'Uploading...'}</Text>
              </View>
            ) : (
              <>
                {categoryDocs.length > 0 && renderDocumentList(sub.key, categoryDocs)}
                {renderUploadButtons(sub.key)}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMainCategory = (category: MainCategoryConfig) => {
    const isExpanded = expandedCategory === category.key;
    const docCount = getDocumentCount(category);
    const categoryDocs = !category.subcategories
      ? documents[category.key as DocumentCategoryKey] || []
      : [];

    return (
      <View key={category.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
        <Pressable
          onPress={() => {
            setExpandedCategory(isExpanded ? null : category.key);
            setExpandedSubcategory(null);
          }}
          className={`flex-row items-center p-4 ${category.bgColor}`}
        >
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Ionicons name={category.icon as any} size={22} color={category.color} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{category.label}</Text>
            {docCount > 0 && (
              <Text className="text-xs text-gray-500">{docCount} document{docCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#6B7280"
          />
        </Pressable>

        {isExpanded && (
          <View className="border-t border-gray-100">
            {category.subcategories ? (
              <View className="px-2 py-1">
                {category.subcategories.map((sub, index) =>
                  renderSubcategory(sub, index === category.subcategories!.length - 1)
                )}
              </View>
            ) : (
              <View className="p-4">
                {uploading ? (
                  <View className="items-center py-4">
                    <ActivityIndicator size="small" color={category.color} />
                    <Text className="text-sm text-gray-500 mt-2">{uploadProgress || 'Uploading...'}</Text>
                  </View>
                ) : (
                  <>
                    {categoryDocs.length > 0 && renderDocumentList(category.key as DocumentCategoryKey, categoryDocs)}
                    {renderUploadButtons(category.key as DocumentCategoryKey)}
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View>
      <Text className="text-sm font-semibold text-gray-500 mb-3">DOCUMENTS</Text>
      {DOCUMENT_CATEGORIES.map(renderMainCategory)}
    </View>
  );
}
