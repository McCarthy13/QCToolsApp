export type RootStackParamList = {
  Dashboard: undefined;
  Calculator: { editingCalculation?: any } | undefined;
  Results: { calculation: any };
  History: undefined;
  StrandPatterns: undefined;
  ProductDetails:
    | {
        editMode: true;
        existingConfig: {
          projectName?: string;
          projectNumber?: string;
          markNumber?: string;
          idNumber?: string;
          span?: number;
          pourDate?: string;
          productType: string;
          strandPattern: string;
          topStrandPattern?: string;
          productWidth?: number;
          productSide?: 'L1' | 'L2';
        };
        existingSlippages: Array<{
          strandId: string;
          leftSlippage: string;
          rightSlippage: string;
          leftExceedsOne: boolean;
          rightExceedsOne: boolean;
        }>;
        recordId: string;
      }
    | undefined;
  ProductTagScanner: {
    onDataScanned: (data: {
      projectName?: string;
      projectNumber?: string;
      markNumber?: string;
      idNumber?: string;
      span?: { feet: number; inches: number };
      pourDate?: string;
      strandPattern?: string;
      productWidth?: number;
      slippageIdentifier?: string;
      camberCalculator?: string;
    }) => void;
  };
  SlippageIdentifier: {
    config: {
      projectName?: string;
      projectNumber?: string;
      markNumber?: string;
      idNumber?: string;
      span?: number;
      pourDate?: string;
      productType: string;
      strandPattern: string;
      topStrandPattern?: string;
      productWidth?: number;
      productSide?: 'L1' | 'L2';
    };
    // Quality log integration
    fromQualityLog?: boolean;
    qualityLogId?: string;
    qualityEntryId?: string;
    // Edit mode
    editMode?: boolean;
    existingSlippages?: Array<{
      strandId: string;
      leftSlippage: string;
      rightSlippage: string;
      leftExceedsOne: boolean;
      rightExceedsOne: boolean;
    }>;
    recordId?: string;
  };
  SlippageSummary: {
    slippages: Array<{
      strandId: string;
      leftSlippage: string;
      rightSlippage: string;
      leftExceedsOne: boolean;
      rightExceedsOne: boolean;
    }>;
    config: {
      projectName?: string;
      projectNumber?: string;
      markNumber?: string;
      idNumber?: string;
      span?: number;
      pourDate?: string;
      productType: string;
      strandPattern: string;
      topStrandPattern?: string;
      productWidth?: number;
      productSide?: 'L1' | 'L2';
    };
    // Quality log integration
    fromQualityLog?: boolean;
    qualityLogId?: string;
    qualityEntryId?: string;
  };
  SlippageHistory: undefined;
  EmailComposer: {
    subject: string;
    body: string;
  };
  StressingCalculator: undefined;
  StressingResults: {
    jackingForce: number;
    bedLength: number;
    strandId: string; // ID from Strand Library
    numberOfStrands: number;
    bedShortening?: number;
    frictionLoss?: number;
    anchorSetLoss?: number;
  };
  StrandLibrary: undefined;
  AggregateGradation: undefined;
  GradationTest: { aggregateName: string; editingTestId?: string };
  GradationResults: { testId: string };
  GradationHistory: undefined;
  GradationAdmin: undefined;
  GradationAddEditAggregate: { aggregateName?: string };
  AggregateLibrary: undefined;
  AggregateLibraryDetail: { aggregateId: string };
  AggregateLibraryAddEdit: { aggregateId?: string };
  AdmixLibrary: undefined;
  AdmixLibraryDetail: { admixId: string };
  AdmixLibraryAddEdit: { admixId?: string };
  Contacts: undefined;
  ContactDetail: { contactId: string };
  ContactAddEdit: { contactId?: string };
  QualityLogDashboard: undefined;
  QualityLogList: { department: string };
  QualityLogDetail: { logId: string };
  QualityLogAddEdit: { logId?: string; department?: string };
  QualityLogMetrics: undefined;
  QualityLogSearch: undefined;
  IssueCodeLibrary: undefined;
  ProductLibrary: undefined;
  ProjectLibrary: undefined;
  ProjectLibraryDetail: { projectId: string };
  ProjectLibraryAddEdit: { 
    projectId?: string;
    prefilledJobNumber?: string;
    prefilledJobName?: string;
    returnScreen?: string;
  };
  ProjectLibraryExportImport: undefined;
  DailyPourSchedule: { date?: string; department?: string } | undefined;
  ScheduleSearch: undefined;
  ScheduleScanner: { date?: string; department?: string };
  ScheduleReview: { entries: any[]; date: string; department?: string };
  YardMap: undefined;
  YardDepartment: { department: string };
  YardProductSelection: { pourEntryId: string; department: string };
  YardSearch: undefined;
};
