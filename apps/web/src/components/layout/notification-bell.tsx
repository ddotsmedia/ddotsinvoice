'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLabel } from '@/lib/ui-helpers';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
interface NotificationsResponse { items: Notification[]; unreadCount: number }

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const L = useLabel();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ['notifications'],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => (await api.get<NotificationsResponse>('/notifications')).data,
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refetch });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refetch });

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = q.data?.unreadCount ?? 0;
  const items = q.data?.items ?? [];

  const onItem = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={L('Notifications', 'الإشعارات')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-surface-3 hover:text-primary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-primary">{L('Notifications', 'الإشعارات')}</span>
            <button
              type="button"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="text-xs font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              {L('Mark all read', 'تعليم الكل كمقروء')}
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted">{L('No notifications', 'لا توجد إشعارات')}</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onItem(n)}
                  className={`block w-full border-b border-border px-4 py-3 text-start last:border-b-0 hover:bg-surface-2 ${n.isRead ? '' : 'bg-blue-50 dark:bg-blue-950/30'}`}
                >
                  <div className="text-sm font-bold text-primary">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-sm text-gray-600 dark:text-slate-400">{n.body}</div>}
                  <div className="mt-1 text-xs text-muted">{timeAgo(n.createdAt)}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
