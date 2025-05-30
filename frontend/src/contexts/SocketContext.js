import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentContext, setRecentContext] = useState(null);

  useEffect(() => {
    if (user) {
      // Initialize socket connection
      const serverUrl = process.env.REACT_APP_WS_URL || window.location.origin;
      const newSocket = io(serverUrl, {
        auth: {
          userId: user.id
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to Wiki App server');
        setConnected(true);
        toast.success('Connecté au système de monitoring', { duration: 2000 });
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
        toast.error('Connexion perdue', { duration: 2000 });
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
        toast.error('Erreur de connexion au serveur');
      });

      // Listen for new context updates
      newSocket.on('new-context', (contextData) => {
        console.log('New context received:', contextData);
        setRecentContext(contextData);
        
        // Generate suggestions based on new context
        generateSuggestions(contextData);
      });

      // Listen for suggestion updates
      newSocket.on('suggestions-update', (newSuggestions) => {
        console.log('Suggestions updated:', newSuggestions);
        setSuggestions(newSuggestions);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [user]);

  const generateSuggestions = async (contextData) => {
    try {
      const response = await fetch('/api/suggestions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contextData,
          userId: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        
        // Show notification for high-relevance suggestions
        const highRelevanceSuggestions = data.suggestions.filter(
          s => s.relevanceScore > 0.8
        );
        
        if (highRelevanceSuggestions.length > 0) {
          toast.success(
            `${highRelevanceSuggestions.length} nouvelle(s) suggestion(s) pertinente(s)`,
            { duration: 3000 }
          );
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  const sendContextUpdate = (contextData) => {
    if (socket && connected) {
      socket.emit('context-update', {
        ...contextData,
        userId: user?.id,
        timestamp: Date.now()
      });
    }
  };

  const provideFeedback = async (suggestionId, feedback) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          feedback,
          userId: user?.id
        })
      });

      if (response.ok) {
        toast.success('Feedback enregistré');
        
        // Update local suggestions
        setSuggestions(prev => prev.map(s => 
          s.id === suggestionId 
            ? { ...s, feedback }
            : s
        ));
      }
    } catch (error) {
      console.error('Error providing feedback:', error);
      toast.error('Erreur lors de l\'enregistrement du feedback');
    }
  };

  const value = {
    socket,
    connected,
    suggestions,
    recentContext,
    sendContextUpdate,
    provideFeedback,
    setSuggestions
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};