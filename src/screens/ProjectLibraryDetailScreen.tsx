import React from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProjectLibraryStore } from '../state/projectLibraryStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectLibraryDetail'>;

export default function ProjectLibraryDetailScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const getProjectById = useProjectLibraryStore((s) => s.getProjectById);
  const deleteProject = useProjectLibraryStore((s) => s.deleteProject);
  
  const project = getProjectById(projectId);

  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Project not found</Text>
      </SafeAreaView>
    );
  }

  const totalPieceCount = project.pieceCountByType.reduce((sum, item) => sum + item.count, 0);

  const handleOpenMaps = () => {
    if (!project.location) return;

    const address = encodeURIComponent(project.location);
    const url = Platform.select({
      ios: `maps://app?address=${address}`,
      android: `geo:0,0?q=${address}`,
      default: `https://www.google.com/maps/search/?api=1&query=${address}`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
      }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.jobNumber} - ${project.jobName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProject(projectId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Project Details</Text>
        <View className="flex-row gap-2">
          <Pressable 
            onPress={() => navigation.navigate('ProjectLibraryAddEdit', { projectId })}
            className="p-2"
          >
            <Ionicons name="create-outline" size={24} color="#3B82F6" />
          </Pressable>
          <Pressable onPress={handleDelete} className="p-2">
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4 gap-4">
          {/* Job Number & Name Card */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-500 mb-2">JOB INFORMATION</Text>
            <View className="gap-3">
              <View>
                <Text className="text-xs text-gray-500 mb-1">Job Number</Text>
                <Text className="text-lg font-bold text-blue-600">{project.jobNumber}</Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500 mb-1">Job Name</Text>
                <Text className="text-base font-semibold text-gray-900">{project.jobName}</Text>
              </View>
            </View>
          </View>

          {/* Location Card */}
          {project.location && (
            <Pressable 
              onPress={handleOpenMaps}
              className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-500 mb-2">LOCATION</Text>
                  <Text className="text-base text-gray-900 mb-1">{project.location}</Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="map-outline" size={14} color="#3B82F6" />
                    <Text className="text-sm text-blue-600 ml-1 font-medium">
                      Open in Maps
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
              </View>
            </Pressable>
          )}

          {/* Team Card */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-500 mb-3">TEAM</Text>
            <View className="gap-3">
              {project.salesperson && (
                <View className="flex-row items-center">
                  <View className="w-24">
                    <Text className="text-xs text-gray-500">Salesperson</Text>
                  </View>
                  <Text className="text-base text-gray-900 flex-1">{project.salesperson}</Text>
                </View>
              )}
              {project.projectManager && (
                <View className="flex-row items-center">
                  <View className="w-24">
                    <Text className="text-xs text-gray-500">PM</Text>
                  </View>
                  <Text className="text-base text-gray-900 flex-1">{project.projectManager}</Text>
                </View>
              )}
              {project.assignedEngineer && (
                <View className="flex-row items-center">
                  <View className="w-24">
                    <Text className="text-xs text-gray-500">Engineer</Text>
                  </View>
                  <Text className="text-base text-gray-900 flex-1">{project.assignedEngineer}</Text>
                </View>
              )}
              {project.assignedDrafter && (
                <View className="flex-row items-center">
                  <View className="w-24">
                    <Text className="text-xs text-gray-500">Drafter</Text>
                  </View>
                  <Text className="text-base text-gray-900 flex-1">{project.assignedDrafter}</Text>
                </View>
              )}
              {!project.salesperson && !project.projectManager && !project.assignedEngineer && !project.assignedDrafter && (
                <Text className="text-gray-400 text-sm italic">No team members assigned</Text>
              )}
            </View>
          </View>

          {/* Piece Count Card */}
          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-500">PIECE COUNT</Text>
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-base font-bold text-blue-700">
                  {totalPieceCount} Total
                </Text>
              </View>
            </View>
            
            {project.pieceCountByType.length > 0 ? (
              <View className="gap-2">
                {project.pieceCountByType.map((item, index) => (
                  <View 
                    key={index}
                    className="flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="cube-outline" size={16} color="#6B7280" />
                      <Text className="text-base text-gray-900 ml-2">{item.productType}</Text>
                    </View>
                    <Text className="text-base font-semibold text-gray-700">{item.count}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-gray-400 text-sm italic">No piece counts added</Text>
            )}
          </View>

          {/* Metadata */}
          <View className="bg-gray-100 rounded-xl p-3">
            <Text className="text-xs text-gray-500">
              Created {new Date(project.createdAt).toLocaleDateString()} by {project.createdBy}
            </Text>
            {project.updatedAt !== project.createdAt && (
              <Text className="text-xs text-gray-500 mt-1">
                Last updated {new Date(project.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
