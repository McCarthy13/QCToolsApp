import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import { useStrandPatternStore } from '../state/strandPatternStore';
import {
  QualityLogEntry,
  ProductType,
  BedNumber,
  BED_OPTIONS,
} from '../types/quality-log';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityLogImport'>;

// All product type options for selection
const ALL_PRODUCT_TYPES: ProductType[] = ['8048', '1047', '1247', '1250', '1647', '1648'];

interface ExtractedEntry {
  pourDate: string;
  jobNumber: string;
  markNumber: string;
  idNumber: string;
  length: string;
  width: number;
  thickness: number;
  designStrandPattern?: string;
  bed?: BedNumber;
}

interface ParsedScheduleResult {
  success: boolean;
  entries: ExtractedEntry[];
  pourDate: string;
  bed?: string;
  thickness?: number;
  error?: string;
}

// Piece ticket types
interface PieceTicket {
  page: number;
  jobNo: string | null;
  markNo: string | null;
}

interface ParsedPieceTicketsResult {
  success: boolean;
  tickets: PieceTicket[];
  pageCount: number;
  error?: string;
}

interface MatchedTicket extends PieceTicket {
  matchedEntryIds: string[]; // All entry IDs that match this ticket (can be multiple)
  matchedJobNumber: string | null;
  matchedMarkNumber: string | null;
  entriesWithoutTicket: number; // Count of matching entries that don't have a piece ticket yet
  entriesWithTicket: number; // Count of matching entries that already have a piece ticket
  isDuplicate: boolean; // true if this is a duplicate ticket in the PDF (same job/mark as earlier page)
  firstOccurrencePage: number | null; // Page number of the first occurrence if this is a duplicate
  shouldLinkToAll: boolean; // user's choice to link to all matching entries (including those with existing tickets)
}

