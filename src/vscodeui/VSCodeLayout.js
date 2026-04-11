import React, { useState } from "react";
import "./../styles/vscode-theme.css";
import "./../styles/vscode-layout.css";

// Inline SVG icons
const icons = {
  jwt: (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" fill="currentColor" />
      <path d="M7 10a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" fill="#252526" />
    </svg>
  ),
  json: (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" fill="currentColor" />
      <text x="10" y="14" textAnchor="middle" fontSize="10" fill="#252526" fontFamily="monospace">{'{}'}</text>
    </svg>
  ),
  gear: (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M10 6v2M10 12v2M6 10h2M12 10h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

const TOOL_LIST = [
  { key: "jwt", label: "JWT Decoder", icon: icons.jwt },
  { key: "json", label: "JSON Parser", icon: icons.json },
];

function VSCodeLayout({
  children,
  activeTool,
  setActiveTool,
  activeEditorTab,
  setActiveEditorTab,
  showTopToolTabs,
  setShowTopToolTabs,
  statusBarContent,
}) {
  // Keyboard navigation for ActivityBar
  const activityBarRef = React.useRef();

  // ActivityBar keyboard navigation
  const handleActivityBarKeyDown = (e) => {
    const idx = TOOL_LIST.findIndex(t => t.key === activeTool);
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      setActiveTool(TOOL_LIST[(idx + 1) % TOOL_LIST.length].key);
      e.preventDefault();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      setActiveTool(TOOL_LIST[(idx - 1 + TOOL_LIST.length) % TOOL_LIST.length].key);
      e.preventDefault();
    }
  };

  // Settings modal (simple popover)
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="vscode-layout">
      <div className="vscode-main">
        <nav
          className="vscode-activitybar"
          role="tablist"
          aria-label="Main Navigation"
          ref={activityBarRef}
        />
        {/* Optional SideBar */}
        <aside className="vscode-sidebar" aria-label="Side Bar" />
        <section className="vscode-editorarea">
          {/* Top tool tabs (optional) */}
          {showTopToolTabs && (
            <div className="vscode-editortabs" role="tablist" aria-label="Tool Tabs">
              {TOOL_LIST.map(tool => (
                <button
                  key={tool.key}
                  className={`vscode-editortab${activeTool === tool.key ? " active" : ""}`}
                  role="tab"
                  aria-selected={activeTool === tool.key}
                  tabIndex={0}
                  onClick={() => setActiveTool(tool.key)}
                  onKeyDown={handleActivityBarKeyDown}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          )}
          {/* Editor tabs for JWT - removed since tabs are now inside JWTDecoder component */}
          <div className="vscode-editorcontent" role="tabpanel">
            {children}
          </div>
        </section>
      </div>
      <footer className="vscode-statusbar" role="status">
        {statusBarContent}
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </footer>
    </div>
  );
}

export default VSCodeLayout;
