
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, X } from "lucide-react";

const DURATION = 4000;

interface Toast {
  message: string;
  token: number;
}

interface ToastContextType {
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useErrorToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useErrorToast must be used inside ErrorToastProvider"
    );
  }

  return context;
}

export function ErrorToastProvider({children}: {children: React.ReactNode;}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToken = useRef(0);

  const showError = useCallback((message: string) => {
    const token = ++nextToken.current;

    setToasts((current) => {
      const existing = current.find(
        (toast) => toast.message === message
      );

      if (existing) {
        return current.map((toast) =>
          toast.message === message
            ? { ...toast, token }
            : toast
        );
      }

      return [...current, { message, token }];
    });
  }, []);

  const dismiss = useCallback((token: number) => {
    setToasts((current) =>
      current.filter((toast) => toast.token !== token)
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}

      <div className="fixed bottom-5 right-5 z-[9999] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <ErrorToast
            key={toast.message}
            toast={toast}
            onDismiss={() => dismiss(toast.token)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface Props {
    toast: Toast;
    onDismiss: () => void;
}

function ErrorToast({toast, onDismiss}: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setExiting(false);

    const timer = window.setTimeout(() => {
      setExiting(true);
    }, DURATION);

    return () => window.clearTimeout(timer);
  }, [toast.token]);

  useEffect(() => {
    if (!exiting) return;

    const timer = window.setTimeout(onDismiss, 250);
    return () => window.clearTimeout(timer);
  }, [exiting, onDismiss]);

  return (
    <div
      role="alert"
      className={`overflow-hidden rounded-md border border-line-strong bg-panel text-ink shadow-2xl ${
        exiting ? "toast-exit" : "toast-enter"
      }`}
    >
      <div className="h-[3px] w-full bg-raised">
        <div
          key={toast.token}
          className="h-full origin-left bg-hazard"
          style={{
            animation: `toast-progress ${DURATION}ms linear forwards`,
          }}
        />
      </div>

      <div className="flex items-start gap-3 p-3.5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-hazard/30 bg-hazard/10">
          <AlertCircle size={17} className="text-hazard" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="mb-1 font-condensed text-[10px] font-semibold uppercase tracking-[0.16em] text-hazard">
            System Alert
          </p>
          <p className="text-sm leading-5 text-ink">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

