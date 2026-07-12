/**
 * Imperative bridge to the app's styled notification toasts and confirm
 * dialog, replacing window.alert()/window.confirm() (which render as bare
 * browser dialogs — on iOS WKWebView they even show the site origin in the
 * title). A host component registers the real implementations at mount;
 * until then the functions fall back to the native dialogs so nothing is
 * ever silently dropped.
 */
import type { NotificationType } from '../contexts/NotificationContext';

export interface AppConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Notifier = (message: string, type: NotificationType, duration?: number) => void;
type Confirmer = (options: AppConfirmOptions) => Promise<boolean>;

let notifier: Notifier | null = null;
let confirmer: Confirmer | null = null;

export function registerNotifier(fn: Notifier | null): void {
  notifier = fn;
}

export function registerConfirmer(fn: Confirmer | null): void {
  confirmer = fn;
}

/** Styled toast; falls back to window.alert if the host isn't mounted yet. */
export function notify(message: string, type: NotificationType = 'info', duration?: number): void {
  if (notifier) {
    notifier(message, type, duration);
  } else {
    window.alert(message);
  }
}

/** Styled confirm; falls back to window.confirm if the host isn't mounted yet. */
export function appConfirm(options: AppConfirmOptions): Promise<boolean> {
  if (confirmer) {
    return confirmer(options);
  }
  return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
}
