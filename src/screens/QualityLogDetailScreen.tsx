import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import {
  QualityLogEntry,
  Disposition,
  ProductType,
  BedNumber,
  getStatusFromDisposition,
  DISPOSITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  BED_OPTIONS,
} from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogDetail'>;

export default function QualityLogDetailScreen({ navigation, route }: Props) {
  const { logId } = route.params;
  const entryId = logId; // Support both param names

  const entries = useQualityLogStore((s) => s.entries);
  const updateEntry = useQualityLogStore((s) => s.updateEntry);
  const deleteEntry = useQualityLogStore((s) => s.deleteEntry);
  const setDisposition = useQualityLogStore((s) => s.setDisposition);
  const issueCodes = useQualityLogStore((s) => s.issueCodes);
  const rejectCodes = useQualityLogStore((s) => s.rejectCodes);

  const entry = entries.find((e) => e.id === entryId);

  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<Partial<QualityLogEntry>>({});
  const [showDispositionPicker, setShowDispositionPicker] = useState(false);
  const [showProductTypePicker, setShowProductTypePicker] = useState(false);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [showIssueCodePicker, setShowIssueCodePicker] = useState(false);
  const [showRejectCodePicker, setShowRejectCodePicker] = useState(false);
  const [issueCodeInput, setIssueCodeInput] = useState('');
  const [rejectCodeInput, setRejectCodeInput] = useState('');

  useEffect(() => {
    if (entry) {
      setEditedEntry(entry);
    }
  }, [entry]);

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-gray-500">Entry not found</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const getRowColor = (): string => {
    if (!entry.disposition) return '#FFFFFF';
    const { color } = getStatusFromDisposition(entry.disposition);
    return color;
  };

  const handleSave = async () => {
    try {
      await updateEntry(entry.id, editedEntry);
      setIsEditing(false);
      Alert.alert('Success', 'Entry updated successfully');
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleDispositionSelect = async (disposition: Disposition) => {
    setShowDispositionPicker(false);
    try {
      await setDisposition(entry.id, disposition);
    } catch (error) {
      console.error('Error setting disposition:', error);
      Alert.alert('Error', 'Failed to update disposition');
    }
  };

  const toggleIssueCode = (code: string) => {
    const currentCodes = editedEntry.issueCodes || [];
    if (currentCodes.includes(code)) {
      setEditedEntry((prev) => ({
        ...prev,
        issueCodes: currentCodes.filter((c) => c !== code),
      }));
    } else {
      setEditedEntry((prev) => ({
        ...prev,
        issueCodes: [...currentCodes, code],
      }));
    }
  };

  const toggleRejectCode = (code: string) => {
    const currentCodes = editedEntry.rejectCodes || [];
    if (currentCodes.includes(code)) {
      setEditedEntry((prev) => ({
        ...prev,
        rejectCodes: currentCodes.filter((c) => c !== code),
      }));
    } else {
      setEditedEntry((prev) => ({
        ...prev,
        rejectCodes: [...currentCodes, code],
      }));
    }
  };

  const addIssueCodeByInput = () => {
    if (issueCodeInput.trim()) {
      const code = issueCodes.find(
        (c) => c.code.toLowerCase() === issueCodeInput.trim().toLowerCase()
      );
      if (code) {
        toggleIssueCode(code.code);
      }
      setIssueCodeInput('');
    }
  };

  const addRejectCodeByInput = () => {
    if (rejectCodeInput.trim()) {
      const code = rejectCodes.find(
        (c) => c.code.toLowerCase() === rejectCodeInput.trim().toLowerCase()
      );
      if (code) {
        toggleRejectCode(code.code);
      }
      setRejectCodeInput('');
    }
  };

  const DetailRow = ({
    label,
    value,
    editable = false,
    onPress,
  }: {
    label: string;
    value: string;
    editable?: boolean;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={editable ? onPress : undefined}
      className={`flex-row justify-between py-3 border-b border-gray-100 ${
        editable ? 'active:bg-gray-50' : ''
      }`}
    >
      <Text className="text-gray-500 text-sm">{label}</Text>
      <View className="flex-row items-center">
        <Text className="text-gray-900 text-sm font-medium">{value || '-'}</Text>
        {editable && <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View
        className="px-4 py-3 border-b border-gray-200"
        style={{ backgroundColor: getRowColor() }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">ID # {entry.idNumber}</Text>
          <View className="flex-row gap-2">
            {isEditing ? (
              <>
                <Pressable
                  onPress={() => {
                    setIsEditing(false);
                    setEditedEntry(entry);
                  }}
                  className="p-2"
                >
                  <Ionicons name="close" size={24} color="#EF4444" />
                </Pressable>
                <Pressable onPress={handleSave} className="p-2">
                  <Ionicons name="checkmark" size={24} color="#10B981" />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={() => setIsEditing(true)} className="p-2">
                  <Ionicons name="pencil" size={22} color="#374151" />
                </Pressable>
                <Pressable onPress={handleDelete} className="p-2">
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Status Section */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Status</Text>
          <DetailRow label="Status Code" value={entry.status || 'Not Set'} />
          <Pressable
            onPress={() => setShowDispositionPicker(true)}
            className="flex-row justify-between py-3 border-b border-gray-100 active:bg-gray-50"
          >
            <Text className="text-gray-500 text-sm">Disposition</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-900 text-sm font-medium">
                {entry.disposition || 'Not Set'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </Pressable>
          <DetailRow
            label="Approval/Rejection Date"
            value={entry.approvalRejectionDate || 'Not Set'}
          />
        </View>

        {/* Product Information */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Product Information</Text>
          <DetailRow label="Pour Date" value={entry.pourDate} />
          <DetailRow
            label="Product Type"
            value={entry.productType || 'Not Set'}
            editable={isEditing}
            onPress={() => setShowProductTypePicker(true)}
          />
          <DetailRow label="Job #" value={entry.jobNumber} />
          <DetailRow label="Mark #" value={entry.markNumber} />
          <DetailRow label="ID #" value={entry.idNumber} />
          <DetailRow label="Length" value={entry.length} />
          <DetailRow label="Width" value={`${entry.width}"`} />
          <DetailRow label="Thickness" value={`${entry.thickness}"`} />
          <DetailRow
            label="Bed"
            value={entry.bed ? `Bed ${entry.bed}` : 'Not Set'}
            editable={isEditing}
            onPress={() => setShowBedPicker(true)}
          />
        </View>

        {/* Quality Information */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Quality Information</Text>

          {/* Engineer */}
          <View className="py-3 border-b border-gray-100">
            <Text className="text-gray-500 text-sm mb-1">Engineer</Text>
            {isEditing ? (
              <TextInput
                value={editedEntry.engineer || ''}
                onChangeText={(text) => setEditedEntry((prev) => ({ ...prev, engineer: text }))}
                placeholder="Enter engineer name"
                className="text-gray-900 text-sm bg-gray-50 rounded-lg px-3 py-2"
              />
            ) : (
              <Text className="text-gray-900 text-sm">{entry.engineer || '-'}</Text>
            )}
          </View>

          {/* Engineer Feedback */}
          <View className="py-3 border-b border-gray-100">
            <Text className="text-gray-500 text-sm mb-1">Engineer Feedback</Text>
            {isEditing ? (
              <TextInput
                value={editedEntry.engineerFeedback || ''}
                onChangeText={(text) =>
                  setEditedEntry((prev) => ({ ...prev, engineerFeedback: text }))
                }
                placeholder="Enter engineer feedback"
                multiline
                numberOfLines={3}
                className="text-gray-900 text-sm bg-gray-50 rounded-lg px-3 py-2"
              />
            ) : (
              <Text className="text-gray-900 text-sm">{entry.engineerFeedback || '-'}</Text>
            )}
          </View>

          {/* Quality Comments */}
          <View className="py-3 border-b border-gray-100">
            <Text className="text-gray-500 text-sm mb-1">Quality Comments</Text>
            {isEditing ? (
              <TextInput
                value={editedEntry.qualityComments || ''}
                onChangeText={(text) =>
                  setEditedEntry((prev) => ({ ...prev, qualityComments: text }))
                }
                placeholder="Enter quality comments"
                multiline
                numberOfLines={3}
                className="text-gray-900 text-sm bg-gray-50 rounded-lg px-3 py-2"
              />
            ) : (
              <Text className="text-gray-900 text-sm">{entry.qualityComments || '-'}</Text>
            )}
          </View>

          {/* Issue Codes */}
          <View className="py-3 border-b border-gray-100">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-500 text-sm">Issue Codes</Text>
              {isEditing && (
                <Pressable
                  onPress={() => setShowIssueCodePicker(true)}
                  className="bg-blue-100 px-2 py-1 rounded"
                >
                  <Text className="text-blue-600 text-xs">Add Code</Text>
                </Pressable>
              )}
            </View>
            {isEditing && (
              <View className="flex-row mb-2">
                <TextInput
                  value={issueCodeInput}
                  onChangeText={setIssueCodeInput}
                  onSubmitEditing={addIssueCodeByInput}
                  placeholder="Type code & press enter"
                  className="flex-1 text-sm bg-gray-50 rounded-lg px-3 py-2 mr-2"
                />
              </View>
            )}
            <View className="flex-row flex-wrap gap-1">
              {(isEditing ? editedEntry.issueCodes : entry.issueCodes)?.map((code) => (
                <View
                  key={code}
                  className="bg-orange-100 px-2 py-1 rounded flex-row items-center"
                >
                  <Text className="text-orange-700 text-xs">{code}</Text>
                  {isEditing && (
                    <Pressable onPress={() => toggleIssueCode(code)} className="ml-1">
                      <Ionicons name="close" size={12} color="#C2410C" />
                    </Pressable>
                  )}
                </View>
              ))}
              {((isEditing ? editedEntry.issueCodes : entry.issueCodes)?.length || 0) === 0 && (
                <Text className="text-gray-400 text-sm">No issue codes</Text>
              )}
            </View>
          </View>

          {/* Reject Codes */}
          <View className="py-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-500 text-sm">Reject Codes</Text>
              {isEditing && (
                <Pressable
                  onPress={() => setShowRejectCodePicker(true)}
                  className="bg-red-100 px-2 py-1 rounded"
                >
                  <Text className="text-red-600 text-xs">Add Code</Text>
                </Pressable>
              )}
            </View>
            {isEditing && (
              <View className="flex-row mb-2">
                <TextInput
                  value={rejectCodeInput}
                  onChangeText={setRejectCodeInput}
                  onSubmitEditing={addRejectCodeByInput}
                  placeholder="Type code & press enter"
                  className="flex-1 text-sm bg-gray-50 rounded-lg px-3 py-2 mr-2"
                />
              </View>
            )}
            <View className="flex-row flex-wrap gap-1">
              {(isEditing ? editedEntry.rejectCodes : entry.rejectCodes)?.map((code) => (
                <View key={code} className="bg-red-100 px-2 py-1 rounded flex-row items-center">
                  <Text className="text-red-700 text-xs">{code}</Text>
                  {isEditing && (
                    <Pressable onPress={() => toggleRejectCode(code)} className="ml-1">
                      <Ionicons name="close" size={12} color="#B91C1C" />
                    </Pressable>
                  )}
                </View>
              ))}
              {((isEditing ? editedEntry.rejectCodes : entry.rejectCodes)?.length || 0) === 0 && (
                <Text className="text-gray-400 text-sm">No reject codes</Text>
              )}
            </View>
          </View>
        </View>

        {/* Metadata */}
        <View className="bg-white mx-4 mt-4 mb-6 rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Metadata</Text>
          <DetailRow
            label="Imported"
            value={new Date(entry.importedAt).toLocaleString()}
          />
          <DetailRow label="Imported By" value={entry.importedBy} />
          <DetailRow
            label="Last Updated"
            value={new Date(entry.updatedAt).toLocaleString()}
          />
          {entry.updatedBy && <DetailRow label="Updated By" value={entry.updatedBy} />}
        </View>
      </ScrollView>

      {/* Disposition Picker Modal */}
      <Modal visible={showDispositionPicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowDispositionPicker(false)}
        >
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-lg font-semibold text-center mb-4">Select Disposition</Text>
            {DISPOSITION_OPTIONS.map((disposition) => (
              <Pressable
                key={disposition}
                onPress={() => handleDispositionSelect(disposition)}
                className="py-3 border-b border-gray-100 active:bg-gray-50"
              >
                <Text className="text-center text-base text-gray-900">{disposition}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowDispositionPicker(false)}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Product Type Picker Modal */}
      <Modal visible={showProductTypePicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowProductTypePicker(false)}
        >
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-lg font-semibold text-center mb-4">Select Product Type</Text>
            {PRODUCT_TYPE_OPTIONS.map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setEditedEntry((prev) => ({ ...prev, productType: type }));
                  setShowProductTypePicker(false);
                }}
                className="py-3 border-b border-gray-100 active:bg-gray-50"
              >
                <Text className="text-center text-base text-gray-900">{type}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowProductTypePicker(false)}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Bed Picker Modal */}
      <Modal visible={showBedPicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowBedPicker(false)}
        >
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-lg font-semibold text-center mb-4">Select Bed</Text>
            {BED_OPTIONS.map((bed) => (
              <Pressable
                key={bed}
                onPress={() => {
                  setEditedEntry((prev) => ({ ...prev, bed }));
                  setShowBedPicker(false);
                }}
                className="py-3 border-b border-gray-100 active:bg-gray-50"
              >
                <Text className="text-center text-base text-gray-900">Bed {bed}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowBedPicker(false)} className="py-3 mt-2">
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Issue Code Picker Modal */}
      <Modal visible={showIssueCodePicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowIssueCodePicker(false)}
        >
          <View className="bg-white rounded-t-2xl p-4 max-h-96">
            <Text className="text-lg font-semibold text-center mb-4">Select Issue Codes</Text>
            <ScrollView>
              {issueCodes
                .filter((c) => c.isActive)
                .map((code) => {
                  const isSelected = editedEntry.issueCodes?.includes(code.code);
                  return (
                    <Pressable
                      key={code.id}
                      onPress={() => toggleIssueCode(code.code)}
                      className={`py-3 px-4 border-b border-gray-100 flex-row justify-between items-center ${
                        isSelected ? 'bg-orange-50' : ''
                      }`}
                    >
                      <View>
                        <Text className="text-base text-gray-900 font-medium">{code.code}</Text>
                        <Text className="text-sm text-gray-500">{code.description}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#EA580C" />}
                    </Pressable>
                  );
                })}
            </ScrollView>
            <Pressable
              onPress={() => setShowIssueCodePicker(false)}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-blue-600">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Reject Code Picker Modal */}
      <Modal visible={showRejectCodePicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowRejectCodePicker(false)}
        >
          <View className="bg-white rounded-t-2xl p-4 max-h-96">
            <Text className="text-lg font-semibold text-center mb-4">Select Reject Codes</Text>
            <ScrollView>
              {rejectCodes
                .filter((c) => c.isActive)
                .map((code) => {
                  const isSelected = editedEntry.rejectCodes?.includes(code.code);
                  return (
                    <Pressable
                      key={code.id}
                      onPress={() => toggleRejectCode(code.code)}
                      className={`py-3 px-4 border-b border-gray-100 flex-row justify-between items-center ${
                        isSelected ? 'bg-red-50' : ''
                      }`}
                    >
                      <View>
                        <Text className="text-base text-gray-900 font-medium">{code.code}</Text>
                        <Text className="text-sm text-gray-500">{code.description}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#DC2626" />}
                    </Pressable>
                  );
                })}
            </ScrollView>
            <Pressable
              onPress={() => setShowRejectCodePicker(false)}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-blue-600">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
