import React from 'react';
import { TextInput, TextInputProps, Platform, StyleSheet } from 'react-native';

/**
 * Custom TextInput component with proper cursor visibility and styling
 * This component ensures the cursor is visible on all platforms and works properly on web.
 */
export const AppTextInput = React.forwardRef<TextInput, TextInputProps>(
  (props, ref) => {
    const { cursorColor, selectionColor, style, ...rest } = props;

    // Web-specific styles to ensure input is interactive
    const combinedStyle = Platform.OS === 'web'
      ? [
          style,
          // @ts-ignore - Web-specific CSS properties not in React Native types
          { outlineStyle: 'none', cursor: 'text' }
        ]
      : style;

    return (
      <TextInput
        ref={ref}
        cursorColor={cursorColor || '#000000'}
        selectionColor={selectionColor || '#3B82F6'}
        style={combinedStyle as any}
        {...rest}
      />
    );
  }
);

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
