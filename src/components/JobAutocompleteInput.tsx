import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useJobAutocomplete, JobSuggestion } from '../utils/jobAutocomplete';
import { validateJobNumber, getValidationMessage, extractJobNumber } from '../utils/jobNumberValidation';

interface JobAutocompleteInputProps {
  jobNumber: string;
  jobName: string;
  onJobNumberChange: (value: string) => void;
  onJobNameChange: (value: string) => void;
  onJobSelect?: (jobNumber: string, jobName: string) => void;
  disabled?: boolean;
  jobNumberLabel?: string;
  jobNameLabel?: string;
  required?: boolean;
  theme?: 'light' | 'dark';
  enableCreatePrompt?: boolean;
}

export default function JobAutocompleteInput({
  jobNumber,
  jobName,
  onJobNumberChange,
  onJobNameChange,
  onJobSelect,
  disabled = false,
  jobNumberLabel = "Job #",
  jobNameLabel = "Job Name",
  required = false,
  theme = 'light',
  enableCreatePrompt = true,
}: JobAutocompleteInputProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { findByJobNumber, searchByJobName } = useJobAutocomplete();
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [focusedField, setFocusedField] = useState<'number' | 'name' | null>(null);
  const [lastCheckedJobNumber, setLastCheckedJobNumber] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Validate job number on change
  const handleJobNumberChange = (value: string) => {
    onJobNumberChange(value);
    
    // Clear error as user types
    if (validationError) {
      setValidationError('');
    }
  };

  // Validate job number format
  const validateAndCheckJobNumber = (jobNum: string) => {
    if (!jobNum.trim()) {
      return;
    }

    const validation = validateJobNumber(jobNum);
    
    if (!validation.isValid) {
      // Show validation error
      setValidationError(validation.error || 'Invalid job number format');
      
      Alert.alert(
        'Invalid Job Number',
        `${validation.error}\n\nJob number must be:\n• Exactly 6 digits\n• 2nd and 3rd digits must match\n\nExample: 255096, 144523, 366789`,
        [
          {
            text: 'OK',
            onPress: () => {
              // If we extracted some digits, offer to auto-correct
              if (validation.cleaned && validation.cleaned.length > 0) {
                // Focus back on the input
              }
            },
          },
        ]
      );
      return;
    }

    // Valid format, clear any errors
    setValidationError('');
    
    // Check if job exists in library
    checkJobNumberExists(validation.cleaned || jobNum);
  };

  // Reset last checked when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // When returning from project creation, check if the job now exists
      if (lastCheckedJobNumber && jobNumber.trim() === lastCheckedJobNumber) {
        const project = findByJobNumber(lastCheckedJobNumber);
        if (project && !jobName) {
          // Project was created, auto-fill the name
          onJobNameChange(project.jobName);
          if (onJobSelect) {
            onJobSelect(project.jobNumber, project.jobName);
          }
        }
      }
    }, [lastCheckedJobNumber, jobNumber, jobName])
  );

  // Check if job number exists and prompt to create if not
  const checkJobNumberExists = (jobNum: string) => {
    if (!enableCreatePrompt || !jobNum.trim() || jobNum === lastCheckedJobNumber) {
      return;
    }

    const trimmed = jobNum.trim();
    
    // First validate format
    const validation = validateJobNumber(trimmed);
    if (!validation.isValid) {
      // Validation already showed error in validateAndCheckJobNumber
      return;
    }
    
    const project = findByJobNumber(trimmed);
    
    if (!project) {
      setLastCheckedJobNumber(trimmed);
      
      Alert.alert(
        'Job Not Found',
        `"${trimmed}" is not in the Project Library.\n\nWould you like to create a new project with this job number?`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
          },
          {
            text: 'Create Project',
            onPress: () => {
              // Navigate to create new project with pre-filled job number
              navigation.navigate('ProjectLibraryAddEdit', { 
                prefilledJobNumber: trimmed,
                prefilledJobName: jobName.trim() || undefined,
                returnScreen: 'current',
              });
            },
          },
        ]
      );
    }
  };

  // Auto-populate job name when job number is entered
  useEffect(() => {
    if (focusedField === 'number' && jobNumber.trim()) {
      const project = findByJobNumber(jobNumber);
      if (project && project.jobName !== jobName) {
        onJobNameChange(project.jobName);
        setLastCheckedJobNumber(jobNumber.trim());
        if (onJobSelect) {
          onJobSelect(project.jobNumber, project.jobName);
        }
      }
    }
  }, [jobNumber, focusedField]);

  // Show suggestions when typing job name
  useEffect(() => {
    if (focusedField === 'name' && jobName.trim().length >= 2) {
      const results = searchByJobName(jobName);
      if (results.length > 0) {
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [jobName, focusedField]);

  const handleSelectSuggestion = (suggestion: JobSuggestion) => {
    onJobNumberChange(suggestion.jobNumber);
    onJobNameChange(suggestion.jobName);
    setShowSuggestions(false);
    setFocusedField(null);
    
    if (onJobSelect) {
      onJobSelect(suggestion.jobNumber, suggestion.jobName);
    }
  };

  const isDark = theme === 'dark';
  
  const inputStyles = isDark ? {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    textColor: '#FFFFFF',
    placeholderColor: '#6B7280',
  } : {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    textColor: '#111827',
    placeholderColor: '#9CA3AF',
  };

  const labelColor = isDark ? '#9CA3AF' : '#374151';

  return (
    <View>
      {/* Job Number Input */}
      <View className="mb-4">
        <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor, marginBottom: 8 }}>
          {jobNumberLabel} {required && <Text style={{ color: '#EF4444' }}>*</Text>}
        </Text>
        <TextInput
          value={jobNumber}
          onChangeText={handleJobNumberChange}
          onFocus={() => setFocusedField('number')}
          onBlur={() => {
            setTimeout(() => {
              setFocusedField(null);
              // Validate and check if job number exists when user finishes typing
              if (jobNumber.trim()) {
                validateAndCheckJobNumber(jobNumber);
              }
            }, 300);
          }}
          placeholder="Enter 6-digit job number"
          placeholderTextColor={inputStyles.placeholderColor}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={10}
          cursorColor="#000000"
          style={{
            backgroundColor: inputStyles.backgroundColor,
            borderWidth: 1,
            borderColor: validationError ? '#EF4444' : inputStyles.borderColor,
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
            color: inputStyles.textColor,
          }}
        />
        {validationError && (
          <View className="flex-row items-start mt-2">
            <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 4, marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: '#EF4444', flex: 1 }}>
              {validationError}
            </Text>
          </View>
        )}
        {!validationError && focusedField === 'number' && (
          <Text style={{ fontSize: 11, color: labelColor, marginTop: 4, opacity: 0.6 }}>
            Format: 6 digits, 2nd and 3rd must match (e.g., 255096)
          </Text>
        )}
      </View>

      {/* Job Name Input with Suggestions */}
      <View className="mb-4">
        <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor, marginBottom: 8 }}>
          {jobNameLabel}
        </Text>
        <View className="relative">
          <TextInput
            value={jobName}
            onChangeText={onJobNameChange}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setTimeout(() => setFocusedField(null), 200)}
            placeholder="Enter or search job name"
            placeholderTextColor={inputStyles.placeholderColor}
            editable={!disabled}
            cursorColor="#000000"
            style={{
              backgroundColor: inputStyles.backgroundColor,
              borderWidth: 1,
              borderColor: inputStyles.borderColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              color: inputStyles.textColor,
            }}
          />
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60">
              <ScrollView keyboardShouldPersistTaps="handled">
                {suggestions.map((suggestion, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleSelectSuggestion(suggestion)}
                    className="px-3 py-3 border-b border-gray-100 active:bg-gray-50"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-blue-600 mb-1">
                          {suggestion.jobNumber}
                        </Text>
                        <Text className="text-base text-gray-900">
                          {suggestion.jobName}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        {focusedField === 'name' && jobName.trim().length >= 1 && jobName.trim().length < 2 && (
          <Text style={{ fontSize: 12, color: labelColor, marginTop: 4, opacity: 0.7 }}>
            Type at least 2 characters to see suggestions
          </Text>
        )}
      </View>
    </View>
  );
}
