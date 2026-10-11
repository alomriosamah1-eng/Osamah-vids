import { NavLink } from 'react-router-dom';
import { Home, Plus, FolderOpen, GalleryVerticalEnd, Clapperboard, Settings } from 'lucide-react';
import { cn } from '../../lib/cn';

const NAV = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/new', label: 'مشروع جديد', icon: Plus },
  { to: '/projects', label: 'المشاريع', icon: FolderOpen },
  { to: '/gallery', label: 'المعرض', icon: GalleryVerticalEnd },
  { to: '/editor/demo', label: 'المحرر', icon: Clapperboard },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="glass z-30 flex w-64 shrink-0 flex-col gap-1 p-4" style={{ borderRadius: 0, borderRight: 'none', borderLeft: 'none', borderBottom: 'none' }}>
      <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-dim">التبويبات الرئيسية</div>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
              'hover:bg-glass-strong',
              isActive
                ? 'bg-gradient-to-l from-accent-cyan/20 to-accent-violet/15 text-ink shadow-inner ring-1 ring-brd-hi'
                : 'text-muted',
            )
          }
        >
          <Icon size={18} className={cn('text-accent-cyan')} />
          {label}
        </NavLink>
      ))}
      <div className="mt-auto rounded-xl bg-glass p-3 text-[11px] leading-relaxed text-dim">
        <div className="mb-1 font-bold text-muted">نصيحة</div>
        اكتب برومبتًا واضحًا في «مشروع جديد» وسيتولّى الوكيل بناء الفيديو مشهدًا مشهدًا أمامك.
      </div>
    </aside>
  );
}