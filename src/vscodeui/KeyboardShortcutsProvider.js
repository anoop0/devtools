import React, { useEffect } from 'react';

export function KeyboardShortcutsProvider({ shortcuts, children }) {
  useEffect(() => {
    function handle(e) {
      for (const s of shortcuts) {
        if (s.match(e)) {
          e.preventDefault();
          s.action();
          break;
        }
      }
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [shortcuts]);
  return children;
}
