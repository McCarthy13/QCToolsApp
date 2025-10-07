const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearPatterns() {
  try {
    await AsyncStorage.removeItem('strand-pattern-storage');
    console.log('Cleared all strand patterns successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing patterns:', error);
    process.exit(1);
  }
}

clearPatterns();
