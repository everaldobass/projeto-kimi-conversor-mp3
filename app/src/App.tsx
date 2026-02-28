import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Sidebar } from '@/components/Sidebar';
import { StemPlayer } from '@/components/StemPlayer';
import { AudioEngine } from '@/components/AudioEngine';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Converter } from '@/pages/Converter';
import { Playlist } from '@/pages/Playlist';
import { Favorites } from '@/pages/Favorites';
import { History } from '@/pages/History';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className={cn(
        "flex-1 overflow-y-auto bg-background transition-colors duration-300",
        "ml-[280px]"
      )}>
        {children}
      </main>
      <AudioEngine />
      <StemPlayer />
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicLayout>
                <Login />
              </PublicLayout>
            }
          />
          <Route
            path="/register"
            element={
              <PublicLayout>
                <Register />
              </PublicLayout>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/converter"
            element={
              <ProtectedLayout>
                <Converter />
              </ProtectedLayout>
            }
          />
          <Route
            path="/playlist"
            element={
              <ProtectedLayout>
                <Playlist />
              </ProtectedLayout>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedLayout>
                <Favorites />
              </ProtectedLayout>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedLayout>
                <History />
              </ProtectedLayout>
            }
          />

          {/* Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
