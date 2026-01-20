import React, { useMemo, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { decimalToFraction, parseMeasurementInput } from "../utils/cn";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { useSlippageHistoryStore, SlippageRecord } from "../state/slippageHistoryStore";
import { useAuthStore } from "../state/authStore";
import { compareStrandPatterns } from "../utils/strandPatternComparison";
import ConfirmModal from "../components/ConfirmModal";
import CrossSection8048 from "../components/CrossSection8048";
import CrossSection1047 from "../components/CrossSection1047";
import CrossSection1247 from "../components/CrossSection1247";
import CrossSection1250 from "../components/CrossSection1250";
import { generateSlippagePDF, sharePDF } from "../utils/pdfGenerator";
import { captureRef } from "react-native-view-shot";
import {
  signInToMicrosoft,
  isSignedInToMicrosoft,
  getCurrentMicrosoftAccount,
  signOutFromMicrosoft,
  getSharePointFolderUrl,
  generateFolderName,
} from "../services/sharepoint";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../config/firebase";
import { Attachment, AttachmentType } from "../types/quality-log";

type SlippageSummaryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SlippageSummary"
>;
type SlippageSummaryScreenRouteProp = RouteProp<
  RootStackParamList,
  "SlippageSummary"
>;

interface Props {
  navigation: SlippageSummaryScreenNavigationProp;
  route: SlippageSummaryScreenRouteProp;
}

export default function SlippageSummaryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { slippages, config, fromQualityLog, qualityEntryId } = route.params;
  const { customPatterns } = useStrandPatternStore();
  const { addUserRecord, publishRecord } = useSlippageHistoryStore();
  const currentUser = useAuthStore((state) => state.currentUser);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharePointSignedIn, setIsSharePointSignedIn] = useState(false);
  const [microsoftAccount, setMicrosoftAccount] = useState<{ name?: string; username?: string } | null>(null);
  const [uploadToSharePoint, setUploadToSharePoint] = useState(true); // Auto-upload by default when signed in

  // Ref for capturing cross-section as image
  const crossSectionRef = useRef<View>(null);

  // Check SharePoint sign-in status on mount
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      checkSharePointStatus();
    }
  }, []);

  const checkSharePointStatus = async () => {
    try {
      const signedIn = await isSignedInToMicrosoft();
      setIsSharePointSignedIn(signedIn);
      if (signedIn) {
        const account = await getCurrentMicrosoftAccount();
        setMicrosoftAccount(account);
      }
    } catch (error) {
      console.error('[SharePoint] Error checking sign-in status:', error);
    }
  };

  const handleSharePointSignIn = async () => {
    try {
      const account = await signInToMicrosoft();
      setIsSharePointSignedIn(true);
      setMicrosoftAccount(account);
      Alert.alert('Success', `Signed in as ${account.name || account.username}`);
    } catch (error) {
      console.error('[SharePoint] Sign-in error:', error);
      Alert.alert('Error', `Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSharePointSignOut = async () => {
    try {
      await signOutFromMicrosoft();
      setIsSharePointSignedIn(false);
      setMicrosoftAccount(null);
      setUploadToSharePoint(false);
      Alert.alert('Success', 'Signed out from Microsoft 365');
    } catch (error) {
      console.error('[SharePoint] Sign-out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  // Save slippage report as attachment to quality log entry
  const saveSlippageReportAsAttachment = async (pdfBlob: Blob, fileName: string) => {
    if (!qualityEntryId) {
      console.log('[SlippageSummary] No qualityEntryId - skipping attachment save');
      return null;
    }

    try {
      console.log('[SlippageSummary] Saving slippage report as attachment for entry:', qualityEntryId);

      // Upload PDF to Firebase Storage
      const timestamp = Date.now();
      const storagePath = `quality-log-attachments/${qualityEntryId}/slippage-reports/${timestamp}_${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, pdfBlob);
      const downloadUrl = await getDownloadURL(storageRef);

      console.log('[SlippageSummary] PDF uploaded to Firebase Storage:', downloadUrl);

      // Create attachment object
      const newAttachment: Attachment = {
        id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'slippage-report' as AttachmentType,
        url: downloadUrl,
        name: fileName,
        createdAt: timestamp,
        createdBy: currentUser?.email || undefined,
      };

      // Get current entry and update attachments
      const entryRef = doc(firestore, 'quality-log-entries', qualityEntryId);
      const entrySnap = await getDoc(entryRef);

      if (!entrySnap.exists()) {
        console.error('[SlippageSummary] Quality log entry not found:', qualityEntryId);
        return null;
      }

      const existingAttachments = entrySnap.data()?.attachments || [];
      const updatedAttachments = [...existingAttachments, newAttachment];

      await updateDoc(entryRef, {
        attachments: updatedAttachments,
        updatedAt: timestamp,
        updatedBy: currentUser?.email || undefined,
      });

      console.log('[SlippageSummary] Attachment saved to quality log entry');
      return downloadUrl;
    } catch (error) {
      console.error('[SlippageSummary] Error saving slippage report as attachment:', error);
      return null;
    }
  };

  // Calculate normalized scale factor to make all cross-sections appear the same visual size
  // Base scale on the tallest product (12" for 1247/1250) to normalize visual size
  const getUniformScale = (baseScale: number) => {
    const BASE_HEIGHT = 12; // Use 12" as reference (tallest product)
    const productHeights: { [key: string]: number } = {
      '8048': 8,
      '1047': 10,
      '1247': 12,
      '1250': 12,
      '1648': 16,
      '1650': 16,
    };
    const currentHeight = productHeights[config.productType] || 12;
    // Scale inversely to height to maintain consistent visual size
    return baseScale * (BASE_HEIGHT / currentHeight);
  };

  // Helper function to format pattern display name with top pattern if present
  // Removes product type from display (e.g., "77-70 (8048)" becomes "77-70")
  const formatPatternName = (bottomPattern?: { name?: string }, topPattern?: { name?: string }) => {
    const stripProductType = (name?: string) => {
      if (!name) return undefined;
      // Remove product type in parentheses (e.g., " (8048)", " (1047)", etc.)
      return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
    };

    const bottomName = stripProductType(bottomPattern?.name);
    const topName = stripProductType(topPattern?.name);

    if (!bottomName && !topName) return undefined;
    if (!topName) return bottomName;
    if (!bottomName) return topName;
    return `${bottomName} + ${topName}`;
  };

  // Get the selected strand patterns (bottom and optionally top)
  // Use CAST patterns if available, otherwise fall back to DESIGN patterns
  const designPattern = customPatterns.find(p => p.id === config.strandPattern);
  const selectedPattern = config.castStrandPattern
    ? customPatterns.find(p => p.id === config.castStrandPattern)
    : designPattern;
  const selectedCastPattern = config.castStrandPattern
    ? customPatterns.find(p => p.id === config.castStrandPattern)
    : undefined;

  const designTopPattern = config.topStrandPattern
    ? customPatterns.find(p => p.id === config.topStrandPattern)
    : undefined;
  const selectedTopPattern = config.topCastStrandPattern
    ? customPatterns.find(p => p.id === config.topCastStrandPattern)
    : designTopPattern;
  const selectedTopCastPattern = config.topCastStrandPattern
    ? customPatterns.find(p => p.id === config.topCastStrandPattern)
    : undefined;

  // Compare design vs cast patterns
  const bottomPatternComparison = useMemo(() => {
    // If no cast pattern specified, patterns match
    if (!config.castStrandPattern) {
      return null;
    }
    return compareStrandPatterns(designPattern, selectedCastPattern, 'Bottom');
  }, [designPattern, selectedCastPattern, config.castStrandPattern]);

  const topPatternComparison = useMemo(() => {
    // Only compare if there are top patterns
    if (!config.topStrandPattern && !config.topCastStrandPattern) {
      return null;
    }

    // If both design and cast are specified, and cast differs from design, compare them
    if (config.topStrandPattern && config.topCastStrandPattern &&
        config.topStrandPattern !== config.topCastStrandPattern) {
      return compareStrandPatterns(designTopPattern, selectedTopCastPattern, 'Top');
    }

    // If only design pattern (no cast specified), patterns match (cast defaults to design)
    if (config.topStrandPattern && !config.topCastStrandPattern) {
      return null;
    }

    // If only cast pattern (no design specified), there's a difference
    // Design = "None", Cast = specified pattern
    if (!config.topStrandPattern && config.topCastStrandPattern) {
      return compareStrandPatterns(undefined, selectedTopCastPattern, 'Top');
    }

    return null;
  }, [designTopPattern, selectedTopCastPattern, config.topStrandPattern, config.topCastStrandPattern]);

  // Helper to get strand size by position
  const getStrandSize = (strandId: string): string => {
    // Check if it's a top strand (starts with T) or bottom strand (starts with B or is just a number)
    const isTopStrand = strandId.startsWith('T');
    const isBottomStrand = strandId.startsWith('B');

    // Extract the numeric part (remove T or B prefix if present)
    const numericId = isTopStrand || isBottomStrand
      ? strandId.substring(1)
      : strandId;
    const index = parseInt(numericId) - 1;

    // Get size from the appropriate pattern
    const pattern = isTopStrand ? selectedTopPattern : selectedPattern;
    const size = pattern?.strandSizes?.[index];
    return size ? `${size}"` : '';
  };

  // Save and publish handlers
  const handleSave = async () => {
    console.log('[SlippageSummaryScreen] ========== SAVE BUTTON PRESSED ==========');
    console.log('[SlippageSummaryScreen] Current user object:', JSON.stringify(currentUser, null, 2));
    console.log('[SlippageSummaryScreen] Current user ID:', currentUser?.id);
    console.log('[SlippageSummaryScreen] Current user ID type:', typeof currentUser?.id);
    console.log('[SlippageSummaryScreen] Current user email:', currentUser?.email);
    console.log('[SlippageSummaryScreen] Is user ID defined?:', currentUser?.id !== undefined);
    console.log('[SlippageSummaryScreen] Is user ID empty string?:', currentUser?.id === '');

    if (!currentUser || !currentUser.id || currentUser.id === '') {
      console.error('[SlippageSummaryScreen] ERROR: Cannot save - user ID is missing or empty!');
      console.error('[SlippageSummaryScreen] currentUser:', currentUser);
      alert('Error: User not logged in properly. Please sign out and sign back in.');
      return;
    }

    const record: SlippageRecord = {
      id: `slippage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      slippages,
      config,
      createdBy: currentUser?.email || 'Unknown',
      userId: currentUser?.id || '',
    };

    console.log('[SlippageSummaryScreen] Created record with userId:', record.userId);
    console.log('[SlippageSummaryScreen] Full record:', JSON.stringify(record, null, 2));

    try {
      await addUserRecord(record);
      console.log('[SlippageSummaryScreen] ✅ Record saved successfully!');
      setSaveSuccess(true);
      setShowSaveModal(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[SlippageSummaryScreen] ❌ Failed to save record:', error);
      alert(`Failed to save record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePublish = async () => {
    console.log('[SlippageSummaryScreen] ========== PUBLISH BUTTON PRESSED ==========');
    console.log('[SlippageSummaryScreen] Current user object:', JSON.stringify(currentUser, null, 2));
    console.log('[SlippageSummaryScreen] Current user ID:', currentUser?.id);
    console.log('[SlippageSummaryScreen] Current user email:', currentUser?.email);

    if (!currentUser || !currentUser.id || currentUser.id === '') {
      console.error('[SlippageSummaryScreen] ERROR: Cannot publish - user ID is missing or empty!');
      alert('Error: User not logged in properly. Please sign out and sign back in.');
      return;
    }

    const record: SlippageRecord = {
      id: `slippage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      slippages,
      config,
      createdBy: currentUser?.email || 'Unknown',
      userId: currentUser?.id || '',
    };

    console.log('[SlippageSummaryScreen] Publishing record with userId:', record.userId);

    try {
      await publishRecord(record, currentUser?.email || 'Unknown');
      console.log('[SlippageSummaryScreen] ✅ Record published successfully!');
      setPublishSuccess(true);
      setShowPublishModal(false);
      setTimeout(() => setPublishSuccess(false), 3000);
    } catch (error) {
      console.error('[SlippageSummaryScreen] ❌ Failed to publish record:', error);
      alert(`Failed to publish record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGeneratePDFReport = async () => {
    setIsGeneratingPDF(true);

    try {
      // Capture the cross-section diagram as an image
      let crossSectionImageUri: string | undefined;
      const isWeb = Platform.OS === 'web';

      if (crossSectionRef.current) {
        try {
          console.log('[PDF] Capturing cross-section...');
          console.log('[PDF] Platform:', isWeb ? 'web' : 'native');
          console.log('[PDF] crossSectionRef.current exists:', !!crossSectionRef.current);

          if (isWeb) {
            // On web, we need to use html2canvas directly since captureRef doesn't work
            console.log('[PDF] Using html2canvas for web...');

            // Dynamically import html2canvas
            const html2canvas = await import('html2canvas');

            // Find the actual DOM element - the ref.current might be a React Native component wrapper
            // We need to find the actual div element
            let element = crossSectionRef.current as any;

            // If it's a React Native component, try to get the underlying DOM element
            if (element._nativeTag || element._internalFiberInstanceHandleDEV) {
              // Try to find the rendered DOM element
              const container = document.querySelector('[data-testid="cross-section-container"]');
              if (container) {
                element = container;
                console.log('[PDF] Found cross-section container via selector');
              }
            }

            console.log('[PDF] Capturing element:', element);

            const canvas = await html2canvas.default(element, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              logging: false,
            });

            crossSectionImageUri = canvas.toDataURL('image/png');
            console.log('[PDF] Cross-section captured successfully via html2canvas');
            console.log('[PDF] Image URI length:', crossSectionImageUri?.length);
          } else {
            // On native, use captureRef
            crossSectionImageUri = await captureRef(crossSectionRef, {
              format: 'png',
              quality: 1.0,
            });
            console.log('[PDF] Cross-section captured successfully via captureRef');
          }
        } catch (captureError) {
          console.error('[PDF] Error capturing cross-section:', captureError);
          console.log('[PDF] Continuing without cross-section image');
          // Continue without the image if capture fails
          crossSectionImageUri = undefined;
        }
      } else {
        console.log('[PDF] No cross-section ref available');
      }

      // Get user's email and name
      const userEmail = currentUser?.email || 'unknown@example.com';
      const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown User';

      console.log('[PDF] Generating PDF...');
      // Generate the PDF
      const filePath = await generateSlippagePDF({
        slippages,
        config,
        slippageStats,
        userEmail,
        userName,
        crossSectionImageUri,
        getStrandSize,
        strandPatternName: formatPatternName(selectedPattern, selectedTopPattern),
        castStrandPatternName: formatPatternName(selectedCastPattern, selectedTopCastPattern),
        topStrandPatternName: selectedTopPattern?.name,
        topCastStrandPatternName: selectedTopCastPattern?.name,
        bottomPatternComparison,
        topPatternComparison,
        castStrandCoordinates: selectedPattern?.strandCoordinates,
        castTopStrandCoordinates: selectedTopPattern?.strandCoordinates,
        designStrandCoordinates: designPattern?.strandCoordinates,
        designTopStrandCoordinates: designTopPattern?.strandCoordinates,
        designStrandSizes: designPattern?.strandSizes,
        designTopStrandSizes: designTopPattern?.strandSizes,
        castStrandSizes: selectedPattern?.strandSizes,
        castTopStrandSizes: selectedTopPattern?.strandSizes,
        activeStrandIndices,
        activeTopStrandIndices,
        uploadToSharePoint: isSharePointSignedIn && uploadToSharePoint && Platform.OS === 'web',
        // Callback to save PDF as attachment to quality log entry
        onPdfBlobCreated: qualityEntryId ? async (blob, filename) => {
          try {
            await saveSlippageReportAsAttachment(blob, filename);
          } catch (err) {
            console.error('[PDF] Error saving attachment:', err);
          }
        } : undefined,
      });

      if (filePath) {
        console.log('[PDF] PDF generated successfully:', filePath);

        // Handle different web responses
        if (filePath.startsWith('web-pdf-downloaded-sharepoint:')) {
          // Extract SharePoint URL
          const sharePointUrl = filePath.replace('web-pdf-downloaded-sharepoint:', '');
          console.log('[PDF] PDF uploaded to SharePoint:', sharePointUrl);

          // Generate folder URL for easier navigation
          const folderName = generateFolderName(
            config.projectNumber || '',
            config.markNumber || '',
            config.idNumber || ''
          );
          const folderUrl = getSharePointFolderUrl(folderName);

          Alert.alert(
            'PDF Saved Successfully',
            `The slippage report has been:\n\n✓ Downloaded to your computer\n✓ Uploaded to SharePoint folder: ${folderName}\n\nWould you like to open the SharePoint folder?`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Open Folder',
                onPress: () => {
                  if (Platform.OS === 'web') {
                    window.open(folderUrl, '_blank');
                  }
                },
              },
            ]
          );
        } else if (filePath === 'web-pdf-downloaded') {
          console.log('[PDF] PDF downloaded successfully on web');
          Alert.alert(
            'PDF Downloaded',
            'The slippage report has been downloaded to your Downloads folder.'
          );
        } else if (filePath === 'web-print-dialog-opened') {
          console.log('[PDF] Web print dialog opened - user can save as PDF from browser');
          Alert.alert(
            'Print Dialog Opened',
            'Use your browser\'s print dialog to save the report as PDF. Select "Save as PDF" as the printer destination.'
          );
        } else {
          // On native platforms, share the PDF file
          await sharePDF(filePath);
          console.log('[PDF] PDF shared successfully');
        }
      } else {
        console.log('[PDF] Failed to generate PDF - no file path returned');
        Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
      }
    } catch (error) {
      console.error('[PDF] Error generating/sharing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PDF] Error details:', errorMessage);

      // Provide more helpful error message
      if (errorMessage.includes('C++') || errorMessage.includes('exception')) {
        Alert.alert(
          'PDF Generation Error',
          'There was an issue processing the image. The PDF may have been generated without the cross-section diagram. Please try again.'
        );
      } else {
        Alert.alert('Error', `Failed to generate or share PDF report: ${errorMessage}`);
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Calculate all slippage statistics
  const slippageStats = useMemo(() => {
    // Parse all values to decimals and track exceeds flags
    const parsedValues = slippages.map((s) => ({
      strandId: s.strandId,
      end1Raw: parseMeasurementInput(s.leftSlippage),
      end2Raw: parseMeasurementInput(s.rightSlippage),
      end1Exceeds: s.leftExceedsOne,
      end2Exceeds: s.rightExceedsOne,
      // When exceeds is true, use 1.0 for calculations, otherwise use the parsed value
      end1: s.leftExceedsOne ? 1.0 : (parseMeasurementInput(s.leftSlippage) ?? 0),
      end2: s.rightExceedsOne ? 1.0 : (parseMeasurementInput(s.rightSlippage) ?? 0),
    }));

    // Check if any value exceeds 1"
    const anyEnd1Exceeds = parsedValues.some((v) => v.end1Exceeds);
    const anyEnd2Exceeds = parsedValues.some((v) => v.end2Exceeds);
    const anyValueExceeds = anyEnd1Exceeds || anyEnd2Exceeds;

    // Get values for calculations (using the adjusted values that account for >1")
    // Include ALL strands, even those with 0 slippage
    const end1Values = parsedValues
      .map((v) => v.end1)
      .filter((v): v is number => v !== null && !isNaN(v));
    const end2Values = parsedValues
      .map((v) => v.end2)
      .filter((v): v is number => v !== null && !isNaN(v));
    const allValues = [...end1Values, ...end2Values];

    // Total slippage (all values) - now includes 1.0 for any >1" values
    const totalSlippage = allValues.reduce((sum, val) => sum + val, 0);

    // Total slippage per end - now includes 1.0 for any >1" values
    const totalSlippageEnd1 = end1Values.reduce((sum, val) => sum + val, 0);
    const totalSlippageEnd2 = end2Values.reduce((sum, val) => sum + val, 0);

    // Total slippage per strand with exceeds tracking
    const strandTotals = parsedValues.map((v) => {
      return {
        strandId: v.strandId,
        total: v.end1 + v.end2, // Uses the adjusted values (1.0 if exceeds)
        exceeds: v.end1Exceeds || v.end2Exceeds,
      };
    });

    // Average calculations - now includes all active strands (including those with 0 slippage)
    const totalAvgSlippage =
      allValues.length > 0 ? totalSlippage / allValues.length : 0;
    const totalAvgSlippageEnd1 =
      end1Values.length > 0 ? totalSlippageEnd1 / end1Values.length : 0;
    const totalAvgSlippageEnd2 =
      end2Values.length > 0 ? totalSlippageEnd2 / end2Values.length : 0;

    return {
      totalSlippage,
      totalSlippageEnd1,
      totalSlippageEnd2,
      strandTotals,
      totalAvgSlippage,
      totalAvgSlippageEnd1,
      totalAvgSlippageEnd2,
      anyValueExceeds,
      anyEnd1Exceeds,
      anyEnd2Exceeds,
    };
  }, [slippages]);

  // Calculate active strand indices for the cross-section
  const activeStrandIndices = useMemo(() => {
    if (!selectedPattern || !selectedPattern.strandCoordinates || !config.productWidth || !config.productSide) {
      return null;
    }

    const { strandCoordinates } = selectedPattern;
    const { productWidth, productSide } = config;

    // The x coordinates are already positions in the full product (0" to 48")
    // Strands are at x=2" to x=46" within the 48" product
    const minX = Math.min(...strandCoordinates.map(c => c.x));
    const maxX = Math.max(...strandCoordinates.map(c => c.x));
    const fullProductWidth = maxX + 2; // Rightmost strand + 2" concrete cover

    console.log('[SlippageSummary] Calculating active strands:');
    console.log('  Strand positions:', `x=${minX}" to x=${maxX}"`);
    console.log('  Full product width:', fullProductWidth);
    console.log('  Cut product width:', productWidth);
    console.log('  Product side:', productSide);
    console.log('  Total strands:', strandCoordinates.length);

    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;
      if (productSide === 'L1') {
        // L1 is kept (left side) - keep strands from 0 to productWidth
        isActive = coord.x <= productWidth;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping 0-${productWidth}")`);
      } else if (productSide === 'L2') {
        // L2 is kept (right side) - keep strands from (fullProductWidth - productWidth) to fullProductWidth
        const cutPosition = fullProductWidth - productWidth;
        isActive = coord.x >= cutPosition;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping ${cutPosition}-${fullProductWidth}")`);
      }
      if (isActive) {
        activeIndices.push(index + 1); // Convert to 1-based
      }
    });

    console.log('[SlippageSummary] Active strand count:', activeIndices.length);
    console.log('[SlippageSummary] Active strand indices:', activeIndices);

    return activeIndices;
  }, [selectedPattern, config.productWidth, config.productSide]);

  // Calculate active top strand indices for the cross-section
  const activeTopStrandIndices = useMemo(() => {
    if (!selectedTopPattern || !selectedTopPattern.strandCoordinates || !config.productWidth || !config.productSide) {
      return null;
    }

    const { strandCoordinates } = selectedTopPattern;
    const { productWidth, productSide } = config;

    const minX = Math.min(...strandCoordinates.map(c => c.x));
    const maxX = Math.max(...strandCoordinates.map(c => c.x));
    const fullProductWidth = maxX + 2;

    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;
      if (productSide === 'L1') {
        isActive = coord.x <= productWidth;
      } else if (productSide === 'L2') {
        const cutPosition = fullProductWidth - productWidth;
        isActive = coord.x >= cutPosition;
      }
      if (isActive) {
        activeIndices.push(index + 1); // Convert to 1-based
      }
    });

    return activeIndices;
  }, [selectedTopPattern, config.productWidth, config.productSide]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header - More compact */}
        <View className="px-6 py-3 border-b border-gray-200">
          <Text className="text-gray-900 text-xl font-bold">
            Slippage Summary
          </Text>
        </View>

        {/* Cross-section diagram - Show side-by-side if design differs from cast */}
        {(bottomPatternComparison?.hasDifferences || topPatternComparison?.hasDifferences) ? (
          <View className="px-6 mb-3">
            <Text className="text-gray-900 text-base font-semibold mb-3">
              Design vs Cast Pattern Comparison
            </Text>

            {/* Side-by-side cross-sections */}
            <View
              ref={crossSectionRef}
              collapsable={false}
              // @ts-ignore
              data-testid="cross-section-container"
            >
              <View className="flex-row gap-2">
                {/* Design Pattern */}
                <View className="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Text className="text-gray-900 text-4xl font-bold mb-1 text-center">
                    DESIGN PATTERN
                  </Text>
                  <Text className="text-gray-700 text-3xl mb-2 text-center">
                    {formatPatternName(designPattern, designTopPattern)}
                  </Text>
                  {config.productType === '1047' ? (
                    <CrossSection1047
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={designPattern?.strandCoordinates}
                      bottomStrandSizes={designPattern?.strandSizes}
                      topStrandCoordinates={designTopPattern?.strandCoordinates}
                      topStrandSizes={designTopPattern?.strandSizes}
                    />
                  ) : config.productType === '1247' ? (
                    <CrossSection1247
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={designPattern?.strandCoordinates}
                      bottomStrandSizes={designPattern?.strandSizes}
                      topStrandCoordinates={designTopPattern?.strandCoordinates}
                      topStrandSizes={designTopPattern?.strandSizes}
                    />
                  ) : config.productType === '1250' ? (
                    <CrossSection1250
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={designPattern?.strandCoordinates}
                      bottomStrandSizes={designPattern?.strandSizes}
                      topStrandCoordinates={designTopPattern?.strandCoordinates}
                      topStrandSizes={designTopPattern?.strandSizes}
                    />
                  ) : (
                    <CrossSection8048
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={designPattern?.strandCoordinates}
                      bottomStrandSizes={designPattern?.strandSizes}
                      topStrandCoordinates={designTopPattern?.strandCoordinates}
                      topStrandSizes={designTopPattern?.strandSizes}
                    />
                  )}
                </View>

                {/* Cast Pattern */}
                <View className="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Text className="text-gray-900 text-4xl font-bold mb-1 text-center">
                    CAST PATTERN
                  </Text>
                  <Text className="text-gray-700 text-3xl mb-2 text-center">
                    {formatPatternName(selectedCastPattern || selectedPattern, selectedTopCastPattern || selectedTopPattern)}
                  </Text>
                  {config.productType === '1047' ? (
                    <CrossSection1047
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={selectedPattern?.strandCoordinates}
                      bottomStrandSizes={selectedPattern?.strandSizes}
                      topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                      topStrandSizes={selectedTopPattern?.strandSizes}
                    />
                  ) : config.productType === '1247' ? (
                    <CrossSection1247
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={selectedPattern?.strandCoordinates}
                      bottomStrandSizes={selectedPattern?.strandSizes}
                      topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                      topStrandSizes={selectedTopPattern?.strandSizes}
                    />
                  ) : config.productType === '1250' ? (
                    <CrossSection1250
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={selectedPattern?.strandCoordinates}
                      bottomStrandSizes={selectedPattern?.strandSizes}
                      topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                      topStrandSizes={selectedTopPattern?.strandSizes}
                    />
                  ) : (
                    <CrossSection8048
                      scale={getUniformScale(10)}
                      activeStrands={activeStrandIndices || undefined}
                      productSide={config.productSide || null}
                      productWidth={config.productWidth}
                      showSlippageValues={false}
                      strandCoordinates={selectedPattern?.strandCoordinates}
                      bottomStrandSizes={selectedPattern?.strandSizes}
                      topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                      topStrandSizes={selectedTopPattern?.strandSizes}
                    />
                  )}
                </View>
              </View>
            </View>

          </View>
        ) : (
          /* Single cross-section when patterns match */
          <View
            ref={crossSectionRef}
            className="items-center my-3"
            style={{ overflow: 'visible', minHeight: 200 }}
            collapsable={false}
            // @ts-ignore
            data-testid="cross-section-container"
          >
            <Text className="text-gray-700 text-xs font-semibold mb-2">
              Cross Section with Slippage Values
            </Text>
            {config.productType === '1047' ? (
              <CrossSection1047
                scale={getUniformScale(12)}
                activeStrands={activeStrandIndices || undefined}
                productSide={config.productSide || null}
                productWidth={config.productWidth}
                slippages={slippages}
                showSlippageValues={true}
                strandCoordinates={selectedPattern?.strandCoordinates}
                bottomStrandSizes={selectedPattern?.strandSizes}
                topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                topStrandSizes={selectedTopPattern?.strandSizes}
              />
            ) : config.productType === '1247' ? (
              <CrossSection1247
                scale={getUniformScale(12)}
                activeStrands={activeStrandIndices || undefined}
                productSide={config.productSide || null}
                productWidth={config.productWidth}
                slippages={slippages}
                showSlippageValues={true}
                strandCoordinates={selectedPattern?.strandCoordinates}
                bottomStrandSizes={selectedPattern?.strandSizes}
                topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                topStrandSizes={selectedTopPattern?.strandSizes}
              />
            ) : config.productType === '1250' ? (
              <CrossSection1250
                scale={getUniformScale(12)}
                activeStrands={activeStrandIndices || undefined}
                productSide={config.productSide || null}
                productWidth={config.productWidth}
                slippages={slippages}
                showSlippageValues={true}
                strandCoordinates={selectedPattern?.strandCoordinates}
                bottomStrandSizes={selectedPattern?.strandSizes}
                topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                topStrandSizes={selectedTopPattern?.strandSizes}
              />
            ) : (
              <CrossSection8048
                scale={getUniformScale(12)}
                activeStrands={activeStrandIndices || undefined}
                productSide={config.productSide || null}
                productWidth={config.productWidth}
                slippages={slippages}
                showSlippageValues={true}
                strandCoordinates={selectedPattern?.strandCoordinates}
                bottomStrandSizes={selectedPattern?.strandSizes}
                topStrandCoordinates={selectedTopPattern?.strandCoordinates}
                topStrandSizes={selectedTopPattern?.strandSizes}
              />
            )}
          </View>
        )}

        {/* Cut-width info banner - more compact */}
        {config.productWidth && config.productSide && selectedPattern?.strandCoordinates && (
          <View className="px-6 mb-2">
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <View className="flex-row items-center">
                <Ionicons name="cut" size={16} color="#F59E0B" />
                <Text className="text-amber-900 text-xs ml-2">
                  Cut: {config.productWidth}" • {config.productSide} • {slippages.length}/{selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6} strands
                </Text>
              </View>
            </View>
          </View>
        )}


        {/* Slippage Statistics - more compact */}
        <View className="px-6">
          <Text className="text-gray-900 text-base font-semibold mb-2">
            Statistics
          </Text>

          {/* Total & Average side by side */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-blue-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium mb-0.5">
                Total Slippage
              </Text>
              <Text className="text-blue-600 text-lg font-bold">
                {slippageStats.anyValueExceeds && ">"}
                {slippageStats.totalSlippage.toFixed(3)}"
              </Text>
              <Text className="text-blue-600 text-xs">
                ≈{slippageStats.anyValueExceeds && ">"}{decimalToFraction(slippageStats.totalSlippage)}
              </Text>
            </View>

            <View className="flex-1 bg-orange-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium mb-0.5">
                Avg Slippage
              </Text>
              <Text className="text-orange-600 text-lg font-bold">
                {slippageStats.anyValueExceeds && ">"}
                {slippageStats.totalAvgSlippage.toFixed(3)}"
              </Text>
              <Text className="text-orange-600 text-xs">
                ≈{slippageStats.anyValueExceeds && ">"}{decimalToFraction(slippageStats.totalAvgSlippage)}
              </Text>
            </View>
          </View>

          {/* End Totals - compact */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-green-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 1 Total</Text>
              <Text className="text-green-600 text-base font-bold">
                {slippageStats.anyEnd1Exceeds && ">"}
                {slippageStats.totalSlippageEnd1.toFixed(3)}"
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 2 Total</Text>
              <Text className="text-purple-600 text-base font-bold">
                {slippageStats.anyEnd2Exceeds && ">"}
                {slippageStats.totalSlippageEnd2.toFixed(3)}"
              </Text>
            </View>
          </View>

          {/* End Averages - compact */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-green-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 1 Avg</Text>
              <Text className="text-green-600 text-base font-bold">
                {slippageStats.anyEnd1Exceeds && ">"}
                {slippageStats.totalAvgSlippageEnd1.toFixed(3)}"
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 2 Avg</Text>
              <Text className="text-purple-600 text-base font-bold">
                {slippageStats.anyEnd2Exceeds && ">"}
                {slippageStats.totalAvgSlippageEnd2.toFixed(3)}"
              </Text>
            </View>
          </View>

          {/* Per-Strand Details - separated by bottom/top */}
          <View className="bg-gray-50 rounded-lg p-2.5 mb-3">
            <Text className="text-gray-700 text-xs font-semibold mb-2">
              By Strand
            </Text>

            {/* Bottom Strands */}
            {slippages.some(s => s.strandId.startsWith('B')) && (
              <>
                <Text className="text-gray-600 text-xs font-semibold mb-1.5">
                  Bottom Strands
                </Text>
                {slippages.filter(s => s.strandId.startsWith('B')).map((strand) => {
                  const end1Value = parseMeasurementInput(strand.leftSlippage);
                  const end2Value = parseMeasurementInput(strand.rightSlippage);
                  // Use adjusted values: 1.0 if exceeds, otherwise use parsed value
                  const e1 = strand.leftExceedsOne ? 1.0 : (end1Value ?? 0);
                  const e2 = strand.rightExceedsOne ? 1.0 : (end2Value ?? 0);
                  const strandTotal = e1 + e2;
                  const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;

                  return (
                    <View key={strand.strandId} className="mb-2 pb-2 border-b border-gray-300 last:border-b-0">
                      {/* Strand Header - inline */}
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center">
                          <View className="bg-green-600 rounded-full w-5 h-5 items-center justify-center mr-1.5">
                            <Text className="text-white font-bold text-xs">
                              {strand.strandId.substring(1)}
                            </Text>
                          </View>
                          <Text className="text-gray-900 text-xs font-semibold">
                            Bottom Strand {strand.strandId.substring(1)}
                            {getStrandSize(strand.strandId) && (
                              <Text className="text-gray-600 font-normal">
                                {' '}({getStrandSize(strand.strandId)})
                              </Text>
                            )}
                          </Text>
                        </View>
                        <View className="bg-blue-100 px-2 py-0.5 rounded">
                          <Text className="text-blue-700 text-xs font-bold">
                            {hasExceeds && ">"}Total: {strandTotal.toFixed(2)}"
                          </Text>
                        </View>
                      </View>

                      {/* END 1 & END 2 - inline */}
                      <View className="flex-row gap-2 ml-6">
                        <View className="flex-1 bg-white rounded p-1.5 border border-green-200">
                          <Text className="text-gray-600 text-xs mb-0.5">E1</Text>
                          <Text className="text-green-600 text-xs font-bold">
                            {strand.leftExceedsOne ? '>1"' : (end1Value !== null && end1Value !== 0 ? `${end1Value.toFixed(3)}"` : '0"')}
                          </Text>
                        </View>

                        <View className="flex-1 bg-white rounded p-1.5 border border-purple-200">
                          <Text className="text-gray-600 text-xs mb-0.5">E2</Text>
                          <Text className="text-purple-600 text-xs font-bold">
                            {strand.rightExceedsOne ? '>1"' : (end2Value !== null && end2Value !== 0 ? `${end2Value.toFixed(3)}"` : '0"')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Top Strands */}
            {slippages.some(s => s.strandId.startsWith('T')) && (
              <>
                <Text className="text-gray-600 text-xs font-semibold mb-1.5 mt-2">
                  Top Strands
                </Text>
                {slippages.filter(s => s.strandId.startsWith('T')).map((strand) => {
                  const end1Value = parseMeasurementInput(strand.leftSlippage);
                  const end2Value = parseMeasurementInput(strand.rightSlippage);
                  // Use adjusted values: 1.0 if exceeds, otherwise use parsed value
                  const e1 = strand.leftExceedsOne ? 1.0 : (end1Value ?? 0);
                  const e2 = strand.rightExceedsOne ? 1.0 : (end2Value ?? 0);
                  const strandTotal = e1 + e2;
                  const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;

                  return (
                    <View key={strand.strandId} className="mb-2 pb-2 border-b border-gray-300 last:border-b-0">
                      {/* Strand Header - inline */}
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center">
                          <View className="bg-blue-600 rounded-full w-5 h-5 items-center justify-center mr-1.5">
                            <Text className="text-white font-bold text-xs">
                              {strand.strandId.substring(1)}
                            </Text>
                          </View>
                          <Text className="text-gray-900 text-xs font-semibold">
                            Top Strand {strand.strandId.substring(1)}
                            {getStrandSize(strand.strandId) && (
                              <Text className="text-gray-600 font-normal">
                                {' '}({getStrandSize(strand.strandId)})
                              </Text>
                            )}
                          </Text>
                        </View>
                        <View className="bg-blue-100 px-2 py-0.5 rounded">
                          <Text className="text-blue-700 text-xs font-bold">
                            {hasExceeds && ">"}Total: {strandTotal.toFixed(2)}"
                          </Text>
                        </View>
                      </View>

                      {/* END 1 & END 2 - inline */}
                      <View className="flex-row gap-2 ml-6">
                        <View className="flex-1 bg-white rounded p-1.5 border border-green-200">
                          <Text className="text-gray-600 text-xs mb-0.5">E1</Text>
                          <Text className="text-green-600 text-xs font-bold">
                            {strand.leftExceedsOne ? '>1"' : (end1Value !== null && end1Value !== 0 ? `${end1Value.toFixed(3)}"` : '0"')}
                          </Text>
                        </View>

                        <View className="flex-1 bg-white rounded p-1.5 border border-purple-200">
                          <Text className="text-gray-600 text-xs mb-0.5">E2</Text>
                          <Text className="text-purple-600 text-xs font-bold">
                            {strand.rightExceedsOne ? '>1"' : (end2Value !== null && end2Value !== 0 ? `${end2Value.toFixed(3)}"` : '0"')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* Success Messages */}
          {saveSuccess && (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="text-green-700 font-semibold ml-3">
                Record saved successfully!
              </Text>
            </View>
          )}
          
          {publishSuccess && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              <Text className="text-blue-700 font-semibold ml-3">
                Record published successfully!
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-3">
            <Pressable
              className="flex-1 bg-green-500 rounded-xl py-4 items-center active:bg-green-600"
              onPress={() => setShowSaveModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="save-outline" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">
                  Save
                </Text>
              </View>
            </Pressable>
            
            <Pressable
              className="flex-1 bg-purple-500 rounded-xl py-4 items-center active:bg-purple-600"
              onPress={() => setShowPublishModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">
                  Publish
                </Text>
              </View>
            </Pressable>
          </View>

          {/* SharePoint Integration (Web Only) */}
          {Platform.OS === 'web' && (
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
              <View className="flex-row items-center mb-3">
                <Ionicons name="cloud-outline" size={20} color="#6B7280" />
                <Text className="text-gray-700 text-sm font-semibold ml-2">
                  SharePoint Integration
                </Text>
              </View>

              {!isSharePointSignedIn ? (
                <Pressable
                  className="bg-blue-600 rounded-lg py-3 items-center active:bg-blue-700"
                  onPress={handleSharePointSignIn}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="log-in-outline" size={18} color="white" />
                    <Text className="text-white text-sm font-semibold ml-2">
                      Sign in with Microsoft 365
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <>
                  <View className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text className="text-green-700 text-xs font-semibold ml-2">
                        Signed in as {microsoftAccount?.name || microsoftAccount?.username}
                      </Text>
                    </View>
                    <Text className="text-green-600 text-xs ml-6">
                      PDFs will auto-upload to SharePoint
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-600 text-xs">Auto-upload to SharePoint</Text>
                    <Pressable
                      onPress={() => setUploadToSharePoint(!uploadToSharePoint)}
                      className={`w-12 h-6 rounded-full ${uploadToSharePoint ? 'bg-blue-500' : 'bg-gray-300'} justify-center`}
                    >
                      <View className={`w-5 h-5 bg-white rounded-full ${uploadToSharePoint ? 'ml-6' : 'ml-1'}`} />
                    </Pressable>
                  </View>

                  {config.projectNumber && config.markNumber && config.idNumber && (
                    <Text className="text-gray-500 text-xs mb-2">
                      📁 Folder: {generateFolderName(config.projectNumber, config.markNumber, config.idNumber)}
                    </Text>
                  )}

                  <Pressable
                    className="border border-gray-300 rounded-lg py-2 items-center active:bg-gray-100"
                    onPress={handleSharePointSignOut}
                  >
                    <Text className="text-gray-600 text-xs font-medium">Sign Out</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          <Pressable
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mb-3"
            onPress={handleGeneratePDFReport}
            disabled={isGeneratingPDF}
          >
            <View className="flex-row items-center">
              <Ionicons name={isGeneratingPDF ? "hourglass-outline" : "document-text-outline"} size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                {isGeneratingPDF ? 'Generating PDF...' : 'Generate Report'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            className="bg-gray-100 rounded-xl py-4 items-center active:bg-gray-200 mb-4"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-gray-700 text-base font-semibold">
              Back to Input
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        visible={showSaveModal}
        title="Save Record"
        message="Save this slippage record to your personal records?"
        confirmText="Save"
        cancelText="Cancel"
        confirmStyle="default"
        onConfirm={handleSave}
        onCancel={() => setShowSaveModal(false)}
      />

      {/* Publish Confirmation Modal */}
      <ConfirmModal
        visible={showPublishModal}
        title="Publish Record"
        message="Publish this slippage record to the official records visible to all users?"
        confirmText="Publish"
        cancelText="Cancel"
        confirmStyle="default"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishModal(false)}
      />
    </View>
  );
}
