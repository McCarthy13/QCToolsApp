import React from 'react';
import { View, Text, Pressable, Image, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface PhotoAttachmentsProps {
  photoUris: string[];
  onPhotosChange: (uris: string[]) => void;
  maxPhotos?: number;
}

export const PhotoAttachments: React.FC<PhotoAttachmentsProps> = ({
  photoUris,
  onPhotosChange,
  maxPhotos = 10,
}) => {
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to add photos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (photoUris.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: maxPhotos - photoUris.length,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => asset.uri);
      onPhotosChange([...photoUris, ...newUris]);
    }
  };

  const takePhoto = async () => {
    if (photoUris.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera access to take photos.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      onPhotosChange([...photoUris, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    const newUris = photoUris.filter((_, i) => i !== index);
    onPhotosChange(newUris);
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose a photo source',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium text-gray-700">
          Photos ({photoUris.length}/{maxPhotos})
        </Text>
        {photoUris.length < maxPhotos && (
          <Pressable
            onPress={showPhotoOptions}
            className="bg-blue-600 rounded-full px-3 py-1.5 flex-row items-center active:bg-blue-700"
          >
            <Ionicons name="camera" size={16} color="white" />
            <Text className="text-white text-xs font-semibold ml-1">Add Photo</Text>
          </Pressable>
        )}
      </View>

      {photoUris.length === 0 ? (
        <View className="bg-gray-100 rounded-lg p-6 items-center justify-center border-2 border-dashed border-gray-300">
          <Ionicons name="images-outline" size={40} color="#9ca3af" />
          <Text className="text-sm text-gray-600 mt-2">No photos attached</Text>
          <Text className="text-xs text-gray-500 mt-1">Tap "Add Photo" to attach images</Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerStyle={{ gap: 8 }}
        >
          {photoUris.map((uri, index) => (
            <View key={index} className="relative">
              <Image
                source={{ uri }}
                className="w-24 h-24 rounded-lg"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 shadow-lg active:bg-red-700"
              >
                <Ionicons name="close" size={16} color="white" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
