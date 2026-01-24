import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AttachmentActionButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
  onPress: () => void;
}

export default function AttachmentActionButton({ 
  iconName, 
  iconColor, 
  backgroundColor, 
  onPress 
}: AttachmentActionButtonProps) {
  if (Platform.OS === 'web') {
    // Use native HTML button for web
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPress();
        }}
        style={{
          padding: 8,
          backgroundColor,
          borderRadius: 999,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
      </div>
    );
  }

  // Use Pressable for native
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 8,
        backgroundColor,
        borderRadius: 999,
      }}
    >
      <Ionicons name={iconName} size={18} color={iconColor} />
    </Pressable>
  );
}
