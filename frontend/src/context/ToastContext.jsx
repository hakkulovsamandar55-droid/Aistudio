import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: 'bg-[#1f7a45]',
  error: 'bg-[#c33e32]',
  info: 'bg-[#37322b]',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'info', duration = 4000) => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Sits above the bottom tab bar rather than behind it. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className={`animate-rise pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-[0_6px_24px_rgba(28,26,23,0.18)] ${
              VARIANTS[toast.variant] || VARIANTS.info
            }`}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
