
import { UserProfile, Ingredient } from './types';

export const MOCK_USER: UserProfile = {
  name: "Alex",
  gender: 'male',
  age: 28,
  height: 180, // cm
  weight: 78, // kg
  
  primaryGoal: "Build Muscle",
  activityLevel: "Moderately Active",
  
  dietaryType: "Omnivore",
  dietaryRestrictions: ["Low Sugar"],
  allergens: [], // Default empty allergens
  
  cookingTime: "Medium (30-45m)",
  sustainabilityFocus: true,
  
  dailyCalorieTarget: 2600,
  steps: 8432,
  caloriesBurned: 450,
};

export const INITIAL_INVENTORY: Ingredient[] = [
  { id: '1', name: 'Eggs', category: 'dairy', expiryEstimateDays: 5, confidence: 0.99 },
  { id: '2', name: 'Spinach', category: 'produce', expiryEstimateDays: 2, confidence: 0.95 },
  { id: '3', name: 'Greek Yogurt', category: 'dairy', expiryEstimateDays: 7, confidence: 0.92 },
];

export const SYSTEM_INSTRUCTION_VISION = `
  You are an advanced AI vision system for a smart fridge. 
  Your task is to identify food items in the image.
  Return a JSON object with a key "items" which is an array of detected ingredients.
  For each item, provide a "name", "category" (one of: produce, dairy, meat, pantry, beverage, other), and an estimated "expiryEstimateDays" (integer) based on typical shelf life of fresh produce.
  Exclude non-food items.
`;

export const SYSTEM_INSTRUCTION_PLANNER = `
  You are a certified nutritionist and world-class chef.
  Based on the user's inventory, dietary restrictions, and goals, generate a one-day meal plan.
  
  Output MUST be valid JSON matching this schema:
  {
    "summary": "string (brief overview of the day)",
    "meals": [
      {
        "type": "Breakfast" | "Lunch" | "Dinner",
        "name": "string",
        "description": "string (short description)",
        "ingredientsUsed": ["string"],
        "missingIngredients": ["string"],
        "nutrition": { "calories": number, "protein": number, "carbs": number, "fats": number },
        "timeToCookMinutes": number
      }
    ],
    "totalNutrition": { "calories": number, "protein": number, "carbs": number, "fats": number },
    "shoppingList": ["string (list of missing ingredients needed for this plan)"]
  }
`;