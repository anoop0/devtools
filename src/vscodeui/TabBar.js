import React from 'react';

export function TabBar({ tabs, activeTab, onSelect, onClose }) {
  return (
    <div className="vsc-tabbar">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`vsc-tab${tab.id === activeTab ? ' active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
          <button className="vsc-tab-close" onClick={e => { e.stopPropagation(); onClose(tab.id); }}>×</button>
        </div>
      ))}
    </div>
  );
}
