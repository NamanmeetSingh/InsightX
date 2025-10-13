import React from 'react';
import { X, Trophy, Star, AlertCircle } from 'lucide-react';
import './JudgeResultsModal.css';

const PROVIDER_INFO = {
  gemini: {
    name: 'Gemini',
    color: '#4285F4',
    icon: '🧠'
  },
  openai: {
    name: 'ChatGPT',
    color: '#10A37F', 
    icon: '🤖'
  },
  claude: {
    name: 'Claude',
    color: '#FF6B35',
    icon: '🎭'
  },
  perplexity: {
    name: 'Perplexity',
    color: '#6366F1',
    icon: '🔍'
  }
};

const JudgeResultsModal = ({ isOpen, onClose, judgeData, originalResponses, question }) => {
  if (!isOpen || !judgeData) return null;

  const { judgement } = judgeData;
  const rankings = judgement.ranking.split(',').map(r => parseInt(r.trim()) - 1); // Convert to 0-based index
  const scores = judgement.scores.split(',').map(s => s.trim());

  const getRankingIcon = (position) => {
    switch(position) {
      case 0: return <Trophy className="trophy gold" />;
      case 1: return <Trophy className="trophy silver" />;
      case 2: return <Trophy className="trophy bronze" />;
      default: return <Star className="star" />;
    }
  };

  const getRankingClass = (position) => {
    switch(position) {
      case 0: return 'rank-1';
      case 1: return 'rank-2';
      case 2: return 'rank-3';
      default: return 'rank-4';
    }
  };

  return (
    <div className="judge-modal-overlay" onClick={onClose}>
      <div className="judge-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="judge-modal-header">
          <h2>🏆 AI Response Rankings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="judge-modal-body">
          <div className="question-section">
            <h3>Question Analyzed:</h3>
            <p className="question-text">{question}</p>
          </div>

          <div className="rankings-section">
            <h3>🥇 Rankings & Scores</h3>
            <div className="rankings-grid">
              {rankings.map((responseIndex, position) => {
                const response = originalResponses[responseIndex];
                const providerInfo = PROVIDER_INFO[response?.provider] || {
                  name: `Response ${responseIndex + 1}`,
                  color: '#6B7280',
                  icon: '🤖'
                };
                
                return (
                  <div key={position} className={`ranking-card ${getRankingClass(position)}`}>
                    <div className="ranking-header">
                      <div className="ranking-position">
                        {getRankingIcon(position)}
                        <span className="position-number">#{position + 1}</span>
                      </div>
                      <div className="provider-info">
                        <span className="provider-icon">{providerInfo.icon}</span>
                        <span className="provider-name">{providerInfo.name}</span>
                      </div>
                      <div className="score-badge">
                        <span className="score-text">{scores[responseIndex] || 'N/A'}/10</span>
                      </div>
                    </div>
                    
                    <div className="response-preview">
                      {response?.success ? (
                        <p className="response-text">
                          {response.content.length > 150 
                            ? `${response.content.substring(0, 150)}...` 
                            : response.content}
                        </p>
                      ) : (
                        <div className="error-response">
                          <AlertCircle size={16} />
                          <span>Response failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reasoning-section">
            <h3>💭 Judge's Reasoning</h3>
            <div className="reasoning-content">
              <p>{judgement.reasoning}</p>
            </div>
          </div>

          <div className="judge-info">
            <div className="judge-badge">
              <span className="judge-icon">⚖️</span>
              <span>Evaluated by AI Judge</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeResultsModal;