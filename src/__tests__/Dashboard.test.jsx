/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { test, expect, describe, beforeAll } from 'vitest';
import { screen, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import Dashboard from '../pages/dashboard/Dashboard';
import DashboardURLParameters from '../pages/dashboard/DashboardURLParameters';
import DashboardNumberTiles from '../pages/dashboard/DashboardNumberTiles';
import DashboardVisualizations from '../pages/dashboard/DashboardVisualizations';

// Initialize i18next once with interpolation so {{name}} in the
// `dashboard.urlParameters.greeting` defaultValue gets substituted.
beforeAll(async () => {
  if (!i18next.isInitialized) {
    await i18next.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en: { translation: {} } },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  }
});

// Helper that renders any component as the dashboard's child route so the
// `useParams` / `useSearchParams` hooks resolve as they would in production.
function renderAtRoute(ui, route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/dashboard" element={ui} />
        <Route path="/dashboard/:id" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardURLParameters', () => {
  test('shows neither path nor query values when none are present', () => {
    renderAtRoute(<DashboardURLParameters />, '/dashboard');
    expect(screen.getByText(/URL parameters example/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Path parameter detected/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Query parameter detected \(q\)/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Query parameter detected \(name\)/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  test('shows the path parameter when `:id` is present', () => {
    renderAtRoute(<DashboardURLParameters />, '/dashboard/1234');
    expect(screen.getByText(/Path parameter detected/i)).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  test('shows the q query parameter', () => {
    renderAtRoute(<DashboardURLParameters />, '/dashboard?q=xyz');
    expect(
      screen.getByText(/Query parameter detected \(q\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('xyz')).toBeInTheDocument();
  });

  test('renders the personalized greeting when `name` is present', () => {
    renderAtRoute(<DashboardURLParameters />, '/dashboard?name=Anne');
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toMatch(/Anne/);
    expect(
      screen.getByText(/Query parameter detected \(name\)/i),
    ).toBeInTheDocument();
    // 'Anne' should appear both in the heading and in the <dd>.
    expect(screen.getAllByText(/Anne/).length).toBeGreaterThanOrEqual(2);
  });

  test('renders all three pieces of detail when path + q + name are all present', () => {
    renderAtRoute(
      <DashboardURLParameters />,
      '/dashboard/1234?q=xyz&name=Anne',
    );
    expect(screen.getByText(/Path parameter detected/i)).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(
      screen.getByText(/Query parameter detected \(q\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('xyz')).toBeInTheDocument();
    expect(
      screen.getByText(/Query parameter detected \(name\)/i),
    ).toBeInTheDocument();
  });
});

describe('DashboardNumberTiles', () => {
  test('renders four number tiles with active-user values', () => {
    render(
      <MemoryRouter>
        <DashboardNumberTiles />
      </MemoryRouter>,
    );

    const labels = screen.getAllByText(/Active users/i);
    expect(labels).toHaveLength(4);

    // Each tile renders <dt>Active users</dt><dd>{number}</dd>. Verify each
    // <dd> sibling is a numeric string in the expected range.
    labels.forEach((dt) => {
      const dd = dt.nextElementSibling;
      expect(dd).not.toBeNull();
      const value = Number(dd.textContent);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1000);
    });
  });
});

describe('DashboardVisualizations', () => {
  test('renders the two visualization tiles by title', () => {
    render(
      <MemoryRouter>
        <DashboardVisualizations />
      </MemoryRouter>,
    );
    expect(screen.getByText('Visualization')).toBeInTheDocument();
    expect(screen.getByText('Cool table')).toBeInTheDocument();
  });
});

describe('Dashboard (composition)', () => {
  test('renders the page header and all three sub-sections', () => {
    renderAtRoute(<Dashboard />, '/dashboard/42?name=Anne');

    // Page header — the title key resolves to its defaultValue 'Dashboard'.
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);

    // URL params section is wired up.
    expect(screen.getByText('42')).toBeInTheDocument();

    // Number tiles rendered (4).
    expect(screen.getAllByText(/Active users/i)).toHaveLength(4);

    // Visualization tiles rendered.
    expect(screen.getByText('Visualization')).toBeInTheDocument();
    expect(screen.getByText('Cool table')).toBeInTheDocument();
  });
});
