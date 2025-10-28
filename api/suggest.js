// /api/suggest.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST required" });

  try {
    const { ingredients = "", filters = "" } = req.body || {};
    if (!ingredients.trim()) return res.status(400).json({ error: "ingredients required" });

    const API_KEY = process.env.GOOGLE_API_KEY; // 🔒 Vercel env var
    if (!API_KEY) return res.status(500).json({ error: "Missing GOOGLE_API_KEY" });

    const MODEL = "gemini-2.0-flash"; // stabil hızlı model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          recipeName: { type: "STRING" },
          prepTime: { type: "STRING" },
          ingredients: { type: "ARRAY", items: { type: "STRING" } },
          instructions: { type: "ARRAY", items: { type: "STRING" } },
          nutritionalInfo: {
            type: "OBJECT",
            properties: {
              calories: { type: "STRING" },
              protein: { type: "STRING" },
              fat: { type: "STRING" },
              carbs: { type: "STRING" }
            },
            required: ["calories","protein","fat","carbs"]
          }
        },
        required: ["recipeName","prepTime","ingredients","instructions","nutritionalInfo"]
      }
    };

    const prompt =
      `Elimde şu malzemeler var: ${ingredients}. ` +
      (filters ? `Ek kısıtlar/filtreler: ${filters}. ` : "") +
      `Bu malzemelerle yapılabilecek 3 farklı tarif öner. ` +
      `Sadece GEÇERLİ bir JSON DİZİSİ döndür.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.6
      }
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: j.error?.message || "Model error" });

    const text = j?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || "[]";
    let recipes = [];
    try { recipes = JSON.parse(text); } catch { recipes = []; }

    return res.status(200).json({ recipes });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
