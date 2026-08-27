import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import type { ReactNode } from 'react';

export function Layout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const links = [
    { to: '/products', label: 'Products' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/categories', label: 'Categories' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Peoples Market &amp; Liquor</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">
                  {user.name} <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{user.role}</span>
                </span>
                <button
                  onClick={logout}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="text-sm font-medium text-sky-600 hover:underline">Sign in</Link>
                <Link to="/register" className="text-sm font-medium text-sky-600 hover:underline">Register</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {user && (
          <nav className="w-48 shrink-0">
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      `block rounded px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
