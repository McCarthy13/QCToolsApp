/**
 * EliPlan API Integration
 * 
 * This service connects to EliPlan scheduling software to pull production schedules.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Obtain API credentials from EliPlan
 * 2. Add to .env file:
 *    EXPO_PUBLIC_ELIPLAN_API_URL=https://your-eliplan-instance.com/api
 *    EXPO_PUBLIC_ELIPLAN_API_KEY=your_api_key
 *    EXPO_PUBLIC_ELIPLAN_USERNAME=your_username (if using basic auth)
 *    EXPO_PUBLIC_ELIPLAN_PASSWORD=your_password (if using basic auth)
 * 
 * API Documentation: Contact EliPlan support for API documentation
 */

// EliPlan API response types
export interface EliPlanScheduleItem {
  // Production order details
  productionOrderId?: string;
  jobNumber: string;
  jobName?: string;
  customerName?: string;
  
  // Product details
  productCode?: string;
  productDescription?: string;
  markNumber?: string;
  pieceCount?: number;
  dimensions?: string;
  
  // Material details
  concreteGrade?: string;
  concreteVolume?: number; // in cubic yards or cubic meters
  mixDesignId?: string;
  
  // Scheduling
  scheduledDate: string; // ISO date string
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  department?: string;
  workstation?: string; // form/bed identifier
  
  // Status
  status?: string;
  priority?: number;
  
  // Additional fields
  foreman?: string;
  notes?: string;
  [key: string]: any; // Allow for custom fields
}

export interface EliPlanApiResponse {
  success: boolean;
  data?: EliPlanScheduleItem[];
  error?: string;
  message?: string;
  total?: number;
  page?: number;
}

// Configuration
const ELIPLAN_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_ELIPLAN_API_URL || '',
  apiKey: process.env.EXPO_PUBLIC_ELIPLAN_API_KEY || '',
  username: process.env.EXPO_PUBLIC_ELIPLAN_USERNAME || '',
  password: process.env.EXPO_PUBLIC_ELIPLAN_PASSWORD || '',
};

/**
 * Check if EliPlan integration is configured
 */
export function isEliPlanConfigured(): boolean {
  return !!(ELIPLAN_CONFIG.baseUrl && (ELIPLAN_CONFIG.apiKey || ELIPLAN_CONFIG.username));
}

/**
 * Fetch production schedule from EliPlan for a specific date
 */
export async function fetchEliPlanSchedule(
  date: Date,
  options?: {
    department?: string;
    includeCompleted?: boolean;
  }
): Promise<EliPlanScheduleItem[]> {
  if (!isEliPlanConfigured()) {
    throw new Error('EliPlan API is not configured. Please add credentials to .env file.');
  }

  try {
    // Format date for API (adjust format based on EliPlan's requirements)
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Build query parameters
    const params = new URLSearchParams({
      date: dateStr,
      ...(options?.department && { department: options.department }),
      ...(options?.includeCompleted !== undefined && { 
        includeCompleted: options.includeCompleted.toString() 
      }),
    });

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authentication
    if (ELIPLAN_CONFIG.apiKey) {
      // API Key authentication
      headers['Authorization'] = `Bearer ${ELIPLAN_CONFIG.apiKey}`;
      // Some APIs use different header names:
      // headers['X-API-Key'] = ELIPLAN_CONFIG.apiKey;
    } else if (ELIPLAN_CONFIG.username && ELIPLAN_CONFIG.password) {
      // Basic authentication
      const credentials = btoa(`${ELIPLAN_CONFIG.username}:${ELIPLAN_CONFIG.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Make API request
    // Note: Adjust the endpoint path based on EliPlan's actual API structure
    const response = await fetch(
      `${ELIPLAN_CONFIG.baseUrl}/schedule?${params.toString()}`,
      {
        method: 'GET',
        headers,
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`EliPlan API error: ${response.status} ${response.statusText}`);
    }

    const data: EliPlanApiResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || data.message || 'Unknown error from EliPlan API');
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching EliPlan schedule:', error);
    throw error;
  }
}

/**
 * Fetch schedule for a date range
 */
export async function fetchEliPlanScheduleRange(
  startDate: Date,
  endDate: Date,
  options?: {
    department?: string;
    includeCompleted?: boolean;
  }
): Promise<EliPlanScheduleItem[]> {
  if (!isEliPlanConfigured()) {
    throw new Error('EliPlan API is not configured. Please add credentials to .env file.');
  }

  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      startDate: startStr,
      endDate: endStr,
      ...(options?.department && { department: options.department }),
      ...(options?.includeCompleted !== undefined && { 
        includeCompleted: options.includeCompleted.toString() 
      }),
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (ELIPLAN_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${ELIPLAN_CONFIG.apiKey}`;
    } else if (ELIPLAN_CONFIG.username && ELIPLAN_CONFIG.password) {
      const credentials = btoa(`${ELIPLAN_CONFIG.username}:${ELIPLAN_CONFIG.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(
      `${ELIPLAN_CONFIG.baseUrl}/schedule/range?${params.toString()}`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      throw new Error(`EliPlan API error: ${response.status} ${response.statusText}`);
    }

    const data: EliPlanApiResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || data.message || 'Unknown error from EliPlan API');
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching EliPlan schedule range:', error);
    throw error;
  }
}

/**
 * Test connection to EliPlan API
 */
export async function testEliPlanConnection(): Promise<{ success: boolean; message: string }> {
  if (!isEliPlanConfigured()) {
    return {
      success: false,
      message: 'EliPlan API is not configured. Please add credentials to .env file.',
    };
  }

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (ELIPLAN_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${ELIPLAN_CONFIG.apiKey}`;
    } else if (ELIPLAN_CONFIG.username && ELIPLAN_CONFIG.password) {
      const credentials = btoa(`${ELIPLAN_CONFIG.username}:${ELIPLAN_CONFIG.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Test with a simple health check or today's date
    const response = await fetch(
      `${ELIPLAN_CONFIG.baseUrl}/health`, // or use a minimal endpoint
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout for health check
      }
    );

    if (response.ok) {
      return {
        success: true,
        message: 'Successfully connected to EliPlan API',
      };
    } else {
      return {
        success: false,
        message: `Connection failed: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Map EliPlan department names to our department types
 * Customize this based on how EliPlan names departments
 */
export function mapEliPlanDepartment(eliplanDept?: string): 'Precast' | 'Extruded' | 'Wall Panels' | 'Flexicore' | null {
  if (!eliplanDept) return null;
  
  const dept = eliplanDept.toLowerCase().trim();
  
  if (dept.includes('precast')) return 'Precast';
  if (dept.includes('extrud')) return 'Extruded';
  if (dept.includes('wall') || dept.includes('panel')) return 'Wall Panels';
  if (dept.includes('flexicore') || dept.includes('flexi')) return 'Flexicore';
  
  return null;
}

/**
 * Map EliPlan status to our status types
 */
export function mapEliPlanStatus(eliplanStatus?: string): 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed' | 'Cancelled' {
  if (!eliplanStatus) return 'Scheduled';
  
  const status = eliplanStatus.toLowerCase().trim();
  
  if (status.includes('progress') || status.includes('active')) return 'In Progress';
  if (status.includes('complete') || status.includes('done')) return 'Completed';
  if (status.includes('delay')) return 'Delayed';
  if (status.includes('cancel')) return 'Cancelled';
  
  return 'Scheduled';
}
