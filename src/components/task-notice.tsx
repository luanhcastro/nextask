export function TaskNotice({
  message,
  error = false,
  onDismiss,
}: {
  message: string;
  error?: boolean;
  onDismiss: () => void;
}) {
  return (
    <div className={error ? 'task-notice task-notice-error' : 'task-notice'}>
      <p role={error ? 'alert' : 'status'}>
        <span aria-hidden="true">{error ? '!' : '✓'}</span>
        <span>{message}</span>
      </p>
      <button
        className="button"
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
