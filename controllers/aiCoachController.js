const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateSuggestions = async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const analytics = req.body;

    const prompt = `
You are an AI Habit Coach. Analyze the user's complete habit data below:

DATA INPUT:
${JSON.stringify(analytics)}

The data includes:
- Personal user info
- Summary analytics (completionRate, streaks, active habits)
- Weekly performance trends
- Monthly habit cycles
- Individual habits list with status, streak, category, type
- Any recent wins or drops

Your task:
Generate 5–8 **deeply personalized** suggestions based on:
1. Behavior trends
2. Habit consistency
3. Streak patterns
4. Peak performance days (weekly data)
5. Habit category balance (monthly)
6. Time-of-day performance patterns
7. Weak spots and strong areas
8. Missed habits and slow habits

OUTPUT RULES:
- Return ONLY a **RAW JSON ARRAY**.
- NO markdown, NO explanation, NO text outside JSON.

SCHEMA:
Each object must follow:
{
  "id": string,
  "type": "improvement" | "achievement" | "newHabit" | "motivation" | "timeOptimization" | "general",
  "priority": "high" | "medium" | "low",
  "title": string,
  "description": string,
  "action": string
}

PRIORITY RULES:
- HIGH → low completionRate OR streak drops OR repeated misses
- MEDIUM → average performance or weekly inconsistency
- LOW → motivational or general tips

LOGIC RULES:
- If user has a strong weekly day → suggest using that day for bigger tasks.
- If monthly trend shows dip → prioritize improvement.
- If habit type is missing (health, learning, productivity) → suggest newHabit.
- If streak < bestStreak → give improvement.
- If completedToday > 0 → include achievement.

Begin now.
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    // Safe parser
    const json = safeJsonParse(raw);

    res.json({ success: true, suggestions: json });
  } catch (error) {
    console.error("Gemini error:", error);

    return res.json({
      success: true,
      fallback: true,
      suggestions: [
        {
          id: "fallback1",
          type: "general",
          priority: "low",
          title: "Stay Consistent",
          description:
            "Consistency is the foundation of building good habits. Keep tracking your progress daily.",
          action: "Open dashboard and complete today’s habits.",
        },
      ],
    });
  }
};

function safeJsonParse(text) {
  let cleaned = text.replace(/```json|```/gi, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found in AI response");
  return JSON.parse(match[0]);
}

exports.generateHabitRecommendations = async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const analytics = req.body;

    const prompt = `
You are an AI Habit Coach. Based on the user’s full habit analytics below:

DATA:
${JSON.stringify(analytics)}

TASK:
Recommend **4–6 NEW HABITS** the user should add.

RULES:
- Provide habits that fill missing categories (health, learning, productivity, self-care, mindfulness, fitness).
- Use patterns from weekly data, monthly dips, low categories, streak drops.
- Provide **short, benefit-focused reasons**.

OUTPUT:
Return ONLY a raw JSON array (no markdown).

OBJECT SHAPE:
{
  "id": string,
  "habitName": string,
  "category": string,
  "benefit": string,
  "frequency": "daily" | "weekly",
  "suggestedTime": string
}
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const json = safeJsonParse(raw);

    res.json({
      success: true,
      habits: json,
    });
  } catch (err) {
    console.error("AI Habit Recommend Error", err);

    return res.json({
      success: true,
      fallback: true,
      habits: [
        {
          id: "fallback-h1",
          habitName: "10-Minute Morning Stretch",
          category: "health",
          benefit: "Improves mobility and boosts morning energy",
          frequency: "daily",
          suggestedTime: "morning",
        },
      ],
    });
  }
};
