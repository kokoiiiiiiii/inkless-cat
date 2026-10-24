import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { StudioIcon, type StudioIconName } from './StudioIcon';

type StudioPopoverProps = {
  children: ReactNode;
  className?: string;
  icon: StudioIconName;
  label: string;
  onTriggerRef?: (node: HTMLButtonElement | null) => void;
  triggerClassName?: string;
};

export const StudioPopover = ({
  children,
  className = '',
  icon,
  label,
  onTriggerRef,
  triggerClassName = '',
}: StudioPopoverProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const menuItems = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [];
    for (const item of menuItems) item.tabIndex = -1;

    const firstItem = [...menuItems].find(
      (item) => !item.matches(':disabled, [aria-disabled="true"]'),
    );
    firstItem?.focus();

    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchorRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', dismissOutside);

    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [open]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && menuRef.current?.contains(nextTarget)) return;
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])',
      ) ?? []),
    ];
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1 + items.length) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;

    const nextItem = nextIndex === undefined ? undefined : items[nextIndex];
    if (nextItem) {
      event.preventDefault();
      nextItem.focus();
    }
  };

  return (
    <div className={`studio-popover-anchor ${className}`.trim()} data-open={open} ref={anchorRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className={`studio-icon-button ${triggerClassName}`.trim()}
        onClick={() => setOpen((value) => !value)}
        ref={(node) => {
          triggerRef.current = node;
          onTriggerRef?.(node);
        }}
        title={label}
        type="button"
      >
        <span className="studio-popover__trigger">
          <StudioIcon name={icon} />
          <span>{label}</span>
        </span>
      </button>
      <div
        className="studio-popover studio-glass"
        data-glass-layer="true"
        hidden={!open}
        aria-label={label}
        onBlur={handleBlur}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) {
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        onKeyDown={handleKeyDown}
        ref={menuRef}
        role="menu"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};
