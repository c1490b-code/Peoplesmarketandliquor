import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/pos', label: 'POS' },
  { to: '/products', label: 'Products' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/customers', label: 'Customers' },
  { to: '/categories', label: 'Categories' },
];

export function Layout({ children }: { children?: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const [navOpen, setNavOpen] = useState(false);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `block rounded px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 sm:hidden"
              onClick={() => setNavOpen((o) => !o)}
              aria-label="Toggle navigation"
              aria-expanded={navOpen}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M2.5 5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H3.25A.75.75 0 0 1 2.5 5Zm0 5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H3.25A.75.75 0 0 1 2.5 10Zm.75 4.25a.75.75 0 0 0 0 1.5h13.5a.75.75 0 0 0 0-1.5H3.25Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
              Peoples Market <span className="text-sky-600 dark:text-sky-400">&amp; Liquor</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">
              POS &amp; Inventory
            </span>
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:gap-6 sm:px-6 sm:py-6">
        <nav
          className={`${navOpen ? 'block' : 'hidden'} shrink-0 sm:block sm:w-48`}
          aria-label="Primary"
        >
          <ul className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none dark:border-gray-800 dark:bg-gray-900 dark:sm:bg-transparent">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className={linkClasses} onClick={() => setNavOpen(false)}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2Zm0 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 17 12Zm-3.22 4.97a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 1 1 1.06-1.06l1.06 1.06a.75.75 0 0 1 0 1.06ZM10 17.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-5.78-1.28a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM3 12a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 12Zm1.22-4.97a.75.75 0 0 1 0 1.06l-1.06 1.06A.75.75 0 1 1 2.1 8.03l1.06-1.06a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.455 2.004a.75.75 0 0 1 .92.745 6.5 6.5 0 0 0 8.876 6.482.75.75 0 0 1 1.045.84A8 8 0 1 1 6.71 1.084a.75.75 0 0 1 .745.92Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
