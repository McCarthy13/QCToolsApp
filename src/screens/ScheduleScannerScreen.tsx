/**
 * Schedule Scanner Screen
 * 
 * Uses camera to capture paper schedules and AI to parse them
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
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

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<ParsedScheduleEntry[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showTipPrompt, setShowTipPrompt] = useState(true);
  const [zoom, setZoom] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const selectedDate = route.params?.date ? new Date(route.params.date) : new Date();
  const selectedDepartment = route.params?.department;

  // Show tip prompt when screen loads
  useEffect(() => {
    if (permission?.granted && showTipPrompt) {
      Alert.alert(
        'Tips for Best Results',
        'Use the zoom controls to frame ONLY the columns from Job through Cutback. The entire camera view will be captured, not just the blue frame.',
        [
          {
            text: 'Got it',
            onPress: () => setShowTipPrompt(false),
          },
        ]
      );
    }
  }, [permission?.granted, showTipPrompt]);

  // Request permission if not granted
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1f2937' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="camera-outline" size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8, textAlign: 'center' }}>
            Camera Permission Required
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24, textAlign: 'center' }}>
            We need camera access to scan paper schedules
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{ backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        exif: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setIsProcessing(true);

        // Parse the image with AI
        const result = await parseScheduleImage(photo.uri, {
          date: selectedDate,
        });

        setIsProcessing(false);

        if (result.success && result.entries.length > 0) {
          setParsedEntries(result.entries);
          setShowResults(true);
        } else {
          Alert.alert(
            'No Data Found',
            'Could not extract schedule entries from the image. Please try again with better lighting or a clearer photo.',
            [
              { text: 'Retry', onPress: () => setCapturedImage(null) },
              { text: 'Cancel', onPress: () => navigation.goBack() },
            ]
          );
        }
      }
    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to capture or process image. Please try again.');
      console.error('Capture error:', error);
    }
  };

  const handleImportEntries = () => {
    navigation.navigate('ScheduleReview', {
      entries: parsedEntries,
      date: selectedDate.toISOString(),
      department: selectedDepartment,
    });
  };

  const toggleFlash = () => setFlash(!flash);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleZoomIn = () => {
    setZoom((current) => Math.min(current + 0.1, 1));
  };

  const handleZoomOut = () => {
    setZoom((current) => Math.max(current - 0.1, 0));
  };

  const resetZoom = () => {
    setZoom(0);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setShowResults(false);
    setParsedEntries([]);
  };

  // Camera View
  if (!capturedImage && !showResults) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          enableTorch={flash}
          autofocus="on"
          mode="picture"
          zoom={zoom}
          pictureSize="high"
        >
          {/* Top Bar */}
          <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>

              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                Scan Schedule
              </Text>

              <Pressable
                onPress={toggleFlash}
                style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
              >
                <Ionicons name={flash ? 'flash' : 'flash-off'} size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Zoom Controls */}
          <View style={{ position: 'absolute', right: 16, top: '50%', transform: [{ translateY: -80 }], zIndex: 10, gap: 12 }}>
            <Pressable
              onPress={handleZoomIn}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: zoom > 0 ? '#3b82f6' : 'rgba(255,255,255,0.3)' }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </Pressable>

            {/* Zoom Level Indicator */}
            {zoom > 0 && (
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700' }}>
                  {(zoom * 10).toFixed(0)}x
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleZoomOut}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: zoom > 0 ? '#3b82f6' : 'rgba(255,255,255,0.3)' }}
            >
              <Ionicons name="remove" size={28} color="#fff" />
            </Pressable>

            {/* Reset Zoom */}
            {zoom > 0 && (
              <Pressable
                onPress={resetZoom}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f59e0b' }}
              >
                <Ionicons name="refresh" size={24} color="#f59e0b" />
              </Pressable>
            )}
          </View>

          {/* Bottom Controls */}
          <View style={{ position: 'absolute', bottom: insets.bottom, left: 0, right: 0, zIndex: 10, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 32 }}>
              <View style={{ width: 64 }} />
              
              <Pressable
                onPress={handleCapture}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#3b82f6' }}
              >
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b82f6' }} />
              </Pressable>
              
              <Pressable
                onPress={toggleCameraFacing}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="camera-reverse" size={32} color="#fff" />
              </Pressable>
            </View>
          </View>
        </CameraView>
      </View>
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
              style={{ width: '100%', height: '50%', borderRadius: 12, marginBottom: 32, opacity: 0.5 }}
              resizeMode="contain"
            />
          )}
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Analyzing Schedule...
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
            AI is extracting pour entries from the image
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Results Preview
  if (showResults) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
            Scanned Entries
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Preview Image */}
          {capturedImage && (
            <View style={{ padding: 16 }}>
              <Image
                source={{ uri: capturedImage }}
                style={{ width: '100%', height: 200, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Results Summary */}
          <View style={{ padding: 16, paddingTop: 0 }}>
            <View style={{ backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                ✓ Found {parsedEntries.length} {parsedEntries.length === 1 ? 'Piece' : 'Pieces'}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>
                Each piece extracted as individual entry
              </Text>
              <View style={{ backgroundColor: '#374151', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={20} color="#60a5fa" style={{ marginRight: 8 }} />
                <Text style={{ color: '#60a5fa', fontSize: 13, flex: 1 }}>
                  Next: Assign Form/Bed to each piece based on current production plan
                </Text>
              </View>
            </View>

            {/* Entry Cards */}
            {parsedEntries.map((entry, index) => (
              <View key={index} style={{ backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                      Job {entry.jobNumber}{entry.markNumber ? ` • ${entry.markNumber}` : ''}
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                      {entry.idNumber ? `ID: ${entry.idNumber}` : `Piece ${index + 1}`}
                    </Text>
                  </View>
                  {entry.confidence && (
                    <Text style={{ color: entry.confidence > 0.7 ? '#10b981' : '#f59e0b', fontSize: 12 }}>
                      {Math.round(entry.confidence * 100)}%
                    </Text>
                  )}
                </View>

                <View style={{ gap: 8 }}>
                  {entry.jobName && (
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ color: '#9ca3af', width: 100 }}>Project:</Text>
                      <Text style={{ color: '#fff', flex: 1 }}>{entry.jobName}</Text>
                    </View>
                  )}
                  {entry.productType && (
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ color: '#9ca3af', width: 100 }}>Type:</Text>
                      <Text style={{ color: '#fff', flex: 1 }}>{entry.productType}</Text>
                    </View>
                  )}
                  {entry.concreteYards && (
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ color: '#9ca3af', width: 100 }}>Yards:</Text>
                      <Text style={{ color: '#fff', flex: 1 }}>{entry.concreteYards} yd³</Text>
                    </View>
                  )}
                  {entry.mixDesign && (
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ color: '#9ca3af', width: 100 }}>Mix:</Text>
                      <Text style={{ color: '#fff', flex: 1 }}>{entry.mixDesign}</Text>
                    </View>
                  )}
                  {entry.scheduledTime && (
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ color: '#9ca3af', width: 100 }}>Time:</Text>
                      <Text style={{ color: '#fff', flex: 1 }}>{entry.scheduledTime}</Text>
                    </View>
                  )}
                  {entry.notes && (
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ color: '#9ca3af', width: 100 }}>Notes:</Text>
                      <Text style={{ color: '#fff', flex: 1 }}>{entry.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#374151', gap: 12 }}>
          <Pressable
            onPress={handleImportEntries}
            style={{ backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Review & Import Entries
            </Text>
          </Pressable>
          
          <Pressable
            onPress={handleRetake}
            style={{ backgroundColor: '#374151', padding: 16, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Retake Photo
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
