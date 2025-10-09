import { StatusBar } from "expo-status-bar";
import { Pressable, View, Text } from "react-native";
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
import LoginScreen from "./src/screens/LoginScreen";
import RegistrationScreen from "./src/screens/RegistrationScreen";
import AdminApprovalScreen from "./src/screens/AdminApprovalScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import { useAuthStore } from "./src/state/authStore";

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
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>("login");
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication state on mount
  useEffect(() => {
    setIsLoading(false);
  }, []);

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
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="Results"
              component={ResultsScreen}
              options={{
                title: "Results",
              }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{
                title: "History",
              }}
            />
            <Stack.Screen
              name="StrandPatterns"
              component={StrandPatternsScreen}
              options={{
                title: "Strand Patterns",
              }}
            />
            <Stack.Screen
              name="ProductDetails"
              component={ProductDetailsScreen}
              options={({ navigation }) => ({
                title: "Product Details",
                headerRight: () => (
                  <Pressable
                    onPress={() => navigation.navigate("SlippageHistory")}
                    className="mr-1"
                  >
                    <Ionicons name="time-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="SlippageIdentifier"
              component={SlippageIdentifierScreen}
              options={({ navigation }) => ({
                title: "Slippage Identifier",
                headerRight: () => (
                  <Pressable
                    onPress={() => navigation.navigate("SlippageHistory")}
                    className="mr-1"
                  >
                    <Ionicons name="time-outline" size={24} color="#111827" />
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen
              name="SlippageSummary"
              component={SlippageSummaryScreen}
              options={{
                title: "Slippage Summary",
              }}
            />
            <Stack.Screen
              name="SlippageHistory"
              component={SlippageHistoryScreen}
              options={{
                title: "Slippage History",
              }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
