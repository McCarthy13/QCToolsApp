export type RootStackParamList = {
  Dashboard: undefined;
  Calculator: undefined;
  Results: { calculation: any };
  History: undefined;
  StrandPatterns: undefined;
  ProductDetails: undefined;
  SlippageIdentifier: { 
    config: {
      projectName?: string;
      projectNumber?: string;
      markNumber?: string;
      idNumber?: string;
      span?: number;
      productType: string;
      strandPattern: string;
      topStrandPattern?: string;
      productWidth?: number;
      offcutSide?: 'L1' | 'L2';
    };
    // Quality log integration
    fromQualityLog?: boolean;
    qualityLogId?: string;
    qualityEntryId?: string;
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
      productType: string;
      strandPattern: string;
      topStrandPattern?: string;
      productWidth?: number;
      offcutSide?: 'L1' | 'L2';
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
  GradationTest: { aggregateName: string };
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
  IssueCodeLibrary: undefined;
  ProductLibrary: undefined;
  DailyPourSchedule: undefined;
};
