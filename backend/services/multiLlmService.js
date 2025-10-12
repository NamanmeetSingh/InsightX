import axios from 'axios';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = 'You are InsightX, a helpful AI assistant. When asked to respond as another LLM (e.g., GPT, Claude, Perplexity), simulate their style and capabilities, but always use Gemini 2.5 Flash.';

// Unified Gemini response generator
async function generateGeminiResponse(userMessage, provider = 'gemini') {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error('Gemini API key not configured');
  // provider can be 'gemini', 'openai', 'claude', 'perplexity', etc.
  // We always use Gemini, but instruct it to simulate the requested provider.
  const prompt = `Respond as if you are ${provider.toUpperCase()} (but use Gemini 2.5 Flash).\n\n${userMessage}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: `${SYSTEM_PROMPT}\n\n${prompt}` }
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
  return {
    content: aiResponse.trim(),
    provider,
    model: 'gemini-2.5-flash',
    success: true
  };
}

// Maintain all function signatures for routes
async function generateResponseFromProvider(provider, userMessage, settings = {}) {
  // settings ignored, always use Gemini
  return await generateGeminiResponse(userMessage, provider);
}

async function generateMultiProviderResponses(providers, userMessage, settings = {}) {
  // Simulate parallel responses, all using Gemini
  return await Promise.all(
    providers.map(provider => generateResponseFromProvider(provider, userMessage, settings))
  );
}

function getAvailableProviders() {
  // Always return all supported providers
  return ['gemini', 'openai', 'claude', 'perplexity'];
}

export {
  getAvailableProviders,
  generateResponseFromProvider,
  generateMultiProviderResponses,
  generateGeminiResponse
};