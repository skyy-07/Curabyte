
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Ingredient, DailyPlan, UserProfile, Meal, MedicalConstraints } from "../types";
import { SYSTEM_INSTRUCTION_VISION, SYSTEM_INSTRUCTION_PLANNER } from "../constants";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanJson = (text: string) => {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) return match[1];
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.trim();
};

export const analyzeMedicalReport = async (base64Image: string): Promise<MedicalConstraints> => {
  const ai = getAiClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Analyze this medical report image for dietary information." }
        ]
      },
      config: {
        systemInstruction: `
          You are a Clinical Nutrition Assistant. Your task is to extract *only* dietary and nutritional information from the provided medical report or prescription image.
          
          SAFETY & PRIVACY RULES:
          1. DO NOT extract specific medical diagnoses, disease names, or medication dosages.
          2. EXTRACT only actionable food-related advice:
             - Foods/Nutrients to AVOID completely (e.g., "No grapefruit due to statins", "Gluten-free").
             - Foods/Nutrients to LIMIT (e.g., "Low sodium", "Limit Vitamin K").
             - Foods/Nutrients to RECOMMEND/INCREASE (e.g., "High fiber", "Iron-rich").
          3. If the image is unclear or contains no dietary info, return empty arrays.
          
          Return JSON matching this schema:
          {
            "avoids": ["string"],
            "limits": ["string"],
            "recommendations": ["string"]
          }
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            avoids: { type: Type.ARRAY, items: { type: Type.STRING } },
            limits: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return { avoids: [], limits: [], recommendations: [] };
    return JSON.parse(cleanJson(jsonText));
  } catch (error) {
    console.error("Gemini Medical Analysis Error:", error);
    throw error;
  }
};

export const analyzeFridgeImage = async (base64Image: string): Promise<Ingredient[]> => {
  const ai = getAiClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Identify all food items in this fridge image." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_VISION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  expiryEstimateDays: { type: Type.INTEGER }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    const data = JSON.parse(cleanJson(jsonText));
    return (data.items || []).map((item: any) => {
      let expiry = item.expiryEstimateDays;
      if (typeof expiry === 'number') {
        const variance = Math.floor(Math.random() * 3) - 1; 
        expiry = Math.max(1, expiry + variance); 
      }

      return {
        ...item,
        id: Math.random().toString(36).substring(7),
        expiryEstimateDays: expiry,
        confidence: 0.95
      };
    });
  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    throw error;
  }
};

export const parseVoiceIngredients = async (audioBase64: string): Promise<Ingredient[]> => {
  const ai = getAiClient();
  // Strip data URL header if present (e.g. "data:audio/webm;base64,")
  const cleanBase64 = audioBase64.split(',')[1] || audioBase64;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/webm', data: cleanBase64 } },
          { text: "Listen to this audio list of food items. Extract them into a structured inventory list." }
        ]
      },
      config: {
        systemInstruction: `
          You are a highly capable inventory assistant. The user is dictating a list of food items for their fridge.
          
          CRITICAL INSTRUCTION FOR FAST SPEECH:
          - The user may speak continuously with little to no gap between words (e.g., "eggs milk cheese bread").
          - You must intelligently separate these into individual distinct items based on food knowledge.
          - Example: "tomatoesonionsgarlic" -> ["Tomatoes", "Onions", "Garlic"]
          - Example: "abottleofketchupandmustard" -> ["Ketchup", "Mustard"]
          
          For each item:
          1. Extract the clean Name (Capitalize first letter).
          2. Infer "category": produce, dairy, meat, pantry, beverage, other.
          3. Estimate "expiryEstimateDays" (integer) based on typical shelf life.
          
          Return JSON:
          {
            "items": [
              { "name": "Milk", "category": "dairy", "expiryEstimateDays": 7 }
            ]
          }
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  expiryEstimateDays: { type: Type.INTEGER }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    const data = JSON.parse(cleanJson(jsonText));
    
    return (data.items || []).map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substring(7),
      confidence: 1.0
    }));

  } catch (error) {
    console.error("Gemini Voice Analysis Error:", error);
    throw error;
  }
};

