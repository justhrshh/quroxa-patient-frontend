import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PortalBrandingProvider } from '../context/PortalBrandingContext';
import { ProtectedRoute } from '../context/AuthContext';
import PatientLayout from '../components/layout/PatientLayout';

// Auth Pages
import HospitalSelectPage from '../pages/auth/HospitalSelectPage';
import LoginPage from '../pages/auth/LoginPage';
import RegistrationPage from '../pages/auth/RegistrationPage';

// Feature Pages
import OverviewPage from '../pages/dashboard/OverviewPage';
import AppointmentsPage from '../pages/appointments/AppointmentsPage';
import BookAppointmentPage from '../pages/appointments/BookAppointmentPage';
import PrescriptionsPage from '../pages/prescriptions/PrescriptionsPage';
import LabResultsPage from '../pages/lab-results/LabResultsPage';
import MedicalRecordsPage from '../pages/medical-records/MedicalRecordsPage';
import BillingPage from '../pages/billing/BillingPage';
import ProfilePage from '../pages/profile/ProfilePage';
import PrivacyConsentPage from '../pages/privacy/PrivacyConsentPage';
import NotFoundPage from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  // Root route: Hospital selection directory entry
  {
    path: '/',
    element: <PatientLayout />,
    children: [
      {
        index: true,
        element: <HospitalSelectPage />
      }
    ]
  },

  // Hospital-scoped portal routes
  {
    path: '/:hospitalSlug',
    element: (
      <PortalBrandingProvider>
        <PatientLayout />
      </PortalBrandingProvider>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <OverviewPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'register',
        element: <RegistrationPage />
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <OverviewPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'appointments',
        element: (
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'appointments/book',
        element: (
          <ProtectedRoute>
            <BookAppointmentPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'prescriptions',
        element: (
          <ProtectedRoute>
            <PrescriptionsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'lab-results',
        element: (
          <ProtectedRoute>
            <LabResultsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'medical-records',
        element: (
          <ProtectedRoute>
            <MedicalRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'billing',
        element: (
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'privacy',
        element: (
          <ProtectedRoute>
            <PrivacyConsentPage />
          </ProtectedRoute>
        )
      }
    ]
  },

  // Fallback 404 handler
  {
    path: '*',
    element: <PatientLayout />,
    children: [
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);

export default router;
