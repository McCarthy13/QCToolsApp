import { StatusBar } from "expo-status-bar";
import { Pressable, View, Text, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { RootStackParamList } from "./src/navigation/types";
import DashboardScreen from "./src/screens/DashboardScreen";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StrandPatternsScreen from "./src/screens/StrandPatternsScreen";
import ProductDetailsScreen from "./src/screens/ProductDetailsScreen";
import SlippageIdentifierScreen from "./src/screens/SlippageIdentifierScreen";
import SlippageSummaryScreen from "./src/screens/SlippageSummaryScreen";
import SlippageHistoryScreen from "./src/screens/SlippageHistoryScreen";
import EmailComposerScreen from "./src/screens/EmailComposerScreen";
import StressingCalculatorScreen from "./src/screens/StressingCalculatorScreen";
import StressingResultsScreen from "./src/screens/StressingResultsScreen";
import StrandLibraryScreen from "./src/screens/StrandLibraryScreen";
import AggregateGradationScreen from "./src/screens/AggregateGradationScreen";
import GradationTestScreen from "./src/screens/GradationTestScreen";
import GradationResultsScreen from "./src/screens/GradationResultsScreen";
import GradationHistoryScreen from "./src/screens/GradationHistoryScreen";
import GradationAdminScreen from "./src/screens/GradationAdminScreen";
import GradationAddEditAggregateScreen from "./src/screens/GradationAddEditAggregateScreen";
import AggregateLibraryScreen from "./src/screens/AggregateLibraryScreen";
import AggregateLibraryDetailScreen from "./src/screens/AggregateLibraryDetailScreen";
import AggregateLibraryAddEditScreen from "./src/screens/AggregateLibraryAddEditScreen";
import AdmixLibraryScreen from "./src/screens/AdmixLibraryScreen";
import AdmixLibraryDetailScreen from "./src/screens/AdmixLibraryDetailScreen";
import AdmixLibraryAddEditScreen from "./src/screens/AdmixLibraryAddEditScreen";
import ContactsScreen from "./src/screens/ContactsScreen";
import ContactDetailScreen from "./src/screens/ContactDetailScreen";
import ContactAddEditScreen from "./src/screens/ContactAddEditScreen";
import QualityLogDashboardScreen from "./src/screens/QualityLogDashboardScreen";
import QualityLogListScreen from "./src/screens/QualityLogListScreen";
import QualityLogDetailScreen from "./src/screens/QualityLogDetailScreen";
import QualityLogAddEditScreen from "./src/screens/QualityLogAddEditScreen";
import QualityLogMetricsScreen from "./src/screens/QualityLogMetricsScreen";
import QualityLogSearchScreen from "./src/screens/QualityLogSearchScreen";
import IssueCodeLibraryScreen from "./src/screens/IssueCodeLibraryScreen";
import ProductLibraryScreen from "./src/screens/ProductLibraryScreen";
import ProjectLibraryScreen from "./src/screens/ProjectLibraryScreen";
import ProjectLibraryDetailScreen from "./src/screens/ProjectLibraryDetailScreen";
import ProjectLibraryAddEditScreen from "./src/screens/ProjectLibraryAddEditScreen";
import ProjectLibraryExportImportScreen from "./src/screens/ProjectLibraryExportImportScreen";
import DailyPourScheduleScreen from "./src/screens/DailyPourScheduleScreen";
import ScheduleSearchScreen from "./src/screens/ScheduleSearchScreen";
import ScheduleScannerScreen from "./src/screens/ScheduleScannerScreen";
import ScheduleReviewScreen from "./src/screens/ScheduleReviewScreen";
import ProductTagScannerScreen from "./src/screens/ProductTagScannerScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegistrationScreen from "./src/screens/RegistrationScreen";
import AdminApprovalScreen from "./src/screens/AdminApprovalScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import YardMapScreen from "./src/screens/YardMapScreen";
import YardDepartmentScreen from "./src/screens/YardDepartmentScreen";
import YardProductSelectionScreen from "./src/screens/YardProductSelectionScreen";
import YardSearchScreen from "./src/screens/YardSearchScreen";
import { useAuthStore } from "./src/state/authStore";
import { useStrandLibraryStore } from "./src/state/strandLibraryStore";
import { useStrandPatternStore } from "./src/state/strandPatternStore";
import { useProductLibraryStore } from "./src/state/productLibraryStore";
import { useAggregateLibraryStore } from "./src/state/aggregateLibraryStore";
import { useAdmixLibraryStore } from "./src/state/admixLibraryStore";
import { useProjectLibraryStore } from "./src/state/projectLibraryStore";
import { useContactsStore } from "./src/state/contactsStore";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

const Stack = createNativeStackNavigator<RootStackParamList>();

type AuthScreen =
  | "login"
  | "registration"
  | "changePassword"
  | "adminApproval"
  | "requestSuccess";

// App version: force reload
export default function App() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const initializeStrandLibrary = useStrandLibraryStore((state) => state.initialize);
  const initializeStrandPatterns = useStrandPatternStore((state) => state.initialize);
  const initializeProducts = useProductLibraryStore((state) => state.initialize);
  const initializeAggregates = useAggregateLibraryStore((state) => state.initialize);
  const initializeAdmixes = useAdmixLibraryStore((state) => state.initialize);
  const initializeProjects = useProjectLibraryStore((state) => state.initialize);
  const initializeContacts = useContactsStore((state) => state.initialize);
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>("login");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Firebase auth and check authentication state on mount
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsLoading(false);
    };
    init();
  }, []);

  // Initialize Firebase-backed stores only after user is authenticated
  useEffect(() => {
    if (currentUser && currentUser.status === 'approved') {
      const initStores = async () => {
        await Promise.all([
          initializeStrandLibrary(),
          initializeStrandPatterns(),
          initializeProducts(),
          initializeAggregates(),
          initializeAdmixes(),
          initializeProjects(),
          initializeContacts(),
        ]);
      };
      initStores();
    }
  }, [currentUser]);

  // Handle successful login
  const handleLoginSuccess = (requiresPasswordChange: boolean) => {
    if (requiresPasswordChange) {
      setCurrentScreen("changePassword");
    }
    // If no password change required, currentUser will be set and main app renders
  };

  // Handle password change success
  const handlePasswordChangeSuccess = () => {
    // After password change, currentUser is already updated in the store
    // The app will automatically render the main app
  };

  // Handle registration success
  const handleRegistrationSuccess = () => {
    setCurrentScreen("requestSuccess");
  };

  // Show nothing while checking initial state
  if (isLoading) {
    return null;
  }

  // Show auth screens if not authenticated
  if (!currentUser) {
    return (
      <GestureHandlerRootView className="flex-1">
        <SafeAreaProvider>
          {currentScreen === "login" && (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
              onRequestAccess={() => setCurrentScreen("registration")}
            />
          )}
          {currentScreen === "registration" && (
            <RegistrationScreen
              onBack={() => setCurrentScreen("login")}
              onSuccess={handleRegistrationSuccess}
            />
          )}
          {currentScreen === "requestSuccess" && (
            <View
              className="flex-1 items-center justify-center px-6"
              style={{ backgroundColor: "#3B82F6" }}
            >
              <View className="bg-white rounded-full p-6 mb-6">
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <View className="bg-white rounded-2xl p-6 shadow-2xl max-w-md">
                <Text className="text-gray-900 text-2xl font-bold mb-2 text-center">
                  Request Submitted!
                </Text>
                <Text className="text-gray-600 text-base text-center mb-6">
                  Your access request has been submitted. An admin will review
                  it and send you login credentials via email if approved.
                </Text>
                <Pressable
                  onPress={() => setCurrentScreen("login")}
                  className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
                >
                  <Text className="text-white text-base font-semibold">
                    Back to Login
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          {currentScreen === "adminApproval" && (
            <AdminApprovalScreen onBack={() => setCurrentScreen("login")} />
          )}
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show password change screen if user has temporary password
  if (currentUser.isTemporaryPassword) {
    return (
      <GestureHandlerRootView className="flex-1">
        <SafeAreaProvider>
          <ChangePasswordScreen onSuccess={handlePasswordChangeSuccess} />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show admin approval screen for admins
  // (They can access it from the dashboard settings in future, but for now we'll add a way to get there)

  // Show main app if authenticated and password is not temporary
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerStyle: {
                backgroundColor: "#FFFFFF",
              },
              headerTintColor: "#111827",
              headerTitleStyle: {
                fontWeight: "600",
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: "Precast Quality Tools",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="Calculator"
              component={CalculatorScreen}
              options={({ navigation }) => ({
                title: "Camber Calculator",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable
                      onPress={() => navigation.navigate("StrandPatterns")}
                    >
                      <Ionicons name="albums-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("History")}>
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="Results"
              component={ResultsScreen}
              options={({ navigation }) => ({
                title: "Results",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={({ navigation }) => ({
                title: "History",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="StrandPatterns"
              component={StrandPatternsScreen}
              options={({ navigation }) => ({
                title: "Strand Patterns",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="ProductDetails"
              component={ProductDetailsScreen}
              options={({ navigation }) => ({
                title: "Product Details",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable
                      onPress={() => navigation.navigate("StrandPatterns")}
                    >
                      <Ionicons name="albums-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable
                      onPress={() => navigation.navigate("SlippageHistory")}
                    >
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="SlippageIdentifier"
              component={SlippageIdentifierScreen}
              options={({ navigation }) => ({
                title: "Slippage Identifier",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable
                      onPress={() => navigation.navigate("SlippageHistory")}
                    >
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="SlippageSummary"
              component={SlippageSummaryScreen}
              options={({ navigation }) => ({
                title: "Slippage Summary",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="SlippageHistory"
              component={SlippageHistoryScreen}
              options={({ navigation }) => ({
                title: "Slippage History",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="EmailComposer"
              component={EmailComposerScreen}
              options={{
                title: "Send Email Report",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="StressingCalculator"
              component={StressingCalculatorScreen}
              options={({ navigation }) => ({
                title: "Stressing Calculator",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable onPress={() => navigation.navigate("StrandLibrary")}>
                      <Ionicons name="library-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="StressingResults"
              component={StressingResultsScreen}
              options={({ navigation }) => ({
                title: "Elongation Results",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="StrandLibrary"
              component={StrandLibraryScreen}
              options={({ navigation }) => ({
                title: "Strand Library",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="AggregateGradation"
              component={AggregateGradationScreen}
              options={({ navigation }) => ({
                title: "Aggregate Gradation",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable onPress={() => navigation.navigate("GradationAdmin")}>
                      <Ionicons name="settings-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("GradationHistory")}>
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="GradationTest"
              component={GradationTestScreen}
              options={({ navigation, route }) => ({
                title: `Test: ${route.params?.aggregateName || 'Gradation'}`,
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable onPress={() => navigation.navigate("GradationAdmin")}>
                      <Ionicons name="settings-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("GradationHistory")}>
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="GradationResults"
              component={GradationResultsScreen}
              options={({ navigation }) => ({
                title: "Test Results",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable onPress={() => navigation.navigate("GradationAdmin")}>
                      <Ionicons name="settings-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("GradationHistory")}>
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="GradationHistory"
              component={GradationHistoryScreen}
              options={({ navigation }) => ({
                title: "Test Repository",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable onPress={() => navigation.navigate("GradationAdmin")}>
                      <Ionicons name="settings-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="GradationAdmin"
              component={GradationAdminScreen}
              options={({ navigation }) => ({
                title: "Aggregate Configuration",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable onPress={() => navigation.navigate("GradationHistory")}>
                      <Ionicons name="time-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Dashboard")}>
                      <Ionicons name="home-outline" size={24} color="#111827" />
                    </Pressable>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="GradationAddEditAggregate"
              component={GradationAddEditAggregateScreen}
              options={{
                title: "Configure Aggregate",
              }}
            />
            <Stack.Screen
              name="AggregateLibrary"
              component={AggregateLibraryScreen}
              options={({ navigation }) => ({
                title: "Aggregate Library",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="AggregateLibraryDetail"
              component={AggregateLibraryDetailScreen}
              options={({ navigation }) => ({
                title: "Aggregate Details",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="AggregateLibraryAddEdit"
              component={AggregateLibraryAddEditScreen}
              options={({ route }) => ({
                title: route.params?.aggregateId ? "Edit Aggregate" : "Add Aggregate",
              })}
            />
            <Stack.Screen
              name="AdmixLibrary"
              component={AdmixLibraryScreen}
              options={({ navigation }) => ({
                title: "Admix Library",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="AdmixLibraryDetail"
              component={AdmixLibraryDetailScreen}
              options={({ navigation }) => ({
                title: "Admixture Details",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="AdmixLibraryAddEdit"
              component={AdmixLibraryAddEditScreen}
              options={({ route }) => ({
                title: route.params?.admixId ? "Edit Admixture" : "Add Admixture",
              })}
            />
            <Stack.Screen
              name="Contacts"
              component={ContactsScreen}
              options={({ navigation }) => ({
                title: "Contacts",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={({ navigation }) => ({
                title: "Contact Details",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} className="mr-1">
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="ContactAddEdit"
              component={ContactAddEditScreen}
              options={({ route }) => ({
                title: route.params?.contactId ? "Edit Contact" : "Add Contact",
              })}
            />
            <Stack.Screen
              name="QualityLogDashboard"
              component={QualityLogDashboardScreen}
              options={({ navigation }) => ({
                title: "Quality Logs",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="QualityLogList"
              component={QualityLogListScreen}
              options={({ navigation, route }) => ({
                title: `${route.params?.department} Logs`,
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="QualityLogDetail"
              component={QualityLogDetailScreen}
              options={({ navigation }) => ({
                title: "Log Details",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="QualityLogAddEdit"
              component={QualityLogAddEditScreen}
              options={({ route }) => ({
                title: route.params?.logId ? "Edit Log Entry" : "New Log Entry",
              })}
            />
            <Stack.Screen
              name="QualityLogMetrics"
              component={QualityLogMetricsScreen}
              options={({ navigation }) => ({
                title: "Quality Metrics",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="QualityLogSearch"
              component={QualityLogSearchScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IssueCodeLibrary"
              component={IssueCodeLibraryScreen}
              options={({ navigation }) => ({
                title: "Issue Code Library",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="ProductLibrary"
              component={ProductLibraryScreen}
              options={({ navigation }) => ({
                title: "Product Library",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="ProjectLibrary"
              component={ProjectLibraryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProjectLibraryDetail"
              component={ProjectLibraryDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProjectLibraryAddEdit"
              component={ProjectLibraryAddEditScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProjectLibraryExportImport"
              component={ProjectLibraryExportImportScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DailyPourSchedule"
              component={DailyPourScheduleScreen}
              options={({ navigation }) => ({
                title: "Daily Pour Schedule",
                headerBackVisible: true,
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="ScheduleSearch"
              component={ScheduleSearchScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ScheduleScanner"
              component={ScheduleScannerScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="ScheduleReview"
              component={ScheduleReviewScreen}
              options={{
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="ProductTagScanner"
              component={ProductTagScannerScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="YardMap"
              component={YardMapScreen}
              options={({ navigation }) => ({
                title: "Yard Maps",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="YardDepartment"
              component={YardDepartmentScreen}
              options={({ navigation, route }) => ({
                title: `${route.params?.department} Yard`,
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Dashboard")} style={{ marginRight: 4 }}>
                    <Ionicons name="home-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="YardProductSelection"
              component={YardProductSelectionScreen}
              options={{
                title: "Assign Yard Location",
              }}
            />
            <Stack.Screen
              name="YardSearch"
              component={YardSearchScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
