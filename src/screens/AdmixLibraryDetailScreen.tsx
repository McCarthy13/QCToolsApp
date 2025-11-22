import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmixLibraryStore } from '../state/admixLibraryStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdmixLibraryDetail'>;
  route: RouteProp<RootStackParamList, 'AdmixLibraryDetail'>;
};

const AdmixLibraryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { admixId } = route.params;
  const { getAdmix, deleteAdmix, isAdmixComplete, toggleFavorite, duplicateAdmix, trackAccess } = useAdmixLibraryStore();
  
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  
  const admix = getAdmix(admixId);

  // Track access when viewing
  React.useEffect(() => {
    if (admixId) {
      trackAccess(admixId);
    }
  }, [admixId, trackAccess]);

  if (!admix) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-8">
        <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
        <Text className="text-lg text-gray-600 mt-4 text-center">
          Admixture not found
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-6 bg-blue-600 rounded-lg px-6 py-3 active:bg-blue-700"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isComplete = isAdmixComplete(admixId);

  const handleEdit = () => {
    navigation.navigate('AdmixLibraryAddEdit', { admixId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Admixture',
      `Are you sure you want to delete "${admix.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAdmix(admixId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleOpenUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  const handleCallPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailSalesRep = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleDuplicate = async () => {
    const duplicated = await duplicateAdmix(admixId);
    if (duplicated) {
      Alert.alert(
        'Duplicate Created',
        `"${duplicated.name}" has been created. Would you like to edit it now?`,
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => navigation.replace('AdmixLibraryAddEdit', { admixId: duplicated.id }),
          },
        ]
      );
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(admixId);
  };

  const renderField = (label: string, value: string | number | null | undefined, unit?: string) => {
    if (value === null || value === undefined) return null;
    
    return (
      <View className="mb-3">
        <Text className="text-xs text-gray-500 mb-0.5">{label}</Text>
        <Text className="text-base text-gray-900 font-medium">
          {value}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
    );
  };

  const renderSection = (title: string, content: React.ReactNode, isEmpty?: boolean) => {
    if (isEmpty) return null;
    
    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
        <Text className="text-lg font-semibold text-gray-900 mb-3">{title}</Text>
        {content}
      </View>
    );
  };

  const hasOptionalData = !!(
    admix.dosageRateRecommendations ||
    admix.costPerGallon ||
    admix.percentWater ||
    admix.notes
  );

  const hasDataSheets = !!(admix.technicalDataSheetUrl || admix.safetyDataSheetUrl);

  const hasSalesRepInfo = !!(admix.salesRepName || admix.salesRepPhone || admix.salesRepEmail);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header Card */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {admix.name}
              </Text>
              <Text className="text-base text-gray-600">{admix.manufacturer}</Text>
            </View>
            
            {!isComplete && (
              <View className="bg-orange-100 px-3 py-1.5 rounded-lg">
                <Text className="text-xs font-semibold text-orange-700">
                  INCOMPLETE
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3">
            <View className="px-3 py-1.5 rounded-full bg-blue-100">
              <Text className="text-sm font-semibold text-blue-700">
                {admix.class}
              </Text>
            </View>

            {admix.specificGravityDisplay && (
              <View className="px-3 py-1.5 rounded-full bg-gray-100">
                <Text className="text-sm font-semibold text-gray-700">
                  SG: {admix.specificGravityDisplay}
                  {admix.specificGravityDisplay.includes('-') && admix.specificGravity && (
                    <Text className="text-xs text-gray-600"> (avg: {admix.specificGravity.toFixed(3)})</Text>
                  )}
                </Text>
              </View>
            )}
          </View>

          {!isComplete && (
            <View className="mt-4 bg-orange-50 rounded-lg p-3 border border-orange-200">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={18} color="#c2410c" />
                <Text className="flex-1 text-xs text-orange-700 ml-2">
                  This admixture is missing required data. Tap Edit to complete the profile.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="p-4">
          {/* Optional Data */}
          {renderSection(
            'Product Information',
            <>
              {admix.dosageRateRecommendations && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-0.5">Dosage Rate Recommendations</Text>
                  <Text className="text-base text-gray-900">{admix.dosageRateRecommendations}</Text>
                </View>
              )}
              {renderField('Cost Per Gallon', admix.costPerGallon, '$')}
              {renderField('Percent Water', admix.percentWater, '%')}
              {admix.notes && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-0.5">Notes</Text>
                  <Text className="text-base text-gray-900">{admix.notes}</Text>
                </View>
              )}
            </>,
            !hasOptionalData
          )}

          {/* Data Sheets */}
          {renderSection(
            'Technical Documentation',
            <>
              {admix.technicalDataSheetUrl && (
                <Pressable
                  onPress={() => handleOpenUrl(admix.technicalDataSheetUrl!)}
                  className="flex-row items-center justify-between bg-blue-50 rounded-lg p-3 mb-2 active:bg-blue-100"
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="document-text" size={20} color="#2563eb" />
                    <Text className="text-blue-700 font-medium ml-2 flex-1">
                      Technical Data Sheet
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#2563eb" />
                </Pressable>
              )}

              {admix.safetyDataSheetUrl && (
                <Pressable
                  onPress={() => handleOpenUrl(admix.safetyDataSheetUrl!)}
                  className="flex-row items-center justify-between bg-red-50 rounded-lg p-3 active:bg-red-100"
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="shield-checkmark" size={20} color="#dc2626" />
                    <Text className="text-red-700 font-medium ml-2 flex-1">
                      Safety Data Sheet
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#dc2626" />
                </Pressable>
              )}
            </>,
            !hasDataSheets
          )}

          {/* Sales Rep Contact */}
          {renderSection(
            'Sales Representative',
            <>
              {renderField('Name', admix.salesRepName)}
              
              {admix.salesRepPhone && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-0.5">Phone</Text>
                  <Pressable onPress={() => handleCallPhone(admix.salesRepPhone!)}>
                    <Text className="text-base text-blue-600 font-medium">
                      {admix.salesRepPhone}
                    </Text>
                  </Pressable>
                </View>
              )}

              {admix.salesRepEmail && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-0.5">Email</Text>
                  <Pressable onPress={() => handleEmailSalesRep(admix.salesRepEmail!)}>
                    <Text className="text-base text-blue-600 font-medium">
                      {admix.salesRepEmail}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>,
            !hasSalesRepInfo
          )}

          {/* Photo Gallery */}
          {admix.photoUris && admix.photoUris.length > 0 && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Photos</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="flex-row"
                contentContainerStyle={{ gap: 8 }}
              >
                {admix.photoUris.map((uri, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setViewingPhotoIndex(index)}
                    className="relative active:opacity-80"
                  >
                    <Image
                      source={{ uri }}
                      className="w-32 h-32 rounded-lg"
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Metadata */}
          <View className="bg-gray-100 rounded-lg p-3 mt-2">
            <Text className="text-xs text-gray-600">
              Created: {new Date(admix.createdAt).toLocaleDateString()} at {new Date(admix.createdAt).toLocaleTimeString()}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Last Updated: {new Date(admix.updatedAt).toLocaleDateString()} at {new Date(admix.updatedAt).toLocaleTimeString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mt-6 mb-8">
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleEdit}
                className="flex-1 bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700 flex-row justify-center"
              >
                <Ionicons name="pencil" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Edit</Text>
              </Pressable>

              <Pressable
                onPress={handleToggleFavorite}
                className={`rounded-lg px-6 py-4 items-center flex-row ${
                  admix.isFavorite ? 'bg-yellow-500 active:bg-yellow-600' : 'bg-gray-400 active:bg-gray-500'
                }`}
              >
                <Ionicons name={admix.isFavorite ? "star" : "star-outline"} size={20} color="white" />
              </Pressable>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDuplicate}
                className="flex-1 bg-green-600 rounded-lg py-4 items-center active:bg-green-700 flex-row justify-center"
              >
                <Ionicons name="copy" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Duplicate</Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                className="bg-red-600 rounded-lg px-6 py-4 items-center active:bg-red-700 flex-row"
              >
                <Ionicons name="trash" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Photo Viewer Modal */}
      {viewingPhotoIndex !== null && admix.photoUris && (
        <Modal
          visible={true}
          animationType="fade"
          transparent
          onRequestClose={() => setViewingPhotoIndex(null)}
        >
          <View className="flex-1 bg-black">
            <Pressable
              onPress={() => setViewingPhotoIndex(null)}
              className="absolute top-12 right-4 z-10 bg-black/50 rounded-full p-2"
            >
              <Ionicons name="close" size={32} color="white" />
            </Pressable>
            
            <Image
              source={{ uri: admix.photoUris[viewingPhotoIndex] }}
              className="flex-1"
              resizeMode="contain"
            />
            
            <View className="absolute bottom-8 left-0 right-0 items-center">
              <Text className="text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                {viewingPhotoIndex + 1} / {admix.photoUris.length}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default AdmixLibraryDetailScreen;
