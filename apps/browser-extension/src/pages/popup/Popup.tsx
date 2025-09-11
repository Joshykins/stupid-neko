import React from 'react';
import logo from '@assets/img/logo.svg';
import background from '@assets/img/mountain-bg-11.svg';
import largeNekoOnTree from '@assets/img/cat-on-bigger-tree.png';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../components/hooks/useAuth';

type SettingsTab = 'integration' | 'widget';

function SmallIconButton({ children, title, onClick, selected, borderless }: { children: React.ReactNode; title: string; onClick: () => void; selected?: boolean; borderless?: boolean; }) {
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center cursor-pointer rounded-md ${borderless ? 'border border-transparent' : 'border !border-neutral-700/50'} ${selected ? (borderless ? 'bg-black/15' : 'border-neutral-700/50 bg-black/15') : ''} px-[4px] py-[2px] text-gray-900 hover:bg-black/10 transition-colors`}
    >
      {children}
    </button>
  );
}

export default function Popup() {
  const [integrationId, setIntegrationId] = React.useState<string>('');
  const [hasKey, setHasKey] = React.useState<boolean>(false);
  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);
  const auth = useAuth();
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab>('integration');
  const [widgetEnabled, setWidgetEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    try {
      chrome.storage.sync.get(['integrationId', 'widgetEnabled'], (items) => {
        const id = typeof items?.integrationId === 'string' ? items.integrationId : '';
        setIntegrationId(id);
        setHasKey(!!id);
        const we = typeof items?.widgetEnabled === 'boolean' ? items.widgetEnabled : true;
        setWidgetEnabled(we);
      });
    } catch { }
  }, []);

  const saveKey = React.useCallback(() => {
    const val = integrationId.trim();
    setSaveError(null);
    if (!val) {
      setSaveError('Integration ID is required.');
      return;
    }
    setSaving(true);
    try {
      chrome.storage.sync.set({ integrationId: val }, () => {
        console.log('SET INTEGRATION ID', val);
        try {
          chrome.runtime.sendMessage({ type: 'REFRESH_AUTH' }, (resp) => {
            console.log("RESP", resp);
            // @ts-ignore - MV3 lastError
            if (chrome.runtime && chrome.runtime.lastError) {
              setSaving(false);
              setSaveError('Failed to refresh authentication.');
              return;
            }
            const ok = !!(resp && (resp as any).ok);
            const authResp = ok ? (resp as any).auth : null;
            const authed = !!(authResp && authResp.isAuthed && authResp.me);
            if (ok && authed) {
              setHasKey(!!val);
              setShowEdit(false);
              setSaving(false);
            } else {
              setSaving(false);
              setSaveError('Invalid Integration ID. Please verify and try again.');
            }
          });
        } catch (e) {
          setSaving(false);
          setSaveError('Failed to refresh authentication.');
        }
      });
    } catch {
      setSaving(false);
      setSaveError('Failed to save Integration ID.');
    }
  }, [integrationId]);

  return (
    <div className='p-14 pt-20 relative'>
      <img src={background} className="h-full w-full absolute inset-0 pointer-events-none object-cover" alt="Stupid Neko" />
      <Card className='w-[360px] relative z-10 '>
        <header className="flex flex-col items-center justify-center px-4 pb-4 pt-6">
          <div className='absolute left-2 top-2 flex items-center gap-2'>
            {!showEdit ? (
              <SmallIconButton title='Settings' onClick={() => setShowEdit(true)} borderless>
                <Settings className='h-4 w-4' />
              </SmallIconButton>
            ) : (
              <>
                <SmallIconButton title='Back' onClick={() => setShowEdit(false)} borderless>
                  <ArrowLeft className='h-4 w-4' />
                </SmallIconButton>
                <SmallIconButton title='Integration Key' onClick={() => setSettingsTab('integration')} selected={settingsTab === 'integration'}>
                  <span className='text-[11px] font-semibold'>Integration Key</span>
                </SmallIconButton>
                <SmallIconButton title='Widget Settings' onClick={() => setSettingsTab('widget')} selected={settingsTab === 'widget'}>
                  <span className='text-[11px] font-semibold'>Widget</span>
                </SmallIconButton>
              </>
            )}
          </div>
          <img src={largeNekoOnTree} className="absolute -right-40 top-0 translate-y-[-50%] h-44" alt="Stupid Neko" />
          <motion.div layout className="relative w-full min-h-[160px]">
            <AnimatePresence mode='wait'>
              {!showEdit ? (
                <motion.div key='view-main' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="mt-2 flex flex-col items-center w-full px-2">
                  <h1 className="text-xl font-semibold tracking-tight">Stupid Neko</h1>
                  <p className="mt-1 text-sm text-gray-600 text-center">Japanese learning companion in your browser.</p>
                  {auth?.isAuthed && auth?.me && (
                    <div className='mt-4 w-full flex flex-col items-center gap-2'>
                      <div className='flex items-center gap-3'>
                        {auth.me.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={auth.me.image} alt={auth.me.name || 'User'} className='h-8 w-8 rounded-full border border-neutral-300 object-cover' />
                        ) : (
                          <div className='h-8 w-8 rounded-full border border-neutral-300 bg-neutral-100 flex items-center justify-center text-xs'>{(auth.me.name || 'U').slice(0, 1)}</div>
                        )}
                        <div className='text-left'>
                          <div className='text-sm font-semibold leading-tight'>{auth.me.name || 'Your Account'}</div>
                          {auth.me.currentStreak != null && (
                            <div className='text-xs text-gray-600 leading-tight'>Streak: {auth.me.currentStreak} days</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex w-full justify-center">
                    <Button className="inline-flex items-center justify-center rounded-md border border-neutral-800 px-3 py-1 text-sm hover:bg-neutral-100" asChild>
                      <a href="https://stupidneko.com" target="_blank" rel="noopener noreferrer">Open App</a>
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key='view-settings' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="mt-2 w-full px-4 py-2">
                  {settingsTab === 'integration' ? (
                    <div>
                      <h2 className="text-base font-semibold">Browser Integration</h2>
                      <p className="mt-1 text-xs text-gray-600">Paste your Integration ID from your <a href="https://stupidneko.com/account" target="_blank" rel="noopener noreferrer" className='underline text-blue-700 hover:text-blue-900'>account page</a>{' '}page.</p>
                      <div className='mt-3 flex items-center gap-2'>
                        <Input placeholder="sn_int_..." value={integrationId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntegrationId(e.target.value)} />
                        <Button onClick={saveKey} disabled={saving}>{saving ? (<span className='inline-flex items-center gap-2'><Loader2 className='h-4 w-4 animate-spin' /></span>) : ('Set')}</Button>
                      </div>
                      {saveError && (<div className='mt-2 text-xs text-red-600'>{saveError}</div>)}
                    </div>
                  ) : (
                    <div>
                      <div className='mt-3 flex items-center justify-between'>
                        <div className='text-sm font-medium'>Show widget on supported pages</div>
                        <Switch checked={widgetEnabled} onCheckedChange={(v) => { const next = !!v; setWidgetEnabled(next); try { chrome.storage.sync.set({ widgetEnabled: next }); } catch { } }} aria-label='Toggle learning widget' />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </header>
      </Card>
    </div>
  );
}
