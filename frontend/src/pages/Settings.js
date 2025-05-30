import React, { useState } from 'react';
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import classNames from 'classnames';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser, changePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { connected } = useSocket();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      suggestions: true,
      errors: true,
      updates: false
    },
    monitoring: {
      commands: true,
      files: true,
      processes: true,
      network: false
    }
  });

  const tabs = [
    { id: 'profile', name: 'Profil', icon: UserCircleIcon },
    { id: 'security', name: 'Sécurité', icon: ShieldCheckIcon },
    { id: 'preferences', name: 'Préférences', icon: Cog6ToothIcon },
    { id: 'monitoring', name: 'Surveillance', icon: ComputerDesktopIcon }
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updateUser(profileData);
      if (result.success) {
        toast.success('Profil mis à jour avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Mot de passe modifié avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    
    // Save to localStorage
    localStorage.setItem('wiki-app-settings', JSON.stringify({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    }));
    
    toast.success('Paramètre mis à jour');
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Informations personnelles
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Mettez à jour vos informations de profil.
        </p>
      </div>
      
      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              id="username"
              value={profileData.username}
              onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Adresse email
            </label>
            <input
              type="email"
              id="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" color="white" className="mr-2" /> : null}
            Mettre à jour le profil
          </button>
        </div>
      </form>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Changer le mot de passe
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Assurez-vous que votre compte utilise un mot de passe long et aléatoire.
        </p>
      </div>
      
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mot de passe actuel
          </label>
          <input
            type="password"
            id="currentPassword"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              id="newPassword"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" color="white" className="mr-2" /> : null}
            Changer le mot de passe
          </button>
        </div>
      </form>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Préférences d'affichage
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Personnalisez votre expérience utilisateur.
        </p>
      </div>
      
      {/* Theme Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Thème
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Clair', icon: SunIcon },
            { value: 'dark', label: 'Sombre', icon: MoonIcon },
            { value: 'system', label: 'Système', icon: ComputerDesktopIcon }
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={classNames(
                  'relative flex items-center justify-center p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500',
                  theme === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                )}
              >
                <div className="text-center">
                  <Icon className="mx-auto h-6 w-6 text-gray-600 dark:text-gray-400" />
                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </div>
                {theme === option.value && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-primary-600 rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Notifications */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notifications
        </label>
        <div className="space-y-3">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {key === 'suggestions' ? 'Nouvelles suggestions' :
                   key === 'errors' ? 'Erreurs système' :
                   key === 'updates' ? 'Mises à jour' : key}
                </span>
              </div>
              <button
                onClick={() => handleSettingsUpdate('notifications', key, !value)}
                className={classNames(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span
                  className={classNames(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    value ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMonitoringTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Configuration de surveillance
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choisissez quels types d'activités surveiller pour générer des suggestions contextuelles.
        </p>
      </div>
      
      {/* Connection Status */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={classNames(
              'w-3 h-3 rounded-full mr-3',
              connected ? 'bg-green-400' : 'bg-red-400'
            )} />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Agent de surveillance
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {connected ? 'Connecté et actif' : 'Déconnecté'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Monitoring Options */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Types de surveillance
        </label>
        <div className="space-y-3">
          {Object.entries(settings.monitoring).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {key === 'commands' ? 'Commandes shell' :
                   key === 'files' ? 'Modifications de fichiers' :
                   key === 'processes' ? 'Processus système' :
                   key === 'network' ? 'Activité réseau' : key}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {key === 'commands' ? 'Surveille l\'historique des commandes bash/zsh' :
                   key === 'files' ? 'Détecte les changements dans les fichiers de configuration' :
                   key === 'processes' ? 'Analyse les processus en cours d\'exécution' :
                   key === 'network' ? 'Monitore les connexions réseau actives' : ''}
                </p>
              </div>
              <button
                onClick={() => handleSettingsUpdate('monitoring', key, !value)}
                className={classNames(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span
                  className={classNames(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    value ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Paramètres
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gérez votre compte et configurez vos préférences
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
        {/* Sidebar */}
        <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={classNames(
                    'group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left',
                    activeTab === tab.id
                      ? 'bg-gray-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300'
                      : 'text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon
                    className={classNames(
                      'flex-shrink-0 -ml-1 mr-3 h-6 w-6',
                      activeTab === tab.id
                        ? 'text-primary-500 dark:text-primary-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    )}
                  />
                  <span className="truncate">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
          <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'security' && renderSecurityTab()}
              {activeTab === 'preferences' && renderPreferencesTab()}
              {activeTab === 'monitoring' && renderMonitoringTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;