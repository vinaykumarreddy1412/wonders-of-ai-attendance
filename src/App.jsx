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

const VALID_ROUTES = [
  '/', 
  '/student/login', 
  '/student/dashboard', 
  '/volunteer/login', 
  '/volunteer/dashboard', 
  '/admin/login', 
  '/admin/dashboard'
];

function Router() {
  const { student, admin, volunteer } = useAuth();
  
  // Get initial route from pathname or hash
  const getInitialRoute = () => {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash.replace('#', '');
    if (hash && VALID_ROUTES.includes(hash)) {
      return hash;
    }
    const path = window.location.pathname;
    if (VALID_ROUTES.includes(path)) {
      return path;
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);

  const navigate = (to) => {
    setCurrentRoute(to);
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      if (VALID_ROUTES.includes(hash)) {
        setCurrentRoute(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
        {currentRoute === '/' && <HomePage onNavigate={navigate} />}
        {currentRoute === '/student/login' && <StudentLoginPage onNavigate={navigate} />}
        {currentRoute === '/student/dashboard' && <StudentDashboardPage onNavigate={navigate} />}
        {currentRoute === '/volunteer/login' && <VolunteerLoginPage onNavigate={navigate} />}
        {currentRoute === '/volunteer/dashboard' && <VolunteerDashboardPage onNavigate={navigate} />}
        {currentRoute === '/admin/login' && <AdminLoginPage onNavigate={navigate} />}
        {currentRoute === '/admin/dashboard' && <AdminDashboardPage onNavigate={navigate} />}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
