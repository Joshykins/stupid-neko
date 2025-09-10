import { useEffect, useState } from 'react';

export function useContentLabel(contentKey: string | null | undefined) {
  const [label, setLabel] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(!!contentKey);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!contentKey) {
        setLoading(false);
        return;
      }
      try {
        chrome.runtime.sendMessage({ type: 'GET_CONTENT_LABEL', contentKey }, (resp) => {
          if (!mounted) return;
          const value = (resp as any)?.contentLabel ?? null;
          setLabel(value);
          setLoading(false);
        });
      } catch {
        if (!mounted) return;
        setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [contentKey]);

  return { label, loading } as const;
}


