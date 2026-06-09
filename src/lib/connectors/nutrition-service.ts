/**
 * Nutrition Lookup Service
 * 
 * Uses two free APIs:
 * 1. Open Food Facts (free, no key) — world.openfoodfacts.org
 * 2. Nutritionix Track API (free tier available)
 * 
 * Provides food search, barcode lookup, and full nutrition breakdown.
 */

import { storeHealthMetrics, type ExtractedHealthData } from '../raphael/healthDataService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FoodItem {
    id: string;
    name: string;
    brand?: string;
    barcode?: string;
    imageUrl?: string;
    serving_size: string;
    nutrition: NutritionFacts;
    source: 'openfoodfacts' | 'usda';
}

export interface NutritionFacts {
    calories: number;
    fat: number;
    saturated_fat: number;
    carbohydrates: number;
    sugar: number;
    fiber: number;
    protein: number;
    sodium: number;
    cholesterol?: number;
    potassium?: number;
    vitamin_a?: number;
    vitamin_c?: number;
    calcium?: number;
    iron?: number;
}

export interface DailyNutrition {
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    total_fiber: number;
    items: FoodItem[];
}

const OFF_BASE = 'https://world.openfoodfacts.org';

// ─── Open Food Facts API (free, no key) ──────────────────────────────────────

/**
 * Search for food items by name
 */
export async function searchFood(query: string, limit = 10): Promise<FoodItem[]> {
    const encoded = encodeURIComponent(query);
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open Food Facts API error: ${response.status}`);

        const data = await response.json();
        if (!data.products) return [];

        return data.products
            .filter((p: any) => p.product_name)
            .map((product: any) => parseOpenFoodFactsProduct(product));
    } catch (error) {
        console.error('Food search error:', error);
        return [];
    }
}

/**
 * Look up food by barcode (EAN/UPC)
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
    const url = `${OFF_BASE}/api/v0/product/${barcode}.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.status !== 1 || !data.product) return null;

        return parseOpenFoodFactsProduct(data.product);
    } catch (error) {
        console.error('Barcode lookup error:', error);
        return null;
    }
}

/**
 * Get nutrition facts for a specific product by ID
 */
export async function getProductDetails(productId: string): Promise<FoodItem | null> {
    return lookupBarcode(productId);
}

/**
 * Log food intake and store calorie/macro data to health metrics
 */
export async function logFoodIntake(
    userId: string,
    food: FoodItem,
    servings = 1
): Promise<{ stored: number }> {
    const dataPoints: ExtractedHealthData[] = [];
    const n = food.nutrition;

    dataPoints.push({
        metric_type: 'calories_consumed',
        value: Math.round(n.calories * servings),
        unit: 'kcal',
        raw_text: `Food: ${food.name} (${servings} serving${servings > 1 ? 's' : ''}) — ${Math.round(n.calories * servings)} kcal`,
    });

    if (n.protein > 0) {
        dataPoints.push({
            metric_type: 'protein_intake',
            value: Math.round(n.protein * servings * 10) / 10,
            unit: 'g',
            raw_text: `Protein: ${(n.protein * servings).toFixed(1)}g from ${food.name}`,
        });
    }

    if (n.carbohydrates > 0) {
        dataPoints.push({
            metric_type: 'carb_intake',
            value: Math.round(n.carbohydrates * servings * 10) / 10,
            unit: 'g',
            raw_text: `Carbs: ${(n.carbohydrates * servings).toFixed(1)}g from ${food.name}`,
        });
    }

    if (n.fat > 0) {
        dataPoints.push({
            metric_type: 'fat_intake',
            value: Math.round(n.fat * servings * 10) / 10,
            unit: 'g',
            raw_text: `Fat: ${(n.fat * servings).toFixed(1)}g from ${food.name}`,
        });
    }

    return storeHealthMetrics(userId, dataPoints, 'nutrition_tracker');
}

/**
 * Search for food by category/nutrient
 */