export default function QualityLogImportScreen({ navigation }: Props) {
  const addEntries = useQualityLogStore((s) => s.addEntries);
  const getEntryByIdNumber = useQualityLogStore((s) => s.getEntryByIdNumber);
  const entries = useQualityLogStore((s) => s.entries);
  const updateEntry = useQualityLogStore((s) => s.updateEntry);

  // Strand pattern store
  const customPatterns = useStrandPatternStore((s) => s.customPatterns);
  const initializePatterns = useStrandPatternStore((s) => s.initialize);

  // Initialize strand patterns on mount
  useEffect(() => {
    initializePatterns();
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [pourDate, setPourDate] = useState<string>('');
  const [selectedBed, setSelectedBed] = useState<BedNumber | undefined>();

  // Selection flow state - collect metadata BEFORE file upload
  const [showBedPrompt, setShowBedPrompt] = useState(false);
  const [showProductTypePrompt, setShowProductTypePrompt] = useState(false);
  const [showCastStrandPatternPrompt, setShowCastStrandPatternPrompt] = useState(false);
  const [showMissingValuesPrompt, setShowMissingValuesPrompt] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | 'Mixed' | null>(null);
  const [selectedBottomStrandPattern, setSelectedBottomStrandPattern] = useState<string | null>(null);
  const [selectedTopStrandPattern, setSelectedTopStrandPattern] = useState<string | null>(null);

  // Get bottom strand patterns filtered by selected product type
  const availableBottomPatterns = useMemo(() => {
    if (!selectedProductType || selectedProductType === 'Mixed') {
      return [];
    }
    const filteredPatterns = customPatterns.filter(
      (p) => p.productType === selectedProductType && (p.position === 'Bottom' || p.position === 'Both')
    );
    const patternIds = [...new Set(filteredPatterns.map((p) => p.patternId))];
    return patternIds.sort();
  }, [customPatterns, selectedProductType]);

  // Get top strand patterns filtered by selected product type
  const availableTopPatterns = useMemo(() => {
    if (!selectedProductType || selectedProductType === 'Mixed') {
      return [];
    }
    const filteredPatterns = customPatterns.filter(
      (p) => p.productType === selectedProductType && (p.position === 'Top' || p.position === 'Both')
    );
    const patternIds = [...new Set(filteredPatterns.map((p) => p.patternId))];
    return patternIds.sort();
  }, [customPatterns, selectedProductType]);

  // No longer need pending file state - we collect metadata first, then pick file

  // Piece ticket state
  const [importMode, setImportMode] = useState<'schedule' | 'pieceTickets' | null>(null);
  const [pieceTicketFile, setPieceTicketFile] = useState<{ base64: string; name: string; mimeType: string } | null>(null);
  const [matchedTickets, setMatchedTickets] = useState<MatchedTicket[]>([]);
  const [showPieceTicketReview, setShowPieceTicketReview] = useState(false);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);

  // Editing state
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Calculate missing values
  const missingValuesInfo = useMemo(() => {
    const missing: { field: string; count: number; indices: number[] }[] = [];

    const fieldsToCheck = [
      { key: 'jobNumber', label: 'Job #' },
      { key: 'markNumber', label: 'Mark #' },
      { key: 'idNumber', label: 'ID #' },
      { key: 'length', label: 'Length' },
      { key: 'width', label: 'Width' },
      { key: 'thickness', label: 'Thickness' },
    ];

    for (const field of fieldsToCheck) {
      const indices: number[] = [];
      extractedEntries.forEach((entry, idx) => {
        const value = entry[field.key as keyof ExtractedEntry];
        if (value === undefined || value === null || value === '' || value === 0) {
          indices.push(idx);
        }
      });
      if (indices.length > 0) {
        missing.push({ field: field.label, count: indices.length, indices });
      }
    }

    return missing;
  }, [extractedEntries]);

  // Step 1: User clicks "Select Schedule File" - start by asking for Bed
  const handlePickDocument = () => {
    console.log('[QualityLogImport] Starting import flow - asking for bed first');
    setShowBedPrompt(true);
  };

  // Step 2: After bed selected, ask for product type
  const handleBedSelect = (bed: BedNumber) => {
    setSelectedBed(bed);
    setShowBedPrompt(false);
    setShowProductTypePrompt(true);
  };

  // Step 3: After product type selected, ask for cast strand pattern
  const handleProductTypeSelect = (type: ProductType | 'Mixed') => {
    setSelectedProductType(type);
    setShowProductTypePrompt(false);
    setShowCastStrandPatternPrompt(true);
  };

  // Step 4: After strand patterns selected, open file picker and process
  const handleStrandPatternsConfirm = async () => {
    // Bottom pattern is required
    if (!selectedBottomStrandPattern) {
      Alert.alert('Required', 'Please select a bottom strand pattern.');
      return;
    }

    setShowCastStrandPatternPrompt(false);

    // Now open file picker
    console.log('[QualityLogImport] Metadata collected, opening file picker...');
    console.log('[QualityLogImport] Bed:', selectedBed, 'Product Type:', selectedProductType);
    console.log('[QualityLogImport] Bottom Pattern:', selectedBottomStrandPattern, 'Top Pattern:', selectedTopStrandPattern);

    try {
      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        console.log('[QualityLogImport] Picker returned');
      } catch (pickerError: any) {
        console.log('[QualityLogImport] Picker threw error:', pickerError?.message || pickerError);
        Alert.alert('Picker Error', `Document picker failed: ${pickerError?.message || 'Unknown error'}`);
        resetImport();
        return;
      }

      if (result.canceled) {
        console.log('[QualityLogImport] User canceled picker');
        resetImport();
        return;
      }

      const file = result.assets?.[0];
      if (!file) {
        console.log('[QualityLogImport] No file in assets');
        Alert.alert('Error', 'No file was selected. Please try again.');
        resetImport();
        return;
      }

      console.log('[QualityLogImport] Selected file:', {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });

      setIsLoading(true);
      setLoadingMessage('Reading file...');

      // Read file as base64
      let base64;
      try {
        if (Platform.OS === 'web') {
          console.log('[QualityLogImport] Using web-specific file reading...');
          const response = await fetch(file.uri);
          const blob = await response.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });
        } else {
          base64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        console.log('[QualityLogImport] File read successfully, base64 length:', base64.length);
      } catch (fileError: any) {
        console.log('[QualityLogImport] File read error:', fileError?.message || fileError);
        Alert.alert('File Read Error', `Could not read file: ${fileError?.message || 'Unknown error'}`);
        setIsLoading(false);
        resetImport();
        return;
      }

      setLoadingMessage('Extracting data from schedule...');

      // Call Cloud Function with product type for better strand pattern matching
      console.log('[QualityLogImport] Calling parseSchedulePDF with productType:', selectedProductType);

      try {
        const functions = getFunctions(app);
        const parseSchedule = httpsCallable<
          { fileBase64: string; fileName: string; mimeType: string; productType?: string },
          ParsedScheduleResult
        >(functions, 'parseSchedulePDF');

        const response = await parseSchedule({
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.mimeType || 'application/pdf',
          productType: selectedProductType === 'Mixed' ? undefined : (selectedProductType as string),
        });

        console.log('[QualityLogImport] Cloud Function response received');

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to parse schedule');
        }

        const { entries, pourDate: extractedPourDate } = response.data;

        if (entries.length === 0) {
          Alert.alert('No Data Found', 'Could not extract any entries from the schedule. Please try a clearer scan.');
          setIsLoading(false);
          resetImport();
          return;
        }

        setExtractedEntries(entries);
        setPourDate(extractedPourDate);

        // Check for duplicate IDs
        const duplicates = entries
          .map((e) => e.idNumber)
          .filter((id) => getEntryByIdNumber(id) !== undefined);
        setDuplicateIds(duplicates);

        setIsLoading(false);

        // Check if there are missing values - if so, show warning before review
        if (missingValuesInfo.length > 0) {
          setShowMissingValuesPrompt(true);
        } else {
          setShowReview(true);
        }

      } catch (cloudFunctionError: any) {
        console.error('[QualityLogImport] Cloud Function error:', cloudFunctionError);
        setIsLoading(false);
        Alert.alert(
          'Import Error',
          `Failed to process schedule: ${cloudFunctionError?.message || 'Unknown error'}. Please try again.`
        );
        resetImport();
      }
    } catch (error: any) {
      console.error('Error importing schedule:', error);
      setIsLoading(false);
      Alert.alert('Import Error', error.message || 'Failed to import schedule. Please try again.');
      resetImport();
    }
  };

  const handleMissingValuesAcknowledged = () => {
    setShowMissingValuesPrompt(false);
    setShowReview(true);
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Importing entries...');

      // Filter out duplicates
      const entriesToImport = extractedEntries.filter(
        (e) => !duplicateIds.includes(e.idNumber)
      );

      if (entriesToImport.length === 0) {
        Alert.alert('No New Entries', 'All entries already exist in the system.');
        setIsLoading(false);
        return;
      }

      // Create full entries with product type, bed, and cast strand pattern
      // If "Mixed" was selected, don't set a product type (user will set individually)
      const fullEntries: Omit<QualityLogEntry, 'id' | 'importedAt' | 'updatedAt'>[] = entriesToImport.map((entry) => {
        const baseEntry = {
          pourDate: pourDate || entry.pourDate,
          jobNumber: entry.jobNumber,
          markNumber: entry.markNumber,
          idNumber: entry.idNumber,
          length: entry.length,
          width: entry.width,
          thickness: entry.thickness,
          bed: selectedBed,
          issueCodes: [] as string[],
          rejectCodes: [] as string[],
          importedBy: '',
        };

        // Only add optional fields if they have values (Firestore doesn't accept undefined)
        if (entry.designStrandPattern) {
          (baseEntry as any).designStrandPattern = entry.designStrandPattern;
        }
        // Combine bottom + top strand pattern in format: "117-70+T32-70"
        // Note: selectedTopStrandPattern already has "T" prefix (e.g., "T32-70")
        if (selectedBottomStrandPattern) {
          const castPattern = selectedTopStrandPattern
            ? `${selectedBottomStrandPattern}+${selectedTopStrandPattern}`
            : selectedBottomStrandPattern;
          (baseEntry as any).castStrandPattern = castPattern;
        }
        if (selectedProductType && selectedProductType !== 'Mixed') {
          (baseEntry as any).productType = selectedProductType as ProductType;
        }

        return baseEntry;
      });

      const importedIds = await addEntries(fullEntries);

      setIsLoading(false);

      Alert.alert(
        'Import Complete',
        `Successfully imported ${importedIds.length} entries.${
          duplicateIds.length > 0
            ? `\n\n${duplicateIds.length} duplicate entries were skipped.`
            : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving entries:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save entries. Please try again.');
    }
  };

  const resetImport = () => {
    setExtractedEntries([]);
    setPourDate('');
    setSelectedBed(undefined);
    setSelectedProductType(null);
    setSelectedBottomStrandPattern(null);
    setSelectedTopStrandPattern(null);
    setShowReview(false);
    setShowBedPrompt(false);
    setShowProductTypePrompt(false);
    setShowCastStrandPatternPrompt(false);
    setShowMissingValuesPrompt(false);
    setDuplicateIds([]);
    setEditingCell(null);
    setEditValue('');
    setImportMode(null);
    setPieceTicketFile(null);
    setMatchedTickets([]);
    setShowPieceTicketReview(false);
  };

  // Handle piece ticket import
  const handlePickPieceTickets = async () => {
    console.log('[QualityLogImport] handlePickPieceTickets called');
    try {
      console.log('[QualityLogImport] Opening document picker for piece tickets...');

      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf'],
          copyToCacheDirectory: true,
        });
        console.log('[QualityLogImport] Picker returned:', JSON.stringify(result, null, 2));
      } catch (pickerError: any) {
        console.error('[QualityLogImport] Picker error:', pickerError);
        Alert.alert('Picker Error', `Document picker failed: ${pickerError?.message || 'Unknown error'}`);
        return;
      }

      if (result.canceled) {
        console.log('[QualityLogImport] User canceled picker');
        return;
      }

      const file = result.assets?.[0];
      if (!file) {
        console.log('[QualityLogImport] No file in result.assets');
        Alert.alert('Error', 'No file was selected. Please try again.');
        return;
      }

      console.log('[QualityLogImport] Selected piece ticket file:', file.name, file.uri);

      setIsLoading(true);
      setLoadingMessage('Reading file...');
      setImportMode('pieceTickets');

      // Read file as base64
      let base64: string;
      try {
        if (Platform.OS === 'web') {
          console.log('[QualityLogImport] Reading file on web platform...');
          const response = await fetch(file.uri);
          const blob = await response.blob();
          console.log('[QualityLogImport] Blob size:', blob.size);
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              console.log('[QualityLogImport] Base64 length:', base64Data?.length);
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });
        } else {
          base64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        console.log('[QualityLogImport] File read successfully, base64 length:', base64?.length);
      } catch (readError: any) {
        console.error('[QualityLogImport] File read error:', readError);
        setIsLoading(false);
        Alert.alert('File Read Error', `Could not read file: ${readError?.message || 'Unknown error'}`);
        return;
      }

      setPieceTicketFile({ base64, name: file.name, mimeType: file.mimeType || 'application/pdf' });

      setLoadingMessage('Extracting Job # and Mark # from piece tickets (this may take a few minutes for large files)...');

      // Call Cloud Function to parse piece tickets
      // Note: Extended timeout because processing 40+ pages takes time with rate limiting
      const functions = getFunctions(app);
      const parsePieceTickets = httpsCallable<
        { fileBase64: string; fileName: string; mimeType: string },
        ParsedPieceTicketsResult
      >(functions, 'parsePieceTickets', { timeout: 540000 }); // 9 minute timeout to match function timeout

      const response = await parsePieceTickets({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.mimeType || 'application/pdf',
      });

      console.log('[QualityLogImport] Piece tickets response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to parse piece tickets');
      }

      const { tickets } = response.data;

      if (tickets.length === 0) {
        Alert.alert('No Data Found', 'Could not extract any piece tickets from the PDF.');
        setIsLoading(false);
        resetImport();
        return;
      }

      // Track which job+mark combinations have been seen to detect duplicates
      const seenJobMarkCombos = new Map<string, number>(); // key: "job-mark", value: first page number

      // Match tickets to existing entries - ONE ticket can match MULTIPLE entries
      const matched: MatchedTicket[] = tickets.map((ticket) => {
        // Check for duplicate ticket (same job+mark as an earlier page)
        const jobMarkKey = `${(ticket.jobNo || '').toLowerCase()}-${(ticket.markNo || '').toLowerCase()}`;
        const firstOccurrence = seenJobMarkCombos.get(jobMarkKey);
        const isDuplicate = firstOccurrence !== undefined;

        if (!isDuplicate && ticket.jobNo && ticket.markNo) {
          seenJobMarkCombos.set(jobMarkKey, ticket.page);
        }

        // Find ALL matching entries by Job # and Mark #
        // Job # might be partial (e.g., "5201" matches "255201")
        let matchingEntries: QualityLogEntry[] = [];

        if (ticket.jobNo && ticket.markNo) {
          matchingEntries = entries.filter((entry) => {
            const entryJobEnds = entry.jobNumber?.endsWith(ticket.jobNo || '');
            const entryJobEquals = entry.jobNumber === ticket.jobNo;
            const markMatches = entry.markNumber?.toUpperCase() === ticket.markNo?.toUpperCase();
            return (entryJobEnds || entryJobEquals) && markMatches;
          });
        }

        // Count entries with and without existing piece tickets
        const entriesWithoutTicket = matchingEntries.filter(e => !e.pieceTicketUrl).length;
        const entriesWithTicket = matchingEntries.filter(e => !!e.pieceTicketUrl).length;

        // Get job/mark from first matching entry (for display purposes)
        const firstMatch = matchingEntries[0];

        return {
          ...ticket,
          matchedEntryIds: matchingEntries.map(e => e.id),
          matchedJobNumber: firstMatch?.jobNumber || null,
          matchedMarkNumber: firstMatch?.markNumber || null,
          entriesWithoutTicket,
          entriesWithTicket,
          isDuplicate,
          firstOccurrencePage: isDuplicate ? firstOccurrence : null,
          shouldLinkToAll: false, // Default: only link to entries without existing tickets
        };
      });

      setMatchedTickets(matched);
      setIsLoading(false);
      setShowPieceTicketReview(true);

    } catch (error: any) {
      console.error('Error importing piece tickets:', error);
      setIsLoading(false);
      Alert.alert('Import Error', error.message || 'Failed to import piece tickets.');
      resetImport();
    }
  };

  // Upload individual PDF page to Firebase Storage and link to ALL matching entries
  const handleLinkPieceTickets = async () => {
    if (!pieceTicketFile) return;

    // Filter to non-duplicate tickets that have matches
    const ticketsToLink = matchedTickets.filter((t) =>
      !t.isDuplicate && t.matchedEntryIds.length > 0
    );

    if (ticketsToLink.length === 0) {
      Alert.alert('No Tickets to Link', 'No piece tickets have matching entries.');
      return;
    }

    // Calculate total entries to update
    const totalEntriesToUpdate = ticketsToLink.reduce((sum, t) => {
      // If shouldLinkToAll, link to all entries; otherwise only those without existing tickets
      const entriesToLink = t.shouldLinkToAll
        ? t.matchedEntryIds.length
        : t.entriesWithoutTicket;
      return sum + entriesToLink;
    }, 0);

    setIsLoading(true);
    setLoadingMessage(`Extracting and linking to ${totalEntriesToUpdate} entries...`);

    try {
      const functions = getFunctions(app);
      const extractAndUploadPdfPage = httpsCallable<
        { fileBase64: string; pageNumber: number; entryId: string; jobNumber: string | null; markNumber: string | null },
        { success: boolean; downloadUrl?: string; error?: string }
      >(functions, 'extractAndUploadPdfPage');

      let linkedCount = 0;
      let replacedCount = 0;
      let errorCount = 0;

      for (const ticket of ticketsToLink) {
        if (ticket.matchedEntryIds.length === 0) continue;

        setLoadingMessage(`Extracting page ${ticket.page}...`);

        try {
          // Extract the page ONCE and upload it
          const response = await extractAndUploadPdfPage({
            fileBase64: pieceTicketFile.base64,
            pageNumber: ticket.page,
            entryId: ticket.matchedEntryIds[0], // Use first entry ID for storage path
            jobNumber: ticket.matchedJobNumber,
            markNumber: ticket.matchedMarkNumber,
          });

          if (response.data.success && response.data.downloadUrl) {
            const pdfUrl = response.data.downloadUrl;

            // Find all matching entries to update
            const entriesToUpdate = entries.filter(e => ticket.matchedEntryIds.includes(e.id));

            // Link the same PDF URL to ALL matching entries
            for (const entry of entriesToUpdate) {
              // Skip entries that already have a ticket (unless shouldLinkToAll is true)
              if (entry.pieceTicketUrl && !ticket.shouldLinkToAll) {
                continue;
              }

              const isReplacing = !!entry.pieceTicketUrl;

              try {
                await updateEntry(entry.id, { pieceTicketUrl: pdfUrl });
                if (isReplacing) {
                  replacedCount++;
                  console.log(`[PieceTicket] Replaced ticket for entry ${entry.id} (${entry.jobNumber}-${entry.markNumber})`);
                } else {
                  linkedCount++;
                  console.log(`[PieceTicket] Linked page ${ticket.page} to entry ${entry.id} (${entry.jobNumber}-${entry.markNumber})`);
                }
              } catch (updateError: any) {
                console.error(`[PieceTicket] Failed to update entry ${entry.id}:`, updateError);
                errorCount++;
              }
            }
          } else {
            console.error(`[PieceTicket] Failed to extract page ${ticket.page}:`, response.data.error);
            errorCount++;
          }
        } catch (pageError: any) {
          console.error(`[PieceTicket] Error processing page ${ticket.page}:`, pageError);
          errorCount++;
        }
      }

      setIsLoading(false);

      // Build success message
      const parts = [];
      if (linkedCount > 0) {
        parts.push(`${linkedCount} new link${linkedCount !== 1 ? 's' : ''}`);
      }
      if (replacedCount > 0) {
        parts.push(`${replacedCount} replaced`);
      }
      const successMsg = parts.length > 0 ? parts.join(', ') : 'No changes made';

      if (errorCount > 0) {
        Alert.alert(
          'Import Partially Complete',
          `${successMsg}.\n${errorCount} failed to process.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Import Complete',
          `Successfully processed piece tickets: ${successMsg}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }

    } catch (error: any) {
      console.error('Error linking piece tickets:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to link piece tickets. Please try again.');
    }
  };

  // Start editing a cell
  const startEditing = (index: number, field: string, currentValue: string | number) => {
    setEditingCell({ index, field });
    setEditValue(String(currentValue ?? ''));
  };

  // Save edited value
  const saveEdit = () => {
    if (!editingCell) return;

    const { index, field } = editingCell;
    const updatedEntries = [...extractedEntries];
    const entry = { ...updatedEntries[index] };

    // Update the field based on type
    if (field === 'width' || field === 'thickness') {
      entry[field] = parseFloat(editValue) || 0;
    } else {
      (entry as any)[field] = editValue;
    }

    updatedEntries[index] = entry;
    setExtractedEntries(updatedEntries);
    setEditingCell(null);
    setEditValue('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Render an editable cell
  const renderEditableCell = (
    index: number,
    field: string,
    value: string | number | undefined,
    className: string,
    isDuplicate: boolean
  ) => {
    const isEditing = editingCell?.index === index && editingCell?.field === field;
    const displayValue = value ?? '-';
    const isMissing = value === undefined || value === null || value === '' || value === 0;

    if (isEditing) {
      return (
        <View className={className}>
          <TextInput
            value={editValue}
            onChangeText={setEditValue}
            onBlur={saveEdit}
            onSubmitEditing={saveEdit}
            autoFocus
            className="text-xs bg-blue-50 border border-blue-300 rounded px-1 py-0.5 text-gray-900"
            style={{ minHeight: 20 }}
          />
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => !isDuplicate && startEditing(index, field, value ?? '')}
        className={className}
      >
        <Text
          className={`text-xs ${
            isDuplicate
              ? 'text-red-400'
              : isMissing
              ? 'text-orange-500 italic'
              : 'text-gray-900'
          }`}
        >
          {isMissing ? '(tap to edit)' : displayValue}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Import</Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">{loadingMessage}</Text>
        </View>
      )}

      {/* Initial State - Two Options */}
      {!isLoading && !showReview && !showBedPrompt && !showProductTypePrompt && !showCastStrandPatternPrompt && !showMissingValuesPrompt && !showPieceTicketReview && (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, gap: 16 }}>
          {/* Import Pour Schedule */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 bg-blue-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="document-text-outline" size={28} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">Import Pour Schedule</Text>
                <Text className="text-sm text-gray-500">Extract piece info from schedule PDF</Text>
              </View>
            </View>
            <Text className="text-gray-600 text-sm mb-4">
              Upload a scanned PDF or photo of your pour schedule. The app will automatically extract job numbers, mark numbers, dimensions, and other piece information.
            </Text>
            <Pressable
              onPress={handlePickDocument}
              className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center justify-center active:bg-blue-700"
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">Select Schedule File</Text>
            </Pressable>
            <Text className="text-xs text-gray-400 mt-3 text-center">
              Supports PDF and image files (JPG, PNG)
            </Text>
          </View>

          {/* Import Piece Tickets */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="documents-outline" size={28} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">Import Piece Tickets</Text>
                <Text className="text-sm text-gray-500">Link piece tickets to existing entries</Text>
              </View>
            </View>
            <Text className="text-gray-600 text-sm mb-4">
              Upload a multi-page PDF containing piece tickets. Each page will be matched to existing entries by Job # and Mark #, and linked as an attachment.
            </Text>
            <Pressable
              onPress={handlePickPieceTickets}
              className="bg-green-600 px-6 py-3 rounded-xl flex-row items-center justify-center active:bg-green-700"
            >
              <Ionicons name="link-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">Select Piece Tickets PDF</Text>
            </Pressable>
            <Text className="text-xs text-gray-400 mt-3 text-center">
              PDF only - each page = one piece ticket
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Piece Ticket Review State */}
      {!isLoading && showPieceTicketReview && (
        <ScrollView className="flex-1">
          {/* Summary Card */}
          <View className="bg-white rounded-xl p-4 mt-4 mx-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">Piece Ticket Matching</Text>
            <View className="flex-row gap-4">
              <View className="flex-1 bg-gray-50 rounded-lg p-3">
                <Text className="text-xs text-gray-500">Total Pages</Text>
                <Text className="text-xl font-bold text-gray-900">{matchedTickets.length}</Text>
              </View>
              <View className="flex-1 bg-green-50 rounded-lg p-3">
                <Text className="text-xs text-gray-500">Will Link</Text>
                <Text className="text-xl font-bold text-green-600">
                  {matchedTickets.filter((t) => !t.isDuplicate && t.matchedEntryIds.length > 0).length}
                </Text>
              </View>
              <View className="flex-1 bg-yellow-50 rounded-lg p-3">
                <Text className="text-xs text-gray-500">Duplicates</Text>
                <Text className="text-xl font-bold text-yellow-600">
                  {matchedTickets.filter((t) => t.isDuplicate).length}
                </Text>
              </View>
              <View className="flex-1 bg-red-50 rounded-lg p-3">
                <Text className="text-xs text-gray-500">No Match</Text>
                <Text className="text-xl font-bold text-red-600">
                  {matchedTickets.filter((t) => !t.isDuplicate && t.matchedEntryIds.length === 0).length}
                </Text>
              </View>
            </View>
            {/* Total entries that will be updated */}
            <View className="mt-3 bg-blue-50 rounded-lg p-3">
              <Text className="text-xs text-gray-500">Total Entries to Update</Text>
              <Text className="text-xl font-bold text-blue-600">
                {matchedTickets
                  .filter((t) => !t.isDuplicate && t.matchedEntryIds.length > 0)
                  .reduce((sum, t) => sum + (t.shouldLinkToAll ? t.matchedEntryIds.length : t.entriesWithoutTicket), 0)}
              </Text>
            </View>
          </View>

          {/* Matched Tickets List */}
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">Extracted Tickets</Text>

            {/* Table Header */}
            <View className="flex-row bg-gray-800 py-2 px-3 rounded-t-lg">
              <Text style={{ width: 40, marginRight: 8 }} className="text-xs font-semibold text-white">Page</Text>
              <Text style={{ width: 70, marginRight: 8 }} className="text-xs font-semibold text-white">Job #</Text>
              <Text style={{ width: 60, marginRight: 8 }} className="text-xs font-semibold text-white">Mark #</Text>
              <Text className="flex-1 text-xs font-semibold text-white">Status</Text>
            </View>

            {/* Table Rows */}
            {matchedTickets.map((ticket, index) => (
              <View
                key={index}
                className={`flex-row py-3 px-3 border-b border-gray-200 ${
                  ticket.isDuplicate
                    ? 'bg-yellow-50'
                    : ticket.matchedEntryIds.length > 0
                      ? 'bg-green-50'
                      : 'bg-red-50'
                }`}
              >
                <Text style={{ width: 40, marginRight: 8 }} className="text-xs text-gray-900">{ticket.page}</Text>
                <Text style={{ width: 70, marginRight: 8 }} className="text-xs text-gray-900">{ticket.jobNo || '-'}</Text>
                <Text style={{ width: 60, marginRight: 8 }} className="text-xs text-gray-900">{ticket.markNo || '-'}</Text>
                <View className="flex-1">
                  {ticket.isDuplicate ? (
                    <View className="flex-row items-center">
                      <Ionicons name="copy-outline" size={14} color="#CA8A04" />
                      <Text className="text-xs text-yellow-700 ml-1">
                        Duplicate (see page {ticket.firstOccurrencePage})
                      </Text>
                    </View>
                  ) : ticket.matchedEntryIds.length > 0 ? (
                    <View>
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                        <Text className="text-xs text-green-700 ml-1">
                          {ticket.matchedEntryIds.length} {ticket.matchedEntryIds.length === 1 ? 'entry' : 'entries'} matched
                        </Text>
                      </View>
                      {ticket.entriesWithTicket > 0 && (
                        <Pressable
                          onPress={() => {
                            const updated = [...matchedTickets];
                            updated[index] = { ...ticket, shouldLinkToAll: !ticket.shouldLinkToAll };
                            setMatchedTickets(updated);
                          }}
                          className="flex-row items-center mt-1"
                        >
                          <Ionicons
                            name={ticket.shouldLinkToAll ? "checkbox" : "square-outline"}
                            size={14}
                            color={ticket.shouldLinkToAll ? "#EA580C" : "#9CA3AF"}
                          />
                          <Text className="text-xs text-orange-600 ml-1">
                            {ticket.entriesWithTicket} already have ticket{ticket.shouldLinkToAll ? ' (will replace)' : ''}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle" size={14} color="#DC2626" />
                      <Text className="text-xs text-red-700 ml-1">No matching entries</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6 mb-8 px-4">
            <Pressable
              onPress={resetImport}
              className="flex-1 bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleLinkPieceTickets}
              disabled={matchedTickets.filter((t) => !t.isDuplicate && t.matchedEntryIds.length > 0).length === 0}
              className={`flex-1 py-4 rounded-xl items-center ${
                matchedTickets.filter((t) => !t.isDuplicate && t.matchedEntryIds.length > 0).length > 0
                  ? 'bg-green-600 active:bg-green-700'
                  : 'bg-gray-300'
              }`}
            >
              <Text
                className={`font-semibold ${
                  matchedTickets.filter((t) => !t.isDuplicate && t.matchedEntryIds.length > 0).length > 0
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                Link {matchedTickets.filter((t) => !t.isDuplicate && t.matchedEntryIds.length > 0).length} Tickets
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Schedule Review State */}
      {!isLoading && showReview && (
        <ScrollView className="flex-1">
          {/* Summary Card */}
          <View className="bg-white rounded-xl p-4 mt-4 mx-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">Import Summary</Text>
            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-[100px]">
                <Text className="text-xs text-gray-500">Pour Date</Text>
                <Text className="text-base font-semibold text-gray-900">{pourDate || 'Unknown'}</Text>
              </View>
              <View className="flex-1 min-w-[100px]">
                <Text className="text-xs text-gray-500">Bed</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {selectedBed ? `Bed ${selectedBed}` : 'Not Set'}
                </Text>
              </View>
              <View className="flex-1 min-w-[100px]">
                <Text className="text-xs text-gray-500">Product Type</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {selectedProductType === 'Mixed' ? 'Mixed/Manual' : selectedProductType || 'Unknown'}
                </Text>
              </View>
              <View className="flex-1 min-w-[100px]">
                <Text className="text-xs text-gray-500">Bottom Pattern</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {selectedBottomStrandPattern || 'None'}
                </Text>
              </View>
              <View className="flex-1 min-w-[100px]">
                <Text className="text-xs text-gray-500">Top Pattern</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {selectedTopStrandPattern || 'None'}
                </Text>
              </View>
              <View className="flex-1 min-w-[100px]">
                <Text className="text-xs text-gray-500">Entries</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {extractedEntries.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Entries Header */}
          <View className="px-4 mt-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">Extracted Entries</Text>
              <Text className="text-xs text-gray-500">Tap cells to edit</Text>
            </View>

            {duplicateIds.length > 0 && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={18} color="#D97706" />
                  <Text className="text-yellow-700 ml-2 font-medium">
                    {duplicateIds.length} duplicate(s) will be skipped
                  </Text>
                </View>
                <Text className="text-yellow-600 text-xs mt-1">
                  IDs: {duplicateIds.join(', ')}
                </Text>
              </View>
            )}

            {missingValuesInfo.length > 0 && (
              <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color="#EA580C" />
                  <Text className="text-orange-700 ml-2 font-medium">
                    Some values could not be extracted
                  </Text>
                </View>
                <Text className="text-orange-600 text-xs mt-1">
                  {missingValuesInfo.map((m) => `${m.field}: ${m.count}`).join(', ')}
                </Text>
              </View>
            )}
          </View>

          {/* Entry List Preview - Full width horizontal scrolling table */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ flex: 1, minWidth: '100%' }}>
              {/* Header Row */}
              <View className="flex-row bg-gray-800 py-2 px-2">
                <Text className="w-24 text-xs font-semibold text-white px-1">Pour Date</Text>
                <Text className="w-20 text-xs font-semibold text-white px-1">Job #</Text>
                <Text className="w-16 text-xs font-semibold text-white px-1">Mark #</Text>
                <Text className="w-24 text-xs font-semibold text-white px-1">ID #</Text>
                <Text className="w-24 text-xs font-semibold text-white px-1">Length</Text>
                <Text className="w-16 text-xs font-semibold text-white px-1">Width</Text>
                <Text className="w-16 text-xs font-semibold text-white px-1">Thk</Text>
                <Text className="flex-1 min-w-[48px] text-xs font-semibold text-white px-1">Bed</Text>
              </View>
              {/* Data Rows */}
              {extractedEntries.map((entry, index) => {
                const isDuplicate = duplicateIds.includes(entry.idNumber);
                return (
                  <View
                    key={entry.idNumber || index}
                    className={`flex-row py-2 px-2 border-b border-gray-200 ${
                      isDuplicate ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    {renderEditableCell(index, 'pourDate', pourDate || entry.pourDate, 'w-24 px-1', isDuplicate)}
                    {renderEditableCell(index, 'jobNumber', entry.jobNumber, 'w-20 px-1', isDuplicate)}
                    {renderEditableCell(index, 'markNumber', entry.markNumber, 'w-16 px-1', isDuplicate)}
                    {renderEditableCell(index, 'idNumber', entry.idNumber, 'w-24 px-1', isDuplicate)}
                    {renderEditableCell(index, 'length', entry.length, 'w-24 px-1', isDuplicate)}
                    {renderEditableCell(index, 'width', entry.width ? `${entry.width}` : '', 'w-16 px-1', isDuplicate)}
                    {renderEditableCell(index, 'thickness', entry.thickness ? `${entry.thickness}` : '', 'w-16 px-1', isDuplicate)}
                    <View className="flex-1 min-w-[48px] px-1">
                      <Text className={`text-xs ${isDuplicate ? 'text-red-400' : 'text-gray-600'}`}>
                        {selectedBed || '-'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6 mb-8 px-4">
            <Pressable
              onPress={resetImport}
              className="flex-1 bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleImport}
              disabled={extractedEntries.length - duplicateIds.length === 0}
              className={`flex-1 py-4 rounded-xl items-center ${
                extractedEntries.length - duplicateIds.length > 0
                  ? 'bg-blue-600 active:bg-blue-700'
                  : 'bg-gray-300'
              }`}
            >
              <Text
                className={`font-semibold ${
                  extractedEntries.length - duplicateIds.length > 0
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                Import {extractedEntries.length - duplicateIds.length} Entries
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Bed Selection Modal */}
      <Modal visible={showBedPrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Select Bed Number
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              {extractedEntries.length} entries extracted. Which bed was this schedule for?
            </Text>

            <View className="flex-row flex-wrap justify-center gap-3">
              {BED_OPTIONS.map((bed) => (
                <Pressable
                  key={bed}
                  onPress={() => handleBedSelect(bed)}
                  className="w-16 h-16 bg-blue-600 rounded-xl items-center justify-center active:bg-blue-700"
                >
                  <Text className="text-white font-bold text-2xl">{bed}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Type Selection Modal */}
      <Modal visible={showProductTypePrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Select Product Type
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Please select the product type for this batch:
            </Text>

            <View className="gap-3">
              {ALL_PRODUCT_TYPES.map((type: ProductType) => (
                <Pressable
                  key={type}
                  onPress={() => handleProductTypeSelect(type)}
                  className="bg-blue-600 py-4 rounded-xl items-center active:bg-blue-700"
                >
                  <Text className="text-white font-bold text-lg">{type}</Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => handleProductTypeSelect('Mixed')}
                className="bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300 mt-2"
              >
                <Text className="text-gray-700 font-semibold">Mixed/Manual</Text>
                <Text className="text-gray-500 text-xs">
                  Mixed product types - enter individually
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cast Strand Pattern Selection Modal */}
      <Modal visible={showCastStrandPatternPrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6 max-h-[85%]">
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Select Strand Patterns
            </Text>
            <Text className="text-gray-600 text-center mb-4">
              Choose the strand patterns used for casting this bed:
            </Text>

            <ScrollView className="max-h-[400px]" showsVerticalScrollIndicator>
              {/* Bottom Strand Pattern - Required */}
              <View className="mb-6">
                <Text className="text-base font-semibold text-gray-900 mb-2">
                  Bottom Strand Pattern <Text className="text-red-500">*</Text>
                </Text>
                <View className="gap-2">
                  {availableBottomPatterns.length > 0 ? (
                    availableBottomPatterns.map((patternId: string) => (
                      <Pressable
                        key={patternId}
                        onPress={() => setSelectedBottomStrandPattern(patternId)}
                        className={`py-3 px-4 rounded-xl items-center border-2 ${
                          selectedBottomStrandPattern === patternId
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-gray-300 active:border-blue-400'
                        }`}
                      >
                        <Text className={`font-bold text-base ${
                          selectedBottomStrandPattern === patternId ? 'text-white' : 'text-gray-900'
                        }`}>
                          {patternId}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <View className="bg-gray-100 rounded-xl p-4 items-center">
                      <Text className="text-gray-600 text-center">
                        No bottom patterns for {selectedProductType}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Top Strand Pattern - Optional */}
              <View className="mb-4">
                <Text className="text-base font-semibold text-gray-900 mb-2">
                  Top Strand Pattern <Text className="text-gray-400">(optional)</Text>
                </Text>
                <View className="gap-2">
                  {availableTopPatterns.length > 0 ? (
                    <>
                      <Pressable
                        onPress={() => setSelectedTopStrandPattern(null)}
                        className={`py-3 px-4 rounded-xl items-center border-2 ${
                          selectedTopStrandPattern === null
                            ? 'bg-gray-600 border-gray-600'
                            : 'bg-white border-gray-300 active:border-gray-400'
                        }`}
                      >
                        <Text className={`font-semibold ${
                          selectedTopStrandPattern === null ? 'text-white' : 'text-gray-700'
                        }`}>
                          None / No Top Strand
                        </Text>
                      </Pressable>
                      {availableTopPatterns.map((patternId: string) => (
                        <Pressable
                          key={patternId}
                          onPress={() => setSelectedTopStrandPattern(patternId)}
                          className={`py-3 px-4 rounded-xl items-center border-2 ${
                            selectedTopStrandPattern === patternId
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300 active:border-blue-400'
                          }`}
                        >
                          <Text className={`font-bold text-base ${
                            selectedTopStrandPattern === patternId ? 'text-white' : 'text-gray-900'
                          }`}>
                            {patternId}
                          </Text>
                        </Pressable>
                      ))}
                    </>
                  ) : (
                    <View className="bg-gray-100 rounded-xl p-3 items-center">
                      <Text className="text-gray-500 text-center text-sm">
                        No top patterns available for {selectedProductType}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={resetImport}
                className="flex-1 bg-gray-200 py-4 rounded-xl items-center active:bg-gray-300"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleStrandPatternsConfirm}
                disabled={!selectedBottomStrandPattern}
                className={`flex-1 py-4 rounded-xl items-center ${
                  selectedBottomStrandPattern
                    ? 'bg-blue-600 active:bg-blue-700'
                    : 'bg-gray-300'
                }`}
              >
                <Text className={`font-semibold ${
                  selectedBottomStrandPattern ? 'text-white' : 'text-gray-500'
                }`}>
                  Upload Schedule
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Missing Values Warning Modal */}
      <Modal visible={showMissingValuesPrompt} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center">
                <Ionicons name="alert-circle" size={40} color="#EA580C" />
              </View>
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Missing Values Detected
            </Text>
            <Text className="text-gray-600 text-center mb-4">
              Some values could not be extracted from the schedule. You can edit them in the review screen.
            </Text>

            <View className="bg-orange-50 rounded-lg p-4 mb-6">
              {missingValuesInfo.map((info, idx) => (
                <View key={idx} className="flex-row justify-between py-1">
                  <Text className="text-orange-800 font-medium">{info.field}</Text>
                  <Text className="text-orange-600">{info.count} missing</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleMissingValuesAcknowledged}
              className="bg-blue-600 py-4 rounded-xl items-center active:bg-blue-700"
            >
              <Text className="text-white font-bold">Continue to Review</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
