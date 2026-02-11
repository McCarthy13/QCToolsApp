import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmStyle?: 'default' | 'destructive';
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmStyle = 'default',
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={onCancel}
      >
        <Pressable
          className="bg-white rounded-2xl mx-5 w-80 overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="p-5">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </Text>
            <Text className="text-base text-gray-600 leading-6">
              {message}
            </Text>
          </View>

          <View className="border-t border-gray-200">
            <View className="flex-row">
              <Pressable
                onPress={onCancel}
                className="flex-1 py-4 items-center border-r border-gray-200 active:bg-gray-50"
              >
                <Text className="text-base font-semibold text-blue-500">
                  {cancelText}
                </Text>
              </Pressable>

              <Pressable
                onPress={onConfirm}
                className="flex-1 py-4 items-center active:bg-gray-50"
              >
                <Text
                  className={`text-base font-semibold ${
                    confirmStyle === 'destructive' ? 'text-red-500' : 'text-blue-500'
                  }`}
                >
                  {confirmText}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
