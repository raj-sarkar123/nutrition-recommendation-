const Groq = require("groq-sdk");

// ✅ Lazy initialization — client is created on first use, not at module load.
// This prevents the server from crashing at startup when GROQ_API_KEY is missing.
let _groq = null;

function getClient() {
  if (_groq) return _groq;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set in your .env file. " +
      "Add: GROQ_API_KEY=your_key_here"
    );
  }

  _groq = new Groq({ apiKey });
  return _groq;
}

async function analyzeMenu(imageBuffer, userProfile = {}) {
  const groq = getClient();

  const goal = userProfile.goal || "maintain";
  const calories = userProfile.daily_calorie_target || 2200;
  const protein = userProfile.protein_target || 120;
  const carbs = userProfile.carbs_target || 200;
  const fats = userProfile.fats_target || 65;
  const dietary = (userProfile.dietary_preferences || []).join(", ") || "none";

  const prompt = `
You are a professional nutritionist and menu analyst.

The user has the following health profile:
- Goal: ${goal} (lose = weight loss, gain = muscle gain, maintain = maintenance)
- Daily calorie target: ${calories} kcal
- Protein target: ${protein}g
- Carbs target: ${carbs}g
- Fats target: ${fats}g
- Dietary preferences: ${dietary}

Your task:
1. Extract EVERY food and drink item visible in this menu image — do NOT skip any item
2. For each item, estimate realistic nutritional values (per standard serving)
3. Score each item from 0–100 based on how well it fits the user's goal and targets
4. Classify each item as "recommended", "moderate", or "avoid"
5. Write a short 1-sentence description explaining why it fits or doesn't fit the user's goal
6. Assign relevant tags from this list only: ["High Protein", "Low Calorie", "Low Carb", "High Fiber", "Low Fat", "High Sodium", "High Calorie", "High Carb", "High Fat", "Good for Weight Loss", "Good for Muscle Gain", "Keto Friendly", "Vegan", "Vegetarian"]

Scoring rules:
- "recommended" = score 70–100
- "moderate"    = score 40–69
- "avoid"       = score 0–39

For goal "lose":     reward low calorie, high protein, low fat. Penalize high calorie, high fat, high carb.
For goal "gain":     reward high protein, high calorie. Penalize very low calorie.
For goal "maintain": reward balanced macros close to targets.

Return ONLY a valid JSON object — no explanation, no markdown, no backticks:

{
  "extracted_items": [
    {
      "food_name": "exact name from menu",
      "description": "one sentence why this fits or doesn't fit the user's goal",
      "calories": 420,
      "protein": 32,
      "net_carbs": 18,
      "fats": 14,
      "sodium": 480,
      "score": 88,
      "classification": "recommended",
      "tags": ["High Protein", "Low Carb"]
    }
  ]
}
`;

  const base64Image = imageBuffer.toString("base64");

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 8192,
  });

  return response.choices[0]?.message?.content || "";
}

async function retryWithFix(rawText) {
  const groq = getClient();

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: `Fix the following into valid JSON only. Return ONLY the JSON object, no explanation, no markdown, no backticks:\n${rawText}`,
      },
    ],
    temperature: 0,
    max_tokens: 8192,
  });

  return response.choices[0]?.message?.content || "";
}

module.exports = { analyzeMenu, retryWithFix };