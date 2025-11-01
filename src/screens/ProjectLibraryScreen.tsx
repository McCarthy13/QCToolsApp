import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProjectLibraryStore } from '../state/projectLibraryStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectLibrary'>;

export default function ProjectLibraryScreen({ navigation }: Props) {
  const projects = useProjectLibraryStore((s) => s.projects);
  const searchProjects = useProjectLibraryStore((s) => s.searchProjects);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProjects = searchQuery ? searchProjects(searchQuery) : projects;
  
  // Calculate total piece count for a project
  const getTotalPieceCount = (project: any) => {
    return project.pieceCountByType.reduce((sum: number, item: any) => sum + item.count, 0);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">Project Library</Text>
        <Pressable 
          onPress={() => navigation.navigate('ProjectLibraryAddEdit', {})}
          className="p-2"
        >
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by job # or name..."
            placeholderTextColor="#9CA3AF"
            cursorColor="#000000"
            className="flex-1 ml-2 text-base text-gray-900"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* Export/Import Button */}
        <Pressable
          onPress={() => navigation.navigate('ProjectLibraryExportImport')}
          className="flex-row items-center justify-center bg-blue-50 border border-blue-200 rounded-lg py-2 px-3"
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#3B82F6" />
          <Text className="text-blue-600 text-sm font-semibold ml-2">
            Export / Import
          </Text>
        </Pressable>
      </View>

      {/* Projects List */}
      <ScrollView className="flex-1">
        {filteredProjects.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8 mt-12">
            <Ionicons name="folder-open-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-base mt-4 text-center">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </Text>
            {!searchQuery && (
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Tap the + button to add your first project
              </Text>
            )}
          </View>
        ) : (
          <View className="p-4 gap-3">
            {filteredProjects.map((project) => {
              const totalPieces = getTotalPieceCount(project);
              
              return (
                <Pressable
                  key={project.id}
                  onPress={() => navigation.navigate('ProjectLibraryDetail', { projectId: project.id })}
                  className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-blue-600 mb-1">
                        {project.jobNumber}
                      </Text>
                      <Text className="text-base font-semibold text-gray-900">
                        {project.jobName}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
                  </View>
                  
                  {project.location && (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-1" numberOfLines={1}>
                        {project.location}
                      </Text>
                    </View>
                  )}
                  
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <View className="flex-row items-center">
                      <Ionicons name="cube-outline" size={16} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-1">
                        {totalPieces} {totalPieces === 1 ? 'piece' : 'pieces'}
                      </Text>
                    </View>
                    
                    {project.projectManager && (
                      <View className="flex-row items-center">
                        <Ionicons name="person-outline" size={16} color="#6B7280" />
                        <Text className="text-sm text-gray-600 ml-1">
                          {project.projectManager}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
