import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@link_rail_preferences';

// In-memory fallback for cases where all persistent storage fails
let memoryStorage = null;

const isWeb = Platform.OS === 'web';

export const savePreferences = async (preferences) => {
  try {
    const jsonValue = JSON.stringify(preferences);
    
    if (isWeb) {
      localStorage.setItem(STORAGE_KEY, jsonValue);
      return;
    }

    // Try AsyncStorage with a safety check
    try {
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (nativeError) {
      console.warn('AsyncStorage Native Error, falling back to memory:', nativeError);
      memoryStorage = jsonValue;
    }
  } catch (e) {
    console.error('General storage error:', e);
  }
};

export const getPreferences = async () => {
  try {
    if (isWeb) {
      const val = localStorage.getItem(STORAGE_KEY);
      return val ? JSON.parse(val) : [];
    }

    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue !== null) return JSON.parse(jsonValue);
    } catch (nativeError) {
      console.warn('AsyncStorage Native Error on get:', nativeError);
    }

    // Fallback to memory
    return memoryStorage ? JSON.parse(memoryStorage) : [];
  } catch (e) {
    console.error('Error getting preferences', e);
    return [];
  }
};

export const findActivePreference = (preferences) => {
  if (!preferences || preferences.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const active = preferences.find(p => {
    const [startH, startM] = p.startTime.split(':').map(Number);
    const [endH, endM] = p.endTime.split(':').map(Number);
    
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      return currentMinutes >= startTotal && currentMinutes < endTotal;
    } else {
      return currentMinutes >= startTotal || currentMinutes < endTotal;
    }
  });

  return active || preferences[0];
};
