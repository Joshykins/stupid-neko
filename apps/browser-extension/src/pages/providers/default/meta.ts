import type { ProviderMeta } from "../registry";

const meta: ProviderMeta = {
  id: "default",
  displayName: "Web",
  matches: () => true,
  extractContentKey: (url: string) => {
    try {
      const u = new URL(url);
      return `web:${u.hostname}${u.pathname}`;
    } catch { return null; }
  },
};

export default meta;

