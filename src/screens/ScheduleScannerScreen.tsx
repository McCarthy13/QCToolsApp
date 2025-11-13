/**
 * Schedule Scanner Screen
 *
 * Uses native camera to capture paper schedules and AI to parse them
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { parseScheduleImage, ParsedScheduleEntry } from '../api/schedule-scanner';

type ScannerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScheduleScanner'>;
type ScannerRouteProp = RouteProp<RootStackParamList, 'ScheduleScanner'>;

export default function ScheduleScannerScreen() {
  const navigation = useNavigation<ScannerNavigationProp>();
  const route = useRoute<ScannerRouteProp>();
  const insets = useSafeAreaInsets();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<ParsedScheduleEntry[]>([]);
  const [showResults, setShowResults] = useState(false);

  const selectedDate = route.params?.date ? new Date(route.params.date) : new Date();
  const selectedDepartment = route.params?.department;

  const handleCapture = async () => {
    try {
      console.log('[Scanner Screen] Starting capture...');

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to scan schedules.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch native camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1, // Maximum quality
        exif: true,
      });

      if (result.canceled) {
        console.log('[Scanner Screen] User canceled camera');
        return;
      }

      const photo = result.assets[0];
      if (photo?.uri) {
        console.log('[Scanner Screen] Photo captured, URI:', photo.uri);
        setCapturedImage(photo.uri);
        setIsProcessing(true);

        try {
          console.log('[Scanner Screen] Starting AI parsing...');
          // Parse the image with AI
          const parseResult = await parseScheduleImage(photo.uri, {
            date: selectedDate,
          });

          console.log('[Scanner Screen] Parse result:', parseResult);
          setIsProcessing(false);

          if (parseResult.success && parseResult.entries.length > 0) {
            console.log('[Scanner Screen] Successfully parsed', parseResult.entries.length, 'entries');
            setParsedEntries(parseResult.entries);
            setShowResults(true);
          } else {
            console.error('[Scanner Screen] No entries found or parse failed:', parseResult.error);
            Alert.alert(
              'No Data Found',
              parseResult.error || 'Could not extract schedule entries from the image. Please try again with better lighting or a clearer photo.',
              [
                { text: 'Retry', onPress: () => { setCapturedImage(null); setIsProcessing(false); } },
                { text: 'Cancel', onPress: () => navigation.goBack() },
              ]
            );
          }
        } catch (parseError) {
          console.error('[Scanner Screen] Parse error:', parseError);
          setIsProcessing(false);
          setCapturedImage(null);

          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
          Alert.alert(
            'Processing Error',
            `Failed to process image: ${errorMessage}`,
            [
              { text: 'Retry', onPress: handleCapture },
              { text: 'Cancel', onPress: () => navigation.goBack() },
            ]
          );
        }
      }
    } catch (error) {
      console.error('[Scanner Screen] Capture error:', error);
      setIsProcessing(false);
      setCapturedImage(null);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Camera Error',
        `Failed to capture image: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleImportEntries = () => {
    try {
      console.log('[Scanner Screen] Importing', parsedEntries.length, 'entries');
      console.log('[Scanner Screen] Date:', selectedDate.toISOString());
      console.log('[Scanner Screen] Department:', selectedDepartment);

      navigation.navigate('ScheduleReview', {
        entries: parsedEntries,
        date: selectedDate.toISOString(),
        department: selectedDepartment,
      });
    } catch (error) {
      console.error('[Scanner Screen] Navigation error:', error);
      Alert.alert(
        'Navigation Error',
        'Failed to navigate to review screen. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setShowResults(false);
    setParsedEntries([]);
  };

  // Initial screen - prompt to take photo
  if (!capturedImage && !showResults) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' }}>
            <Pressable onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Scan Schedule</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Instructions */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="camera-outline" size={96} color="#3b82f6" style={{ marginBottom: 24 }} />

            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>
              Take a Photo of Your Schedule
            </Text>

            <Text style={{ color: '#9ca3af', fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
              Use your phone's native camera for the sharpest results. Frame the Position through Cutback columns.
            </Text>

            {/* Tips */}
            <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 20, marginBottom: 32, width: '100%' }}>
              <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                Tips for Best Results:
              </Text>
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#d1d5db', fontSize: 14 }}>
                  • Get as close as possible to the schedule
                </Text>
                <Text style={{ color: '#d1d5db', fontSize: 14 }}>
                  • Hold phone steady and wait for focus
                </Text>
                <Text style={{ color: '#d1d5db', fontSize: 14 }}>
                  • Use flash in low light conditions
                </Text>
                <Text style={{ color: '#d1d5db', fontSize: 14 }}>
                  • Frame Position through Cutback columns
                </Text>
              </View>
            </View>

            {/* Capture Button */}
            <Pressable
              onPress={handleCapture}
              style={{ backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                  Open Camera
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Processing State
  if (isProcessing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          {capturedImage && (
            <Image
              source={{ uri: capturedImage }}
              style={{ width: '100%', height: 300, borderRadius: 12, marginBottom: 32 }}
              resizeMode="contain"
            />
          )}
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
            Analyzing Schedule...
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Extracting entries from image
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Results View
  if (showResults && parsedEntries.length > 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' }}>
            <Pressable onPress={handleRetake}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Scan Results</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Preview Image */}
            {capturedImage && (
              <View style={{ marginBottom: 16 }}>
                <Image
                  source={{ uri: capturedImage }}
                  style={{ width: '100%', height: 200, borderRadius: 12 }}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Results Summary */}
            <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: '#3b82f6', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                Found {parsedEntries.length} {parsedEntries.length === 1 ? 'Entry' : 'Entries'}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                Review the entries below and import to your schedule
              </Text>
            </View>

            {/* Entries List */}
            {parsedEntries.map((entry, index) => (
              <View key={index} style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    Entry {index + 1}
                  </Text>
                  {entry.position && (
                    <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '600' }}>
                      Position {entry.position}
                    </Text>
                  )}
                </View>

                {entry.jobNumber && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    📋 Job: {entry.jobNumber}
                  </Text>
                )}
                {entry.markNumber && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    🏷️ Mark: {entry.markNumber}
                  </Text>
                )}
                {entry.idNumber && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    🔢 ID: {entry.idNumber}
                  </Text>
                )}
                {entry.length1 && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    📏 Length 1: {entry.length1}
                  </Text>
                )}
                {entry.length2 && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    📏 Length 2: {entry.length2}
                  </Text>
                )}
                {entry.width !== undefined && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    ↔️ Width: {entry.width}"
                  </Text>
                )}
                {entry.angle !== undefined && (
                  <Text style={{ color: '#d1d5db', fontSize: 14, marginBottom: 4 }}>
                    📐 Angle: {entry.angle}°
                  </Text>
                )}
                {entry.cutback && (
                  <Text style={{ color: '#d1d5db', fontSize: 14 }}>
                    ✂️ Cutback: {entry.cutback}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937', gap: 12 }}>
            <Pressable
              onPress={handleImportEntries}
              style={{ backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Import {parsedEntries.length} {parsedEntries.length === 1 ? 'Entry' : 'Entries'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRetake}
              style={{ backgroundColor: '#374151', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Retake Photo
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
