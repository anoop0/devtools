import React from 'react';

export function CommandPalette({ open, commands, onSelect, onClose }) {
  if (!open) return null;
  return (
    <div className="vsc-cmd-palette-overlay" onClick={onClose}>
      <div className="vsc-cmd-palette" onClick={e => e.stopPropagation()}>
        <input autoFocus className="vsc-cmd-input" placeholder="Type a command..." />
        <ul>
          {commands.map(cmd => (
            <li key={cmd.id} onClick={() => onSelect(cmd)}>{cmd.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
