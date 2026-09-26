import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./auth/LoginPage";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { MonitorsPage } from "./pages/MonitorsPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { MetricsPage } from "./pages/MetricsPage";
import { InsightsPage } from "./pages/InsightsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="monitors" element={<MonitorsPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="insights" element={<InsightsPage />} />
        </Route>
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}