export async function searchByNutrient(
    nutrient: 'proteins' | 'carbohydrates' | 'fat' | 'fiber',
    minValue: number,
    maxValue: number,
    limit = 10
): Promise<FoodItem[]> {
    const url = `${OFF_BASE}/cgi/search.pl?action=process&json=1&page_size=${limit}&nutriment_0=${nutrient}&nutriment_compare_0=between&nutriment_value_0=${minValue}&nutriment_value_1=${maxValue}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        if (!data.products) return [];

        return data.products
            .filter((p: any) => p.product_name)
            .map((product: any) => parseOpenFoodFactsProduct(product));
    } catch (error) {
        console.error('Nutrient search error:', error);
        return [];
    }
}

// ─── USDA FoodData Central API (free, API key recommended) ───────────────────

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_KEY = 'DEMO_KEY'; // Free demo key, 30 requests/hour

/**
 * Search USDA food database (more accurate for US foods)
 */
export async function searchUSDA(query: string, limit = 5): Promise<FoodItem[]> {
    const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${USDA_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        if (!data.foods) return [];

        return data.foods.map((food: any) => {
            const nutrients = food.foodNutrients || [];
            const getNutrient = (id: number) => {
                const n = nutrients.find((n: any) => n.nutrientId === id);
                return n?.value || 0;
            };

            return {
                id: food.fdcId?.toString() || '',
                name: food.description || food.lowercaseDescription || '',
                brand: food.brandOwner || food.brandName || undefined,
                serving_size: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
                nutrition: {
                    calories: getNutrient(1008),
                    fat: getNutrient(1004),
                    saturated_fat: getNutrient(1258),
                    carbohydrates: getNutrient(1005),
                    sugar: getNutrient(2000),
                    fiber: getNutrient(1079),
                    protein: getNutrient(1003),
                    sodium: getNutrient(1093),
                    cholesterol: getNutrient(1253),
                    potassium: getNutrient(1092),
                    vitamin_a: getNutrient(1106),
                    vitamin_c: getNutrient(1162),
                    calcium: getNutrient(1087),
                    iron: getNutrient(1089),
                },
                source: 'usda' as const,
            };
        });
    } catch (error) {
        console.error('USDA search error:', error);
        return [];
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseOpenFoodFactsProduct(product: any): FoodItem {
    const n = product.nutriments || {};

    return {
        id: product.code || product._id || '',
        name: product.product_name || product.product_name_en || 'Unknown',
        brand: product.brands || undefined,
        barcode: product.code || undefined,
        imageUrl: product.image_small_url || product.image_url || undefined,
        serving_size: product.serving_size || product.quantity || '100g',
        nutrition: {
            calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || (n.energy_100g || 0) / 4.184),
            fat: round1(n.fat_100g || n.fat || 0),
            saturated_fat: round1(n['saturated-fat_100g'] || 0),
            carbohydrates: round1(n.carbohydrates_100g || n.carbohydrates || 0),
            sugar: round1(n.sugars_100g || n.sugars || 0),
            fiber: round1(n.fiber_100g || n.fiber || 0),
            protein: round1(n.proteins_100g || n.proteins || 0),
            sodium: round1(n.sodium_100g ? n.sodium_100g * 1000 : 0), // g → mg
            cholesterol: n['cholesterol_100g'] ? round1(n['cholesterol_100g'] * 1000) : undefined,
            potassium: n['potassium_100g'] ? round1(n['potassium_100g'] * 1000) : undefined,
            vitamin_a: n['vitamin-a_100g'] ? round1(n['vitamin-a_100g'] * 1000000) : undefined, // g → µg
            vitamin_c: n['vitamin-c_100g'] ? round1(n['vitamin-c_100g'] * 1000) : undefined, // g → mg
            calcium: n['calcium_100g'] ? round1(n['calcium_100g'] * 1000) : undefined,
            iron: n['iron_100g'] ? round1(n['iron_100g'] * 1000) : undefined,
        },
        source: 'openfoodfacts',
    };
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}