export const generateMealPlan = async (
  inventory: Ingredient[],
  userProfile: UserProfile,
  onChunk?: (text: string) => void
): Promise<DailyPlan> => {
  const ai = getAiClient();
  
  // Enriched inventory list with expiry context for the AI
  const inventoryList = inventory.map(i => 
    `${i.name} (Expires in ${i.expiryEstimateDays} days)`
  ).join(", ");

  const allergensList = userProfile.allergens?.join(", ") || "None";
  
  // Construct Medical Context if available
  let medicalContext = "None";
  if (userProfile.medicalConstraints && userProfile.medicalConsentGiven) {
    medicalContext = `
      MEDICAL DIETARY CONSTRAINTS (STRICT PRIORITY):
      - AVOID: ${userProfile.medicalConstraints.avoids.join(", ") || "None"}
      - LIMIT: ${userProfile.medicalConstraints.limits.join(", ") || "None"}
      - RECOMMENDATIONS: ${userProfile.medicalConstraints.recommendations.join(", ") || "None"}
    `;
  }

  const userContext = `
    User Profile:
    - Name: ${userProfile.name}
    - Biometrics: ${userProfile.gender}, ${userProfile.age}y, ${userProfile.height}cm, ${userProfile.weight}kg
    
    Goals & Preferences:
    - Primary Goal: ${userProfile.primaryGoal}
    - Activity Level: ${userProfile.activityLevel}
    - Diet: ${userProfile.dietaryType}
    - Restrictions: ${userProfile.dietaryRestrictions.join(", ") || "None"}
    - Cooking Preference: ${userProfile.cookingTime}
    - Sustainability: ${userProfile.sustainabilityFocus ? "PRIORITIZE WASTE REDUCTION & ECO-FRIENDLY" : "Standard"}
    
    CRITICAL HEALTH WARNINGS:
    - Allergens to AVOID STRICTLY: ${allergensList}
    ${medicalContext}
    
    Targets:
    - Daily Calorie Target: ${userProfile.dailyCalorieTarget} kcal
    - Current Live Activity: Steps ${userProfile.steps}, Active Burn ${userProfile.caloriesBurned}
    
    Available Inventory:
    ${inventoryList}
  `;

  // Helper for ingredient objects
  const ingredientObjectSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      category: { type: Type.STRING, enum: ['produce', 'dairy', 'meat', 'pantry', 'beverage', 'other'] }
    },
    required: ["name", "category"]
  };

  // Schema for a single meal/recipe structure
  const mealProperties = {
    type: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    cuisine: { type: Type.STRING },
    ingredientsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingIngredients: { type: Type.ARRAY, items: ingredientObjectSchema },
    expiringIngredientsUsed: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients used that were expiring soon" },
    wasteReductionScore: { type: Type.INTEGER, description: "0 to 100 percentage score of how much this recipe helps reduce waste" },
    
    // New Medical Explanation Fields
    healthReasoning: { type: Type.STRING, description: "Explain WHY this meal was chosen based on medical/dietary constraints (e.g. 'Low sodium option selected due to medical report')." },
    dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags like 'Low Sodium', 'High Iron' relevant to the meal." },

    nutrition: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.INTEGER },
        protein: { type: Type.INTEGER },
        carbs: { type: Type.INTEGER },
        fats: { type: Type.INTEGER }
      },
      required: ["calories", "protein", "carbs", "fats"],
    },
    timeToCookMinutes: { type: Type.INTEGER }
  };

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Generate a smart recipe plan. Context: ${userContext}`,
      config: {
        systemInstruction: `
          You are a sustainable fitness chef and clinical nutrition aide. Your goal is to generate "Smart Recipes" that:
          1. SAFETY FIRST: Strictly adhere to "MEDICAL DIETARY CONSTRAINTS" and "Allergens". If a conflict exists between the 'Primary Goal' (e.g., Build Muscle) and 'Medical Constraints' (e.g., Low Protein for kidney), the MEDICAL CONSTRAINT WINS.
          2. Adhere to the ${userProfile.dietaryType} diet.
          3. Respect cooking time preference: ${userProfile.cookingTime}.
          4. MINIMIZE FOOD WASTE by prioritizing ingredients listed as expiring soon.
          5. Provide explicit 'healthReasoning' explaining how the recipe adheres to the specific medical/dietary constraints provided.
          
          For "missingIngredients" and "shoppingList", you MUST provide both the name and a category.
          
          For each meal slot (Breakfast, Lunch, Dinner), provide 1 Main Option and 2 Alternative Options.
          
          Calculations:
          - "wasteReductionScore": Estimate 0-100 based on how many expiring items are used.
          - "expiringIngredientsUsed": List the specific items saved.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ...mealProperties,
                  alternatives: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: mealProperties.name,
                        description: mealProperties.description,
                        cuisine: mealProperties.cuisine,
                        ingredientsUsed: mealProperties.ingredientsUsed,
                        missingIngredients: mealProperties.missingIngredients,
                        expiringIngredientsUsed: mealProperties.expiringIngredientsUsed,
                        wasteReductionScore: mealProperties.wasteReductionScore,
                        healthReasoning: mealProperties.healthReasoning,
                        dietaryTags: mealProperties.dietaryTags,
                        nutrition: mealProperties.nutrition,
                        timeToCookMinutes: mealProperties.timeToCookMinutes
                      }
                    }
                  }
                },
                required: ["type", "name", "nutrition", "alternatives"],
              }
            },
            totalNutrition: {
              type: Type.OBJECT,
              properties: {
                 calories: { type: Type.INTEGER },
                 protein: { type: Type.INTEGER },
                 carbs: { type: Type.INTEGER },
                 fats: { type: Type.INTEGER }
              },
            },
            shoppingList: { type: Type.ARRAY, items: ingredientObjectSchema }
          }
        }
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        if (onChunk) onChunk(c.text);
      }
    }

    if (!fullText) throw new Error("No response content from Gemini.");
    
    // Parse the generated plan
    const plan = JSON.parse(cleanJson(fullText)) as DailyPlan;

    // --- Post-Processing: Precise Waste Score Calculation ---
    const calculatePreciseWasteScore = (meal: Meal) => {
       let totalScore = 0;
       const expiringUsed: string[] = [];
       const ingredients = meal.ingredientsUsed || [];
       
       ingredients.forEach((ingName: string) => {
          // Find the ingredient in inventory (case-insensitive fuzzy match)
          const match = inventory.find(inv => 
             inv.name.toLowerCase() === ingName.toLowerCase() || 
             inv.name.toLowerCase().includes(ingName.toLowerCase()) || // e.g., "Spinach" matches "Baby Spinach"
             ingName.toLowerCase().includes(inv.name.toLowerCase())    // e.g., "2 Eggs" matches "Eggs"
          );
          
          if (match && match.expiryEstimateDays !== undefined) {
             const days = match.expiryEstimateDays;
             
             let itemScore = 0;
             if (days <= 2) {
                itemScore = 40 - (days * 5); 
             } else if (days <= 5) {
                itemScore = 25 - ((days - 2) * 3); 
             } else if (days <= 10) {
                 itemScore = 10 - ((days - 5)); 
             }
             
             if (itemScore > 0) {
               totalScore += itemScore;
               expiringUsed.push(match.name);
             }
          }
       });
       
       // Cap at 100, round to integer
       meal.wasteReductionScore = Math.min(100, Math.round(totalScore));
       meal.expiringIngredientsUsed = [...new Set(expiringUsed)]; // Deduplicate names
    };

    // Apply score calculation to all meals and their alternatives
    if (plan.meals) {
      plan.meals.forEach(meal => {
         calculatePreciseWasteScore(meal);
         if (meal.alternatives) {
            meal.alternatives.forEach(alt => calculatePreciseWasteScore(alt));
         }
      });
    }

    return plan;

  } catch (error) {
    console.error("Gemini Planner API Error:", error);
    throw error;
  }
};
