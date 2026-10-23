import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import { StudioIcon, type StudioIconName } from './StudioIcon';

type StudioPopoverProps = {
  children: ReactNode;
  icon: StudioIconName;
  label: string;
};

export const StudioPopover = ({ children, icon, label }: StudioPopoverProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    firstItem?.focus();

    const dismissOutside = (event: PointerEvent) => {
      if (!menuRef.current?.parentElement?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);

    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
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
    <div className="studio-popover-anchor">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="studio-icon-button"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
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
