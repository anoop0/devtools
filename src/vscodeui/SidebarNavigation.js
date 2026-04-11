import React from 'react';

export function SidebarNavigation({ tools, activeTool, onSelect, pinned, onPinToggle }) {
  return (
    <nav className={`vsc-sidebar${pinned ? ' pinned' : ''}`}>
      <div className="vsc-sidebar-tools">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={tool.id === activeTool ? 'active' : ''}
            onClick={() => onSelect(tool.id)}
            title={tool.name}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <button className="vsc-sidebar-pin" onClick={onPinToggle} title="Toggle sidebar pin">
        {pinned ? '📌' : '📍'}
      </button>
    </nav>
  );
}
