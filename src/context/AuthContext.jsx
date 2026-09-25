import React, { createContext, useContext, useState, useEffect } from 'react';
import { findStudentByCredentials, findStudentByPassCode, findStudentByRegCode, findVolunteerByCredentials, subscribeToDB } from '../services/db';

const AuthContext = createContext(null);

const AUTH_KEYS = {
  STUDENT: 'euphoria_auth_student',
  ADMIN: 'euphoria_auth_admin',
  VOLUNTEER: 'euphoria_auth_volunteer'
};

// Default Admin Credentials (can be updated or configured)
const ADMIN_CONFIG = {
  username: 'admin',
  password: 'euphoria2026',
  displayName: 'Portal Administrator'
};

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEYS.STUDENT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEYS.ADMIN);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [volunteer, setVolunteer] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEYS.VOLUNTEER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync current student data if attendance updates in the background
  useEffect(() => {
    const unsubscribe = subscribeToDB(() => {
      if (student && student.registrationCode) {
        const fresh = findStudentByRegCode(student.registrationCode);
        if (fresh && JSON.stringify(fresh) !== JSON.stringify(student)) {
          setStudent(fresh);
          localStorage.setItem(AUTH_KEYS.STUDENT, JSON.stringify(fresh));
        }
      }
    });
    return unsubscribe;
  }, [student]);

  // Student Login with Registration Code & Mobile Number (Password)
  const loginStudent = (registrationCode, mobileNumber) => {
    if (!registrationCode || !registrationCode.trim()) {
      return { success: false, error: 'Please enter your Registration Code.' };
    }
    if (!mobileNumber || !mobileNumber.trim()) {
      return { success: false, error: 'Please enter your Mobile Number (Password).' };
    }

    const matchedStudent = findStudentByCredentials(registrationCode.trim(), mobileNumber.trim())
      || findStudentByPassCode(mobileNumber.trim());

    if (!matchedStudent) {
      return {
        success: false,
        error: 'Invalid Registration Code or Mobile Number. Please check your credentials and try again.'
      };
    }

    setStudent(matchedStudent);
    localStorage.setItem(AUTH_KEYS.STUDENT, JSON.stringify(matchedStudent));
    return { success: true, student: matchedStudent };
  };

  // Student Logout
  const logoutStudent = () => {
    setStudent(null);
    localStorage.removeItem(AUTH_KEYS.STUDENT);
  };

  // Volunteer Login with Username & Pass Code
  const loginVolunteer = (username, passCode) => {
    if (!username || !username.trim() || !passCode || !passCode.trim()) {
      return { success: false, error: 'Please enter both Username and Pass Code.' };
    }

    const matchedVolunteer = findVolunteerByCredentials(username.trim(), passCode.trim());
    if (!matchedVolunteer) {
      return {
        success: false,
        error: 'Invalid Volunteer credentials. Please check your Username and Pass Code.'
      };
    }

    const volunteerSession = {
      id: matchedVolunteer.id,
      name: matchedVolunteer.name,
      username: matchedVolunteer.username,
      loggedInAt: new Date().toISOString()
    };

    setVolunteer(volunteerSession);
    localStorage.setItem(AUTH_KEYS.VOLUNTEER, JSON.stringify(volunteerSession));
    return { success: true, volunteer: volunteerSession };
  };

  // Volunteer Logout
  const logoutVolunteer = () => {
    setVolunteer(null);
    localStorage.removeItem(AUTH_KEYS.VOLUNTEER);
  };

  // Admin Login with Username / Password
  const loginAdmin = (username, password) => {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    if (cleanUser === ADMIN_CONFIG.username && cleanPass === ADMIN_CONFIG.password) {
      const adminSession = {
        username: ADMIN_CONFIG.username,
        displayName: ADMIN_CONFIG.displayName,
        loggedInAt: new Date().toISOString()
      };
      setAdmin(adminSession);
      localStorage.setItem(AUTH_KEYS.ADMIN, JSON.stringify(adminSession));
      return { success: true, admin: adminSession };
    }

    return {
      success: false,
      error: 'Invalid Admin Username or Password. Please try again.'
    };
  };

  // Admin Logout
  const logoutAdmin = () => {
    setAdmin(null);
    localStorage.removeItem(AUTH_KEYS.ADMIN);
  };

  return (
    <AuthContext.Provider
      value={{
        student,
        admin,
        volunteer,
        loginStudent,
        logoutStudent,
        loginVolunteer,
        logoutVolunteer,
        loginAdmin,
        logoutAdmin,
        isStudentAuthenticated: !!student,
        isAdminAuthenticated: !!admin,
        isVolunteerAuthenticated: !!volunteer
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
