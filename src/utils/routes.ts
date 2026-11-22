import type { PublicPage } from '../types';

export type AppRoute =
  | { view: 'public'; page: 'discover' | 'services' | 'contact' | 'tickets' }
  | { view: 'public'; page: 'event_detail'; eventId: string }
  | { view: 'organizer' }
  | { view: 'admin' }
  | { view: 'auth'; mode: 'login' | 'register'; role: 'user' | 'organizer' };

export function parseRouteFromLocation(pathname: string, search = ''): AppRoute {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/dich-vu') {
    return { view: 'public', page: 'services' };
  }
  if (cleanPath === '/lien-he') {
    return { view: 'public', page: 'contact' };
  }
  if (cleanPath === '/da-dang-ky') {
    return { view: 'public', page: 'tickets' };
  }
  if (cleanPath.startsWith('/su-kien/')) {
    const eventId = decodeURIComponent(cleanPath.slice('/su-kien/'.length)).trim();
    if (eventId) {
      return { view: 'public', page: 'event_detail', eventId };
    }
  }
  if (cleanPath === '/to-chuc') {
    return { view: 'organizer' };
  }
  if (cleanPath === '/quan-tri') {
    return { view: 'admin' };
  }
  if (cleanPath === '/dang-nhap') {
    return { view: 'auth', mode: 'login', role: 'user' };
  }
  if (cleanPath === '/dang-ky') {
    const params = new URLSearchParams(search);
    const role = params.get('role') === 'organizer' ? 'organizer' : 'user';
    return { view: 'auth', mode: 'register', role };
  }

  return { view: 'public', page: 'discover' };
}

export function getPathForPublicPage(page: PublicPage, eventId?: string): string {
  switch (page) {
    case 'services':
      return '/dich-vu';
    case 'contact':
      return '/lien-he';
    case 'tickets':
      return '/da-dang-ky';
    case 'event_detail':
      return eventId ? `/su-kien/${encodeURIComponent(eventId)}` : '/';
    case 'discover':
    default:
      return '/';
  }
}

export function pushBrowserPath(path: string): void {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname + window.location.search;
  if (current !== path) {
    window.history.pushState(null, '', path);
  }
}
