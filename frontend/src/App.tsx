import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginView } from './pages/Login/LoginView';
import { HubView } from './pages/Hub/HubView';
import { POSView } from './pages/POS/POSView';
import { FulfillmentView } from './pages/Fulfillment/FulfillmentView';

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/hub" : "/login"} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginView />} />
          <Route 
            path="/hub" 
            element={
              <ProtectedRoute>
                <HubView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/pos" 
            element={
              <ProtectedRoute>
                <POSView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/fulfillment" 
            element={
              <ProtectedRoute>
                <FulfillmentView />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
