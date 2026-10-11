import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/cn';

export function TopBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="glass z-40 flex h-16 shrink-0 items-center gap-4 px-5" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <div className="flex items-center gap-3">
        <Logo size={38} />
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-tight">
            Osamah vids <span className="text-accent-cyan">ai</span>
          </div>
          <div className="text-[11px] text-dim">استوديو إنتاج الفيديو بالذكاء الاصطناعي</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label="تبديل الوضع"
          className={cn(
            'grid h-10 w-10 place-items-center rounded-xl transition',
            'bg-glass text-muted hover:bg-glass-strong hover:text-ink',
          )}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>
    </header>
  );
}