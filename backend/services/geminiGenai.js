import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

export async function generateGeminiContent({ contents, model = "gemini-2.5-flash", thinkingBudget }) {
  const config = thinkingBudget !== undefined
    ? { thinkingConfig: { thinkingBudget } }
    : undefined;

  const response = await ai.models.generateContent({
    model,
    contents,
    ...(config && { config })
  });
  return response.text;
}

// Usage example (remove in production):
// (async () => {
//   const text = await generateGeminiContent({
//     contents: "Explain how AI works in a few words",
//     thinkingBudget: 0 // disables thinking
//   });
//   console.log(text);
// })();
