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
    }
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
  };
  SlippageHistory: undefined;
  EmailComposer: {
    subject: string;
    body: string;
  };
};
