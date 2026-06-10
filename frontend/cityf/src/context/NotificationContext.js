import React, { createContext, useState, useContext } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [hasNotifications, setHasNotifications] = useState(false);

  const triggerNotification = () => {
    setHasNotifications(true);
    // Reset after 5 seconds
    setTimeout(() => {
      setHasNotifications(false);
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ hasNotifications, triggerNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
