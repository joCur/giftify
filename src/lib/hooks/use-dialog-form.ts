import { useState, useCallback } from "react";

interface UseDialogFormOptions<TState = Record<string, unknown>> {
  /** Initial form state - will be reset to these values on close */
  defaultState?: TState;
  /** Callback fired when dialog opens */
  onOpen?: () => void;
  /** Callback fired after dialog closes and state is reset */
  onClose?: () => void;
  /** Callback fired just before reset (can be async) */
  onReset?: () => void | Promise<void>;
}

interface UseDialogFormReturn<TState = Record<string, unknown>> {
  /** Current open state */
  open: boolean;
  /** Open the dialog */
  openDialog: () => void;
  /** Close the dialog (triggers reset) */
  closeDialog: () => void;
  /** Set open state directly (use as onOpenChange handler) */
  setOpen: (open: boolean) => void;
  /** Reset state to defaults without closing */
  resetState: () => void;
  /** Current state (for controlled components) */
  state: TState;
  /** Update state */
  setState: React.Dispatch<React.SetStateAction<TState>>;
}

/**
 * Hook to manage dialog state with automatic form reset on close.
 *
 * Provides a clean API for managing dialog open/close state and form data,
 * with automatic cleanup when the dialog closes (including ESC, cancel, click-outside).
 *
 * @example
 * ```tsx
 * interface MyDialogState {
 *   name: string;
 *   isLoading: boolean;
 * }
 *
 * function MyDialog() {
 *   const dialog = useDialogForm<MyDialogState>({
 *     defaultState: { name: "", isLoading: false }
 *   });
 *
 *   return (
 *     <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
 *       <Input
 *         value={dialog.state.name}
 *         onChange={(e) => dialog.setState(prev => ({ ...prev, name: e.target.value }))}
 *       />
 *     </Dialog>
 *   );
 * }
 * ```
 */
export function useDialogForm<TState = Record<string, unknown>>(
  options: UseDialogFormOptions<TState> = {}
): UseDialogFormReturn<TState> {
  const { defaultState, onOpen, onClose, onReset } = options;

  const [open, setOpenState] = useState(false);
  const [state, setState] = useState<TState>(
    (defaultState || {}) as TState
  );

  const resetState = useCallback(async () => {
    // Call custom reset handler
    await onReset?.();

    // Reset to default state
    if (defaultState) {
      setState(defaultState);
    }
  }, [defaultState, onReset]);

  const openDialog = useCallback(() => {
    setOpenState(true);
    onOpen?.();
  }, [onOpen]);

  const closeDialog = useCallback(async () => {
    setOpenState(false);

    // Small delay to allow exit animations
    await new Promise(resolve => setTimeout(resolve, 150));

    await resetState();
    onClose?.();
  }, [resetState, onClose]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      openDialog();
    } else {
      closeDialog();
    }
  }, [openDialog, closeDialog]);

  return {
    open,
    openDialog,
    closeDialog,
    setOpen: handleOpenChange,
    resetState,
    state,
    setState,
  };
}
