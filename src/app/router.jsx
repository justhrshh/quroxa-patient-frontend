import React from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { PortalBrandingProvider } from '../context/PortalBrandingContext';
import { ProtectedRoute, GlobalProtectedRoute } from '../context/AuthContext';
import PatientLayout from '../components/layout/PatientLayout';

// Global Auth & Portal Pages (Phase H MVP)
import GlobalLoginPage from '../pages/auth/GlobalLoginPage';
import ProfileSelectPage from '../pages/auth/ProfileSelectPage';
import GlobalPortalPage from '../pages/portal/GlobalPortalPage';

// Hospital Feature Pages
import RegistrationPage from '../pages/auth/RegistrationPage';
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

/**
 * Backward compatibility redirect:
 * /:hospitalSlug/login -> /login?redirectHospital=:hospitalSlug
 */
const HospitalLoginRedirect = () => {
  const { hospitalSlug } = useParams();
  const safeSlug = (hospitalSlug || '').replace(/[^a-z0-9_-]/gi, '');
  return <Navigate to={`/login?redirectHospital=${encodeURIComponent(safeSlug)}`} replace />;
};

export const router = createBrowserRouter([
  // Central Global QUROXA Patient Entry Routes (Phase H)
  {
    path: '/',
    element: <PatientLayout />,
    children: [
      {
        index: true,
        element: <GlobalLoginPage />
      },
      {
        path: 'login',
        element: <GlobalLoginPage />
      },
      {
        path: 'select-profile',
        element: <ProfileSelectPage />
      }
    ]
  },

  // Authenticated Central Global Patient Portal
  {
    path: '/portal',
    element: (
      <GlobalProtectedRoute>
        <GlobalPortalPage />
      </GlobalProtectedRoute>
    )
  },

  // Hospital-scoped clinical portal routes (Preserved Stage D Architecture)
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
        element: <HospitalLoginRedirect />
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
