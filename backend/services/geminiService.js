import axios from 'axios';

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const API_KEY = process.env.GEMINI_API_KEY;

// Default model settings
const DEFAULT_SETTINGS = {
  model: 'gemini-pro',
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'You are InsightX, a helpful AI assistant. Provide clear, accurate, and helpful responses.'
};

/**
 * Generate AI response using Gemini API
 * @param {string} userMessage - The user's message
 * @param {object} chatSettings - Chat-specific settings
 * @returns {Promise<object>} AI response with metadata
 */
const generateAIResponse = async (userMessage, chatSettings = {}) => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const settings = { ...DEFAULT_SETTINGS, ...chatSettings };
    const startTime = Date.now();

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${settings.systemPrompt}\n\nUser: ${userMessage}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
        topP: 0.8,
        topK: 10
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Make API request
    const response = await axios.post(
      `${GEMINI_API_URL}/models/${settings.model}:generateContent?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const processingTime = Date.now() - startTime;

    // Extract response content
    const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No response generated from Gemini API');
    }

    // Extract usage information
    const usageInfo = response.data.usageMetadata || {};
    const tokens = {
      prompt: usageInfo.promptTokenCount || 0,
      completion: usageInfo.candidatesTokenCount || 0,
      total: usageInfo.totalTokenCount || 0
    };

    return {
      content: aiResponse.trim(),
      model: settings.model,
      tokens,
      processingTime,
      temperature: settings.temperature
    };

  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    
    // Return a fallback response
    return {
      content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      model: settings?.model || 'gemini-pro',
      tokens: { prompt: 0, completion: 0, total: 0 },
      processingTime: Date.now() - startTime,
      temperature: settings?.temperature || 0.7,
      error: error.message
    };
  }
};

/**
 * Generate AI response with vision capabilities
 * @param {string} userMessage - The user's message
 * @param {Array} images - Array of image data
 * @param {object} chatSettings - Chat-specific settings
 * @returns {Promise<object>} AI response with metadata
 */
const generateVisionResponse = async (userMessage, images = [], chatSettings = {}) => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const settings = { ...DEFAULT_SETTINGS, ...chatSettings, model: 'gemini-1.5-pro' };
    const startTime = Date.now();

    // Prepare image parts
    const imageParts = images.map(image => ({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data
      }
    }));

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${settings.systemPrompt}\n\nUser: ${userMessage}`
            },
            ...imageParts
          ]
        }
      ],
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
        topP: 0.8,
        topK: 10
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Make API request
    const response = await axios.post(
      `${GEMINI_API_URL}/models/${settings.model}:generateContent?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const processingTime = Date.now() - startTime;

    // Extract response content
    const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No response generated from Gemini API');
    }

    // Extract usage information
    const usageInfo = response.data.usageMetadata || {};
    const tokens = {
      prompt: usageInfo.promptTokenCount || 0,
      completion: usageInfo.candidatesTokenCount || 0,
      total: usageInfo.totalTokenCount || 0
    };

    return {
      content: aiResponse.trim(),
      model: settings.model,
      tokens,
      processingTime,
      temperature: settings.temperature
    };

  } catch (error) {
    console.error('Gemini Vision API Error:', error.response?.data || error.message);
    
    // Return a fallback response
    return {
      content: "I apologize, but I'm having trouble processing your request with images right now. Please try again in a moment.",
      model: settings?.model || 'gemini-1.5-pro',
      tokens: { prompt: 0, completion: 0, total: 0 },
      processingTime: Date.now() - startTime,
      temperature: settings?.temperature || 0.7,
      error: error.message
    };
  }
};

/**
 * Get available models
 * @returns {Array} List of available models
 */
const getAvailableModels = () => {
  return [
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient model for most tasks',
      maxTokens: 8192,
      supportsVision: true
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Advanced model for complex tasks and reasoning',
      maxTokens: 32768,
      supportsVision: true
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro (Legacy)',
      description: 'Legacy model - use 1.5 Flash for better performance',
      maxTokens: 4000,
      supportsVision: false
    }
  ];
};

/**
 * Validate API key
 * @returns {Promise<boolean>} Whether the API key is valid
 */
const validateApiKey = async () => {
  try {
    if (!API_KEY) {
      return false;
    }

    const response = await axios.get(
      `${GEMINI_API_URL}/models?key=${API_KEY}`,
      { timeout: 10000 }
    );

    return response.status === 200;
  } catch (error) {
    console.error('API Key validation failed:', error.message);
    return false;
  }
};

export {
  generateAIResponse,
  generateVisionResponse,
  getAvailableModels,
  validateApiKey
};
