/**
 * Product Tag Scanner Screen
 *
 * Uses camera to capture product tags and AI to parse fields like span and pour date
 */

import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
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

  const cameraRef = useRef<CameraView>(null);
  const { targetFields, onDataScanned } = route.params;

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
        quality: 1.0,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setIsProcessing(true);

        // Parse the image with AI
        const result = await parseProductTag(photo.uri, targetFields);

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
