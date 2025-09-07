import React from 'react';
import logo from '@assets/img/logo.svg';
import background from '@assets/img/mountain-bg-11.svg';
import largeNekoOnTree from '@assets/img/cat-on-bigger-tree.png';
import { Card } from '../../components/ui/card';

export default function Popup() {
  async function handleSendClick() {
    try {
      const convexUrl = (globalThis as any).VITE_CONVEX_SITE_URL || (import.meta as any).env?.VITE_CONVEX_SITE_URL || (globalThis as any).CONVEX_SITE_URL || (import.meta as any).env?.CONVEX_SITE_URL;
      const webAppUrl = (globalThis as any).VITE_WEB_APP_URL || (import.meta as any).env?.VITE_WEB_APP_URL || (globalThis as any).WEB_APP_URL || (import.meta as any).env?.WEB_APP_URL;
      if (!convexUrl) {
        console.warn("VITE_CONVEX_SITE_URL/CONVEX_SITE_URL is not set");
        return;
      }
      let authHeader: Record<string, string> = {};
      if (webAppUrl) {
        try {
          const tokenRes = await fetch(`${webAppUrl}/api/convex/token`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
          });
          if (tokenRes.ok) {
            const { token } = await tokenRes.json();
            if (token) authHeader = { Authorization: `Bearer ${token}` };
          } else {
            console.warn('Token fetch failed', tokenRes.status);
          }
        } catch (e) {
          console.warn('Token fetch error', e);
        }
      }
      const res = await fetch(`${convexUrl}/extension/log-click`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ source: 'browser-extension', ts: Date.now() })
      });
      const json = await res.json().catch(() => ({}));
      console.log('Sent click to server', res.status, json);
    } catch (err) {
      console.error('Failed sending click', err);
    }
  }
  return (
    <div className='p-12 pt-16 relative'>
      <img src={background} className="h-full w-full absolute inset-0 pointer-events-none object-cover" alt="Stupid Neko" />
      <Card className='w-[300px] relative z-10 '>
        <header className="flex flex-col items-center justify-center">
          <img src={largeNekoOnTree} className="absolute -right-40 top-0 translate-y-[-50%] h-44" alt="Stupid Neko" />
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Stupid Neko</h1>
          <p className="mt-1 text-sm text-gray-600 text-center">
            Japanese learning companion in your browser.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 w-full">
            <a
              className="inline-flex items-center justify-center rounded-md border border-neutral-800 px-3 py-1 text-sm hover:bg-neutral-100"
              href="https://stupidneko.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open App
            </a>
            <button
              className="inline-flex items-center justify-center rounded-md border border-neutral-800 px-3 py-1 text-sm hover:bg-neutral-100"
              onClick={handleSendClick}
              type="button"
            >
              Send
            </button>
          </div>
        </header>
      </Card>
    </div>
  );
}
