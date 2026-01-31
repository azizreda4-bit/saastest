import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage'; // ✅ Named import

// Simple loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }) => {
  // Replace this with your auth logic later
  // Example:
  // const { user } = useAuth();
  // if (!user) return <Navigate to="/auth/login" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <TenantProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/auth/login" element={<LoginPage />} />

                {/* Protected Routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={<LoadingSpinner />}>
                          <DashboardPage />
                        </Suspense>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                {/* 404 Page */}
                <Route
                  path="*"
                  element={
                    <div className="min-h-screen flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900">404</h1>
                        <p className="text-gray-600">Page non trouvée</p>
                        <Link
                          to="/dashboard"
                          className="text-blue-600 hover:text-blue-500"
                        >
                          Retour au tableau de bord
                        </Link>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </TenantProvider>
    </ThemeProvider>
  );
}

export default App;
