import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  showHome?: boolean;
  rightContent?: React.ReactNode;
  onBackPress?: () => void;
}

export default function ScreenHeader({
  title,
  showBack = true,
  showHome = true,
  rightContent,
  onBackPress,
}: ScreenHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleHome = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <View className="bg-gray-900">
      <SafeAreaView edges={['top']} className="bg-gray-900">
        <View className="flex-row items-center justify-between px-4 py-3 min-h-[48px]">
          {/* Left side - Back button */}
          <View className="flex-row items-center flex-1">
            {showBack ? (
              <Pressable
                onPress={handleBack}
                className="p-2 -ml-2 active:opacity-70"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </Pressable>
            ) : (
              <View className="w-8" />
            )}
            <Text
              className="text-white text-lg font-semibold ml-2 flex-shrink"
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>

          {/* Right side - Custom content and Home button */}
          <View className="flex-row items-center gap-3">
            {rightContent}
            {showHome && (
              <Pressable
                onPress={handleHome}
                className="p-2 -mr-2 active:opacity-70"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="home-outline" size={24} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
