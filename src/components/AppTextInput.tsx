import React from 'react';
import { TextInput, TextInputProps, Platform } from 'react-native';

/**
 * Custom TextInput component with proper cursor visibility and styling
 * This component ensures the cursor is visible on all platforms by setting both
 * cursorColor and selectionColor properties.
 */
export const AppTextInput = React.forwardRef<TextInput, TextInputProps>(
  (props, ref) => {
    const { cursorColor, selectionColor, ...rest } = props;

    return (
      <TextInput
        ref={ref}
        cursorColor={cursorColor || '#3B82F6'}
        selectionColor={selectionColor || '#3B82F6'}
        {...rest}
      />
    );
  }
);

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
