export type RootStackParamList = {
  Dashboard: undefined;
  Calculator: undefined;
  Results: { calculation: any };
  History: undefined;
  StrandPatterns: undefined;
  SlippageIdentifier: undefined;
  SlippageSummary: { 
    slippages: Array<{ 
      strandId: string; 
      leftSlippage: string; 
      rightSlippage: string;
      leftExceedsOne: boolean;
      rightExceedsOne: boolean;
    }> 
  };
};
