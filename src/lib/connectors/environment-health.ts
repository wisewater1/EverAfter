/**
 * Environmental Health Service
 * 
 * Uses Open-Meteo API (100% free, no API key, no signup).
 * https://open-meteo.com/
 * 
 * Provides real-time environmental factors that affect health:
 * - Weather conditions (temperature, humidity, pressure)
 * - UV Index (skin/eye health)
 * - Air Quality Index (respiratory health)
 * - Pollen count (allergy tracking)
 */

import { storeHealthMetrics, type ExtractedHealthData } from '../raphael/healthDataService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeatherHealth {
    temperature: number;
    apparent_temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    uvIndex: number;
    precipitation: number;
    cloudCover: number;
    sunrise: string;
    sunset: string;
    healthImpacts: HealthImpact[];
    fetchedAt: Date;
}

export interface AirQuality {
    aqi: number; // US AQI
    pm25: number;
    pm10: number;
    ozone: number;
    no2: number;
    so2: number;
    co: number;
    category: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
    healthImpacts: HealthImpact[];
    fetchedAt: Date;
}

export interface PollenData {
    grass: number;
    tree: number;
    weed: number;
    overallLevel: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';
    healthImpacts: HealthImpact[];
    fetchedAt: Date;
}

export interface HealthImpact {
    factor: string;
    level: 'low' | 'moderate' | 'high' | 'severe';
    recommendation: string;
    affectedConditions: string[];
}

export interface EnvironmentSnapshot {
    weather: WeatherHealth;
    airQuality: AirQuality;
    pollen: PollenData;
    location: { lat: number; lon: number };
    overallHealthScore: number; // 0-100, environmental favorability
}

const WEATHER_BASE = 'https://api.open-meteo.com/v1';
const AQI_BASE = 'https://air-quality-api.open-meteo.com/v1';

// ─── Location helper ─────────────────────────────────────────────────────────

async function getCurrentLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    });
}

// ─── Weather API ─────────────────────────────────────────────────────────────

/**
 * Get current weather with health impact analysis
 */
export async function getWeatherHealth(lat?: number, lon?: number): Promise<WeatherHealth> {
    if (lat === undefined || lon === undefined) {
        const loc = await getCurrentLocation();
        lat = loc.lat;
        lon = loc.lon;
    }

    const url = `${WEATHER_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,uv_index,precipitation,cloud_cover&daily=sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`);

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    const weather: WeatherHealth = {
        temperature: current.temperature_2m,
        apparent_temperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        pressure: current.surface_pressure,
        windSpeed: current.wind_speed_10m,
        uvIndex: current.uv_index,
        precipitation: current.precipitation,
        cloudCover: current.cloud_cover,
        sunrise: daily.sunrise?.[0] || '',
        sunset: daily.sunset?.[0] || '',
        healthImpacts: [],
        fetchedAt: new Date(),
    };

    // Analyze health impacts
    weather.healthImpacts = analyzeWeatherHealth(weather);

    return weather;
}

// ─── Air Quality API ─────────────────────────────────────────────────────────

/**
 * Get current air quality with health analysis
 */
export async function getAirQuality(lat?: number, lon?: number): Promise<AirQuality> {
    if (lat === undefined || lon === undefined) {
        const loc = await getCurrentLocation();
        lat = loc.lat;
        lon = loc.lon;
    }

    const url = `${AQI_BASE}/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Air Quality API error: ${response.status}`);

    const data = await response.json();
    const current = data.current;

    const aqi: AirQuality = {
        aqi: current.us_aqi || 0,
        pm25: current.pm2_5 || 0,
        pm10: current.pm10 || 0,
        ozone: current.ozone || 0,
        no2: current.nitrogen_dioxide || 0,
        so2: current.sulphur_dioxide || 0,
        co: current.carbon_monoxide || 0,
        category: getAQICategory(current.us_aqi || 0),
        healthImpacts: [],
        fetchedAt: new Date(),
    };

    aqi.healthImpacts = analyzeAirQuality(aqi);

    return aqi;
}

// ─── Pollen API (uses Open-Meteo forecast model) ─────────────────────────────

/**
 * Get pollen levels for allergy tracking
 */
