import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Dashboard } from "./pages/Dashboard";
import { Campaigns } from "./pages/Campaigns";
import { CampaignDetail } from "./pages/CampaignDetail";
import { CreateCampaign } from "./pages/CreateCampaign";
import { Analytics } from "./pages/Analytics";
import { Templates } from "./pages/Templates";
import { Contacts } from "./pages/Contacts";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Navigation } from "./components/Navigation";
import { Sidebar } from "./components/Sidebar";
import { ThemeProvider } from './hooks/useTheme'; 
import "./index.css";
import { PermissionsProvider } from "./hooks/usePermissions";

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Main App Content (uses auth context)
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
            <Route path="/campaigns/create" element={<ProtectedRoute><CreateCampaign /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Root App component with AuthProvider
function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="system"> 
      <AuthProvider>
        <PermissionsProvider>

        <AppContent />
        </PermissionsProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;