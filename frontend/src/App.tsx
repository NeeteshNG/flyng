import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthGuard } from '@/components/layout/auth-guard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

// Auth pages
import LoginPage from '@/pages/auth/login'
import RegisterPage from '@/pages/auth/register'
import ForgotPasswordPage from '@/pages/auth/forgot-password'

// Dashboard pages
import DashboardHome from '@/pages/dashboard/home'
import UsersPage from '@/pages/dashboard/users'
import ProfilePage from '@/pages/dashboard/profile'
import SettingsPage from '@/pages/dashboard/settings'
import WarehousesPage from '@/pages/dashboard/warehouses'
import ZonesPage from '@/pages/dashboard/zones'
import GCSPage from '@/pages/dashboard/gcs'
import WorkAreasPage from '@/pages/dashboard/work-areas'
import LocationsPage from '@/pages/dashboard/locations'
import BinsPage from '@/pages/dashboard/bins'
import LabelTypesPage from '@/pages/dashboard/label-types'
import BinTemplatesPage from '@/pages/dashboard/bin-templates'
import CategoriesPage from '@/pages/dashboard/categories'
import ItemsPage from '@/pages/dashboard/items'
import InventoryPage from '@/pages/dashboard/inventory'
import OrdersPage from '@/pages/dashboard/orders'
import CreateOrderPage from '@/pages/dashboard/orders/create'
import DronesPage from '@/pages/dashboard/drones'
import TelemetryPage from '@/pages/dashboard/telemetry'
import MaintenancePage from '@/pages/dashboard/maintenance'
import BatteriesPage from '@/pages/dashboard/batteries'
import JobsPage from '@/pages/dashboard/jobs'
import LogFilesPage from '@/pages/dashboard/log-files'
import GraphTemplatesPage from '@/pages/dashboard/graph-templates'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* Auth routes (public) */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

          {/* Dashboard routes (protected) */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="zones" element={<ZonesPage />} />
            <Route path="ground-stations" element={<GCSPage />} />
            <Route path="work-areas" element={<WorkAreasPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="bins" element={<BinsPage />} />
            <Route path="label-types" element={<LabelTypesPage />} />
            <Route path="bin-templates" element={<BinTemplatesPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/create" element={<CreateOrderPage />} />
            <Route path="drones" element={<DronesPage />} />
            <Route path="telemetry" element={<TelemetryPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="batteries" element={<BatteriesPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="log-files" element={<LogFilesPage />} />
            <Route path="graph-templates" element={<GraphTemplatesPage />} />
            {/* Add more dashboard routes here */}
            <Route path="*" element={<ComingSoon />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

// Placeholder for coming soon pages
function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
      <p className="text-muted-foreground">This feature is under development.</p>
    </div>
  )
}

export default App
