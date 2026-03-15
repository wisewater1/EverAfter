declare global {
  interface Window {
    Plaid?: {
      create: (config: Record<string, unknown>) => {
        open: () => void;
        destroy?: () => void;
      };
    };
  }
}

let plaidScriptPromise: Promise<void> | null = null;

function loadPlaidScript(): Promise<void> {
  if (window.Plaid) {
    return Promise.resolve();
  }

  if (plaidScriptPromise) {
    return plaidScriptPromise;
  }

  plaidScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-plaid-link="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Plaid Link')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.dataset.plaidLink = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid Link'));
    document.head.appendChild(script);
  });

  return plaidScriptPromise;
}

export async function openPlaidLink(options: {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: any) => Promise<void> | void;
  onExit?: (error: Error | null) => void;
}) {
  await loadPlaidScript();

  if (!window.Plaid) {
    throw new Error('Plaid Link SDK did not initialize');
  }

  return new Promise<void>((resolve, reject) => {
    const handler = window.Plaid!.create({
      token: options.linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        try {
          await options.onSuccess(publicToken, metadata);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          handler.destroy?.();
        }
      },
      onExit: (error: any) => {
        options.onExit?.(error ? new Error(error.display_message || error.error_message || 'Plaid Link exited') : null);
        if (error) {
          reject(new Error(error.display_message || error.error_message || 'Plaid Link exited'));
        } else {
          resolve();
        }
        handler.destroy?.();
      },
    });

    handler.open();
  });
}
