import { BrowserRouter, Route, Routes, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

import HomePage from './pages/public/HomePage';
import ExploreCarsPage from './pages/public/ExploreCarsPage';
import BrowseGroupsPage from './pages/public/BrowseGroupsPage';
import GroupDetailsPage from './pages/public/GroupDetailsPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import FaqPage from './pages/public/FaqPage';
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage';
import TermsPage from './pages/public/TermsPage';
import AiToolsHubPage from './pages/public/AiToolsHubPage';
import PricePredictionPage from './pages/public/PricePredictionPage';
import DemandPredictionPage from './pages/public/DemandPredictionPage';
import OfferAnalysisPage from './pages/public/OfferAnalysisPage';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import BuyerDashboardPage from './pages/user/BuyerDashboardPage';
import DealerDashboardPage from './pages/user/DealerDashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Website Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/cars" element={<ExploreCarsPage />} />
              <Route path="/groups" element={<BrowseGroupsPage />} />
              <Route path="/groups/:id" element={<GroupDetailsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Dedicated AI Smart Tools Routes */}
              <Route path="/ai-tools" element={<AiToolsHubPage />} />
              <Route path="/ai-tools/price" element={<PricePredictionPage />} />
              <Route path="/ai-tools/demand" element={<DemandPredictionPage />} />
              <Route path="/ai-tools/offers" element={<OfferAnalysisPage />} />

              {/* Backwards-compatible aliases */}
              <Route path="/price-prediction" element={<PricePredictionPage />} />
              <Route path="/offer-analysis" element={<OfferAnalysisPage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Protected Role Workspaces */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                  <BuyerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dealer"
              element={
                <ProtectedRoute allowedRoles={['dealer']}>
                  <DealerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
