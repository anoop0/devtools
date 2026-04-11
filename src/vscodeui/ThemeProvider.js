import React from 'react';

export function ThemeProvider({ children }) {
  // Simple passthrough for now; extend for theming support
  return <div className="vscode-theme-default">{children}</div>;
}
