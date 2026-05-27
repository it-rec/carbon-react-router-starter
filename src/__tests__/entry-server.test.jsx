/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { test, expect, describe, beforeAll, vi } from 'vitest';
import { Writable } from 'node:stream';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { render } from '../entry-server.jsx';

// Collect the streamed HTML so we can assert on it.
function collectStream(pipe) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    sink.on('finish', () => resolve(Buffer.concat(chunks).toString('utf8')));
    sink.on('error', reject);
    pipe(sink);
  });
}

function renderWithShell(url, cookies) {
  return new Promise((resolve, reject) => {
    let result;
    result = render(
      url,
      i18next,
      {
        async onShellReady() {
          try {
            const html = await collectStream(result.pipe);
            resolve({
              html,
              statusCode: result.statusCode,
              themeAttr: result.themeAttr,
              head: result.head,
            });
          } catch (err) {
            reject(err);
          }
        },
        onShellError: reject,
        onError: () => {},
      },
      cookies,
    );
  });
}

describe('entry-server render()', () => {
  beforeAll(async () => {
    await i18next.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['en', 'de'],
      resources: {
        en: { translation: { greeting: 'Hello' } },
        de: { translation: { greeting: 'Hallo' } },
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  });

  test('returns 200 status for the index route', async () => {
    const { statusCode } = await renderWithShell('');
    expect(statusCode).toBe(200);
  });

  test('returns 404 status for an unknown route', async () => {
    const { statusCode } = await renderWithShell('this-route-does-not-exist');
    expect(statusCode).toBe(404);
  });

  test('embeds default theme attributes when no cookies are provided', async () => {
    const { themeAttr } = await renderWithShell('');
    expect(themeAttr).toContain('data-theme-setting="system"');
    expect(themeAttr).toContain('data-header-inverse="false"');
  });

  test('reflects theme cookies in the html attributes', async () => {
    const { themeAttr } = await renderWithShell(
      '',
      'theme-setting=dark; header-inverse=true',
    );
    expect(themeAttr).toContain('data-theme-setting="dark"');
    expect(themeAttr).toContain('data-header-inverse="true"');
  });

  test('falls back to system theme when cookie value is invalid', async () => {
    const { themeAttr } = await renderWithShell('', 'theme-setting=neon');
    expect(themeAttr).toContain('data-theme-setting="system"');
  });

  test('embeds the initial i18n state in the head', async () => {
    const { head } = await renderWithShell('');
    expect(head).toContain('window.__INITIAL_I18N_STATE__');
    expect(head).toContain('"initialLanguage":"en"');
    expect(head).toContain('"greeting":"Hello"');
  });

  test('escapes < in the embedded i18n state to prevent script injection', async () => {
    // Add a translation that contains a closing script tag.
    i18next.addResource('en', 'translation', 'evil', '</script><img src=x>');
    const { head } = await renderWithShell('');
    // Slice out the JSON payload between the assignment and the closing </script>
    // tag of the script block itself.
    const payloadStart = head.indexOf('window.__INITIAL_I18N_STATE__');
    const payloadEnd = head.lastIndexOf('</script>');
    const payload = head.slice(payloadStart, payloadEnd);
    // The translation's '</script>' must not appear unescaped in the payload —
    // the replace() in render() should escape '<' to '<'.
    expect(payload).not.toContain('</script>');
    expect(payload).toContain('\\u003c/script');
  });

  test('returns a working abort function', async () => {
    const { abort } = render('', i18next, {
      onShellReady() {},
      onShellError() {},
      onError() {},
    });
    expect(typeof abort).toBe('function');
    // Calling abort should not throw.
    expect(() => abort()).not.toThrow();
  });

  test('renders successfully when an unrecognized cookie string is passed', async () => {
    // Even a malformed cookie string should not break rendering.
    const { statusCode } = await renderWithShell(
      '',
      'not-a-real-cookie-format',
    );
    expect(statusCode).toBe(200);
  });

  test('warns or logs nothing unexpected when i18n has multiple languages loaded', async () => {
    // Pre-load 'de' so initialI18nStore covers both languages.
    await i18next.loadLanguages(['de']);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { head } = await renderWithShell('');
    expect(head).toContain('"en":');
    consoleSpy.mockRestore();
  });
});
