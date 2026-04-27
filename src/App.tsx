import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { DemoBanner } from '@/components/DemoBanner'
import { isDemoMode } from '@/lib/supabase'
import { AuthProvider } from '@/lib/auth'
import { AuthPage } from '@/pages/AuthPage'
import { AgencyOnboarding } from '@/pages/AgencyOnboarding'
import { Dashboard } from '@/pages/Dashboard'
import { Portefeuille } from '@/pages/Portefeuille'
import { Proprietaires } from '@/pages/Proprietaires'
import { Locataires } from '@/pages/Locataires'
import { Paiements } from '@/pages/Paiements'
import { Frais } from '@/pages/Frais'
import { ImportBancaire } from '@/pages/ImportBancaire'
import { Reconciliation } from '@/pages/Reconciliation'
import { Decomptes } from '@/pages/Decomptes'
import { Parametres } from '@/pages/Parametres'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function Toaster() {
  const { toasts } = useToast()
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {action}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {isDemoMode && <DemoBanner />}
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<AgencyOnboarding />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="portefeuille" element={<Portefeuille />} />
              <Route path="proprietaires" element={<Proprietaires />} />
              <Route path="locataires" element={<Locataires />} />
              <Route path="paiements" element={<Paiements />} />
              <Route path="frais" element={<Frais />} />
              <Route path="import-bancaire" element={<ImportBancaire />} />
              <Route path="reconciliation" element={<Reconciliation />} />
              <Route path="decomptes" element={<Decomptes />} />
              <Route path="parametres" element={<Parametres />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
