import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route?: keyof RootStackParamList;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: 'camber-calculator',
    name: 'Camber Calculator',
    description: 'Calculate precast concrete member camber with strand patterns',
    icon: 'calculator',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    route: 'Calculator',
  },
  {
    id: 'slippage-identifier',
    name: 'Slippage Identifier',
    description: 'Track and report strand slippage with cross-section templates',
    icon: 'resize',
    color: '#10B981',
    bgColor: '#F0FDF4',
    route: 'ProductDetails',
  },
  {
    id: 'stressing-calculator',
    name: 'Stressing Force & Elongation',
    description: 'Calculate expected strand elongation during prestressing',
    icon: 'git-pull-request',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    route: 'StressingCalculator',
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleToolPress = (tool: Tool) => {
    if (tool.comingSoon) {
      return; // Do nothing for coming soon tools
    }
    if (tool.route) {
      navigation.navigate(tool.route as any);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="p-5">
          {/* Header */}
          <View className="mb-8 mt-4">
            <Text className="text-4xl font-bold text-gray-900 mb-2">
              Quality Tools
            </Text>
            <Text className="text-base text-gray-600">
              Select a tool to get started
            </Text>
          </View>

          {/* Tools Grid */}
          <View className="space-y-4">
            {tools.map((tool) => (
              <Pressable
                key={tool.id}
                onPress={() => handleToolPress(tool)}
                disabled={tool.comingSoon}
                className={`rounded-2xl p-6 shadow-sm ${
                  tool.comingSoon ? 'opacity-60' : 'active:opacity-80'
                }`}
                style={{ backgroundColor: tool.bgColor }}
              >
                <View className="flex-row items-start justify-between mb-4">
                  <View 
                    className="rounded-xl p-3"
                    style={{ backgroundColor: tool.color }}
                  >
                    <Ionicons name={tool.icon} size={32} color="white" />
                  </View>
                  {tool.comingSoon && (
                    <View className="bg-yellow-100 px-3 py-1.5 rounded-full">
                      <Text className="text-xs font-bold text-yellow-700">
                        COMING SOON
                      </Text>
                    </View>
                  )}
                  {!tool.comingSoon && (
                    <Ionicons name="chevron-forward" size={24} color={tool.color} />
                  )}
                </View>

                <Text className="text-xl font-bold text-gray-900 mb-2">
                  {tool.name}
                </Text>
                <Text className="text-sm text-gray-600 leading-5">
                  {tool.description}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Info Section */}
          <View className="mt-8 bg-blue-50 rounded-xl p-5 border border-blue-200">
            <View className="flex-row items-start">
              <View className="bg-blue-500 rounded-full p-2 mr-3">
                <Ionicons name="information" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-900 mb-1">
                  More Tools Coming
                </Text>
                <Text className="text-xs text-blue-700">
                  We are continuously adding new quality control tools to help you work more efficiently. Check back for updates!
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
