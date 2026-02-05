import { Navigate, Route, Routes } from "react-router-dom"
import { DocsPage } from "./pages/DocsPage"
import { HomePage } from "./pages/HomePage"

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/docs" element={<Navigate to="/docs/latest" replace />} />
      <Route path="/docs/:version/*" element={<DocsPage />} />
      <Route path="/docs/:version" element={<DocsPage />} />
    </Routes>
  )
}
