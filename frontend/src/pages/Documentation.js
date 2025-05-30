import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  TagIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useDebounce } from '../hooks/useDebounce';
import LoadingSpinner from '../components/LoadingSpinner';
import classNames from 'classnames';
import toast from 'react-hot-toast';

const Documentation = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchDocuments();
    fetchMetadata();
  }, [debouncedSearchQuery, selectedCategory, selectedSource]);

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams({
        limit: 50,
        offset: 0
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (selectedSource !== 'all') {
        params.append('source', selectedSource);
      }
      
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }

      const response = await fetch(`/api/documentation?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documentation);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [categoriesRes, sourcesRes] = await Promise.all([
        fetch('/api/documentation/meta/categories', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/documentation/meta/sources', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (categoriesRes.ok && sourcesRes.ok) {
        const [categoriesData, sourcesData] = await Promise.all([
          categoriesRes.json(),
          sourcesRes.json()
        ]);
        
        setCategories(categoriesData);
        setSources(sourcesData);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documentation/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setDocuments(docs => docs.filter(doc => doc.id !== id));
        toast.success('Document supprimé avec succès');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return 'text-red-600 bg-red-100';
    if (priority >= 6) return 'text-yellow-600 bg-yellow-100';
    if (priority >= 4) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 8) return 'Critique';
    if (priority >= 6) return 'Élevée';
    if (priority >= 4) return 'Moyenne';
    return 'Faible';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Base de connaissances
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gérez et organisez votre documentation DevOps
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Rechercher dans la documentation..."
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Toutes les sources</option>
              {sources.map(source => (
                <option key={source.source} value={source.source}>
                  {source.source} ({source.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 hover:shadow-soft-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <span className={classNames(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getPriorityColor(doc.priority)
                )}>
                  {getPriorityLabel(doc.priority)}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Voir"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Modifier"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Supprimer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
              {doc.title}
            </h3>

            {/* Content preview */}
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
              {doc.content.substring(0, 150)}...
            </p>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {doc.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{doc.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{doc.source}</span>
              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {documents.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Aucun document trouvé
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || selectedCategory !== 'all' || selectedSource !== 'all'
              ? 'Essayez de modifier vos filtres de recherche.'
              : 'Commencez par créer votre premier document.'
            }
          </p>
          {!searchQuery && selectedCategory === 'all' && selectedSource === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Créer un document
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document details modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedDoc(null)} />
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedDoc.title}
                  </h3>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
                
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{selectedDoc.content}</div>
                </div>
                
                {selectedDoc.source_url && (
                  <div className="mt-4">
                    <a
                      href={selectedDoc.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Voir la source originale →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentation;