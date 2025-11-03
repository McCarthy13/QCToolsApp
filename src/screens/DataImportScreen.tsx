import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { importDataToFirebase, validateImportData, ImportResult } from '../services/firebaseImport';
import { useAuthStore } from '../state/authStore';
import { getCurrentUser } from '../services/firebaseAuth';

interface DataImportScreenProps {
  onBack: () => void;
}

export default function DataImportScreen({ onBack }: DataImportScreenProps) {
  const insets = useSafeAreaInsets();
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      alert('Please paste your JSON data');
      return;
    }

    const firebaseUser = getCurrentUser();
    if (!firebaseUser || !currentUser) {
      alert('You must be logged in to import data');
      return;
    }

    // Validate JSON
    const validation = validateImportData(jsonInput);
    if (!validation.valid) {
      alert('Invalid Data: ' + (validation.error || 'Invalid JSON structure'));
      return;
    }

    // Confirm import
    const confirmed = confirm('This will import the data to Firebase. Existing data with the same IDs will be merged. Continue?');
    if (!confirmed) return;

    setLoading(true);
    setImportResult(null);

    try {
      const result = await importDataToFirebase(validation.data!, firebaseUser.uid);
      setImportResult(result);

      if (result.success) {
        alert('Data imported successfully!');
        setJsonInput(''); // Clear input on success
      } else {
        alert('Import Failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Import failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={onBack}
            className="flex-row items-center active:opacity-50"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              Import Data
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Instructions */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <View className="flex-row items-start">
              <Ionicons name="document-text" size={20} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-blue-900 mb-1">
                  Import Instructions
                </Text>
                <Text className="text-sm text-blue-800">
                  Paste your exported JSON data below. This will import strand patterns, products, materials, projects, and contacts to Firebase.
                </Text>
              </View>
            </View>
          </View>

          {/* JSON Input */}
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            JSON Data
          </Text>
          <TextInput
            value={jsonInput}
            onChangeText={setJsonInput}
            placeholder='Paste your JSON export here...'
            placeholderTextColor="#9CA3AF"
            cursorColor="#000000"
            multiline
            numberOfLines={10}
            className="bg-white border border-gray-300 rounded-lg p-3 text-sm font-mono text-gray-900 mb-4"
            style={{
              minHeight: 200,
              textAlignVertical: 'top',
            }}
            editable={!loading}
          />

          {/* Import Button */}
          <Pressable
            onPress={handleImport}
            disabled={loading || !jsonInput.trim()}
            className={`flex-row items-center justify-center py-3 px-4 rounded-lg ${
              loading || !jsonInput.trim()
                ? 'bg-gray-300'
                : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white font-semibold ml-2">
                  Importing...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text className="text-white font-semibold ml-2">
                  Import to Firebase
                </Text>
              </>
            )}
          </Pressable>

          {/* Import Results */}
          {importResult && importResult.success && importResult.imported && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-sm font-semibold text-green-900 ml-2">
                  Import Successful
                </Text>
              </View>
              <View className="space-y-1">
                {importResult.imported.strandPatterns > 0 && (
                  <Text className="text-sm text-green-800">
                    • Strand Patterns: {importResult.imported.strandPatterns}
                  </Text>
                )}
                {importResult.imported.products > 0 && (
                  <Text className="text-sm text-green-800">
                    • Products: {importResult.imported.products}
                  </Text>
                )}
                {importResult.imported.strandLibrary > 0 && (
                  <Text className="text-sm text-green-800">
                    • Strand Library: {importResult.imported.strandLibrary}
                  </Text>
                )}
                {importResult.imported.aggregateLibrary > 0 && (
                  <Text className="text-sm text-green-800">
                    • Aggregate Library: {importResult.imported.aggregateLibrary}
                  </Text>
                )}
                {importResult.imported.admixLibrary > 0 && (
                  <Text className="text-sm text-green-800">
                    • Admix Library: {importResult.imported.admixLibrary}
                  </Text>
                )}
                {importResult.imported.projects > 0 && (
                  <Text className="text-sm text-green-800">
                    • Projects: {importResult.imported.projects}
                  </Text>
                )}
                {importResult.imported.contacts > 0 && (
                  <Text className="text-sm text-green-800">
                    • Contacts: {importResult.imported.contacts}
                  </Text>
                )}
                {importResult.imported.yardLocations > 0 && (
                  <Text className="text-sm text-green-800">
                    • Yard Locations: Updated
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Error Result */}
          {importResult && !importResult.success && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <Text className="text-sm font-semibold text-red-900 mb-1">
                Import Failed
              </Text>
              <Text className="text-sm text-red-800">
                {importResult.error}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
