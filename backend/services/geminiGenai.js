import axios from 'axios';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = 'You are InsightX, a helpful AI assistant. Always use Gemini 2.5 Flash.';

export async function generateGeminiContent(userMessage) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error('Gemini API key not configured');
  const payload = {
    contents: [
      {
        parts: [
          { text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.8,
      topK: 10
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };
  const response = await axios.post(
    `${GEMINI_API_URL}/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    payload,
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiResponse) throw new Error('No response generated from Gemini API');
  return aiResponse.trim();
}
