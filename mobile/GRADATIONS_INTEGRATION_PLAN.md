# Gradations Tool Integration Plan

## Overview
Integrating standalone HTML/CSS/JS Gradations web app (2284 lines) into QCToolsApp as a new tool with identical functionality.

## Original App Analysis

### Core Features
1. **Aggregate Configuration**
   - Create/edit/delete aggregate profiles (Coarse/Fine)
   - Define sieve sizes and ASTM C-33 spec limits
   - Import from existing profiles
   - Pre-configured defaults (Keystone #7, Concrete Sand, etc.)

2. **Test Entry**
   - Multiple simultaneous tests
   - Weight retained input with keyboard navigation (Enter/Arrow/Tab)
   - Auto-calculation: % retained, cumulative % retained, % passing
   - Washed weight input for decant calculation
   - Fineness modulus calculation (Fine aggregates only)

3. **Data Management**
   - Save tests to repository
   - Filter by aggregate, type, date range, material name
   - View/edit/delete records
   - Export individual or batch CSV
   - Print individual records

4. **Visualization**
   - SVG-based gradation curves
   - Sample line vs ASTM C-33 upper/lower limits
   - Pass/fail visual indicators

5. **Printing**
   - Blank form printing (portrait)
   - Filled record printing (portrait) with chart
   - Print multiple blank forms

### Data Structures

#### Aggregate Profile
```javascript
{
  name: string,
  type: 'Coarse' | 'Fine',
  sieves: [{
    name: string,      // '3/4"', '#4', etc.
    size: number,      // mm
    c33Lower: number | '-',
    c33Upper: number | '-'
  }]
}
```

#### Test Record
```javascript
{
  id: string (UUID),
  aggregateName: string,
  aggregateType: 'Coarse' | 'Fine',
  date: string (ISO),
  materialName: string,
  sieveData: [{
    name: string,
    size: number,
    weightRetained: string,
    percentRetained: string,
    cumulativeRetained: string,
    percentPassing: string,
    c33Lower: number | '-',
    c33Upper: number | '-'
  }],
  washedWeight: string,
  decant: string,
  finenessModulus: string,
  totalWeight: number,
  passes: boolean,
  timestamp: number
}
```

### Key Functions
- `calculateTestData()` - Calculate all percentages
- `calculateFinenessModulus()` - FM for fine aggregates
- `calculateDecant()` - Decant percentage
- `prepareChartData()` - Format data for charts
- `createSimpleChart()` - SVG chart generation
- `handleWeightKeydown()` - Keyboard navigation
- `handleWashedKeydown()` - Keyboard navigation

### Storage
- localStorage keys: 'aggregateLibrary', 'testRepository', 'defaultAggregates'

## Integration Strategy

### 1. Firebase Structure
```
/users/{userId}/gradations/
  /aggregates/{aggregateId}
    - name
    - type
    - sieves[]
    - isDefault
    - createdAt
    - updatedAt

  /records/{recordId}
    - aggregateName
    - aggregateType
    - date
    - materialName
    - sieveData[]
    - washedWeight
    - decant
    - finenessModulus
    - totalWeight
    - passes
    - timestamp
```

### 2. File Structure
```
/src/screens/GradationsScreen/
  index.tsx                 - Main screen
  components/
    GradationsHeader.tsx    - Header with navigation
    TestEntryView.tsx       - Main test entry interface
    TestCard.tsx            - Individual test card
    SieveInput.tsx          - Weight input field
    ConfigurationView.tsx   - Aggregate management
    AggregateForm.tsx       - Add/edit aggregate
    RepositoryView.tsx      - Saved records list
    RecordCard.tsx          - Record list item
    RecordModal.tsx         - View/edit record
    GradationChart.tsx      - Chart component
    PrintModal.tsx          - Print options
    ExportOptions.tsx       - Export options
  store/
    gradationsStore.ts      - Zustand store
  utils/
    calculations.ts         - All calculation functions
    chartUtils.ts           - Chart generation
    constants.ts            - Sieve sizes, defaults
  firebase/
    aggregatesService.ts    - Aggregate CRUD
    recordsService.ts       - Record CRUD
```

### 3. State Management (Zustand)
```typescript
interface GradationsState {
  // Data
  aggregates: Record<string, Aggregate>
  records: TestRecord[]
  activeTests: ActiveTest[]

  // UI State
  currentView: 'main' | 'admin' | 'repository' | 'configureDefaults'
  selectedAggregate: string
  date: string
  showAddMore: boolean
  showPrintModal: boolean
  editingRecord: TestRecord | null
  viewingRecord: TestRecord | null

  // Filters
  filterAggregate: string
  filterType: string
  filterDateFrom: string
  filterDateTo: string

  // Actions
  loadAggregates: () => Promise<void>
  loadRecords: () => Promise<void>
  addAggregate: (aggregate: Aggregate) => Promise<void>
  updateAggregate: (id: string, aggregate: Aggregate) => Promise<void>
  deleteAggregate: (id: string) => Promise<void>
  saveRecord: (record: TestRecord) => Promise<void>
  updateRecord: (id: string, record: TestRecord) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  addTest: () => void
  removeTest: (index: number) => void
  updateTestWeight: (testIndex: number, sieveIndex: number, weight: string) => void
  setView: (view: string) => void
  // ... more actions
}
```

### 4. Component Conversion Map

| Original HTML | React Native Component |
|--------------|------------------------|
| `<div>` | `<View>` |
| `<input type="text">` | `<TextInput>` |
| `<button>` | `<Pressable>` + `<Text>` |
| `<select>` | Custom `<Picker>` or `<BottomSheet>` |
| `<svg>` | `react-native-svg` |
| Print CSS | `react-native-print` or Share API |
| Modal overlays | `<Modal>` component |

### 5. Key Adaptations

#### Keyboard Navigation
- Use `onSubmitEditing` for Enter key
- Use `ref` forwarding for focus management
- Implement custom navigation logic

#### Chart Rendering
- Use `react-native-svg` with same SVG generation logic
- Create wrapper component for chart
- Ensure responsive sizing

#### Print Functionality
- Use `expo-print` for PDF generation
- Create print templates matching original
- Support batch printing
- Implement CSV export via `expo-sharing`

#### Date Input
- Use React Native date picker
- Support shorthand date entry (7/3/25 → 2025-07-03)
- Format display dates consistently

#### Styling
- Convert Tailwind classes to Nativewind
- Maintain exact color schemes
- Preserve spacing and layout
- Implement print-specific styles

### 6. Testing Checklist
- [ ] All calculations match original (%, cumulative %, passing, FM, decant)
- [ ] Keyboard navigation works (Enter, Tab, Arrows)
- [ ] Chart rendering matches original
- [ ] Print output matches original
- [ ] CSV export format matches original
- [ ] Save/load from Firebase works
- [ ] Filters work correctly
- [ ] Edit/delete functionality works
- [ ] Default aggregates load correctly
- [ ] Multi-test interface works
- [ ] Date shortcuts work
- [ ] Pass/fail indicators correct

### 7. Migration Steps

1. ✅ Download and analyze original code
2. ⏳ Create Firebase collections and services
3. ⏳ Set up navigation and screen
4. ⏳ Create Zustand store
5. ⏳ Build configuration view
6. ⏳ Build test entry view
7. ⏳ Build repository view
8. ⏳ Implement all calculations
9. ⏳ Create chart component
10. ⏳ Implement print/export
11. ⏳ Test everything
12. ⏳ Deploy

## Notes
- Maintain exact calculation precision (toFixed values)
- Preserve all keyboard shortcuts
- Keep same color coding (red=fail, green=pass)
- Maintain same error handling
- Keep same date formatting
- Preserve all validation logic
