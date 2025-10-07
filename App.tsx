import { StatusBar } from "expo-status-bar";
import { Pressable, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "./src/navigation/types";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StrandPatternsScreen from "./src/screens/StrandPatternsScreen";

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

// App version: force reload
export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Calculator"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#FFFFFF',
              },
              headerTintColor: '#111827',
              headerTitleStyle: {
                fontWeight: '600',
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="Calculator"
              component={CalculatorScreen}
              options={({ navigation }) => ({
                title: "Camber Calculator",
                headerRight: () => (
                  <View className="flex-row gap-3 mr-1">
                    <Pressable
                      onPress={() => navigation.navigate('StrandPatterns')}
                    >
                      <Ionicons name="albums-outline" size={24} color="#111827" />
                    </Pressable>
                    <Pressable
                      onPress={() => navigation.navigate('History')}
                    >
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
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
