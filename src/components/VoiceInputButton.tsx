import React, { useState } from 'react';
import { Pressable, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { transcribeAudio } from '../api/transcribe-audio';

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  buttonSize?: number;
  buttonColor?: string;
  style?: any;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscriptionComplete,
  buttonSize = 40,
  buttonColor = '#3B82F6',
  style,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (!uri) {
        setError('No audio recorded');
        return;
      }

      // Transcribe the audio
      setIsTranscribing(true);
      const transcription = await transcribeAudio(uri);
      
      if (transcription && transcription.trim()) {
        onTranscriptionComplete(transcription.trim());
      }

      setIsTranscribing(false);
      setRecording(null);
    } catch (err) {
      console.error('Failed to process recording:', err);
      setError('Failed to transcribe audio');
      setIsTranscribing(false);
      setRecording(null);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
  };

  return (
    <View style={style}>
      <Pressable
        onPress={handlePress}
        disabled={isTranscribing}
        className="items-center justify-center rounded-full active:opacity-80"
        style={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: isRecording ? '#EF4444' : buttonColor,
        }}
      >
        {isTranscribing ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={buttonSize * 0.5}
            color="white"
          />
        )}
      </Pressable>
      
      {isRecording && (
        <View className="absolute -bottom-6 left-1/2 -ml-12 w-24">
          <Text className="text-xs text-center text-red-600 font-semibold">
            Recording...
          </Text>
        </View>
      )}
      
      {isTranscribing && (
        <View className="absolute -bottom-6 left-1/2 -ml-16 w-32">
          <Text className="text-xs text-center text-blue-600 font-semibold">
            Transcribing...
          </Text>
        </View>
      )}
      
      {error && (
        <View className="absolute -bottom-6 left-1/2 -ml-20 w-40">
          <Text className="text-xs text-center text-red-600 font-semibold">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};
