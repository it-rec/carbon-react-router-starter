/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { test, expect, describe, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Nav } from '../components/nav/Nav';

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

function renderNav(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Nav />
    </MemoryRouter>,
  );
}

describe('Nav header interactions', () => {
  test('the menu toggle button reflects collapsed/expanded state', async () => {
    const user = userEvent.setup();
    renderNav();

    const menuButton = screen.getByRole('button', { name: /open menu/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);

    const closeButton = await screen.findByRole('button', {
      name: /close menu/i,
    });
    expect(closeButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(closeButton);
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('the profile action toggles the profile panel', async () => {
    const user = userEvent.setup();
    renderNav();

    // The profile panel is empty until the action is clicked.
    expect(screen.queryByText(/Anne Profile/i)).not.toBeInTheDocument();

    const profileButton = screen.getByRole('button', {
      name: /user profile/i,
    });
    await user.click(profileButton);

    // ProfilePanel renders Anne's info when open.
    expect(await screen.findByText(/Anne Profile/i)).toBeInTheDocument();

    // Toggling again closes it.
    await user.click(profileButton);
    expect(screen.queryByText(/Anne Profile/i)).not.toBeInTheDocument();
  });

  test('renders the Carbon brand link to home', () => {
    renderNav();
    // The HeaderName renders "Carbon React starter" — the brand link
    // should point at "/".
    const homeLink = screen.getByRole('link', {
      name: /carbon.*react starter/i,
    });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  test('exposes search and app-switcher global actions', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /app switcher/i }),
    ).toBeInTheDocument();
  });

  test('renders a skip-to-content link for accessibility', () => {
    renderNav();
    // SkipToContent is rendered as a button or anchor that targets #main-content.
    const skip = screen.getByText(/skip to main content/i);
    expect(skip).toBeInTheDocument();
  });

  test('renders without crashing on a dynamic route', () => {
    // Regression: location.pathname is used by isPathActive in NavHeaderItems.
    renderNav(['/dashboard/12345']);
    // Brand link should still be present even after a route with params.
    const brand = within(document.body).getByRole('link', {
      name: /carbon.*react starter/i,
    });
    expect(brand).toBeInTheDocument();
  });
});
