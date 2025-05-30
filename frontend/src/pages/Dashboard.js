import React, { useState, useEffect } from 'react';
import {
  LightBulbIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CpuChipIcon,
  CommandLineIcon,
  ServerIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import SuggestionCard from '../components/SuggestionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import classNames from 'classnames';

const Dashboard = () => {
  const { user } = useAuth();
  const { suggestions, connected, recentContext } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [analyticsRes, suggestionsRes] = await Promise.all([
        fetch('/api/suggestions/analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`/api/suggestions/history/${user?.id}?limit=10`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (analyticsRes.ok && suggestionsRes.ok) {
        const [analytics, recentSuggestions] = await Promise.all([
          analyticsRes.json(),
          suggestionsRes.json()
        ]);

        setStats({
          analytics: analytics.overview,
          topCategories: analytics.topCategories,
          recentSuggestions: recentSuggestions.suggestions
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContextIcon = (type) => {
    switch (type) {
      case 'command_execution':
        return CommandLineIcon;
      case 'file_modification':
        return DocumentTextIcon;
      case 'process_analysis':
        return CpuChipIcon;
      case 'network_activity':
        return ServerIcon;
      default:
        return ExclamationCircleIcon;
    }
  };

  const filteredSuggestions = selectedCategory === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.category === selectedCategory);

  const categories = ['all', ...new Set(suggestions.map(s => s.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bonjour, {user?.username} !
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Voici un aperçu de votre activité DevOps et des suggestions personnalisées.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-soft rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={classNames(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  connected ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                )}>
                  <div className={classNames(
                    'w-3 h-3 rounded-full',
                    connected ? 'bg-green-600' : 'bg-red-600'
                  )} />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Statut de connexion
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {connected ? 'Connecté' : 'Déconnecté'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-soft rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LightBulbIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Suggestions actives
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {suggestions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-soft rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Précision moyenne
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats?.analytics?.avg_relevance 
                      ? `${Math.round(stats.analytics.avg_relevance * 100)}%`
                      : 'N/A'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-soft rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Dernière activité
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recentContext ? 'Maintenant' : 'Inactif'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Context */}
      {recentContext && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
          <div className="flex items-center mb-4">
            {React.createElement(getContextIcon(recentContext.type), {
              className: 'h-6 w-6 text-primary-600 dark:text-primary-400 mr-2'
            })}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contexte récent détecté
            </h2>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Type d'activité: {recentContext.type}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(recentContext.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            {recentContext.commands && (
              <div className="mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Commandes:</span>
                <div className="mt-1 space-y-1">
                  {recentContext.commands.slice(0, 3).map((cmd, index) => (
                    <code key={index} className="block text-xs bg-gray-800 text-green-400 p-2 rounded">
                      {cmd}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Suggestions contextuelles
            </h2>
            
            {/* Category filter */}
            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={classNames(
                    'px-3 py-1 text-sm rounded-full transition-colors',
                    selectedCategory === category
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  {category === 'all' ? 'Toutes' : category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredSuggestions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onFeedback={(id, feedback) => {
                    // Feedback is handled by the SuggestionCard component
                    console.log(`Feedback ${feedback} for suggestion ${id}`);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Aucune suggestion disponible
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Travaillez sur vos projets DevOps pour recevoir des suggestions personnalisées.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;