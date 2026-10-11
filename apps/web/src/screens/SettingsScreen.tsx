import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Cpu } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';
import { ModelsPanel } from './ModelsScreen';
import { cn } from '@/lib/cn';

type Tab = 'general' | 'models';

const TABS: { id: Tab; label: string; icon: typeof Cpu }[] = [
  { id: 'general', label: 'عام', icon: Settings2 },
  { id: 'models', label: 'النماذج', icon: Cpu },
];

export function SettingsScreen() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('settings-tab') as Tab) || 'general');
  const [cfg, setCfg] = useState<unknown>(null);

  useEffect(() => {
    api.config().then(setCfg).catch(() => {});
  }, []);
  useEffect(() => { localStorage.setItem('settings-tab', tab); }, [tab]);

  const c = cfg as { app?: { name: string } } | null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-black">الإعدادات</h1>

      <div className="flex w-fit overflow-hidden rounded-xl bg-glass ring-1 ring-brd">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition',
              tab === id ? 'bg-accent-cyan/20 text-ink' : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'general' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="space-y-3 p-6">
            <Row k="اسم التطبيق" v={c?.app?.name ?? '…'} />
            <Row k="اللغة / الاتجاه" v="العربية — RTL" />
            <Row k="الإصدار" v="0.1.0 (المرحلة 1-3)" />
            <p className="pt-2 text-xs text-dim">الأصوات والجودة والإخراج تُدار من osamah-vids-ai.config.json. اختيار النموذج من تبويب «النماذج».</p>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ModelsPanel />
        </motion.div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-glass px-4 py-3">
      <span className="text-sm text-muted">{k}</span>
      <span className="text-sm font-bold">{v}</span>
    </div>
  );
}
