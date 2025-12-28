import { useEffect, useRef } from "react";

interface UseDialogResetOptions {
  /** The open state from parent */
  open: boolean;
  /** Callback to reset form/state */
  onReset: () => void | Promise<void>;
  /** Delay before resetting (for exit animations) */
  resetDelay?: number;
}

/**
 * Hook to automatically reset dialog state when closed.
 * Use this for dialogs where `open` state is controlled by parent component.
 *
 * @example
 * ```tsx
 * function EditItemDialog({ open, onOpenChange }: EditItemDialogProps) {
 *   const [isUpdating, setIsUpdating] = useState(false);
 *
 *   useDialogReset({
 *     open,
 *     onReset: () => {
 *       setIsUpdating(false);
 *     },
 *   });
 *
 *   return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>;
 * }
 * ```
 */
export function useDialogReset(options: UseDialogResetOptions): void {
  const { open, onReset, resetDelay = 150 } = options;
  const previousOpenRef = useRef(open);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Detect close transition (was open, now closed)
    if (previousOpenRef.current && !open) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule reset after delay (allows exit animations to complete)
      timeoutRef.current = setTimeout(() => {
        void Promise.resolve(onReset());
      }, resetDelay);
    }

    previousOpenRef.current = open;

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [open, onReset, resetDelay]);
}
