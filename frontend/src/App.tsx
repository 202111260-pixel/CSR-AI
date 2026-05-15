import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/common/Toast'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import AppShell from './components/layout/AppShell'
import { useAuthStore } from './stores/authStore'
import api from './services/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Lazy-loaded page components for code splitting
const LandingPage = React.lazy(() => import('./pages/LandingPage'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const ProjectsList = React.lazy(() => import('./pages/ProjectsList'))
const ProjectDetails = React.lazy(() => import('./pages/ProjectDetails'))
const AddProject = React.lazy(() => import('./pages/AddProject'))
const EditProject = React.lazy(() => import('./pages/EditProject'))
const ArchivedProjects = React.lazy(() => import('./pages/ArchivedProjects'))
const GeneralReports = React.lazy(() => import('./pages/reports/GeneralReports'))
const ImpactReports = React.lazy(() => import('./pages/reports/ImpactReports'))
const FinancialReports = React.lazy(() => import('./pages/reports/FinancialReports'))
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'))
const CategoryManagement = React.lazy(() => import('./pages/admin/CategoryManagement'))
const PartnersAndDonations = React.lazy(() => import('./pages/PartnersAndDonations'))
const IdeasBox = React.lazy(() => import('./pages/IdeasBox'))
const SocialMediaAnalytics = React.lazy(() => import('./pages/SocialMediaAnalytics'))
const FuturePortal = React.lazy(() => import('./pages/FuturePortal'))
const EarlyWarning = React.lazy(() => import('./pages/EarlyWarning'))
const MapView = React.lazy(() => import('./pages/MapView'))
const Settings = React.lazy(() => import('./pages/Settings'))
const NotFound = React.lazy(() => import('./pages/NotFound'))

// Auth pages
const Login = React.lazy(() => import('./pages/auth/Login'))
const Register = React.lazy(() => import('./pages/auth/Register'))
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'))
const OAuthCallback = React.lazy(() => import('./pages/auth/OAuthCallback'))

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary caught:', error, info.componentStack) }
  render() {
    const basePath = import.meta.env.BASE_URL || '/'

    if (this.state.error) {
      return (
        <div style={{background:'#080805',color:'#F0EFE2',padding:40,fontFamily:'Inter, sans-serif',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:16,padding:'12px 16px',marginBottom:24,display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:'#f87171',fontSize:18}}>⚠</span>
            <span style={{color:'#f87171',fontWeight:600,fontSize:14}}>Runtime Error</span>
          </div>
          <pre style={{color:'#A8A48A',fontSize:13,whiteSpace:'pre-wrap',maxWidth:600,textAlign:'center'}}>{this.state.error.message}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.href = `${basePath}dashboard`; }} style={{marginTop:24,background:'#C9C036',color:'#080805',border:'none',borderRadius:12,padding:'10px 24px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            Return to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// On app start, verify auth cookie is still valid
function AuthInitializer() {
  const { setUser, setAccessToken, logout } = useAuthStore()

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const u = res.data?.data
        if (u?.id) {
          setAccessToken('cookie')
          setUser({ id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, role: u.role, department: u.department })
        }
      })
      .catch(() => {
        logout()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// Protects routes that require authentication
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Redirects authenticated users away from auth pages
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Smart root redirect: dashboard if logged in, landing if not
function RootRedirect() {
  const user = useAuthStore(s => s.user)
  return <Navigate to={user ? '/dashboard' : '/landing'} replace />
}

function AppContent() {
  return (
    <>
      <AuthInitializer />
      <Suspense fallback={
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080805'
        }}>
          <LoadingSpinner size="lg" />
        </div>
      }>
        <Routes>
          {/* Public informational page */}
          <Route path="/landing" element={<LandingPage />} />

          {/* Auth pages — redirect to dashboard if already logged in */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Protected app shell — requires authentication */}
          <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Projects */}
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/add" element={<AddProject />} />
            <Route path="/projects/archived" element={<ArchivedProjects />} />
            <Route path="/projects/edit/:id" element={<EditProject />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />

            {/* Reports */}
            <Route path="/reports/general" element={<GeneralReports />} />
            <Route path="/reports/impact" element={<ImpactReports />} />
            <Route path="/reports/financial" element={<FinancialReports />} />

            {/* Admin */}
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/categories" element={<CategoryManagement />} />

            {/* Management */}
            <Route path="/partners" element={<PartnersAndDonations />} />

            {/* Intelligence */}
            <Route path="/ideas" element={<IdeasBox />} />
            <Route path="/social-media" element={<SocialMediaAnalytics />} />
            <Route path="/future" element={<FuturePortal />} />
            <Route path="/early-warning" element={<EarlyWarning />} />

            {/* Tools */}
            <Route path="/map" element={<MapView />} />
            <Route path="/settings" element={<Settings />} />

            {/* Fallback redirects */}
            <Route path="/reports" element={<Navigate to="/reports/general" replace />} />

            {/* 404 inside shell */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Redirect root: dashboard if authenticated, landing if not */}
          <Route path="/" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </>
  )
}

function App() {
  const basePath = import.meta.env.BASE_URL

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <ToastProvider>
    <BrowserRouter basename={basePath}>
      <AppContent />
    </BrowserRouter>
    </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
