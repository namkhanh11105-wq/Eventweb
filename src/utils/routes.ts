import type { PublicPage } from '../types';

export type AppRoute =
  | { view: 'public'; page: 'discover' | 'services' | 'contact' | 'tickets'; tab?: 'registered' | 'requests' }
  | { view: 'public'; page: 'event_detail'; eventId: string }
  | { view: 'admin' }
  | { view: 'auth'; mode: 'login' | 'register' };

export function parseRouteFromLocation(pathname: string, search = ''): AppRoute {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search);

  if (cleanPath === '/dich-vu') {
    return { view: 'public', page: 'services' };
  }
  if (cleanPath === '/lien-he') {
    return { view: 'public', page: 'contact' };
  }
  if (cleanPath === '/su-kien-cua-toi' || cleanPath === '/da-dang-ky') {
    const tab = params.get('tab') === 'requests' ? 'requests' : 'registered';
    return { view: 'public', page: 'tickets', tab };
  }
  if (cleanPath === '/to-chuc') {
    return { view: 'public', page: 'tickets', tab: 'requests' };
  }
  if (cleanPath.startsWith('/su-kien/')) {
    const eventId = decodeURIComponent(cleanPath.slice('/su-kien/'.length)).trim();
    if (eventId) {
      return { view: 'public', page: 'event_detail', eventId };
    }
  }
  if (cleanPath === '/quan-tri') {
    return { view: 'admin' };
  }
  if (cleanPath === '/dang-nhap') {
    return { view: 'auth', mode: 'login' };
  }
  if (cleanPath === '/dang-ky') {
    return { view: 'auth', mode: 'register' };
  }

  return { view: 'public', page: 'discover' };
}

export function getPathForPublicPage(
  page: PublicPage,
  eventId?: string,
  ticketsTab?: 'registered' | 'requests'
): string {
  switch (page) {
    case 'services':
      return '/dich-vu';
    case 'contact':
      return '/lien-he';
    case 'tickets':
      return ticketsTab === 'requests' ? '/su-kien-cua-toi?tab=requests' : '/su-kien-cua-toi';
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
