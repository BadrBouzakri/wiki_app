import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  LightBulbIcon,
  UserGroupIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import classNames from 'classnames';

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [contextAnalytics, setContextAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      const [suggestionsRes, contextRes] = await Promise.all([
        fetch('/api/suggestions/analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`/api/context/analytics/${user?.id}?period=${selectedPeriod}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (suggestionsRes.ok && contextRes.ok) {
        const [suggestionsData, contextData] = await Promise.all([
          suggestionsRes.json(),
          contextRes.json()
        ]);
        
        setAnalytics(suggestionsData);
        setContextAnalytics(contextData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { value: '1d', label: '24h' },
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' }
  ];

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const feedbackData = analytics ? [
    { name: 'Utiles', value: parseInt(analytics.overview.helpful_count) || 0, color: '#10b981' },
    { name: 'Pas utiles', value: parseInt(analytics.overview.not_helpful_count) || 0, color: '#ef4444' },
    { name: 'Non pertinentes', value: parseInt(analytics.overview.irrelevant_count) || 0, color: '#f59e0b' }
  ] : [];

  const categoryData = analytics?.topCategories?.map(cat => ({
    name: cat.category || 'Non catégorisé',
    suggestions: parseInt(cat.suggestion_count)
  })) || [];

  const timelineData = contextAnalytics?.timeline?.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    activities: parseInt(item.count),
    type: item.activity_type
  })) || [];

  // Group timeline data by date
  const groupedTimelineData = timelineData.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date);
    if (existing) {
      existing[item.type] = item.activities;
      existing.total = (existing.total || 0) + item.activities;
    } else {
      acc.push({
        date: item.date,
        [item.type]: item.activities,
        total: item.activities
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Analysez l'efficacité de votre base de connaissances contextuelle
          </p>
        </div>
        
        <div className="flex space-x-2">
          {periods.map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={classNames(
                'px-3 py-2 text-sm rounded-md transition-colors',
                selectedPeriod === period.value
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-soft rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LightBulbIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total suggestions
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.overview?.total_suggestions || 0}
                    </div>
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
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.overview?.avg_relevance 
                        ? `${Math.round(analytics.overview.avg_relevance * 100)}%`
                        : 'N/A'
                      }
                    </div>
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
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Activités totales
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {contextAnalytics?.summary?.total_activities || 0}
                    </div>
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
                <ClockIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Types d'activité
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {contextAnalytics?.summary?.unique_types || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feedback Distribution */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribution des feedbacks
          </h3>
          {feedbackData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={feedbackData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {feedbackData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              Aucune donnée de feedback disponible
            </div>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Catégories les plus suggérées
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  className="text-sm fill-gray-600 dark:fill-gray-400"
                />
                <YAxis className="text-sm fill-gray-600 dark:fill-gray-400" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="suggestions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              Aucune donnée de catégorie disponible
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Évolution de l'activité ({selectedPeriod})
        </h3>
        {groupedTimelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={groupedTimelineData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-sm fill-gray-600 dark:fill-gray-400"
              />
              <YAxis className="text-sm fill-gray-600 dark:fill-gray-400" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgb(31 41 55)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="total"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Total activités"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Aucune donnée d'activité disponible pour cette période
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Insights de performance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-full mb-3">
              <TrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Taux de satisfaction
            </h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analytics?.overview ? 
                Math.round((analytics.overview.helpful_count / Math.max(analytics.overview.total_suggestions, 1)) * 100)
                : 0
              }%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Suggestions jugées utiles
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
              <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Engagement moyen
            </h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {contextAnalytics?.summary ? 
                Math.round((contextAnalytics.summary.total_activities / 7) * 10) / 10
                : 0
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Activités par jour
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900 rounded-full mb-3">
              <LightBulbIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Couverture contextuelle
            </h4>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {contextAnalytics?.summary?.unique_types || 0}/5
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Types d'activité détectés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;