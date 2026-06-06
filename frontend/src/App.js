import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { DashboardLayout } from "@/layout/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Discovery from "@/pages/Discovery";
import ImportList from "@/pages/ImportList";
import ProductStudio from "@/pages/ProductStudio";
import AISettings from "@/pages/AISettings";
import Logs from "@/pages/Logs";
import CloudSettings from "@/pages/CloudSettings";
import Releases from "@/pages/Releases";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/imports" element={<ImportList />} />
          <Route path="/studio/:draftId" element={<ProductStudio />} />
          <Route path="/ai" element={<AISettings />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/cloud" element={<CloudSettings />} />
          <Route path="/releases" element={<Releases />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
