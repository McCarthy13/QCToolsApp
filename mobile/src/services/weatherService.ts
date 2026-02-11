// Weather service for fetching historical weather data based on pour dates
// Uses Open-Meteo API (free, no API key required)

import { WeatherData } from '../types/insights';

// Plant location coordinates (you may want to make this configurable)
const PLANT_LATITUDE = 33.4484; // Example: Phoenix, AZ
const PLANT_LONGITUDE = -112.0740;

// Weather condition codes from Open-Meteo
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Slight Hail',
  99: 'Thunderstorm with Heavy Hail',
};

/**
 * Convert MM/DD/YYYY to YYYY-MM-DD for API
 */
function convertDateFormat(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [month, day, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Fetch weather data for a specific pour date
 */
export async function fetchWeatherForDate(pourDate: string): Promise<WeatherData | null> {
  try {
    const apiDate = convertDateFormat(pourDate);

    // Open-Meteo historical weather API
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${PLANT_LATITUDE}&longitude=${PLANT_LONGITUDE}&start_date=${apiDate}&end_date=${apiDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=America/Phoenix`;

    console.log('[WeatherService] Fetching weather for:', pourDate, '→', apiDate);

    const response = await fetch(url);

    if (!response.ok) {
      console.error('[WeatherService] API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      console.log('[WeatherService] No data returned for date');
      return null;
    }

    const weatherCode = data.daily.weathercode?.[0] ?? 0;
    const tempMax = data.daily.temperature_2m_max?.[0] ?? 0;
    const tempMin = data.daily.temperature_2m_min?.[0] ?? 0;

    const weatherData: WeatherData = {
      date: pourDate,
      temperature: Math.round((tempMax + tempMin) / 2), // Average temp
      humidity: Math.round(data.daily.relative_humidity_2m_mean?.[0] ?? 0),
      conditions: WEATHER_CODES[weatherCode] || 'Unknown',
      windSpeed: Math.round(data.daily.windspeed_10m_max?.[0] ?? 0),
      precipitation: data.daily.precipitation_sum?.[0] ?? 0,
    };

    console.log('[WeatherService] Weather data:', weatherData);
    return weatherData;
  } catch (error) {
    console.error('[WeatherService] Error fetching weather:', error);
    return null;
  }
}

/**
 * Batch fetch weather for multiple dates
 */
export async function fetchWeatherForDates(pourDates: string[]): Promise<Map<string, WeatherData>> {
  const weatherMap = new Map<string, WeatherData>();

  // Deduplicate dates
  const uniqueDates = [...new Set(pourDates)];

  console.log('[WeatherService] Fetching weather for', uniqueDates.length, 'dates');

  // Fetch in batches to avoid rate limiting
  for (const date of uniqueDates) {
    const weather = await fetchWeatherForDate(date);
    if (weather) {
      weatherMap.set(date, weather);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return weatherMap;
}

/**
 * Get weather condition category for analysis
 */
export function categorizeWeather(weather: WeatherData): string {
  const { temperature, humidity, conditions, windSpeed, precipitation } = weather;

  const categories: string[] = [];

  // Temperature categories
  if (temperature < 40) categories.push('Cold');
  else if (temperature > 90) categories.push('Hot');
  else categories.push('Moderate Temp');

  // Humidity
  if (humidity > 80) categories.push('High Humidity');
  else if (humidity < 30) categories.push('Low Humidity');

  // Wind
  if (windSpeed > 20) categories.push('Windy');

  // Precipitation
  if (precipitation > 0.1) categories.push('Wet');

  // Conditions
  if (conditions.toLowerCase().includes('rain') || conditions.toLowerCase().includes('drizzle')) {
    categories.push('Rainy');
  } else if (conditions.toLowerCase().includes('snow')) {
    categories.push('Snowy');
  } else if (conditions.toLowerCase().includes('thunder')) {
    categories.push('Stormy');
  }

  return categories.join(', ') || 'Normal';
}
