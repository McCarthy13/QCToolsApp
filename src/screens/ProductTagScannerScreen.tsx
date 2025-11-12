/**
 * Product Tag Scanner Screen
 *
 * Uses camera to capture product tags and AI to parse fields like span and pour date
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { parseProductTag, ProductTagData } from '../api/product-tag-scanner';

type ScannerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductTagScanner'>;
type ScannerRouteProp = RouteProp<RootStackParamList, 'ProductTagScanner'>;

export default function ProductTagScannerScreen() {
  const navigation = useNavigation<ScannerNavigationProp>();
  const route = useRoute<ScannerRouteProp>();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [cameraCompleted, setCameraCompleted] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const processingRef = useRef(false); // Persistent flag across re-renders
  const { onDataScanned } = route.params;

  // On web, auto-launch camera picker once when component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && !processingRef.current) {
      handleWebCapture();
    }
  }, []);

  // Web-specific camera picker
  const handleWebCapture = async () => {
    // Prevent multiple launches - check ref first (persists across re-renders)
    if (processingRef.current) {
      console.log('[Scanner] Already processing (ref check), skipping camera launch');
      return;
    }

    if (isProcessing || cameraCompleted) {
      console.log('[Scanner] Already processing or completed, skipping camera launch');
      return;
    }

    // Set flags IMMEDIATELY before launching to prevent multiple launches
    processingRef.current = true; // Set ref flag first
    setCameraCompleted(true);
    setIsProcessing(true);

    try {
      console.log('[Scanner] Launching camera...');
      // On web, use the image picker which will trigger the browser's file/camera picker
      // Request base64 data to avoid blob URL fetch issues on iOS Safari
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7, // Reduced from 1.0 for faster processing
        exif: true,
        base64: true, // Get base64 data directly
      });

      if (result.canceled) {
        console.log('[Scanner] User canceled camera');
        processingRef.current = false;
        setCameraCompleted(false);
        setIsProcessing(false);
        navigation.goBack();
        return;
      }

      const photo = result.assets[0];
      if (photo?.uri) {
        console.log('[Scanner] Photo captured:', photo.uri);
        console.log('[Scanner] Has base64:', !!photo.base64);
        setCapturedImage(photo.uri);

        // Parse the image with AI
        console.log('[Scanner] Parsing product tag...');
        // If base64 is available, pass it directly, otherwise use URI
        const imageData = photo.base64
          ? `data:image/jpeg;base64,${photo.base64}`
          : photo.uri;
        console.log('[Scanner] Using image data type:', photo.base64 ? 'base64' : 'uri');
        const parseResult = await parseProductTag(imageData);

        setIsProcessing(false);

        if (parseResult.success && parseResult.data) {
          console.log('[Scanner] Successfully parsed data:', parseResult.data);
          // Call the callback with the parsed data
          onDataScanned(parseResult.data);
          processingRef.current = false;
          navigation.goBack();
        } else {
          console.log('[Scanner] Failed to parse data');
          processingRef.current = false;
          setCameraCompleted(false); // Allow retry
          Alert.alert(
            'No Data Found',
            'Could not extract information from the product tag. Please try again with better lighting or a clearer photo.',
            [
              {
                text: 'Retry',
                onPress: () => {
                  setCameraCompleted(false);
                  setCapturedImage(null);
                  handleWebCapture();
                }
              },
              { text: 'Cancel', onPress: () => navigation.goBack() },
            ]
          );
        }
      }
    } catch (error) {
      console.error('[Scanner] Capture error:', error);
      processingRef.current = false;
      setIsProcessing(false);
      setCameraCompleted(false);
      Alert.alert('Error', 'Failed to capture or process image. Please try again.');
      navigation.goBack();
    }
  };

  // On web, show the processing state
  if (Platform.OS === 'web') {
    // Always show loading state on web (camera launches automatically)
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
            {capturedImage ? 'Reading Product Tag...' : 'Opening Camera...'}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
            {capturedImage ? 'AI is extracting information from the tag' : 'Please allow camera access when prompted'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            We need camera access to scan product tags
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
        quality: 0.7, // Reduced from 1.0 for faster processing
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setIsProcessing(true);

        // Parse the image with AI
        const result = await parseProductTag(photo.uri);

        setIsProcessing(false);

        if (result.success && result.data) {
          // Call the callback with the parsed data
          onDataScanned(result.data);
          navigation.goBack();
        } else {
          Alert.alert(
            'No Data Found',
            'Could not extract information from the product tag. Please try again with better lighting or a clearer photo.',
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

  // Camera View
  if (!capturedImage && !isProcessing) {
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
                Scan Product Tag
              </Text>

              <Pressable
                onPress={toggleFlash}
                style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
              >
                <Ionicons name={flash ? 'flash' : 'flash-off'} size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Instructions */}
          <View style={{ position: 'absolute', top: insets.top + 80, left: 0, right: 0, zIndex: 10, paddingHorizontal: 32 }} pointerEvents="none">
            <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: 16, borderRadius: 12 }}>
              <Text style={{ color: '#FFD700', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                Position the product tag in frame
              </Text>
              <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                Ensure text is clear and readable • Use flash if needed
              </Text>
            </View>
          </View>

          {/* Frame Guide */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 5, pointerEvents: 'none' }}>
            <View style={{ width: '85%', height: '60%', borderWidth: 3, borderColor: '#3b82f6', borderRadius: 12, backgroundColor: 'transparent' }} />
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
            Reading Product Tag...
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
            AI is extracting information from the tag
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
