import React from 'react';
import { Modal, ModalProps, KeyboardAvoidingView, Platform, Pressable, Keyboard } from 'react-native';

interface KeyboardAvoidingModalProps extends ModalProps {
  children: React.ReactNode;
  onDismiss?: () => void;
}

/**
 * Modal component with proper keyboard handling
 * Prevents keyboard from covering input fields and allows dismissing keyboard by tapping outside
 */
export const KeyboardAvoidingModal: React.FC<KeyboardAvoidingModalProps> = ({
  children,
  onDismiss,
  ...modalProps
}) => {
  return (
    <Modal {...modalProps}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => {
            Keyboard.dismiss();
            onDismiss?.();
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default KeyboardAvoidingModal;