export async function getPollenData(lat?: number, lon?: number): Promise<PollenData> {
    if (lat === undefined || lon === undefined) {
        const loc = await getCurrentLocation();
        lat = loc.lat;
        lon = loc.lon;
    }

    const url = `${AQI_BASE}/air-quality?latitude=${lat}&longitude=${lon}&current=grass_pollen,birch_pollen,ragweed_pollen`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Pollen API error: ${response.status}`);

        const data = await response.json();
        const current = data.current;

        const grass = current.grass_pollen || 0;
        const tree = current.birch_pollen || 0;
        const weed = current.ragweed_pollen || 0;
        const total = grass + tree + weed;

        const pollen: PollenData = {
            grass,
            tree,
            weed,
            overallLevel: total > 100 ? 'Very High' : total > 50 ? 'High' : total > 20 ? 'Moderate' : total > 5 ? 'Low' : 'None',
            healthImpacts: [],
            fetchedAt: new Date(),
        };

        pollen.healthImpacts = analyzePollenImpact(pollen);
        return pollen;
    } catch {
        // Pollen data not available in all regions
        return {
            grass: 0, tree: 0, weed: 0,
            overallLevel: 'None',
            healthImpacts: [],
            fetchedAt: new Date(),
        };
    }
}

// ─── Combined snapshot ───────────────────────────────────────────────────────

/**
 * Get full environmental health snapshot
 */
export async function getEnvironmentSnapshot(lat?: number, lon?: number): Promise<EnvironmentSnapshot> {
    if (lat === undefined || lon === undefined) {
        const loc = await getCurrentLocation();
        lat = loc.lat;
        lon = loc.lon;
    }

    const [weather, airQuality, pollen] = await Promise.all([
        getWeatherHealth(lat, lon),
        getAirQuality(lat, lon),
        getPollenData(lat, lon),
    ]);

    const overallHealthScore = calculateEnvironmentalScore(weather, airQuality, pollen);

    return { weather, airQuality, pollen, location: { lat, lon }, overallHealthScore };
}

/**
 * Store environmental data as health context
 */
export async function storeEnvironmentData(userId: string, snapshot: EnvironmentSnapshot): Promise<number> {
    const dataPoints: ExtractedHealthData[] = [
        {
            metric_type: 'uv_index',
            value: snapshot.weather.uvIndex,
            unit: 'index',
            raw_text: `UV Index: ${snapshot.weather.uvIndex}`,
        },
        {
            metric_type: 'air_quality',
            value: snapshot.airQuality.aqi,
            unit: 'AQI',
            raw_text: `Air Quality: ${snapshot.airQuality.aqi} (${snapshot.airQuality.category})`,
        },
        {
            metric_type: 'environmental_health_score',
            value: snapshot.overallHealthScore,
            unit: 'score',
            raw_text: `Environmental health score: ${snapshot.overallHealthScore}/100`,
        },
    ];

    const result = await storeHealthMetrics(userId, dataPoints, 'environment');
    return result.stored;
}

// ─── Health Impact Analysis ──────────────────────────────────────────────────

function analyzeWeatherHealth(weather: WeatherHealth): HealthImpact[] {
    const impacts: HealthImpact[] = [];

    // Temperature extremes
    if (weather.temperature > 95) {
        impacts.push({
            factor: 'Extreme Heat',
            level: 'severe',
            recommendation: 'Stay indoors, hydrate frequently. Risk of heat stroke.',
            affectedConditions: ['cardiovascular', 'respiratory', 'elderly'],
        });
    } else if (weather.temperature > 85) {
        impacts.push({
            factor: 'High Temperature',
            level: 'moderate',
            recommendation: 'Limit outdoor exercise. Drink extra water.',
            affectedConditions: ['cardiovascular', 'elderly'],
        });
    } else if (weather.temperature < 20) {
        impacts.push({
            factor: 'Extreme Cold',
            level: 'severe',
            recommendation: 'Minimize exposure. Risk of hypothermia and frostbite.',
            affectedConditions: ['cardiovascular', 'arthritis', 'asthma'],
        });
    }

    // UV Index
    if (weather.uvIndex >= 11) {
        impacts.push({
            factor: 'Extreme UV',
            level: 'severe',
            recommendation: 'Avoid sun exposure. SPF 50+ required.',
            affectedConditions: ['skin_cancer', 'photosensitivity'],
        });
    } else if (weather.uvIndex >= 6) {
        impacts.push({
            factor: 'High UV',
            level: 'moderate',
            recommendation: 'Wear sunscreen (SPF 30+), sunglasses, and hat.',
            affectedConditions: ['skin_health', 'eye_health'],
        });
    }

    // Humidity
    if (weather.humidity > 80) {
        impacts.push({
            factor: 'High Humidity',
            level: 'moderate',
            recommendation: 'May worsen respiratory conditions. Use dehumidifier.',
            affectedConditions: ['asthma', 'COPD', 'allergies'],
        });
    } else if (weather.humidity < 20) {
        impacts.push({
            factor: 'Very Low Humidity',
            level: 'moderate',
            recommendation: 'Stay hydrated. Use moisturizer and humidifier.',
            affectedConditions: ['skin_health', 'respiratory'],
        });
    }

    // Pressure changes
    if (weather.pressure < 1000) {
        impacts.push({
            factor: 'Low Barometric Pressure',
            level: 'low',
            recommendation: 'May trigger headaches or joint pain in sensitive individuals.',
            affectedConditions: ['migraines', 'arthritis'],
        });
    }

    return impacts;
}

function analyzeAirQuality(aq: AirQuality): HealthImpact[] {
    const impacts: HealthImpact[] = [];

    if (aq.aqi > 200) {
        impacts.push({
            factor: 'Very Unhealthy Air',
            level: 'severe',
            recommendation: 'Avoid all outdoor activities. Close windows. Use air purifier.',
            affectedConditions: ['asthma', 'COPD', 'cardiovascular', 'elderly', 'children'],
        });
    } else if (aq.aqi > 100) {
        impacts.push({
            factor: 'Unhealthy Air for Sensitive Groups',
            level: 'moderate',
            recommendation: 'Sensitive individuals should limit outdoor exertion.',
            affectedConditions: ['asthma', 'respiratory', 'heart_disease'],
        });
    } else if (aq.aqi > 50) {
        impacts.push({
            factor: 'Moderate Air Quality',
            level: 'low',
            recommendation: 'Unusually sensitive individuals should limit prolonged outdoor exertion.',
            affectedConditions: ['asthma'],
        });
    }

    if (aq.pm25 > 35) {
        impacts.push({
            factor: 'Elevated PM2.5',
            level: 'moderate',
            recommendation: 'Fine particulate matter elevated. Consider wearing N95 mask outdoors.',
            affectedConditions: ['respiratory', 'cardiovascular'],
        });
    }

    return impacts;
}

function analyzePollenImpact(pollen: PollenData): HealthImpact[] {
    const impacts: HealthImpact[] = [];

    if (pollen.overallLevel === 'Very High' || pollen.overallLevel === 'High') {
        const types: string[] = [];
        if (pollen.grass > 30) types.push('grass');
        if (pollen.tree > 30) types.push('tree');
        if (pollen.weed > 30) types.push('weed');

        impacts.push({
            factor: `High Pollen (${types.join(', ')})`,
            level: pollen.overallLevel === 'Very High' ? 'severe' : 'high',
            recommendation: 'Take antihistamines. Limit outdoor time. Shower after going outside.',
            affectedConditions: ['allergies', 'asthma', 'rhinitis'],
        });
    } else if (pollen.overallLevel === 'Moderate') {
        impacts.push({
            factor: 'Moderate Pollen',
            level: 'low',
            recommendation: 'Allergy-prone individuals may experience mild symptoms.',
            affectedConditions: ['allergies'],
        });
    }

    return impacts;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function getAQICategory(aqi: number): AirQuality['category'] {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

function calculateEnvironmentalScore(
    weather: WeatherHealth,
    airQuality: AirQuality,
    pollen: PollenData
): number {
    let score = 100;

    // AQI impact (0-50 = no penalty, 50+ = scaling penalty)
    score -= Math.max(0, (airQuality.aqi - 50) * 0.3);

    // UV impact (0-3 = ok, 6+ = moderate, 11+ = severe)
    score -= Math.max(0, (weather.uvIndex - 3) * 2);

    // Temperature extremes (ideal: 65-80°F)
    const tempDiff = weather.temperature < 65 ? 65 - weather.temperature : weather.temperature > 80 ? weather.temperature - 80 : 0;
    score -= tempDiff * 0.5;

    // Humidity impact (ideal: 30-60%)
    const humDiff = weather.humidity < 30 ? 30 - weather.humidity : weather.humidity > 60 ? weather.humidity - 60 : 0;
    score -= humDiff * 0.2;

    // Pollen impact
    const pollenTotal = pollen.grass + pollen.tree + pollen.weed;
    score -= Math.min(pollenTotal * 0.1, 15);

    return Math.max(0, Math.min(100, Math.round(score)));
}
