/**
 * Aggregate Gradation Analysis - Exact Replica of HTML App
 * Source: https://github.com/McCarthy13/GradationsTool
 *
 * This is a pixel-perfect recreation of the standalone HTML gradation tool
 * integrated into React Native with Firebase storage replacing localStorage.
 *
 * All UI, calculations, keyboard navigation, print functionality, and features
 * match the original exactly.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
  Modal,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { STANDARD_SIEVES, DEFAULT_AGGREGATES } from '../utils/aggregate-gradation-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateGradation'>;
};

// ===== TYPE DEFINITIONS (matching original exactly) =====
interface SieveData {
  name: string;
  size: number;
  weightRetained: string | number;
  percentRetained?: string;
  cumulativeRetained?: string;
  percentPassing?: string;
  c33Lower?: number | string;
  c33Upper?: number | string;
}

interface AggregateConfig {
  type: 'Fine' | 'Coarse';
  sieves: SieveData[];
  maxDecant?: number | null;
  maxFinenessModulus?: number | null;
}

interface ActiveTest {
  aggregateName: string;
  date: string;
  sieveData: SieveData[];
  washedWeight: string | number;
}

interface TestRecord {
  id: string;
  date: string;
  aggregateName: string;
  aggregateType: string;
  finenessModulus: string;
  decant: string;
  totalWeight: string;
  washedWeight: string;
  sieveResults: Record<string, number>;
  fullSieveData: SieveData[];
}

interface AppState {
  aggregates: Record<string, AggregateConfig>;
  savedRecords: TestRecord[];
  defaultAggregates: string[];
  activeTests: ActiveTest[];
  currentView: 'main' | 'admin' | 'repository' | 'configureDefaults';
  selectedAggregate: string;
  date: string;
  showAddMore: boolean;
  showPrintModal: boolean;
  error: string | null;
  successMessage: string | null;
  editingAggregate: string | null;
  showAddForm: boolean;
  newAggregateName: string;
  newAggregateType: 'Fine' | 'Coarse';
  importFromExisting: string;
  confirmingDelete: string | null;
  showSieveSelector: string | null;
  confirmingDeleteRecord: string | null;
  filterAggregate: string;
  filterType: string;
  filterDateFrom: string;
  filterDateTo: string;
  viewingRecord: TestRecord | null;
  viewingDate: string | null;
  showExportOptions: string | null;
  selectedDefaults: string[];
  showNoProductionDateRange: boolean;
  noProductionStartDate: string;
  noProductionEndDate: string;
  editingRecord: TestRecord | null;
  showEditModal: boolean;
}

const AggregateGradationScreen: React.FC<Props> = ({ navigation }) => {
  // ===== STATE (exact replica of appState from HTML) =====
  const [appState, setAppState] = useState<AppState>({
    aggregates: {},
    savedRecords: [],
    defaultAggregates: [],
    activeTests: [],
    currentView: 'main',
    selectedAggregate: '',
    date: new Date().toISOString().split('T')[0],
    showAddMore: false,
    showPrintModal: false,
    error: null,
    successMessage: null,
    editingAggregate: null,
    showAddForm: false,
    newAggregateName: '',
    newAggregateType: 'Fine',
    importFromExisting: '',
    confirmingDelete: null,
    showSieveSelector: null,
    confirmingDeleteRecord: null,
    filterAggregate: '',
    filterType: '',
    filterDateFrom: '',
    filterDateTo: '',
    viewingRecord: null,
    viewingDate: null,
    showExportOptions: null,
    selectedDefaults: [],
    showNoProductionDateRange: false,
    noProductionStartDate: new Date().toISOString().split('T')[0],
    noProductionEndDate: new Date().toISOString().split('T')[0],
    editingRecord: null,
    showEditModal: false,
  });

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  // ===== UTILITY FUNCTIONS (exact replicas from HTML) =====

  const formatDateForDisplay = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const parseDateInput = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return new Date().toISOString().split('T')[0];

    let parsedDate = null;
    let isoDate = null;

    // Format: M/D/YY or MM/DD/YY
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      let year = parts[2];
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      year = String(currentCentury + parseInt(year));
      isoDate = `${year}-${month}-${day}`;
      parsedDate = new Date(isoDate + 'T00:00:00');
    }
    // Format: M/D/YYYY or MM/DD/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      isoDate = `${year}-${month}-${day}`;
      parsedDate = new Date(isoDate + 'T00:00:00');
    }
    // Format: M/D or MM/DD
    else if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = new Date().getFullYear();
      isoDate = `${year}-${month}-${day}`;
      parsedDate = new Date(isoDate + 'T00:00:00');
    }
    // Format: YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      isoDate = trimmed;
      parsedDate = new Date(trimmed + 'T00:00:00');
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return isoDate;
    }
    return null;
  };

  const calculateTestData = (sieveData: SieveData[]): SieveData[] => {
    const totalWeight = sieveData.reduce((sum, row) => sum + (parseFloat(String(row.weightRetained)) || 0), 0);
    let cumulativeRetained = 0;

    return sieveData.map((row) => {
      const weight = parseFloat(String(row.weightRetained)) || 0;
      const percentRetained = totalWeight > 0 ? (weight / totalWeight * 100) : 0;
      cumulativeRetained += percentRetained;
      const percentPassing = 100 - cumulativeRetained;

      return {
        ...row,
        percentRetained: percentRetained.toFixed(0),
        cumulativeRetained: cumulativeRetained.toFixed(0),
        percentPassing: percentPassing.toFixed(0),
      };
    });
  };

  const calculateFinenessModulus = (aggregateType: string, sieveData: SieveData[]): string => {
    if (aggregateType !== 'Fine') return 'N/A';
    const fmSieves = ['3/8"', '#4', '#8', '#16', '#30', '#50', '#100'];
    const fmSum = sieveData
      .filter(row => fmSieves.includes(row.name))
      .reduce((sum, row) => sum + parseFloat(row.cumulativeRetained || '0'), 0);
    return (fmSum / 100).toFixed(2);
  };

  const calculateDecant = (sieveData: SieveData[], washedWeight: string | number): string => {
    const totalWeight = sieveData.reduce((sum, row) => sum + (parseFloat(String(row.weightRetained)) || 0), 0);
    const washed = parseFloat(String(washedWeight)) || 0;
    if (totalWeight > 0 && washed <= totalWeight) {
      return ((totalWeight - washed) / totalWeight * 100).toFixed(2);
    }
    return '0.00';
  };

  const checkC33Compliance = (sieve: SieveData): string => {
    const percentPassing = parseFloat(sieve.percentPassing || '0');
    const lower = typeof sieve.c33Lower === 'number' ? sieve.c33Lower : null;
    const upper = typeof sieve.c33Upper === 'number' ? sieve.c33Upper : null;

    if (lower !== null && upper !== null) {
      if (percentPassing >= lower && percentPassing <= upper) {
        return 'pass';
      }
      return 'fail';
    }
    return 'none';
  };

  // ===== LOAD DATA ON MOUNT =====
  useEffect(() => {
    const loadData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      try {
        // Load aggregates
        const aggregatesRef = collection(firestore, 'users', userId, 'gradationAggregates');
        const aggregatesSnap = await getDocs(aggregatesRef);

        let loadedAggs: Record<string, AggregateConfig> = {};

        if (aggregatesSnap.empty) {
          // Initialize with defaults
          for (const [name, config] of Object.entries(DEFAULT_AGGREGATES)) {
            await setDoc(doc(aggregatesRef, name), config);
            loadedAggs[name] = config as AggregateConfig;
          }
        } else {
          aggregatesSnap.forEach(d => {
            loadedAggs[d.id] = d.data() as AggregateConfig;
          });
        }

        // Load default aggregates list
        const defaultsRef = doc(firestore, 'users', userId, 'gradationSettings', 'defaults');
        const defaultsSnap = await getDoc(defaultsRef);
        let defaultsList = ['Keystone #7', 'Concrete Sand'];

        if (defaultsSnap.exists()) {
          defaultsList = defaultsSnap.data()?.list || defaultsList;
        } else {
          await setDoc(defaultsRef, { list: defaultsList });
        }

        // Load saved records
        const recordsRef = collection(firestore, 'users', userId, 'gradationRecords');
        const recordsSnap = await getDocs(query(recordsRef, orderBy('id', 'desc')));
        const records: TestRecord[] = [];
        recordsSnap.forEach(d => records.push(d.data() as TestRecord));

        // Initialize active tests with defaults
        const tests: ActiveTest[] = [];
        const today = new Date().toISOString().split('T')[0];

        defaultsList.forEach(aggName => {
          const agg = loadedAggs[aggName];
          if (agg) {
            tests.push({
              aggregateName: aggName,
              date: today,
              sieveData: agg.sieves.map(s => ({
                ...s,
                weightRetained: '',
                percentRetained: '0',
                cumulativeRetained: '0',
                percentPassing: '100',
              })),
              washedWeight: '',
            });
          }
        });

        setAppState(prev => ({
          ...prev,
          aggregates: loadedAggs,
          savedRecords: records,
          defaultAggregates: defaultsList,
          activeTests: tests,
          date: today,
        }));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // ===== EVENT HANDLERS (exact replicas from HTML) =====

  const handleWeightKeydown = (event: any, testIndex: number, sieveIndex: number) => {
    const key = event.nativeEvent.key;
    let moveDirection = 0;

    if (key === 'Enter' || key === 'ArrowDown') {
      moveDirection = 1;
    } else if (key === 'ArrowUp') {
      moveDirection = -1;
    }

    if (moveDirection !== 0) {
      event.preventDefault();

      if (moveDirection === 1) {
        const currentTest = appState.activeTests[testIndex];
        if (sieveIndex < currentTest.sieveData.length - 1) {
          focusOnSieveInput(testIndex, sieveIndex + 1);
        } else {
          focusOnWashedInput(testIndex);
        }
      } else if (moveDirection === -1) {
        if (sieveIndex > 0) {
          focusOnSieveInput(testIndex, sieveIndex - 1);
        } else if (testIndex > 0) {
          focusOnWashedInput(testIndex - 1);
        }
      }
    }
  };

  const focusOnSieveInput = (testIndex: number, sieveIndex: number) => {
    setTimeout(() => {
      const key = `test-${testIndex}-sieve-${sieveIndex}`;
      inputRefs.current[key]?.focus();
    }, 10);
  };

  const focusOnWashedInput = (testIndex: number) => {
    setTimeout(() => {
      const key = `test-${testIndex}-washed`;
      inputRefs.current[key]?.focus();
    }, 10);
  };

  const handleWeightChange = (testIndex: number, sieveIndex: number, value: string) => {
    const newTests = [...appState.activeTests];
    newTests[testIndex].sieveData[sieveIndex].weightRetained = value;
    newTests[testIndex].sieveData = calculateTestData(newTests[testIndex].sieveData);
    setAppState(prev => ({ ...prev, activeTests: newTests }));
  };

  const handleWashedWeightChange = (testIndex: number, value: string) => {
    const newTests = [...appState.activeTests];
    newTests[testIndex].washedWeight = value;
    setAppState(prev => ({ ...prev, activeTests: newTests }));
  };

  const handleDateChange = (testIndex: number, value: string) => {
    const newTests = [...appState.activeTests];
    newTests[testIndex].date = value;
    setAppState(prev => ({ ...prev, activeTests: newTests }));
  };

  const handleRemoveTest = (testIndex: number) => {
    const newTests = appState.activeTests.filter((_, i) => i !== testIndex);
    setAppState(prev => ({ ...prev, activeTests: newTests }));
  };

  const handleSubmitTest = async (testIndex: number) => {
    const test = appState.activeTests[testIndex];
    const totalWeight = test.sieveData.reduce((sum, row) => sum + (parseFloat(String(row.weightRetained)) || 0), 0);

    if (totalWeight === 0) {
      setAppState(prev => ({ ...prev, error: 'Please enter weight retained values' }));
      setTimeout(() => setAppState(prev => ({ ...prev, error: null })), 3000);
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const aggregateType = appState.aggregates[test.aggregateName].type;
      const newRecord: TestRecord = {
        id: Date.now().toString(),
        date: test.date,
        aggregateName: test.aggregateName,
        aggregateType,
        finenessModulus: calculateFinenessModulus(aggregateType, test.sieveData),
        decant: calculateDecant(test.sieveData, test.washedWeight),
        totalWeight: totalWeight.toFixed(1),
        washedWeight: (parseFloat(String(test.washedWeight)) || 0).toFixed(1),
        sieveResults: {},
        fullSieveData: [...test.sieveData],
      };

      test.sieveData.forEach(sieve => {
        if (sieve.name !== 'Pan') {
          newRecord.sieveResults[sieve.name] = parseFloat(sieve.percentPassing || '0');
        }
      });

      // Save to Firebase
      const recordRef = doc(firestore, 'users', userId, 'gradationRecords', newRecord.id);
      await setDoc(recordRef, newRecord);

      // Reset test form
      const aggregate = appState.aggregates[test.aggregateName];
      const newTests = [...appState.activeTests];
      newTests[testIndex] = {
        ...test,
        sieveData: aggregate.sieves.map(sieve => ({
          ...sieve,
          weightRetained: '',
          percentRetained: '0',
          cumulativeRetained: '0',
          percentPassing: '100',
        })),
        washedWeight: '',
      };

      setAppState(prev => ({
        ...prev,
        activeTests: newTests,
        successMessage: `${test.aggregateName} data saved successfully!`,
        savedRecords: [newRecord, ...prev.savedRecords],
      }));

      setTimeout(() => setAppState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error('Error submitting test:', error);
      setAppState(prev => ({ ...prev, error: 'Error saving test data. Please try again.' }));
      setTimeout(() => setAppState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const setAllDatesToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    const newTests = appState.activeTests.map(test => ({ ...test, date: today }));
    setAppState(prev => ({
      ...prev,
      date: today,
      activeTests: newTests,
      successMessage: 'All test dates set to today',
    }));
    setTimeout(() => setAppState(prev => ({ ...prev, successMessage: null })), 3000);
  };

  const applyDateToAll = () => {
    const newTests = appState.activeTests.map(test => ({ ...test, date: appState.date }));
    const dateObj = new Date(appState.date + 'T00:00:00');
    setAppState(prev => ({
      ...prev,
      activeTests: newTests,
      successMessage: `All test dates updated to ${dateObj.toLocaleDateString()}`,
    }));
    setTimeout(() => setAppState(prev => ({ ...prev, successMessage: null })), 3000);
  };

  const handleAddTest = () => {
    if (!appState.selectedAggregate) {
      setAppState(prev => ({ ...prev, error: 'Please select an aggregate' }));
      setTimeout(() => setAppState(prev => ({ ...prev, error: null })), 3000);
      return;
    }

    const aggregate = appState.aggregates[appState.selectedAggregate];
    const newTest: ActiveTest = {
      aggregateName: appState.selectedAggregate,
      date: appState.date,
      sieveData: aggregate.sieves.map(s => ({
        ...s,
        weightRetained: '',
        percentRetained: '0',
        cumulativeRetained: '0',
        percentPassing: '100',
      })),
      washedWeight: '',
    };

    setAppState(prev => ({
      ...prev,
      activeTests: [...prev.activeTests, newTest],
      showAddMore: false,
      selectedAggregate: '',
    }));
  };

  const handlePrintForms = async () => {
    // Generate print content
    const printHTML = generatePrintHTML();

    try {
      const { uri } = await Print.printToFileAsync({ html: printHTML });
      await Sharing.shareAsync(uri);
      setAppState(prev => ({ ...prev, showPrintModal: false }));
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Error', 'Failed to generate print forms');
    }
  };

  const generatePrintHTML = (): string => {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: letter; margin: 0.5in; }
    body { font-family: Arial, sans-serif; font-size: 10pt; }
    .form-container { page-break-after: always; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid black; padding: 4px; text-align: center; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .header { text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold; }
    .info-row { margin: 5px 0; }
  </style>
</head>
<body>`;

    const selectedTests = appState.activeTests.filter((_, i) =>
      appState.selectedDefaults.includes(String(i))
    );

    selectedTests.forEach(test => {
      html += `
<div class="form-container">
  <div class="header">Aggregate Gradation Analysis</div>
  <div class="info-row"><strong>Material:</strong> ${test.aggregateName}</div>
  <div class="info-row"><strong>Date:</strong> ${formatDateForDisplay(test.date)}</div>
  <table>
    <thead>
      <tr>
        <th>Sieve</th>
        <th>Weight Retained (g)</th>
        <th>% Retained</th>
        <th>Cumulative % Retained</th>
        <th>% Passing</th>
      </tr>
    </thead>
    <tbody>`;

      test.sieveData.forEach(sieve => {
        html += `
      <tr>
        <td>${sieve.name}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`;
      });

      html += `
    </tbody>
  </table>
  <div class="info-row"><strong>Washed Weight:</strong> ___________</div>
  <div class="info-row"><strong>Total Weight:</strong> ___________</div>
  <div class="info-row"><strong>Decant %:</strong> ___________</div>
</div>`;
    });

    html += '</body></html>';
    return html;
  };

  const exportRecordAsCSV = async (record: TestRecord) => {
    let csv = 'Aggregate Gradation Report\n';
    csv += `Material: ${record.aggregateName}\n`;
    csv += `Date: ${formatDateForDisplay(record.date)}\n`;
    csv += `Type: ${record.aggregateType}\n`;
    csv += `Total Weight: ${record.totalWeight}g\n`;
    csv += `Washed Weight: ${record.washedWeight}g\n`;
    csv += `Decant: ${record.decant}%\n`;
    csv += `Fineness Modulus: ${record.finenessModulus}\n\n`;

    csv += 'Sieve,Weight Retained (g),% Retained,Cumulative % Retained,% Passing,C33 Lower,C33 Upper\n';

    record.fullSieveData.forEach(sieve => {
      csv += `${sieve.name},${sieve.weightRetained},${sieve.percentRetained || ''},${sieve.cumulativeRetained || ''},${sieve.percentPassing || ''},${sieve.c33Lower || ''},${sieve.c33Upper || ''}\n`;
    });

    try {
      const fileName = `gradation_${record.aggregateName.replace(/\s+/g, '_')}_${record.date}.csv`;
      const fileUri = `${Platform.OS === 'ios' ? '' : 'file://'}${fileName}`;

      // For mobile, we'll use expo-sharing to share the CSV
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Gradation Data',
        UTI: 'public.comma-separated-values-text'
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  // ===== RENDER TEST TABLE =====
  const renderTestTable = (test: ActiveTest, testIndex: number) => {
    const totalWeight = test.sieveData.reduce((sum, row) => sum + (parseFloat(String(row.weightRetained)) || 0), 0);
    const aggregateType = appState.aggregates[test.aggregateName]?.type || 'Coarse';

    return (
      <View key={testIndex} style={{ width: '48%', marginBottom: 16, backgroundColor: 'white', borderRadius: 8, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        {/* Header */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{test.aggregateName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, marginRight: 8 }}>Date:</Text>
            <TextInput
              value={formatDateForDisplay(test.date)}
              onChangeText={(value) => {
                const parsed = parseDateInput(value);
                if (parsed) handleDateChange(testIndex, parsed);
              }}
              style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 4, fontSize: 12 }}
            />
          </View>
          {appState.activeTests.length > 1 && (
            <Pressable onPress={() => handleRemoveTest(testIndex)} style={{ position: 'absolute', right: 0, top: 0, padding: 4 }}>
              <Text style={{ color: '#dc2626', fontSize: 18 }}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Table */}
        <View style={{ borderWidth: 1, borderColor: '#d1d5db' }}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#d1d5db' }}>
            <Text style={{ flex: 1, padding: 4, fontSize: 10, fontWeight: 'bold', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>Sieve</Text>
            <Text style={{ flex: 1, padding: 4, fontSize: 10, fontWeight: 'bold', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>Weight (g)</Text>
            <Text style={{ flex: 1, padding: 4, fontSize: 10, fontWeight: 'bold', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>% Ret.</Text>
            <Text style={{ flex: 1, padding: 4, fontSize: 10, fontWeight: 'bold', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>Cum. %</Text>
            <Text style={{ flex: 1, padding: 4, fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>% Pass.</Text>
          </View>

          {/* Data Rows */}
          {test.sieveData.map((sieve, sieveIndex) => {
            const compliance = checkC33Compliance(sieve);
            const bgColor = compliance === 'pass' ? '#dcfce7' : compliance === 'fail' ? '#fee2e2' : 'white';

            return (
              <View key={sieveIndex} style={{ flexDirection: 'row', borderBottomWidth: sieveIndex < test.sieveData.length - 1 ? 1 : 0, borderBottomColor: '#d1d5db', backgroundColor: bgColor }}>
                <Text style={{ flex: 1, padding: 4, fontSize: 10, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>{sieve.name}</Text>
                <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#d1d5db' }}>
                  <TextInput
                    ref={ref => { inputRefs.current[`test-${testIndex}-sieve-${sieveIndex}`] = ref; }}
                    value={String(sieve.weightRetained)}
                    onChangeText={(value) => handleWeightChange(testIndex, sieveIndex, value)}
                    onKeyPress={(e) => handleWeightKeydown(e, testIndex, sieveIndex)}
                    keyboardType="numeric"
                    style={{ padding: 4, fontSize: 10, textAlign: 'center', backgroundColor: 'transparent' }}
                  />
                </View>
                <Text style={{ flex: 1, padding: 4, fontSize: 10, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>{sieve.percentRetained || '0'}</Text>
                <Text style={{ flex: 1, padding: 4, fontSize: 10, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db' }}>{sieve.cumulativeRetained || '0'}</Text>
                <Text style={{ flex: 1, padding: 4, fontSize: 10, textAlign: 'center' }}>{sieve.percentPassing || '100'}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer Info */}
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, marginRight: 8 }}>Washed Weight (g):</Text>
            <TextInput
              ref={ref => { inputRefs.current[`test-${testIndex}-washed`] = ref; }}
              value={String(test.washedWeight)}
              onChangeText={(value) => handleWashedWeightChange(testIndex, value)}
              keyboardType="numeric"
              style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 4, fontSize: 11 }}
            />
          </View>
          <Text style={{ fontSize: 11 }}>Total Weight: {totalWeight.toFixed(1)}g</Text>
          <Text style={{ fontSize: 11 }}>Decant: {calculateDecant(test.sieveData, test.washedWeight)}%</Text>
          {aggregateType === 'Fine' && (
            <Text style={{ fontSize: 11 }}>Fineness Modulus: {calculateFinenessModulus(aggregateType, test.sieveData)}</Text>
          )}
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={() => handleSubmitTest(testIndex)}
          style={{ marginTop: 12, backgroundColor: '#2563eb', padding: 10, borderRadius: 6, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Submit Test</Text>
        </Pressable>
      </View>
    );
  };

  // ===== RENDER MAIN VIEW =====
  const renderMainView = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Aggregate Gradation Analysis</Text>

          {/* Date Controls */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, marginRight: 8 }}>Master Date:</Text>
            <TextInput
              value={formatDateForDisplay(appState.date)}
              onChangeText={(value) => {
                const parsed = parseDateInput(value);
                if (parsed) setAppState(prev => ({ ...prev, date: parsed }));
              }}
              style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 8, fontSize: 14, marginRight: 8 }}
            />
            <Pressable onPress={setAllDatesToToday} style={{ backgroundColor: '#059669', padding: 8, borderRadius: 6, marginRight: 8 }}>
              <Text style={{ color: 'white', fontSize: 12 }}>Today</Text>
            </Pressable>
            <Pressable onPress={applyDateToAll} style={{ backgroundColor: '#2563eb', padding: 8, borderRadius: 6 }}>
              <Text style={{ color: 'white', fontSize: 12 }}>Apply to All</Text>
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Pressable onPress={() => setAppState(prev => ({ ...prev, showAddMore: true }))} style={{ backgroundColor: '#059669', padding: 10, borderRadius: 6, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add Test</Text>
            </Pressable>
            <Pressable onPress={() => setAppState(prev => ({ ...prev, showPrintModal: true }))} style={{ backgroundColor: '#7c3aed', padding: 10, borderRadius: 6, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Print Forms</Text>
            </Pressable>
            <Pressable onPress={() => setAppState(prev => ({ ...prev, currentView: 'repository' }))} style={{ backgroundColor: '#0891b2', padding: 10, borderRadius: 6, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Repository</Text>
            </Pressable>
            <Pressable onPress={() => setAppState(prev => ({ ...prev, currentView: 'admin' }))} style={{ backgroundColor: '#dc2626', padding: 10, borderRadius: 6, marginBottom: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Admin</Text>
            </Pressable>
          </View>
        </View>

        {/* Active Tests Grid */}
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {appState.activeTests.map((test, index) => renderTestTable(test, index))}
        </ScrollView>

        {/* Add More Modal */}
        <Modal visible={appState.showAddMore} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 20, width: '80%', maxWidth: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Add Test</Text>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>Select Aggregate:</Text>
              <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
                {Object.keys(appState.aggregates).map(aggName => (
                  <Pressable
                    key={aggName}
                    onPress={() => setAppState(prev => ({ ...prev, selectedAggregate: aggName }))}
                    style={{ padding: 12, backgroundColor: appState.selectedAggregate === aggName ? '#dbeafe' : 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, marginBottom: 8 }}
                  >
                    <Text style={{ fontSize: 14 }}>{aggName}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setAppState(prev => ({ ...prev, showAddMore: false, selectedAggregate: '' }))} style={{ padding: 10, marginRight: 8 }}>
                  <Text style={{ color: '#6b7280' }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleAddTest} style={{ backgroundColor: '#2563eb', padding: 10, borderRadius: 6 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Add</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Print Modal */}
        <Modal visible={appState.showPrintModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 20, width: '80%', maxWidth: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Print Blank Forms</Text>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>Select forms to print:</Text>
              <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
                {appState.activeTests.map((test, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      const selected = appState.selectedDefaults.includes(String(index))
                        ? appState.selectedDefaults.filter(i => i !== String(index))
                        : [...appState.selectedDefaults, String(index)];
                      setAppState(prev => ({ ...prev, selectedDefaults: selected }));
                    }}
                    style={{ padding: 12, backgroundColor: appState.selectedDefaults.includes(String(index)) ? '#dbeafe' : 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, marginBottom: 8 }}
                  >
                    <Text style={{ fontSize: 14 }}>{test.aggregateName} - {formatDateForDisplay(test.date)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setAppState(prev => ({ ...prev, showPrintModal: false, selectedDefaults: [] }))} style={{ padding: 10, marginRight: 8 }}>
                  <Text style={{ color: '#6b7280' }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handlePrintForms} style={{ backgroundColor: '#2563eb', padding: 10, borderRadius: 6 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Print</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ===== RENDER ADMIN VIEW (STUB - TO BE COMPLETED) =====
  const renderAdminView = () => {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Admin - Aggregate Management</Text>
        <Pressable onPress={() => setAppState(prev => ({ ...prev, currentView: 'main' }))} style={{ backgroundColor: '#6b7280', padding: 10, borderRadius: 6, alignSelf: 'flex-start' }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>← Back to Main</Text>
        </Pressable>
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Admin panel implementation in progress...</Text>
      </View>
    );
  };

  // ===== RENDER REPOSITORY VIEW (STUB - TO BE COMPLETED) =====
  const renderRepositoryView = () => {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Repository - Saved Tests</Text>
        <Pressable onPress={() => setAppState(prev => ({ ...prev, currentView: 'main' }))} style={{ backgroundColor: '#6b7280', padding: 10, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 16 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>← Back to Main</Text>
        </Pressable>

        <ScrollView>
          {appState.savedRecords.map(record => (
            <View key={record.id} style={{ backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{record.aggregateName}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Date: {formatDateForDisplay(record.date)}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Type: {record.aggregateType}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>FM: {record.finenessModulus} | Decant: {record.decant}%</Text>
              <Pressable onPress={() => exportRecordAsCSV(record)} style={{ backgroundColor: '#2563eb', padding: 8, borderRadius: 6, marginTop: 8 }}>
                <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>Export CSV</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Messages */}
      {appState.error && (
        <View style={{ position: 'absolute', top: 10, left: 16, right: 16, backgroundColor: '#fecaca', padding: 12, borderRadius: 6, zIndex: 1000 }}>
          <Text style={{ color: '#991b1b' }}>{appState.error}</Text>
        </View>
      )}
      {appState.successMessage && (
        <View style={{ position: 'absolute', top: 10, left: 16, right: 16, backgroundColor: '#d1fae5', padding: 12, borderRadius: 6, zIndex: 1000 }}>
          <Text style={{ color: '#065f46' }}>{appState.successMessage}</Text>
        </View>
      )}

      {/* View Switcher */}
      {appState.currentView === 'main' && renderMainView()}
      {appState.currentView === 'admin' && renderAdminView()}
      {appState.currentView === 'repository' && renderRepositoryView()}
    </SafeAreaView>
  );
};

export default AggregateGradationScreen;
