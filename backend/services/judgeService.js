import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

class JudgeService {
    constructor() {
        this.hf = new HfInference(process.env.HF_API_TOKEN);
        this.modelId = process.env.JUDGE_MODEL_ID;
    }

    /**
     * Judges responses to a question using Hugging Face model
     * @param {string} question - The question to judge responses for
     * @param {Array<string>} responses - Array of responses to judge
     * @returns {Promise<Object>} - Judge evaluation result
     */
    async judgeResponses(question, responses) {
        try {
            if (!question || !responses || !Array.isArray(responses) || responses.length !== 4) {
                throw new Error('Invalid input: question and exactly 4 responses are required');
            }

            // Create the prompt structure for the judge model
            const prompt = this.buildJudgePrompt(question, responses);

            // Try text-generation first; if provider only supports conversational, fall back.
            let generatedText;
            try {
                generatedText = await this.callTextGeneration(prompt);
            } catch (innerErr) {
                const msg = String(innerErr?.message || innerErr);
                // Detect provider-task mismatch indicating conversational/chat-only support
                if (/supported\s*for\s*task\s*text-generation[\s\S]*conversational/i.test(msg)
                    || /Supported task:\s*conversational/i.test(msg)
                    || /is not supported for task text-generation/i.test(msg)) {
                    generatedText = await this.callChatCompletion(prompt);
                } else {
                    throw innerErr;
                }
            }

            // Parse and format the response
            const judgement = this.parseJudgement(generatedText);

            return {
                success: true,
                data: {
                    question,
                    responses,
                    judgement,
                    rawOutput: generatedText
                }
            };

        } catch (error) {
            console.error('Judge Service Error:', error);
            
            // Fallback to mock response when HF API is unavailable
            if (error.message.includes('No Inference Provider available') || 
                error.message.includes('Failed to fetch inference provider')) {
                
                console.log('Using fallback mock judge response due to HF API unavailability');
                
                // Generate a mock but realistic judgment
                const mockJudgement = this.generateMockJudgement(question, responses);
                
                return {
                    success: true,
                    data: {
                        question,
                        responses,
                        judgement: mockJudgement,
                        rawOutput: 'Mock response - HF API unavailable'
                    }
                };
            }
            
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Builds the prompt structure for the judge model
     * @param {string} question - The question
     * @param {Array<string>} responses - Array of responses
     * @returns {string} - Formatted prompt
     */
    buildJudgePrompt(question, responses) {
        const prompt = `You are an expert AI judge tasked with evaluating responses to questions. Please analyze the following question and four responses, then provide a detailed evaluation.

Question: "${question}"

Responses to evaluate:
1. ${responses[0]}
2. ${responses[1]}
3. ${responses[2]}
4. ${responses[3]}

Please evaluate each response based on:
- Accuracy and correctness
- Completeness and depth
- Clarity and coherence
- Relevance to the question

Provide your judgment in the following format:
RANKING: [Best to worst, e.g., "3, 1, 4, 2"]
SCORES: [Score out of 10 for each response, e.g., "9, 7, 8, 6"]
REASONING: [Brief explanation for your ranking]

Your evaluation:`;

        return prompt;
    }

    /**
     * Invoke text-generation task on HF Inference and normalize output
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async callTextGeneration(prompt) {
        const res = await this.hf.textGeneration({
            model: this.modelId,
            inputs: prompt,
            parameters: {
                max_new_tokens: 512,
                temperature: 0.1,
                top_p: 0.9,
                do_sample: true,
                return_full_text: false
            }
        });

        // Normalize various possible shapes
        if (res && typeof res === 'object' && 'generated_text' in res) {
            return res.generated_text;
        }
        if (Array.isArray(res) && res[0]?.generated_text) {
            return res[0].generated_text;
        }
        return String(res ?? '');
    }

    /**
     * Invoke conversational task on HF Inference and normalize output
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async callChatCompletion(prompt) {
        // Use chatCompletion API with a single user message containing our judging prompt
        const res = await this.hf.chatCompletion({
            model: this.modelId,
            messages: [
                { role: 'system', content: 'You are an impartial AI judge.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 512,
            temperature: 0.1,
        });

        // Normalize OpenAI-style response
        const choice = res?.choices?.[0];
        const content = choice?.message?.content ?? choice?.delta?.content;
        if (content) return Array.isArray(content) ? content.map(c => c?.text ?? c).join('\n') : String(content);

        // Some providers may return a string or different shape
        return String(res ?? '');
    }

    /**
     * Parses the judgement response from the model
     * @param {string} rawText - Raw text from the model
     * @returns {Object} - Parsed judgement
     */
    parseJudgement(rawText) {
        try {
            const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
            
            let ranking = null;
            let scores = null;
            let reasoning = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.toUpperCase().startsWith('RANKING:')) {
                    ranking = line.substring(8).trim();
                } else if (line.toUpperCase().startsWith('SCORES:')) {
                    scores = line.substring(7).trim();
                } else if (line.toUpperCase().startsWith('REASONING:')) {
                    reasoning = lines.slice(i).join(' ').substring(10).trim();
                    break;
                }
            }

            return {
                ranking: ranking || 'Not provided',
                scores: scores || 'Not provided',
                reasoning: reasoning || 'No reasoning provided',
                fullText: rawText
            };

        } catch (error) {
            console.error('Error parsing judgement:', error);
            return {
                ranking: 'Parse error',
                scores: 'Parse error',
                reasoning: 'Failed to parse model response',
                fullText: rawText
            };
        }
    }

    /**
     * Validates the service configuration
     * @returns {Object} - Validation result
     */
    validateConfig() {
        const missingConfig = [];
        
        if (!process.env.HF_API_TOKEN) {
            missingConfig.push('HF_API_TOKEN');
        }
        
        if (!process.env.JUDGE_MODEL_ID) {
            missingConfig.push('JUDGE_MODEL_ID');
        }

        return {
            isValid: missingConfig.length === 0,
            missingConfig
        };
    }

    /**
     * Generates a mock judgement when HF API is unavailable
     * @param {string} question - The question
     * @param {Array<string>} responses - Array of responses
     * @returns {Object} - Mock judgement
     */
    generateMockJudgement(question, responses) {
        // Simple heuristic-based ranking for demonstration
        const scoredResponses = responses.map((response, index) => ({
            index: index + 1,
            length: response.length,
            hasNumbers: /\d/.test(response),
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(response),
            wordCount: response.split(' ').length
        }));

        // Score based on length, completeness, and content richness
        const rankedResponses = scoredResponses.map(resp => ({
            ...resp,
            score: Math.min(10, Math.max(1, 
                (resp.wordCount * 0.1) + 
                (resp.hasNumbers ? 1 : 0) + 
                (resp.hasSpecialChars ? 0.5 : 0) + 
                Math.random() * 3 // Add some randomness
            ))
        })).sort((a, b) => b.score - a.score);

        const ranking = rankedResponses.map(r => r.index).join(', ');
        const scores = responses.map((_, index) => {
            const found = rankedResponses.find(r => r.index === index + 1);
            return Math.round(found ? found.score : 5);
        }).join(', ');

        return {
            ranking,
            scores,
            reasoning: `Mock evaluation based on response length, content richness, and completeness. Response ${rankedResponses[0].index} appears most comprehensive with ${rankedResponses[0].wordCount} words and detailed content structure. This is a fallback response due to AI model unavailability.`,
            fullText: `RANKING: ${ranking}\nSCORES: ${scores}\nREASONING: Mock evaluation - AI judge model temporarily unavailable.`
        };
    }
}

export default new JudgeService();