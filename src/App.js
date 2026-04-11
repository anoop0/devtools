
import React, { useState, useEffect } from "react";
import VSCodeLayout from "./vscodeui/VSCodeLayout";
import JWTDecoder from "./JWTDecoder";
import JSONParser from "./JSONParser";

function getInitialShowTopToolTabs() {
  const val = localStorage.getItem("showTopToolTabs");
  return val === null ? true : val === "true";
}

function App() {
  // Navigation state
  const [activeTool, setActiveTool] = useState("jwt");
  const [activeEditorTab, setActiveEditorTab] = useState("claims");
  const [showTopToolTabs, setShowTopToolTabs] = useState(getInitialShowTopToolTabs);

  // Input state (kept at top level to persist when switching tabs)
  const [jwtToken, setJwtToken] = useState("");
  const [jsonInput, setJsonInput] = useState("");

  // Persist showTopToolTabs
  useEffect(() => {
    localStorage.setItem("showTopToolTabs", showTopToolTabs);
  }, [showTopToolTabs]);

  // Status bar content (example: show JWT/JSON validity, etc.)
  const [jwtStatus, setJwtStatus] = useState("");
  const [jsonStatus, setJsonStatus] = useState("");

  // Pass status setters to children
  const statusBarContent =
    activeTool === "jwt"
      ? jwtStatus || "Ready"
      : jsonStatus || "Ready";

  return (
    <VSCodeLayout
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      activeEditorTab={activeEditorTab}
      setActiveEditorTab={setActiveEditorTab}
      showTopToolTabs={showTopToolTabs}
      setShowTopToolTabs={setShowTopToolTabs}
      statusBarContent={statusBarContent}
    >
      {activeTool === "jwt" ? (
        <JWTDecoder
          jwtToken={jwtToken}
          setJwtToken={setJwtToken}
          activeTab={activeEditorTab}
          setStatus={setJwtStatus}
        />
      ) : (
        <JSONParser
          jsonInput={jsonInput}
          setJsonInput={setJsonInput}
          setStatus={setJsonStatus}
        />
      )}
    </VSCodeLayout>
  );
}

export default App;

