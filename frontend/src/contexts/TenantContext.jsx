import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize with default tenant for testing
    const defaultTenant = {
      id: 'test-tenant-id',
      name: 'Test Company',
      domain: 'localhost',
      plan: 'professional',
      settings: {
        company_name: 'Test Company',
        timezone: 'Africa/Casablanca',
        currency: 'MAD',
        language: 'fr'
      },
      isActive: true
    };

    setTenant(defaultTenant);
    setLoading(false);
  }, []);

  const updateTenant = (updates) => {
    setTenant(prev => ({
      ...prev,
      ...updates
    }));
  };

  const value = {
    tenant,
    setTenant,
    updateTenant,
    loading
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};