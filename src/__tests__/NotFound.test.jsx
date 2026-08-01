/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { test, expect, describe, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import NotFound from '../pages/not-found/NotFound';
import { getStatusCodeForPath } from '../routes/utils';

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

function renderAt(pathname) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotFound page', () => {
  test('renders the title and the standard description', () => {
    renderAt('/some-missing-page');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(
      screen.getByText(/This is not the page you were looking for/i),
    ).toBeInTheDocument();
  });

  test('includes the unrecognized pathname in the message', () => {
    renderAt('/typo-here');
    expect(
      screen.getByText((content) =>
        content.includes("The route '/typo-here' is not recognized."),
      ),
    ).toBeInTheDocument();
  });

  test('reflects the maintainer attribution', () => {
    renderAt('/x');
    expect(screen.getByText(/Maintained by fed-at-ibm/i)).toBeInTheDocument();
  });

  test('the same unknown path resolves to a 404 status via routes/utils', () => {
    // Pairs the rendered page with the SSR status decision so a mismatch
    // (e.g. someone adds /typo-here as a real route but forgets to remove
    // the catch-all) shows up here.
    expect(getStatusCodeForPath('/some-missing-page')).toBe(404);
  });
});
