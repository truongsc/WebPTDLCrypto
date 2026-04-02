import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:8000', {
      transports: ['websocket'],
      timeout: 20000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const subscribeToToken = (tokenSymbol) => {
    if (socket && connected) {
      socket.emit('subscribe-token', tokenSymbol);
    }
  };

  const unsubscribeFromToken = (tokenSymbol) => {
    if (socket && connected) {
      socket.emit('unsubscribe-token', tokenSymbol);
    }
  };

  const value = {
    socket,
    connected,
    subscribeToToken,
    unsubscribeFromToken,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
