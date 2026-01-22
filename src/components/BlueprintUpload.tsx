import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Blueprint } from '../types/project-library';

interface BlueprintUploadProps {
  projectId: string;
  blueprints: Blueprint[];
  userEmail: string;
  onAddBlueprint: (blueprint: Blueprint) => Promise<void>;
  onRemoveBlueprint: (blueprintId: string) => Promise<void>;
  editable?: boolean;
}

export default function BlueprintUpload({
  projectId,
  blueprints,
  userEmail,
  onAddBlueprint,
  onRemoveBlueprint,
  editable = true,
}: BlueprintUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handlePickDocument = async () => {
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
          const filename = `project-blueprints/${projectId}/${timestamp}_${sanitizedName}`;
          const storageRef = ref(storage, filename);

          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);

          const blueprint: Blueprint = {
            id: `blueprint-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            name: asset.name,
            url: downloadUrl,
            fileSize: asset.size,
            uploadedAt: timestamp,
            uploadedBy: userEmail,
          };

          await onAddBlueprint(blueprint);
        } catch (error) {
          console.error('Error uploading blueprint:', error);
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

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
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
          const extension = asset.uri.split('.').pop() || 'jpg';
          const filename = `project-blueprints/${projectId}/${timestamp}_blueprint.${extension}`;
          const storageRef = ref(storage, filename);

          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);

          const blueprint: Blueprint = {
            id: `blueprint-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            name: `Blueprint ${i + 1}.${extension}`,
            url: downloadUrl,
            fileSize: asset.fileSize,
            uploadedAt: timestamp,
            uploadedBy: userEmail,
          };

          await onAddBlueprint(blueprint);
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Upload Error', `Failed to upload image ${i + 1}`);
        }
      }

      setUploading(false);
      setUploadProgress(null);
    } catch (error) {
      console.error('Error picking image:', error);
      setUploading(false);
      setUploadProgress(null);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
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
        const filename = `project-blueprints/${projectId}/${timestamp}_photo.jpg`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        const blueprint: Blueprint = {
          id: `blueprint-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
          name: `Blueprint Photo ${new Date().toLocaleDateString()}.jpg`,
          url: downloadUrl,
          fileSize: asset.fileSize,
          uploadedAt: timestamp,
          uploadedBy: userEmail,
        };

        await onAddBlueprint(blueprint);
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

  const handleRemoveBlueprint = (blueprint: Blueprint) => {
    Alert.alert(
      'Remove Blueprint',
      `Are you sure you want to remove "${blueprint.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to delete from storage (may fail if URL format changed)
              try {
                const storageRef = ref(storage, blueprint.url);
                await deleteObject(storageRef);
              } catch {
                // Ignore storage deletion errors
              }
              await onRemoveBlueprint(blueprint.id);
            } catch (error) {
              console.error('Error removing blueprint:', error);
              Alert.alert('Error', 'Failed to remove blueprint');
            }
          },
        },
      ]
    );
  };

  const handleViewBlueprint = (blueprint: Blueprint) => {
    Linking.openURL(blueprint.url).catch(() => {
      Alert.alert('Error', 'Unable to open blueprint');
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

  return (
    <View className="bg-white rounded-xl p-4 border border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-gray-500">BLUEPRINTS & DRAWINGS</Text>
        {blueprints.length > 0 && (
          <View className="bg-blue-100 px-2 py-1 rounded">
            <Text className="text-xs font-bold text-blue-700">{blueprints.length} files</Text>
          </View>
        )}
      </View>

      {/* Existing Blueprints */}
      {blueprints.length > 0 && (
        <View className="gap-2 mb-4">
          {blueprints.map((blueprint) => (
            <Pressable
              key={blueprint.id}
              onPress={() => handleViewBlueprint(blueprint)}
              className="flex-row items-center bg-gray-50 rounded-lg p-3 active:bg-gray-100"
            >
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name={getFileIcon(blueprint.name) as any} size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                  {blueprint.name}
                </Text>
                <Text className="text-xs text-gray-500">
                  {new Date(blueprint.uploadedAt).toLocaleDateString()}
                  {blueprint.fileSize ? ` • ${formatFileSize(blueprint.fileSize)}` : ''}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => handleViewBlueprint(blueprint)}
                  className="p-2"
                >
                  <Ionicons name="open-outline" size={18} color="#6B7280" />
                </Pressable>
                {editable && (
                  <Pressable
                    onPress={() => handleRemoveBlueprint(blueprint)}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Upload Section */}
      {editable && (
        <View className="border-t border-gray-200 pt-3">
          {uploading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text className="text-sm text-gray-500 mt-2">{uploadProgress || 'Uploading...'}</Text>
            </View>
          ) : (
            <View>
              <Text className="text-xs font-semibold text-gray-500 mb-2">ADD BLUEPRINTS</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={handlePickDocument}
                  className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-3 items-center active:bg-blue-100"
                >
                  <Ionicons name="document-outline" size={20} color="#3B82F6" />
                  <Text className="text-xs font-medium text-blue-700 mt-1">PDF/File</Text>
                </Pressable>
                <Pressable
                  onPress={handlePickImage}
                  className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-3 items-center active:bg-blue-100"
                >
                  <Ionicons name="images-outline" size={20} color="#3B82F6" />
                  <Text className="text-xs font-medium text-blue-700 mt-1">Gallery</Text>
                </Pressable>
                {Platform.OS !== 'web' && (
                  <Pressable
                    onPress={handleTakePhoto}
                    className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-3 items-center active:bg-blue-100"
                  >
                    <Ionicons name="camera-outline" size={20} color="#3B82F6" />
                    <Text className="text-xs font-medium text-blue-700 mt-1">Camera</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {!editable && blueprints.length === 0 && (
        <Text className="text-gray-400 text-sm italic">No blueprints uploaded</Text>
      )}
    </View>
  );
}
