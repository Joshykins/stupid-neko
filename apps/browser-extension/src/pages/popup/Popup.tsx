import React from 'react';
import logo from '@assets/img/logo.svg';
import background from '@assets/img/mountain-bg-11.svg';
import largeNekoOnTree from '@assets/img/cat-on-bigger-tree.png';
import { Card } from '../../components/ui/card';

export default function Popup() {

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
          </div>
        </header>
      </Card>
    </div>
  );
}
