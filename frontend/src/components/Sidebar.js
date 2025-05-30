import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  LightBulbIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useSocket } from '../contexts/SocketContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Documentation', href: '/documentation', icon: BookOpenIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Paramètres', href: '/settings', icon: Cog6ToothIcon },
];

const Sidebar = ({ isOpen, onToggle }) => {
  const { suggestions } = useSocket();
  const activeSuggestions = suggestions.filter(s => s.relevanceScore > 0.7).length;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden" 
          onClick={onToggle}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={classNames(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-soft transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:w-16'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-primary-600 dark:bg-primary-700">
            <div className="flex items-center">
              <LightBulbIcon className="h-8 w-8 text-white" />
              {isOpen && (
                <span className="ml-2 text-xl font-bold text-white">
                  Wiki App
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    classNames(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    )
                  }
                >
                  <Icon className={classNames(
                    'flex-shrink-0 h-5 w-5',
                    isOpen ? 'mr-3' : 'mx-auto'
                  )} />
                  {isOpen && item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Suggestions indicator */}
          {activeSuggestions > 0 && (
            <div className="px-4 pb-4">
              <div className="bg-primary-50 dark:bg-primary-900 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <LightBulbIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  {isOpen && (
                    <div className="ml-3">
                      <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                        {activeSuggestions} suggestion{activeSuggestions > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-primary-600 dark:text-primary-400">
                        Disponible{activeSuggestions > 1 ? 's' : ''} maintenant
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;