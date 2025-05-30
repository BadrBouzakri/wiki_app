import React, { useState } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BookOpenIcon,
  TagIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { useSocket } from '../contexts/SocketContext';

const SuggestionCard = ({ suggestion, onFeedback }) => {
  const [loading, setLoading] = useState(false);
  const { provideFeedback } = useSocket();

  const handleFeedback = async (feedback) => {
    setLoading(true);
    try {
      await provideFeedback(suggestion.id, feedback);
      onFeedback?.(suggestion.id, feedback);
    } catch (error) {
      console.error('Error providing feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelevanceColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatRelevanceScore = (score) => {
    return Math.round(score * 100);
  };

  return (
    <div className="suggestion-card group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BookOpenIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <span className={classNames(
            'px-2 py-1 text-xs font-medium rounded-full',
            getRelevanceColor(suggestion.relevanceScore)
          )}>
            {formatRelevanceScore(suggestion.relevanceScore)}% pertinent
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {suggestion.type === 'rule-based' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <StarIcon className="w-3 h-3 mr-1" />
              Auto
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {suggestion.source}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {suggestion.title}
      </h3>

      {/* Content preview */}
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
        {suggestion.content}
      </p>

      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            >
              <TagIcon className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
          {suggestion.tags.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{suggestion.tags.length - 3} plus
            </span>
          )}
        </div>
      )}

      {/* Matched keywords */}
      {suggestion.matchedKeywords && suggestion.matchedKeywords.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Mots-clés correspondants:
          </p>
          <div className="flex flex-wrap gap-1">
            {suggestion.matchedKeywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-mono bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {!suggestion.feedback && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cette suggestion vous a-t-elle été utile ?
          </p>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFeedback('helpful')}
              disabled={loading}
              className="p-2 rounded-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900 transition-colors disabled:opacity-50"
              title="Utile"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleFeedback('not_helpful')}
              disabled={loading}
              className="p-2 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
              title="Pas utile"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleFeedback('irrelevant')}
              disabled={loading}
              className="p-2 rounded-full text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900 transition-colors disabled:opacity-50"
              title="Non pertinent"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Feedback status */}
      {suggestion.feedback && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {suggestion.feedback === 'helpful' && (
              <>
                <CheckIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Marqué comme utile</span>
              </>
            )}
            {suggestion.feedback === 'not_helpful' && (
              <>
                <XMarkIcon className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Marqué comme pas utile</span>
              </>
            )}
            {suggestion.feedback === 'irrelevant' && (
              <>
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600">Marqué comme non pertinent</span>
              </>
            )}
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon className="inline h-3 w-3 mr-1" />
            Évalué
          </span>
        </div>
      )}
    </div>
  );
};

export default SuggestionCard;