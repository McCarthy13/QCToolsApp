import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { useAuthStore } from '../state/authStore';
import { useStrandPatternStore } from '../state/strandPatternStore';
import { useInsightsStore } from '../state/insightsStore';
import { reAuthenticateWithMicrosoft } from '../services/sharepoint';
import {
  QualityLogEntry,
  getStatusFromDisposition,
  DISPOSITION_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  BED_OPTIONS,
  ISSUE_CODE_OPTIONS,
  REJECT_CODE_OPTIONS,
  STATUS_OPTIONS,
  isValidLocation,
  Disposition,
  DispositionValue,
  ProductType,
  BedNumber,
  Attachment,
  AttachmentType,
} from '../types/quality-log';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogDashboard'>;

// Column filter types
type ColumnFilterType = 'pourDate' | 'disposition' | 'status' | 'approvalDate' | 'productType' |
  'jobNumber' | 'markNumber' | 'idNumber' | 'length' | 'width' | 'designStrandPattern' | 'castStrandPattern' | 'bed' | 'location' |
  'qualityComments' | 'engineer' | 'engineerFeedback' | 'issueCodes' | 'rejectCodes';

interface ColumnFilters {
  pourDate: string;
  disposition: string;
  status: string;
  approvalDate: string;
  productType: string;
  jobNumber: string;
  markNumber: string;
  idNumber: string;
  length: string;
  width: string;
  designStrandPattern: string;
  castStrandPattern: string;
  bed: string;
  location: string;
  qualityComments: string;
  engineer: string;
  engineerFeedback: string;
  issueCodes: string;
  rejectCodes: string;
}

export default function QualityLogDashboardScreen({ navigation }: Props) {
  const entries = useQualityLogStore((s) => s.entries);
  const initialize = useQualityLogStore((s) => s.initialize);
  const setDisposition = useQualityLogStore((s) => s.setDisposition);
  const updateEntry = useQualityLogStore((s) => s.updateEntry);
  const deleteEntry = useQualityLogStore((s) => s.deleteEntry);
  const clearAllEntries = useQualityLogStore((s) => s.clearAllEntries);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const customPatterns = useStrandPatternStore((s) => s.customPatterns);

  // Insights store
  const insightsSummary = useInsightsStore((s) => s.getSummary)(entries);
  const insightsLoading = useInsightsStore((s) => s.isLoading);
  const initializeInsights = useInsightsStore((s) => s.initialize);
  const checkAndTriggerAnalysis = useInsightsStore((s) => s.checkAndTriggerAnalysis);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    pourDate: '',
    disposition: '',
    status: '',
    approvalDate: '',
    productType: '',
    jobNumber: '',
    markNumber: '',
    idNumber: '',
    length: '',
    width: '',
    designStrandPattern: '',
    castStrandPattern: '',
    bed: '',
    location: '',
    qualityComments: '',
    engineer: '',
    engineerFeedback: '',
    issueCodes: '',
    rejectCodes: '',
  });

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState<ColumnFilterType | null>(null);
  const [filterInputValue, setFilterInputValue] = useState('');

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPickerModal, setShowPickerModal] = useState<{
    entryId: string;
    field: 'disposition' | 'productType' | 'bed' | 'castStrandPattern' | 'issueCodes' | 'rejectCodes';
  } | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedDispositions, setSelectedDispositions] = useState<string[]>([]);

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState<{ entry: QualityLogEntry } | null>(null);

  useEffect(() => {
    initialize();
    initializeInsights();
  }, []);

  // Check for auto-analysis when entries change
  useEffect(() => {
    if (entries.length > 0 && insightsSummary.pendingAnalysisDate) {
      checkAndTriggerAnalysis(entries);
    }
  }, [entries, insightsSummary.pendingAnalysisDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    initialize();
    setTimeout(() => setRefreshing(false), 1000);
  }, [initialize]);

  // Filter entries based on search and column filters
  const filteredEntries = entries.filter((entry) => {
    // Global search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        entry.idNumber?.toLowerCase().includes(query) ||
        entry.jobNumber?.toLowerCase().includes(query) ||
        entry.markNumber?.toLowerCase().includes(query) ||
        entry.engineer?.toLowerCase().includes(query) ||
        entry.qualityComments?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Column filters
    if (columnFilters.pourDate && !entry.pourDate?.toLowerCase().includes(columnFilters.pourDate.toLowerCase())) return false;
    if (columnFilters.disposition && entry.disposition !== columnFilters.disposition) return false;
    if (columnFilters.status && entry.status !== columnFilters.status) return false;
    if (columnFilters.approvalDate && !entry.approvalRejectionDate?.toLowerCase().includes(columnFilters.approvalDate.toLowerCase())) return false;
    if (columnFilters.productType && entry.productType !== columnFilters.productType) return false;
    if (columnFilters.jobNumber && !entry.jobNumber?.toLowerCase().includes(columnFilters.jobNumber.toLowerCase())) return false;
    if (columnFilters.markNumber && !entry.markNumber?.toLowerCase().includes(columnFilters.markNumber.toLowerCase())) return false;
    if (columnFilters.idNumber && !entry.idNumber?.toLowerCase().includes(columnFilters.idNumber.toLowerCase())) return false;
    if (columnFilters.length && !entry.length?.toLowerCase().includes(columnFilters.length.toLowerCase())) return false;
    if (columnFilters.width && entry.width?.toString() !== columnFilters.width) return false;
    if (columnFilters.designStrandPattern && !entry.designStrandPattern?.toLowerCase().includes(columnFilters.designStrandPattern.toLowerCase())) return false;
    if (columnFilters.castStrandPattern && !entry.castStrandPattern?.toLowerCase().includes(columnFilters.castStrandPattern.toLowerCase())) return false;
    if (columnFilters.bed && entry.bed !== columnFilters.bed) return false;
    if (columnFilters.location && !entry.location?.toLowerCase().includes(columnFilters.location.toLowerCase())) return false;
    if (columnFilters.qualityComments && !entry.qualityComments?.toLowerCase().includes(columnFilters.qualityComments.toLowerCase())) return false;
    if (columnFilters.engineer && !entry.engineer?.toLowerCase().includes(columnFilters.engineer.toLowerCase())) return false;
    if (columnFilters.engineerFeedback && !entry.engineerFeedback?.toLowerCase().includes(columnFilters.engineerFeedback.toLowerCase())) return false;
    if (columnFilters.issueCodes && !entry.issueCodes.some(code => code.includes(columnFilters.issueCodes))) return false;
    if (columnFilters.rejectCodes && !entry.rejectCodes.some(code => code.includes(columnFilters.rejectCodes))) return false;

    return true;
  });

  // Sort by pour date (newest first), then by ID number
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    // First sort by pour date
    const dateA = new Date(a.pourDate).getTime();
    const dateB = new Date(b.pourDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    // Then by ID number
    return (b.idNumber || '').localeCompare(a.idNumber || '');
  });

  const getStatusColor = (entry: QualityLogEntry): string => {
    if (!entry.disposition) return '#FFFFFF';
    const { color } = getStatusFromDisposition(entry.disposition);
    return color;
  };

  const handleDispositionChange = async (entry: QualityLogEntry, disposition: DispositionValue) => {
    try {
      await setDisposition(entry.id, disposition);
    } catch (error) {
      console.error('Error setting disposition:', error);
      Alert.alert('Error', 'Failed to update disposition');
    }
  };

  // Start inline editing for text fields
  const startEditing = (entryId: string, field: string, currentValue: string | number | undefined) => {
    setEditingCell({ entryId, field });
    setEditValue(String(currentValue ?? ''));
  };

  // Save inline edit
  const saveEdit = async () => {
    if (!editingCell) return;

    const { entryId, field } = editingCell;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    try {
      const updates: Partial<QualityLogEntry> = {};

      // Validate location format
      if (field === 'location' && editValue.trim() !== '') {
        if (!isValidLocation(editValue.trim())) {
          Alert.alert('Invalid Location', 'Location must be in format: (1-4)-(1-80)\nExample: 2-45');
          return;
        }
      }

      // Handle numeric fields
      if (field === 'width' || field === 'thickness') {
        (updates as any)[field] = parseFloat(editValue) || 0;
      } else {
        (updates as any)[field] = editValue;
      }

      await updateEntry(entryId, updates);
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }

    setEditingCell(null);
    setEditValue('');
  };

  // Cancel inline edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle picker selection
  const handlePickerSelect = async (value: string) => {
    if (!showPickerModal) return;

    const { entryId, field } = showPickerModal;

    try {
      if (field === 'disposition') {
        // Handle disposition selection
        const isYardCutCompatible = value === 'Yard Cut' || YARD_CUT_COMPATIBLE.includes(value);
        const hasYardCutCompatibleSelected = selectedDispositions.some(d => d === 'Yard Cut' || YARD_CUT_COMPATIBLE.includes(d));

        if (isYardCutCompatible && hasYardCutCompatibleSelected) {
          // Toggle Yard Cut compatible options (multi-select allowed)
          setSelectedDispositions((prev) => {
            if (prev.includes(value)) {
              return prev.filter((d) => d !== value);
            } else {
              // Filter out any non-compatible options and add the new one
              const compatiblePrev = prev.filter(d => d === 'Yard Cut' || YARD_CUT_COMPATIBLE.includes(d));
              return [...compatiblePrev, value];
            }
          });
          return; // Don't close modal yet
        } else if (!isYardCutCompatible) {
          // Non-compatible options (Ok to Ship, Not Cast, Repour) - single select, save immediately
          await setDisposition(entryId, value as Disposition);
          setShowPickerModal(null);
          setSelectedDispositions([]);
        } else {
          // First selection of a Yard Cut compatible option
          setSelectedDispositions([value]);
          return; // Don't close modal yet, allow adding Yard Cut
        }
      } else if (field === 'issueCodes' || field === 'rejectCodes') {
        // Multi-select: toggle the code
        setSelectedCodes((prev) =>
          prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
        );
        return; // Don't close modal for multi-select
      } else {
        const updates: Partial<QualityLogEntry> = {};
        (updates as any)[field] = value;
        await updateEntry(entryId, updates);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }

    setShowPickerModal(null);
  };

  // Save multi-select codes or dispositions
  const saveMultiSelectCodes = async () => {
    if (!showPickerModal) return;

    const { entryId, field } = showPickerModal;

    try {
      if (field === 'disposition') {
        // Save disposition(s) - join with comma if multiple
        const dispositionValue = selectedDispositions.join(', ');
        if (dispositionValue) {
          await setDisposition(entryId, dispositionValue as Disposition);
        }
        setSelectedDispositions([]);
      } else {
        const updates: Partial<QualityLogEntry> = {};
        (updates as any)[field] = selectedCodes;
        await updateEntry(entryId, updates);
        setSelectedCodes([]);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }

    setShowPickerModal(null);
  };

  // Open disposition picker with current values
  const openDispositionPicker = (entryId: string, currentDisposition: string | undefined) => {
    // Parse existing disposition (might be comma-separated)
    const dispositions = currentDisposition
      ? currentDisposition.split(', ').map(d => d.trim()).filter(d => d)
      : [];
    setSelectedDispositions(dispositions);
    setShowPickerModal({ entryId, field: 'disposition' });
  };

  // Open codes picker with current values
  const openCodesPicker = (entryId: string, field: 'issueCodes' | 'rejectCodes', currentCodes: string[]) => {
    setSelectedCodes([...currentCodes]);
    setShowPickerModal({ entryId, field });
  };

  // Upload photo to Firebase Storage
  const uploadPhoto = async (uri: string, entryId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `quality-log-attachments/${entryId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  // Add attachment to entry
  const addAttachment = async (entry: QualityLogEntry, type: AttachmentType, url: string, name: string) => {
    const newAttachment: Attachment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      url,
      name,
      createdAt: Date.now(),
      createdBy: currentUser?.email || undefined,
    };
    const existingAttachments = entry.attachments || [];
    await updateEntry(entry.id, { attachments: [...existingAttachments, newAttachment] });
  };

  // Handle taking a photo with camera
  const handleTakePhoto = async (entry: QualityLogEntry) => {
    const entryId = entry.id;
    console.log('[QualityLogDashboard] handleTakePhoto called for entry:', entryId);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[QualityLogDashboard] Camera permission status:', status);

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera access to take photos.');
        return;
      }

      console.log('[QualityLogDashboard] Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      console.log('[QualityLogDashboard] Camera result:', JSON.stringify({
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
      }));

      if (result.canceled) {
        console.log('[QualityLogDashboard] User cancelled camera');
        return;
      }

      if (!result.assets || !result.assets[0]) {
        console.log('[QualityLogDashboard] No assets returned from camera');
        Alert.alert('Error', 'No photo was captured. Please try again.');
        return;
      }

      const photoUri = result.assets[0].uri;
      console.log('[QualityLogDashboard] Photo URI:', photoUri?.substring(0, 50) + '...');

      console.log('[QualityLogDashboard] Uploading photo to Firebase Storage...');
      const downloadUrl = await uploadPhoto(photoUri, entryId);
      console.log('[QualityLogDashboard] Upload complete, URL:', downloadUrl?.substring(0, 50) + '...');

      const timestamp = new Date().toLocaleString();
      const newAttachment: Attachment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'photo' as AttachmentType,
        url: downloadUrl,
        name: `Photo ${timestamp}`,
        createdAt: Date.now(),
        createdBy: currentUser?.email || undefined,
      };

      // Get fresh entry from store to avoid stale closure
      const freshEntry = entries.find(e => e.id === entryId);
      const existingAttachments = freshEntry?.attachments || [];
      const allAttachments = [...existingAttachments, newAttachment];

      console.log('[QualityLogDashboard] Updating entry with', allAttachments.length, 'total attachments');
      await updateEntry(entryId, { attachments: allAttachments });

      console.log('[QualityLogDashboard] Photo added successfully');
      if (Platform.OS === 'web') {
        window.alert('Photo added successfully');
      } else {
        Alert.alert('Success', 'Photo added successfully');
      }
    } catch (error) {
      console.error('[QualityLogDashboard] Error in handleTakePhoto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[QualityLogDashboard] Error details:', errorMessage);
      if (Platform.OS === 'web') {
        window.alert(`Failed to upload photo: ${errorMessage}`);
      } else {
        Alert.alert('Error', `Failed to upload photo: ${errorMessage}`);
      }
    }
  };

  // Handle selecting photo from gallery
  const handleSelectFromGallery = async (entry: QualityLogEntry) => {
    console.log('[QualityLogDashboard] handleSelectFromGallery called for entry:', entry.id);
    console.log('[QualityLogDashboard] Platform:', Platform.OS);

    try {
      // On web, use native file input for better compatibility
      if (Platform.OS === 'web') {
        console.log('[QualityLogDashboard] Using web file input');

        // Capture entry ID before async operations to avoid stale closure
        const entryId = entry.id;
        const userEmail = currentUser?.email;

        // Create a hidden file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.style.display = 'none';

        // Add to DOM to ensure it works in all browsers
        document.body.appendChild(input);

        // Use a Promise-based approach for cleaner async handling
        const handleFiles = async (files: FileList) => {
          console.log('[QualityLogDashboard] handleFiles called with', files.length, 'files');

          try {
            const newAttachments: Attachment[] = [];

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              console.log(`[QualityLogDashboard] Processing file ${i + 1}:`, file.name, 'size:', file.size);

              // Upload to Firebase Storage
              const filename = `quality-log-attachments/${entryId}/${Date.now()}_${file.name}`;
              console.log(`[QualityLogDashboard] Uploading to:`, filename);
              const storageRef = ref(storage, filename);
              await uploadBytes(storageRef, file);
              const downloadUrl = await getDownloadURL(storageRef);

              console.log(`[QualityLogDashboard] Uploaded, got URL:`, downloadUrl.substring(0, 50) + '...');

              const newAttachment: Attachment = {
                id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'file' as AttachmentType,
                url: downloadUrl,
                name: file.name,
                createdAt: Date.now(),
                createdBy: userEmail || undefined,
              };

              newAttachments.push(newAttachment);
              console.log(`[QualityLogDashboard] File ${i + 1} processed successfully`);
            }

            // Get FRESH entry from store AFTER uploads complete to avoid stale data
            const currentEntries = useQualityLogStore.getState().entries;
            const freshEntry = currentEntries.find(e => e.id === entryId);
            const existingAttachments = freshEntry?.attachments || [];
            const allAttachments = [...existingAttachments, ...newAttachments];

            console.log('[QualityLogDashboard] Updating entry with', allAttachments.length, 'total attachments');
            await updateEntry(entryId, { attachments: allAttachments });

            console.log('[QualityLogDashboard] Entry updated successfully');
            window.alert(`Success: ${files.length} file(s) added successfully`);
          } catch (uploadError) {
            console.error('[QualityLogDashboard] Error uploading files:', uploadError);
            window.alert(`Error: Failed to upload files - ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        };

        // Use addEventListener for better reliability
        input.addEventListener('change', (e) => {
          console.log('[QualityLogDashboard] Input change event fired');
          const target = e.target as HTMLInputElement;
          const files = target.files;

          // Clean up input element
          document.body.removeChild(input);

          if (!files || files.length === 0) {
            console.log('[QualityLogDashboard] No files selected');
            return;
          }

          console.log('[QualityLogDashboard] Selected', files.length, 'files, starting upload...');

          // Call the async handler
          handleFiles(files).catch((err) => {
            console.error('[QualityLogDashboard] handleFiles error:', err);
          });
        });

        // Also handle cancel (user closes dialog without selecting)
        input.addEventListener('cancel', () => {
          console.log('[QualityLogDashboard] File dialog cancelled');
          document.body.removeChild(input);
        });

        // Trigger the file picker
        console.log('[QualityLogDashboard] Triggering file input click');
        input.click();
        return;
      }

      // Native platforms use expo-image-picker
      const entryId = entry.id;

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[QualityLogDashboard] Permission status:', status);

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to select photos.');
        return;
      }

      console.log('[QualityLogDashboard] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      console.log('[QualityLogDashboard] ImagePicker result:', JSON.stringify({
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
      }));

      if (result.canceled) {
        console.log('[QualityLogDashboard] User canceled selection');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('[QualityLogDashboard] No assets in result');
        Alert.alert('No Files Selected', 'Please select at least one file.');
        return;
      }

      console.log('[QualityLogDashboard] Selected', result.assets.length, 'assets, starting upload...');

      // Collect all new attachments first
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        console.log(`[QualityLogDashboard] Processing asset ${i + 1}:`, {
          uri: asset.uri?.substring(0, 50) + '...',
          fileName: asset.fileName,
        });

        const downloadUrl = await uploadPhoto(asset.uri, entryId);
        console.log(`[QualityLogDashboard] Uploaded asset ${i + 1}, got URL:`, downloadUrl?.substring(0, 50) + '...');

        const timestamp = new Date().toLocaleString();

        const newAttachment: Attachment = {
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'file' as AttachmentType,
          url: downloadUrl,
          name: asset.fileName || `File ${timestamp}`,
          createdAt: Date.now(),
          createdBy: currentUser?.email || undefined,
        };

        newAttachments.push(newAttachment);
        console.log(`[QualityLogDashboard] Asset ${i + 1} processed successfully`);
      }

      // Get FRESH entry from store to avoid stale closure
      const freshEntry = entries.find(e => e.id === entryId);
      const existingAttachments = freshEntry?.attachments || [];
      const allAttachments = [...existingAttachments, ...newAttachments];

      console.log('[QualityLogDashboard] Updating entry with', allAttachments.length, 'total attachments');

      // Update entry once with all new attachments
      await updateEntry(entryId, { attachments: allAttachments });

      console.log('[QualityLogDashboard] Entry updated successfully');
      Alert.alert('Success', `${result.assets.length} file(s) added successfully`);
    } catch (error) {
      console.error('[QualityLogDashboard] Error in handleSelectFromGallery:', error);
      Alert.alert('Error', `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Parse length string to number (e.g., "24'-3.75\"" -> 24.3125)
  const parseLengthToFeet = (lengthStr: string | undefined): number | undefined => {
    if (!lengthStr) return undefined;
    const match = lengthStr.match(/(\d+)'[-\s]*(\d+(?:\.\d+)?)"?/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseFloat(match[2]);
      return feet + (inches / 12);
    }
    return undefined;
  };

  // Convert feet to total inches for span (ProductDetails expects inches)
  const convertLengthToInches = (lengthStr: string | undefined): number | undefined => {
    const feet = parseLengthToFeet(lengthStr);
    if (feet === undefined) return undefined;
    return feet * 12;
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (entry: QualityLogEntry) => {
    const message = `Are you sure you want to delete this entry?\n\nID: ${entry.idNumber || 'N/A'}\nMark: ${entry.markNumber || 'N/A'}\nJob: ${entry.jobNumber || 'N/A'}`;

    if (Platform.OS === 'web') {
      // Use window.confirm for web
      const confirmed = window.confirm(message);
      if (confirmed) {
        try {
          await deleteEntry(entry.id);
        } catch (error) {
          console.error('Error deleting entry:', error);
          window.alert('Failed to delete entry');
        }
      }
    } else {
      // Use Alert.alert for native
      Alert.alert(
        'Delete Entry',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteEntry(entry.id);
              } catch (error) {
                console.error('Error deleting entry:', error);
                Alert.alert('Error', 'Failed to delete entry');
              }
            },
          },
        ]
      );
    }
  };

  // Handle deleting all entries (admin only, requires re-authentication)
  const handleDeleteAllEntries = async () => {
    if (!isAdmin) return;

    // Show initial confirmation modal
    setShowDeleteAllModal(true);
  };

  // Confirm and execute delete all after re-authentication
  const confirmDeleteAll = async () => {
    setShowDeleteAllModal(false);
    setIsDeletingAll(true);

    try {
      // Require Microsoft re-authentication
      const { success, error } = await reAuthenticateWithMicrosoft();

      if (!success) {
        if (Platform.OS === 'web') {
          window.alert(error || 'Re-authentication failed. Delete cancelled.');
        } else {
          Alert.alert('Authentication Failed', error || 'Re-authentication failed. Delete cancelled.');
        }
        setIsDeletingAll(false);
        return;
      }

      // User re-authenticated successfully, proceed with deletion
      await clearAllEntries();

      if (Platform.OS === 'web') {
        window.alert(`Successfully deleted all ${entries.length} entries.`);
      } else {
        Alert.alert('Success', `Successfully deleted all ${entries.length} entries.`);
      }
    } catch (error) {
      console.error('Error deleting all entries:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete entries. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete entries. Please try again.');
      }
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Navigate to Product Details (Slippage Identifier entry point) with pre-filled data
  const handleOpenSlippageIdentifier = (entry: QualityLogEntry) => {
    navigation.navigate('ProductDetails', {
      prefillData: {
        projectNumber: entry.jobNumber,
        markNumber: entry.markNumber,
        idNumber: entry.idNumber,
        span: convertLengthToInches(entry.length),
        pourDate: entry.pourDate,
        productType: entry.productType,
        productWidth: entry.width,
      },
      fromQualityLog: true,
      qualityEntryId: entry.id,
    });
  };

  // Column width definitions (in pixels) for consistent alignment
  const COLUMN_WIDTHS = {
    detail: 28,
    actions: 115, // Camera, gallery, slippage, delete buttons
    pourDate: 78,
    disposition: 85,
    status: 48,
    approvalDate: 85,
    productType: 50,
    jobNumber: 62,
    markNumber: 72,
    pieceTicket: 28,
    idNumber: 72,
    length: 72,
    width: 48,
    designStrandPattern: 110,
    castStrandPattern: 110,
    bed: 40,
    location: 58,
    qualityComments: 350,
    attachments: 36, // New attachments folder column
    engineer: 80,
    engineerFeedback: 280,
    issueCodes: 80,
    rejectCodes: 80,
  };

  // Subtle border style for cells
  const cellBorderStyle = { borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)' };

  // Render an editable text cell
  const renderEditableTextCell = (
    entry: QualityLogEntry,
    field: string,
    value: string | number | undefined,
    width: number
  ) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell?.field === field;
    const displayValue = value ?? '-';

    if (isEditing) {
      return (
        <View style={{ width, paddingHorizontal: 6, paddingVertical: 4, ...cellBorderStyle }}>
          <TextInput
            value={editValue}
            onChangeText={setEditValue}
            onBlur={saveEdit}
            onSubmitEditing={saveEdit}
            autoFocus
            className="text-sm bg-blue-50 border border-blue-300 rounded px-1 py-1 text-gray-900"
            style={{ minHeight: 24 }}
          />
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => startEditing(entry.id, field, value)}
        style={{ width, paddingHorizontal: 6, paddingVertical: 10, justifyContent: 'center', ...cellBorderStyle }}
      >
        <Text className="text-sm text-gray-900" numberOfLines={2}>{displayValue}</Text>
      </Pressable>
    );
  };

  // Render a picker cell (disposition, product type, bed, castStrandPattern)
  const renderPickerCell = (
    entry: QualityLogEntry,
    field: 'disposition' | 'productType' | 'bed' | 'castStrandPattern',
    value: string | undefined,
    width: number
  ) => {
    const displayValue = field === 'bed' && value ? `${value}` : value || '-';

    const handlePress = () => {
      if (field === 'disposition') {
        openDispositionPicker(entry.id, value);
      } else {
        setShowPickerModal({ entryId: entry.id, field });
      }
    };

    // Allow text wrapping for disposition field to show multi-select values
    const allowWrap = field === 'disposition';

    return (
      <Pressable
        onPress={handlePress}
        style={{ width, paddingHorizontal: 6, paddingVertical: 10, flexDirection: 'row', alignItems: allowWrap ? 'flex-start' : 'center', ...cellBorderStyle }}
      >
        <Text className="text-sm text-gray-900 flex-1" numberOfLines={allowWrap ? undefined : 1} style={allowWrap ? { flexWrap: 'wrap' } : undefined}>{displayValue}</Text>
        <Ionicons name="chevron-down" size={10} color="#9CA3AF" style={allowWrap ? { marginTop: 4 } : undefined} />
      </Pressable>
    );
  };

  // Calculate stats for metric cards
  const awaitingInspection = entries.filter((e) => e.disposition === 'Scheduled' || e.disposition?.includes('Scheduled')).length;
  const openWip = entries.filter((e) => e.disposition === 'WIP' || e.disposition?.includes('WIP')).length;
  const openEng = entries.filter((e) => e.disposition === 'Eng' || e.disposition?.includes('Eng')).length;
  const openYardCuts = entries.filter((e) => e.disposition === 'Yard Cut' || e.disposition?.includes('Yard Cut')).length;

  // Calculate most recent pour date before today
  // Pour dates are stored in MM/DD/YYYY format
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique pour dates with their parsed Date objects
  const pourDateMap = new Map<string, Date>();
  entries.forEach((e) => {
    if (e.pourDate) {
      const parsed = new Date(e.pourDate);
      if (!isNaN(parsed.getTime()) && parsed < today) {
        pourDateMap.set(e.pourDate, parsed);
      }
    }
  });

  // Find the most recent pour date string (in original format)
  let mostRecentPourDateStr: string | null = null;
  let mostRecentTime = 0;
  pourDateMap.forEach((date, dateStr) => {
    if (date.getTime() > mostRecentTime) {
      mostRecentTime = date.getTime();
      mostRecentPourDateStr = dateStr;
    }
  });

  // Get entries for most recent pour date (using original string format)
  const postPourEntries = mostRecentPourDateStr
    ? entries.filter((e) => e.pourDate === mostRecentPourDateStr)
    : [];
  const postPourStats = {
    total: postPourEntries.length,
    scheduled: postPourEntries.filter((e) => e.disposition === 'Scheduled' || e.disposition?.includes('Scheduled')).length,
    wip: postPourEntries.filter((e) => e.disposition === 'WIP' || e.disposition?.includes('WIP')).length,
    eng: postPourEntries.filter((e) => e.disposition === 'Eng' || e.disposition?.includes('Eng')).length,
    yardCut: postPourEntries.filter((e) => e.disposition === 'Yard Cut' || e.disposition?.includes('Yard Cut')).length,
  };

  // Handle metric card clicks to filter the log
  const handleMetricCardPress = (filterType: 'scheduled' | 'wip' | 'eng' | 'yardCut' | 'postPour') => {
    // Clear existing filters first
    const clearedFilters: ColumnFilters = {
      pourDate: '',
      disposition: '',
      status: '',
      approvalDate: '',
      productType: '',
      jobNumber: '',
      markNumber: '',
      idNumber: '',
      length: '',
      width: '',
      designStrandPattern: '',
      castStrandPattern: '',
      bed: '',
      location: '',
      qualityComments: '',
      engineer: '',
      engineerFeedback: '',
      issueCodes: '',
      rejectCodes: '',
    };

    switch (filterType) {
      case 'scheduled':
        setColumnFilters({ ...clearedFilters, disposition: 'Scheduled' });
        break;
      case 'wip':
        setColumnFilters({ ...clearedFilters, disposition: 'WIP' });
        break;
      case 'eng':
        setColumnFilters({ ...clearedFilters, disposition: 'Eng' });
        break;
      case 'yardCut':
        setColumnFilters({ ...clearedFilters, disposition: 'Yard Cut' });
        break;
      case 'postPour':
        if (mostRecentPourDateStr) {
          setColumnFilters({ ...clearedFilters, pourDate: mostRecentPourDateStr });
        }
        break;
    }
  };

  // Get picker options based on field
  const getPickerOptions = () => {
    if (!showPickerModal) return [];
    switch (showPickerModal.field) {
      case 'disposition':
        return DISPOSITION_OPTIONS;
      case 'productType':
        return PRODUCT_TYPE_OPTIONS;
      case 'bed':
        return BED_OPTIONS;
      case 'castStrandPattern':
        // Return unique strand pattern IDs from customPatterns
        return [...new Set(customPatterns.map(p => p.patternId))].sort();
      case 'issueCodes':
        return ISSUE_CODE_OPTIONS;
      case 'rejectCodes':
        return REJECT_CODE_OPTIONS;
      default:
        return [];
    }
  };

  const getPickerTitle = () => {
    if (!showPickerModal) return '';
    switch (showPickerModal.field) {
      case 'disposition':
        return 'Select Disposition';
      case 'productType':
        return 'Select Product Type';
      case 'bed':
        return 'Select Bed';
      case 'castStrandPattern':
        return 'Select Cast Strand Pattern';
      case 'issueCodes':
        return 'Select Issue Codes (tap to toggle)';
      case 'rejectCodes':
        return 'Select Reject Codes (tap to toggle)';
      default:
        return '';
    }
  };

  const isMultiSelect = showPickerModal?.field === 'issueCodes' || showPickerModal?.field === 'rejectCodes' || showPickerModal?.field === 'disposition';

  // Yard Cut can only be paired with these dispositions
  const YARD_CUT_COMPATIBLE = ['WIP', 'Scheduled', 'Eng'];

  // Check if a disposition option should be enabled based on current selections
  const isDispositionOptionEnabled = (option: string): boolean => {
    if (!showPickerModal || showPickerModal.field !== 'disposition') return true;

    // If nothing is selected, all options are enabled
    if (selectedDispositions.length === 0) return true;

    // If only one option is selected, allow selecting any other option
    // (user can always change their mind before saving)
    if (selectedDispositions.length === 1) {
      const currentSelection = selectedDispositions[0];

      // If current selection is Yard Cut compatible, allow Yard Cut to be added
      if (YARD_CUT_COMPATIBLE.includes(currentSelection) || currentSelection === 'Yard Cut') {
        // Allow the current selection, Yard Cut, and compatible options
        if (option === currentSelection || option === 'Yard Cut' || YARD_CUT_COMPATIBLE.includes(option)) {
          return true;
        }
      }

      // Always allow selecting any single option (to change the selection)
      return true;
    }

    // If multiple options are selected (Yard Cut combo), restrict to compatible options
    if (selectedDispositions.includes('Yard Cut')) {
      return option === 'Yard Cut' || YARD_CUT_COMPATIBLE.includes(option);
    }

    // For other multi-select scenarios, only allow already selected options
    return selectedDispositions.includes(option);
  };

  // Get filter options for dropdown columns
  const getFilterOptions = (column: ColumnFilterType): string[] => {
    switch (column) {
      case 'disposition':
        return ['', ...DISPOSITION_OPTIONS];
      case 'status':
        return ['', ...STATUS_OPTIONS];
      case 'productType':
        return ['', ...PRODUCT_TYPE_OPTIONS];
      case 'bed':
        return ['', ...BED_OPTIONS];
      default:
        return [];
    }
  };

  // Check if column uses dropdown filter
  const isDropdownFilter = (column: ColumnFilterType): boolean => {
    return ['disposition', 'status', 'productType', 'bed'].includes(column);
  };

  // Open filter modal
  const openFilterModal = (column: ColumnFilterType) => {
    setFilterInputValue(columnFilters[column]);
    setShowFilterModal(column);
  };

  // Apply filter
  const applyFilter = (value: string) => {
    if (showFilterModal) {
      setColumnFilters(prev => ({ ...prev, [showFilterModal]: value }));
    }
    setShowFilterModal(null);
    setFilterInputValue('');
  };

  // Render filterable header cell
  const renderFilterableHeader = (column: ColumnFilterType, label: string, width: number) => {
    const hasFilter = columnFilters[column] !== '';
    return (
      <Pressable
        onPress={() => openFilterModal(column)}
        style={{ width, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRightWidth: 1, borderRightColor: 'rgba(156, 163, 175, 0.4)' }}
      >
        <Text className="text-xs font-semibold text-white flex-1" style={{ flexWrap: 'wrap' }}>{label}</Text>
        <Ionicons
          name={hasFilter ? 'funnel' : 'funnel-outline'}
          size={10}
          color={hasFilter ? '#60a5fa' : '#9CA3AF'}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Loading overlay for delete all */}
      {isDeletingAll && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center">
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="mt-4 text-gray-900 font-medium">Deleting all entries...</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Quality Log</Text>
          <View className="flex-row gap-2">
            {isAdmin && (
              <Pressable
                onPress={handleDeleteAllEntries}
                className="bg-red-100 rounded-full p-2"
                disabled={entries.length === 0 || isDeletingAll}
              >
                <Ionicons name="trash" size={22} color={entries.length === 0 ? '#FCA5A5' : '#DC2626'} />
              </Pressable>
            )}
            {isAdmin && (
              <Pressable
                onPress={() => navigation.navigate('QualityLogAdmin' as any)}
                className="bg-gray-100 rounded-full p-2"
              >
                <Ionicons name="settings-outline" size={22} color="#374151" />
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('QualityLogImport' as any)}
              className="bg-blue-600 rounded-full p-2"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by ID, Job #, Mark #, Engineer..."
            className="flex-1 ml-2 text-base text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        {/* Metric Cards */}
        <View className="flex-row flex-wrap gap-2">
          {/* Awaiting Inspection */}
          <Pressable
            onPress={() => handleMetricCardPress('scheduled')}
            className="flex-1 min-w-[80px] bg-amber-50 rounded-lg p-2 border border-amber-200 active:bg-amber-100"
          >
            <Text className="text-xs text-amber-700">Awaiting Inspection</Text>
            <Text className="text-lg font-bold text-amber-600">{awaitingInspection}</Text>
          </Pressable>

          {/* Open WIP */}
          <Pressable
            onPress={() => handleMetricCardPress('wip')}
            className="flex-1 min-w-[80px] bg-blue-50 rounded-lg p-2 border border-blue-200 active:bg-blue-100"
          >
            <Text className="text-xs text-blue-700">Open WIP</Text>
            <Text className="text-lg font-bold text-blue-600">{openWip}</Text>
          </Pressable>

          {/* Open Eng */}
          <Pressable
            onPress={() => handleMetricCardPress('eng')}
            className="flex-1 min-w-[80px] bg-purple-50 rounded-lg p-2 border border-purple-200 active:bg-purple-100"
          >
            <Text className="text-xs text-purple-700">Open Eng</Text>
            <Text className="text-lg font-bold text-purple-600">{openEng}</Text>
          </Pressable>

          {/* Open Yard Cuts */}
          <Pressable
            onPress={() => handleMetricCardPress('yardCut')}
            className="flex-1 min-w-[80px] bg-orange-50 rounded-lg p-2 border border-orange-200 active:bg-orange-100"
          >
            <Text className="text-xs text-orange-700">Open Yard Cuts</Text>
            <Text className="text-lg font-bold text-orange-600">{openYardCuts}</Text>
          </Pressable>
        </View>

        {/* Post-Pour Report Card */}
        <Pressable
          onPress={() => handleMetricCardPress('postPour')}
          className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200 active:bg-slate-100"
          disabled={!mostRecentPourDateStr}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-slate-700">
              Post-Pour Report {mostRecentPourDateStr ? `(${mostRecentPourDateStr})` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
          {mostRecentPourDateStr ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[10px] text-slate-500">Total</Text>
                <Text className="text-sm font-bold text-slate-700">{postPourStats.total}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-amber-600">Awaiting</Text>
                <Text className="text-sm font-bold text-amber-600">{postPourStats.scheduled}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-blue-600">WIP</Text>
                <Text className="text-sm font-bold text-blue-600">{postPourStats.wip}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-purple-600">Eng</Text>
                <Text className="text-sm font-bold text-purple-600">{postPourStats.eng}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-orange-600">Yard Cut</Text>
                <Text className="text-sm font-bold text-orange-600">{postPourStats.yardCut}</Text>
              </View>
            </View>
          ) : (
            <Text className="text-xs text-slate-400">No pour data available</Text>
          )}
        </Pressable>

        {/* AI Insights Card */}
        <Pressable
          onPress={() => navigation.navigate('Insights')}
          className="mt-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200 active:bg-indigo-100"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="bg-indigo-100 rounded-full p-2 mr-3">
                <Ionicons name="sparkles" size={18} color="#6366F1" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-indigo-900">AI Insights</Text>
                {insightsSummary.topConcern ? (
                  <Text className="text-xs text-indigo-600" numberOfLines={1}>
                    {insightsSummary.topConcern}
                  </Text>
                ) : insightsSummary.pendingAnalysisDate ? (
                  <Text className="text-xs text-amber-600">
                    Analysis ready for {insightsSummary.pendingAnalysisDate}
                  </Text>
                ) : (
                  <Text className="text-xs text-gray-500">
                    Trend analysis & correlations
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {insightsLoading && (
                <ActivityIndicator size="small" color="#6366F1" />
              )}
              {insightsSummary.criticalTrends > 0 && (
                <View className="bg-red-100 px-2 py-0.5 rounded-full">
                  <Text className="text-red-700 text-xs font-bold">{insightsSummary.criticalTrends}</Text>
                </View>
              )}
              {insightsSummary.warningTrends > 0 && (
                <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                  <Text className="text-amber-700 text-xs font-bold">{insightsSummary.warningTrends}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#6366F1" />
            </View>
          </View>
        </Pressable>
      </View>

      {/* Active Filters Row */}
      {Object.values(columnFilters).some(v => v !== '') && (
        <View className="bg-white px-4 py-2 border-b border-gray-200">
          <View className="flex-row items-center flex-wrap gap-2">
            <Text className="text-xs text-gray-500 mr-1">Filters:</Text>
            {Object.entries(columnFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <Pressable
                  key={key}
                  onPress={() => setColumnFilters(prev => ({ ...prev, [key]: '' }))}
                  className="flex-row items-center bg-blue-100 rounded-full px-2 py-1"
                >
                  <Text className="text-xs text-blue-800 mr-1">{key}: {value}</Text>
                  <Ionicons name="close-circle" size={14} color="#1e40af" />
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setColumnFilters({
                pourDate: '', disposition: '', status: '', approvalDate: '', productType: '',
                jobNumber: '', markNumber: '', idNumber: '', length: '', width: '',
                designStrandPattern: '', castStrandPattern: '', bed: '',
                location: '', qualityComments: '', engineer: '', engineerFeedback: '',
                issueCodes: '', rejectCodes: '',
              })}
              className="ml-2"
            >
              <Text className="text-xs text-red-600">Clear All</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Editing hint */}
      <View className="bg-blue-50 px-4 py-2 border-b border-blue-100">
        <Text className="text-xs text-blue-600">Tap any cell to edit. Tap row icon for full details.</Text>
      </View>

      {/* Table */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Table Header */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ minWidth: '100%' }}
        >
          <View style={{ minWidth: '100%' }}>
            <View className="flex-row bg-gray-800 py-2 items-center" style={{ minWidth: '100%' }}>
              <Text style={{ width: COLUMN_WIDTHS.detail, paddingHorizontal: 4, paddingVertical: 4, borderRightWidth: 1, borderRightColor: 'rgba(156, 163, 175, 0.4)' }} className="text-xs font-semibold text-white"></Text>
              <Text style={{ width: COLUMN_WIDTHS.actions, paddingHorizontal: 8, paddingVertical: 4, borderRightWidth: 1, borderRightColor: 'rgba(156, 163, 175, 0.4)' }} className="text-xs font-semibold text-white">Actions</Text>
              {renderFilterableHeader('pourDate', 'Pour Date', COLUMN_WIDTHS.pourDate)}
              {renderFilterableHeader('disposition', 'Disposition', COLUMN_WIDTHS.disposition)}
              {renderFilterableHeader('status', 'Status', COLUMN_WIDTHS.status)}
              {renderFilterableHeader('approvalDate', 'Approval Date', COLUMN_WIDTHS.approvalDate)}
              {renderFilterableHeader('productType', 'Type', COLUMN_WIDTHS.productType)}
              {renderFilterableHeader('jobNumber', 'Job #', COLUMN_WIDTHS.jobNumber)}
              {renderFilterableHeader('markNumber', 'Mark #', COLUMN_WIDTHS.markNumber)}
              <Text style={{ width: COLUMN_WIDTHS.pieceTicket, paddingHorizontal: 4, paddingVertical: 4, borderRightWidth: 1, borderRightColor: 'rgba(156, 163, 175, 0.4)' }} className="text-xs font-semibold text-white"></Text>
              {renderFilterableHeader('idNumber', 'ID #', COLUMN_WIDTHS.idNumber)}
              {renderFilterableHeader('length', 'Length', COLUMN_WIDTHS.length)}
              {renderFilterableHeader('width', 'Width', COLUMN_WIDTHS.width)}
              {renderFilterableHeader('designStrandPattern', 'Design Strand Pattern', COLUMN_WIDTHS.designStrandPattern)}
              {renderFilterableHeader('castStrandPattern', 'Cast Strand Pattern', COLUMN_WIDTHS.castStrandPattern)}
              {renderFilterableHeader('bed', 'Bed', COLUMN_WIDTHS.bed)}
              {renderFilterableHeader('location', 'Location', COLUMN_WIDTHS.location)}
              {renderFilterableHeader('qualityComments', 'Quality Comments', COLUMN_WIDTHS.qualityComments)}
              <Text style={{ width: COLUMN_WIDTHS.attachments, paddingHorizontal: 4, paddingVertical: 4, borderRightWidth: 1, borderRightColor: 'rgba(156, 163, 175, 0.4)' }} className="text-xs font-semibold text-white"></Text>
              {renderFilterableHeader('engineer', 'Engineer', COLUMN_WIDTHS.engineer)}
              {renderFilterableHeader('engineerFeedback', 'Engineer Feedback', COLUMN_WIDTHS.engineerFeedback)}
              {renderFilterableHeader('issueCodes', 'Issue Codes', COLUMN_WIDTHS.issueCodes)}
              {renderFilterableHeader('rejectCodes', 'Reject Codes', COLUMN_WIDTHS.rejectCodes)}
            </View>

            {/* Table Rows */}
            {sortedEntries.length === 0 ? (
              <View className="py-12 px-4" style={{ minWidth: '100%' }}>
                <Text className="text-gray-500 text-center">
                  {searchQuery || Object.values(columnFilters).some(v => v !== '')
                    ? 'No entries match your filters'
                    : 'No entries yet. Tap + to import a schedule.'}
                </Text>
              </View>
            ) : (
              sortedEntries.map((entry, index) => (
                <View
                  key={entry.id}
                  className="flex-row border-b border-gray-200"
                  style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F3F4F6', minWidth: '100%' }}
                >
                  {/* Detail button */}
                  <Pressable
                    onPress={() => navigation.navigate('QualityLogDetail' as any, { entryId: entry.id })}
                    style={{ width: COLUMN_WIDTHS.detail, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)' }}
                  >
                    <Ionicons name="open-outline" size={14} color="#6B7280" />
                  </Pressable>

                  {/* Action buttons - Camera, Gallery, Slippage, Delete */}
                  <View style={{ width: COLUMN_WIDTHS.actions, paddingHorizontal: 4, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)' }}>
                    <Pressable
                      onPress={() => handleTakePhoto(entry)}
                      className="bg-blue-100 rounded-full p-1.5 active:bg-blue-200"
                    >
                      <Ionicons name="camera" size={16} color="#2563EB" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleSelectFromGallery(entry)}
                      className="bg-green-100 rounded-full p-1.5 active:bg-green-200"
                    >
                      <Ionicons name="images" size={16} color="#16A34A" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenSlippageIdentifier(entry)}
                      className="bg-purple-100 rounded-full p-1.5 active:bg-purple-200"
                    >
                      <Ionicons name="git-compare" size={16} color="#9333EA" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteEntry(entry)}
                      className="bg-red-100 rounded-full p-1.5 active:bg-red-200"
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </Pressable>
                  </View>

                  {/* Editable cells - New column order */}
                  {renderEditableTextCell(entry, 'pourDate', entry.pourDate, COLUMN_WIDTHS.pourDate)}
                  {renderPickerCell(entry, 'disposition', entry.disposition || 'Scheduled', COLUMN_WIDTHS.disposition)}
                  <View style={{ width: COLUMN_WIDTHS.status, paddingHorizontal: 8, paddingVertical: 10, backgroundColor: getStatusColor(entry), borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)', justifyContent: 'center' }}>
                    <Text className="text-sm font-bold text-gray-900">
                      {entry.status || '40'}
                    </Text>
                  </View>
                  <View style={{ width: COLUMN_WIDTHS.approvalDate, paddingHorizontal: 8, paddingVertical: 10, borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)', justifyContent: 'center' }}>
                    <Text className="text-sm text-gray-900">
                      {entry.approvalRejectionDate || '-'}
                    </Text>
                  </View>
                  {renderPickerCell(entry, 'productType', entry.productType, COLUMN_WIDTHS.productType)}
                  {renderEditableTextCell(entry, 'jobNumber', entry.jobNumber, COLUMN_WIDTHS.jobNumber)}
                  {renderEditableTextCell(entry, 'markNumber', entry.markNumber, COLUMN_WIDTHS.markNumber)}
                  {/* Piece Ticket PDF Icon */}
                  <Pressable
                    onPress={() => {
                      if (entry.pieceTicketUrl) {
                        Linking.openURL(entry.pieceTicketUrl);
                      }
                    }}
                    style={{ width: COLUMN_WIDTHS.pieceTicket, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)' }}
                    disabled={!entry.pieceTicketUrl}
                  >
                    {entry.pieceTicketUrl ? (
                      <Ionicons name="document-text" size={16} color="#3B82F6" />
                    ) : (
                      <View style={{ width: 16, height: 16 }} />
                    )}
                  </Pressable>
                  {renderEditableTextCell(entry, 'idNumber', entry.idNumber, COLUMN_WIDTHS.idNumber)}
                  {renderEditableTextCell(entry, 'length', entry.length, COLUMN_WIDTHS.length)}
                  {renderEditableTextCell(entry, 'width', entry.width ? `${entry.width}` : '', COLUMN_WIDTHS.width)}
                  {renderEditableTextCell(entry, 'designStrandPattern', entry.designStrandPattern, COLUMN_WIDTHS.designStrandPattern)}
                  {renderEditableTextCell(entry, 'castStrandPattern', entry.castStrandPattern, COLUMN_WIDTHS.castStrandPattern)}
                  {renderPickerCell(entry, 'bed', entry.bed, COLUMN_WIDTHS.bed)}
                  {renderEditableTextCell(entry, 'location', entry.location, COLUMN_WIDTHS.location)}
                  {renderEditableTextCell(entry, 'qualityComments', entry.qualityComments, COLUMN_WIDTHS.qualityComments)}
                  {/* Attachments folder icon */}
                  <Pressable
                    onPress={() => {
                      const attachmentCount = (entry.attachments?.length || 0) + (entry.photoUrls?.length || 0);
                      if (attachmentCount > 0) {
                        setShowAttachmentsModal({ entry });
                      }
                    }}
                    style={{ width: COLUMN_WIDTHS.attachments, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)' }}
                    disabled={(entry.attachments?.length || 0) + (entry.photoUrls?.length || 0) === 0}
                  >
                    {((entry.attachments?.length || 0) + (entry.photoUrls?.length || 0)) > 0 ? (
                      <View className="relative">
                        <Ionicons name="folder" size={18} color="#F59E0B" />
                        <View className="absolute -top-1 -right-2 bg-blue-600 rounded-full px-1 min-w-[14px] items-center">
                          <Text className="text-white text-[9px] font-bold">
                            {(entry.attachments?.length || 0) + (entry.photoUrls?.length || 0)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ width: 18, height: 18 }} />
                    )}
                  </Pressable>
                  {renderEditableTextCell(entry, 'engineer', entry.engineer, COLUMN_WIDTHS.engineer)}
                  {renderEditableTextCell(entry, 'engineerFeedback', entry.engineerFeedback, COLUMN_WIDTHS.engineerFeedback)}
                  <Pressable
                    onPress={() => openCodesPicker(entry.id, 'issueCodes', entry.issueCodes)}
                    style={{ width: COLUMN_WIDTHS.issueCodes, paddingHorizontal: 8, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(209, 213, 219, 0.5)' }}
                  >
                    <Text className="text-sm text-gray-900 flex-1" numberOfLines={1}>
                      {entry.issueCodes.length > 0 ? entry.issueCodes.join(', ') : '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={10} color="#9CA3AF" />
                  </Pressable>
                  <Pressable
                    onPress={() => openCodesPicker(entry.id, 'rejectCodes', entry.rejectCodes)}
                    style={{ width: COLUMN_WIDTHS.rejectCodes, paddingHorizontal: 8, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text className="text-sm text-gray-900 flex-1" numberOfLines={1}>
                      {entry.rejectCodes.length > 0 ? entry.rejectCodes.join(', ') : '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={10} color="#9CA3AF" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Picker Modal */}
      <Modal visible={!!showPickerModal} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => {
            if (isMultiSelect) {
              saveMultiSelectCodes();
            } else {
              setShowPickerModal(null);
            }
          }}
        >
          <Pressable className="bg-white rounded-t-2xl p-4 max-h-[70%]" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold flex-1 text-center">{getPickerTitle()}</Text>
              {isMultiSelect && (
                <Pressable
                  onPress={saveMultiSelectCodes}
                  className="bg-blue-600 px-4 py-2 rounded-lg absolute right-0"
                >
                  <Text className="text-white font-semibold">Done</Text>
                </Pressable>
              )}
            </View>
            {showPickerModal?.field === 'disposition' && selectedDispositions.length > 0 && (
              <View className="mb-3 pb-3 border-b border-gray-200">
                <Text className="text-xs text-gray-500 mb-1">Selected: {selectedDispositions.join(', ')}</Text>
              </View>
            )}
            {(showPickerModal?.field === 'issueCodes' || showPickerModal?.field === 'rejectCodes') && selectedCodes.length > 0 && (
              <View className="mb-3 pb-3 border-b border-gray-200">
                <Text className="text-xs text-gray-500 mb-1">Selected: {selectedCodes.sort((a, b) => Number(a) - Number(b)).join(', ')}</Text>
              </View>
            )}
            <ScrollView className="max-h-80">
              <View className="flex-row flex-wrap">
                {getPickerOptions().map((option) => {
                  const isDisposition = showPickerModal?.field === 'disposition';
                  const isCodeField = showPickerModal?.field === 'issueCodes' || showPickerModal?.field === 'rejectCodes';
                  const isSelected = isDisposition
                    ? selectedDispositions.includes(option)
                    : isCodeField
                    ? selectedCodes.includes(option)
                    : false;
                  const isEnabled = isDisposition ? isDispositionOptionEnabled(option) : true;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => isEnabled && handlePickerSelect(option)}
                      className={`py-2 px-3 m-1 rounded-lg ${
                        isSelected
                          ? 'bg-blue-600'
                          : !isEnabled
                          ? 'bg-gray-200'
                          : isMultiSelect
                          ? 'bg-gray-100'
                          : 'border-b border-gray-100'
                      }`}
                      style={!isMultiSelect && !isDisposition ? { width: '100%', marginHorizontal: 0 } : {}}
                      disabled={!isEnabled}
                    >
                      <Text
                        className={`text-center text-base ${
                          isSelected ? 'text-white' : !isEnabled ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {showPickerModal?.field === 'bed' ? `Bed ${option}` : option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            {showPickerModal?.field === 'disposition' && (
              <View className="mt-2 pb-2 border-b border-gray-100">
                <Text className="text-xs text-gray-400 text-center">Yard Cut can be combined with WIP, Scheduled, or Eng</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                setShowPickerModal(null);
                setSelectedCodes([]);
                setSelectedDispositions([]);
              }}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Column Filter Modal */}
      <Modal visible={!!showFilterModal} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => {
            setShowFilterModal(null);
            setFilterInputValue('');
          }}
        >
          <Pressable className="bg-white rounded-t-2xl p-4" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-semibold text-center mb-4">
              Filter by {showFilterModal?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Text>

            {showFilterModal && isDropdownFilter(showFilterModal) ? (
              // Dropdown filter for predefined options
              <ScrollView className="max-h-80">
                {getFilterOptions(showFilterModal).map((option) => (
                  <Pressable
                    key={option || 'all'}
                    onPress={() => applyFilter(option)}
                    className={`py-3 px-4 border-b border-gray-100 ${
                      columnFilters[showFilterModal] === option ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Text className={`text-base ${
                      columnFilters[showFilterModal] === option ? 'text-blue-600 font-semibold' : 'text-gray-900'
                    }`}>
                      {option || 'All (No Filter)'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              // Text input filter for free-text columns
              <View>
                <TextInput
                  value={filterInputValue}
                  onChangeText={setFilterInputValue}
                  placeholder="Enter filter value..."
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 mb-4"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => applyFilter('')}
                    className="flex-1 py-3 bg-gray-200 rounded-lg"
                  >
                    <Text className="text-center text-base text-gray-700">Clear</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => applyFilter(filterInputValue)}
                    className="flex-1 py-3 bg-blue-600 rounded-lg"
                  >
                    <Text className="text-center text-base text-white font-semibold">Apply</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable
              onPress={() => {
                setShowFilterModal(null);
                setFilterInputValue('');
              }}
              className="py-3 mt-2"
            >
              <Text className="text-center text-base text-red-600">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete All Confirmation Modal */}
      <Modal visible={showDeleteAllModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="bg-red-100 rounded-full p-3 mb-3">
                <Ionicons name="warning" size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">Delete All Entries?</Text>
            </View>

            <Text className="text-gray-600 text-center mb-2">
              This will permanently delete all {entries.length} entries from the Quality Log.
            </Text>
            <Text className="text-gray-600 text-center mb-4">
              You will be required to sign in with Microsoft again to confirm this action.
            </Text>

            <View className="bg-red-50 rounded-lg p-3 mb-6">
              <Text className="text-red-800 text-sm text-center font-medium">
                This action cannot be undone!
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDeleteAllModal(false)}
                className="flex-1 py-3 bg-gray-200 rounded-lg"
              >
                <Text className="text-center text-base text-gray-700 font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteAll}
                className="flex-1 py-3 bg-red-600 rounded-lg"
              >
                <Text className="text-center text-base text-white font-semibold">Delete All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attachments Modal */}
      <Modal visible={!!showAttachmentsModal} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowAttachmentsModal(null)}
        >
          <Pressable className="bg-white rounded-t-2xl p-4 max-h-[80%]" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">Attachments</Text>
                {showAttachmentsModal && (
                  <Text className="text-sm text-gray-500">
                    {showAttachmentsModal.entry.jobNumber} - {showAttachmentsModal.entry.markNumber}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => setShowAttachmentsModal(null)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView className="max-h-96">
              {showAttachmentsModal && (
                <>
                  {/* New attachments system */}
                  {showAttachmentsModal.entry.attachments?.map((attachment, index) => (
                    <Pressable
                      key={attachment.id}
                      onPress={() => Linking.openURL(attachment.url)}
                      className="flex-row items-center py-3 px-4 bg-gray-50 rounded-lg mb-2"
                    >
                      <View className="bg-white rounded-full p-2 mr-3">
                        <Ionicons
                          name={
                            attachment.type === 'photo' ? 'image' :
                            attachment.type === 'slippage-report' ? 'document-text' :
                            'document'
                          }
                          size={20}
                          color={
                            attachment.type === 'photo' ? '#2563EB' :
                            attachment.type === 'slippage-report' ? '#9333EA' :
                            '#16A34A'
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                          {attachment.name}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {attachment.type === 'photo' ? 'Photo' :
                           attachment.type === 'slippage-report' ? 'Slippage Report' : 'File'}
                          {' • '}
                          {new Date(attachment.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={18} color="#9CA3AF" />
                    </Pressable>
                  ))}

                  {/* Legacy photoUrls */}
                  {showAttachmentsModal.entry.photoUrls?.map((url, index) => (
                    <Pressable
                      key={`legacy-${index}`}
                      onPress={() => Linking.openURL(url)}
                      className="flex-row items-center py-3 px-4 bg-gray-50 rounded-lg mb-2"
                    >
                      <View className="bg-white rounded-full p-2 mr-3">
                        <Ionicons name="image" size={20} color="#2563EB" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                          Photo {index + 1}
                        </Text>
                        <Text className="text-xs text-gray-500">Legacy photo</Text>
                      </View>
                      <Ionicons name="open-outline" size={18} color="#9CA3AF" />
                    </Pressable>
                  ))}

                  {((showAttachmentsModal.entry.attachments?.length || 0) + (showAttachmentsModal.entry.photoUrls?.length || 0)) === 0 && (
                    <View className="py-8 items-center">
                      <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
                      <Text className="text-gray-400 mt-2">No attachments</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowAttachmentsModal(null)}
              className="py-3 mt-4 bg-gray-200 rounded-lg"
            >
              <Text className="text-center text-base text-gray-700">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
