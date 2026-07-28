// App.tsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import SalaView from "./views/SalaView";
import CocinaView from "./views/CocinaView";
import AdminView from "./views/AdminView";
import AdminGuard from "./components/AdminGuard";
import ReportsView from "./views/ReportsView";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-16 sm:pb-0">

        {/* Navegación */}
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Restaurante App</p>
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <NavLink
                to="/sala"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                Sala
              </NavLink>
              <NavLink
                to="/cocina"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                Cocina
              </NavLink>
            </div>

            <NavLink
              to="/reportes"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`
              }
            >
              Reportes
            </NavLink>

            {/* Acceso a admin separado del nav principal */}
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isActive
                    ? "border-gray-800 text-gray-900 bg-gray-100"
                    : "border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                }`
              }
            >
              Admin
            </NavLink>
          </div>
        </nav>

        {/* Rutas */}
        <Routes>
          <Route path="/sala"   element={<SalaView />} />
          <Route path="/cocina" element={<CocinaView />} />
          <Route
            path="/reportes"
            element={
              <AdminGuard>
                <ReportsView />
              </AdminGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminView />
              </AdminGuard>
            }
          />
          <Route path="*" element={<Navigate to="/sala" replace />} />
        </Routes>
        
        {/* Bottom nav — solo móvil */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-50">
          {(
            [
              {
                to: "/sala",
                label: "Sala",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                ),
              },
              {
                to: "/cocina",
                label: "Cocina",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                  </svg>
                ),
              },
              {
                to: "/reportes",
                label: "Reportes",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                ),
              },
              {
                to: "/admin",
                label: "Admin",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                ),
              },
            ] as { to: string; label: string; icon: React.ReactNode }[]
          ).map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

      </div>
    </BrowserRouter>
  );
}