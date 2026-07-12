import { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { useNotification } from '../../contexts/NotificationContext';
import { registerConfirmer, registerNotifier, type AppConfirmOptions } from '../../lib/dialogs';

interface PendingConfirm {
  options: AppConfirmOptions;
  resolve: (value: boolean) => void;
}

/**
 * Mount-once host that backs the imperative notify()/appConfirm() bridge
 * (src/lib/dialogs.ts) with the app's styled toast system and ConfirmDialog.
 * Render inside NotificationProvider; see App.tsx.
 */
export default function DialogHost() {
  const { showNotification } = useNotification();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Queue further requests that arrive while one dialog is open, so no
  // confirmation is ever silently dropped.
  const queueRef = useRef<PendingConfirm[]>([]);

  useEffect(() => {
    registerNotifier(showNotification);
    return () => registerNotifier(null);
  }, [showNotification]);

  useEffect(() => {
    registerConfirmer((options: AppConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending((current) => {
          if (current) {
            queueRef.current.push({ options, resolve });
            return current;
          }
          return { options, resolve };
        });
      })
    );
    return () => registerConfirmer(null);
  }, []);

  const settle = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return queueRef.current.shift() ?? null;
    });
  }, []);

  return (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.options.title ?? ''}
      message={pending?.options.message ?? ''}
      confirmLabel={pending?.options.confirmLabel}
      cancelLabel={pending?.options.cancelLabel}
      destructive={pending?.options.destructive ?? false}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}
