import type { WidgetError } from '../hooks/useWidgetErrors';

interface Props {
  errors: WidgetError[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export default function WidgetErrorBanner({ errors, onDismiss, onDismissAll }: Props) {
  if (errors.length === 0) return null;

  return (
    <div className="absolute bottom-2 left-2 right-2 z-[9999] flex flex-col gap-1.5 pointer-events-none">
      {errors.length > 1 && (
        <button
          onClick={onDismissAll}
          className="self-end pointer-events-auto text-[10px] text-zinc-400 hover:text-white bg-zinc-900/80 px-2 py-0.5 rounded"
        >
          Dismiss all ({errors.length})
        </button>
      )}
      {errors.map(err => (
        <div
          key={err.id}
          className="pointer-events-auto bg-red-950/95 border border-red-700/60 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-red-300">Widget JS Error</p>
              <p className="text-[11px] text-red-200/90 font-mono break-words">{err.message}</p>
              {(err.lineno || err.source) && (
                <p className="text-[10px] text-red-400/70 font-mono mt-0.5">
                  {err.source ? `${err.source} ` : ''}{err.lineno ? `line ${err.lineno}${err.colno ? ':' + err.colno : ''}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(err.id)}
              className="text-red-400/70 hover:text-red-200 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
