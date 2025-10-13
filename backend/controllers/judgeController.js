import judgeService from '../services/judgeService.js';

/**
 * Controller for handling judge-related operations
 */
class JudgeController {
    /**
     * Judge responses to a question
     * POST /api/judge
     */
    async judgeResponses(req, res) {
        try {
            const { question, responses } = req.body;

            // Validate input
            if (!question || typeof question !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Question is required and must be a string'
                });
            }

            if (!responses || !Array.isArray(responses) || responses.length !== 4) {
                return res.status(400).json({
                    success: false,
                    message: 'Exactly 4 responses are required in an array'
                });
            }

            // Validate each response is a string
            for (let i = 0; i < responses.length; i++) {
                if (typeof responses[i] !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: `Response ${i + 1} must be a string`
                    });
                }
            }

            // Validate service configuration
            const configValidation = judgeService.validateConfig();
            if (!configValidation.isValid) {
                return res.status(500).json({
                    success: false,
                    message: 'Judge service configuration error',
                    details: `Missing environment variables: ${configValidation.missingConfig.join(', ')}`
                });
            }

            // Process the judgment request
            const result = await judgeService.judgeResponses(question, responses);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Responses judged successfully',
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to judge responses',
                    error: result.error
                });
            }

        } catch (error) {
            console.error('Judge Controller Error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    /**
     * Get judge service health status
     * GET /api/judge/health
     */
    async getHealth(req, res) {
        try {
            const configValidation = judgeService.validateConfig();
            
            res.status(200).json({
                success: true,
                message: 'Judge service health check',
                data: {
                    status: configValidation.isValid ? 'healthy' : 'configuration error',
                    configuration: configValidation,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Judge Health Check Error:', error);
            res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
            });
        }
    }
}

export default new JudgeController();