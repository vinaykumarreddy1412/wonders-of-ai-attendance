import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { VolunteerLoginPage } from './pages/VolunteerLoginPage';
import { VolunteerDashboardPage } from './pages/VolunteerDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const VALID_ROUTES = [
  '/', 
  '/student/login', 
  '/student/dashboard', 
  '/volunteer/login', 
  '/volunteer/dashboard', 
  '/admin/login', 
  '/admin/dashboard'
];

function normalizeRoute(raw) {
  if (!raw) return '/';
  let clean = String(raw).trim();
  clean = clean.replace(/^#\/?/, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  clean = clean.replace(/\/+$/, '');
  if (!clean) clean = '/';
  return VALID_ROUTES.includes(clean) ? clean : '/';
}

function Router() {
  const { student, admin, volunteer } = useAuth();
  
  // Get initial route from pathname or hash
  const getInitialRoute = () => {
    if (typeof window === 'undefined') return '/';
    if (window.location.hash) {
      const parsedHash = normalizeRoute(window.location.hash);
      if (parsedHash !== '/') return parsedHash;
    }
    if (window.location.pathname && window.location.pathname !== '/') {
      return normalizeRoute(window.location.pathname);
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);

  const navigate = (to) => {
    const valid = normalizeRoute(to);
    setCurrentRoute(valid);
    window.location.hash = valid;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleRouteSync = () => {
      if (window.location.hash) {
        const fromHash = normalizeRoute(window.location.hash);
        if (fromHash !== '/') {
          setCurrentRoute(fromHash);
          return;
        }
      }
      if (window.location.pathname) {
        setCurrentRoute(normalizeRoute(window.location.pathname));
      }
    };

    window.addEventListener('hashchange', handleRouteSync);
    window.addEventListener('popstate', handleRouteSync);
    return () => {
      window.removeEventListener('hashchange', handleRouteSync);
      window.removeEventListener('popstate', handleRouteSync);
    };
  }, []);

  // Route protection rules
  useEffect(() => {
    if (currentRoute === '/student/dashboard' && !student) {
      navigate('/student/login');
    }
    if (currentRoute === '/volunteer/dashboard' && !volunteer) {
      navigate('/volunteer/login');
    }
    if (currentRoute === '/admin/dashboard' && !admin) {
      navigate('/admin/login');
    }
    if (currentRoute === '/student/login' && student) {
      navigate('/student/dashboard');
    }
    if (currentRoute === '/volunteer/login' && volunteer) {
      navigate('/volunteer/dashboard');
    }
    if (currentRoute === '/admin/login' && admin) {
      navigate('/admin/dashboard');
    }
  }, [currentRoute, student, admin, volunteer]);

  return (
    <div className="app-container">
      <Navbar activeRoute={currentRoute} onNavigate={navigate} />

      <main className="main-content">
        {currentRoute === '/student/login' ? (
          <StudentLoginPage onNavigate={navigate} />
        ) : currentRoute === '/student/dashboard' ? (
          <StudentDashboardPage onNavigate={navigate} />
        ) : currentRoute === '/volunteer/login' ? (
          <VolunteerLoginPage onNavigate={navigate} />
        ) : currentRoute === '/volunteer/dashboard' ? (
          <VolunteerDashboardPage onNavigate={navigate} />
        ) : currentRoute === '/admin/login' ? (
          <AdminLoginPage onNavigate={navigate} />
        ) : currentRoute === '/admin/dashboard' ? (
          <AdminDashboardPage onNavigate={navigate} />
        ) : (
          <HomePage onNavigate={navigate} />
        )}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ErrorBoundary>
  );
}
