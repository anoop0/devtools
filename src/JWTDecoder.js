import React, { useState, useEffect, useRef } from "react";
import jwtDecode from "jwt-decode";

const TIME_CLAIMS = new Set(["exp", "nbf", "iat"]);

function ExpiryCountdown({ epochSeconds }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const diff = Math.max(0, Math.floor(epochSeconds - now / 1000));
  const hours = String(Math.floor(diff / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const seconds = String(diff % 60).padStart(2, "0");
  
  let timerColor = "#6a9955"; // dark green for > 2 minutes
  if (diff === 0) {
    timerColor = "#f14c4c"; // red for expired
  } else if (diff < 120) {
    timerColor = "#dcdcaa"; // yellow for < 2 minutes
  }
  
  return (
    <span style={{ color: timerColor, fontWeight: 500, fontSize: "1.2em" }}>
      {diff === 0 ? "Expired" : `${hours}:${minutes}:${seconds}`}
    </span>
  );
}

function renderClaimValue(key, value) {
  if (TIME_CLAIMS.has(key)) {
    const epochSeconds = Number(value);
    if (!Number.isNaN(epochSeconds) && Number.isFinite(epochSeconds)) {
      const date = new Date(epochSeconds * 1000);
      if (!Number.isNaN(date.getTime())) {
        return (
          <div className="claim-time-value">
            <div><strong>Epoch:</strong> {epochSeconds}</div>
            <div><strong>UTC:</strong> {date.toUTCString()}</div>
            <div><strong>Local:</strong> {date.toLocaleString()}</div>
            {key === "exp" && (
              <div><strong>Time left:</strong> <ExpiryCountdown epochSeconds={epochSeconds} /></div>
            )}
          </div>
        );
      }
    }
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function syntaxHighlight(json, compact = false) {
  if (!json) return '';
  let jsonStr = JSON.stringify(json, null, compact ? undefined : 2);
  jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d*\.\d+(?:[eE][+-]?\d+)?|-?\d+|[{}[\]])/g, function (match) {
    let cls = 'json-number';
    if (/^[{}[\]]$/.test(match)) {
      cls = 'json-brace';
    } else if (/^".*"$/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/^true$|^false$/.test(match)) {
      cls = 'json-boolean';
    } else if (/^null$/.test(match)) {
      cls = 'json-null';
    } else if (/^-?\d*\.\d+(?:[eE][+-]?\d+)?$/.test(match)) {
      cls = 'json-float';
    } else if (/^-?\d+$/.test(match)) {
      cls = 'json-int';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function JWTDecoder({ jwtToken, setJwtToken, activeTab, setStatus }) {
  const [decodedToken, setDecodedToken] = useState(null);
  const [decodeError, setDecodeError] = useState("");
  const [localTab, setLocalTab] = useState("claims");
  const [isCompact, setIsCompact] = useState(false);
  const decodedPreRef = useRef(null);

  const handleSelectAll = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(e.currentTarget);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  useEffect(() => {
    if (!jwtToken) {
      setDecodedToken(null);
      setDecodeError("");
      setStatus && setStatus("");
      return;
    }
    try {
      const decoded = jwtDecode(jwtToken);
      setDecodedToken(decoded);
      setDecodeError("");
      setStatus && setStatus("JWT valid");
    } catch (e) {
      setDecodedToken(null);
      setDecodeError("Invalid JWT token");
      setStatus && setStatus("JWT invalid");
    }
  }, [jwtToken, setStatus]);

  const handlePasteJWT = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text").trim();
    // Clear the input div content first
    if (inputDivRef.current) {
      inputDivRef.current.textContent = '';
    }
    isUserTypingRef.current = false;
    setJwtToken(text);
  };

  // Get JWT parts for visualization
  const getJWTParts = () => {
    if (!jwtToken) return null;
    const parts = jwtToken.split('.');
    return parts.length === 3 ? { header: parts[0], payload: parts[1], signature: parts[2] } : null;
  };

  const jwtParts = getJWTParts();

  // Ref for the input div
  const inputDivRef = useRef(null);
  const highlightDivRef = useRef(null);
  const isUserTypingRef = useRef(false);

  // Update DOM content only when pasting/external changes, not when user types
  useEffect(() => {
    if (inputDivRef.current && !isUserTypingRef.current) {
      inputDivRef.current.textContent = jwtToken;
      // Sync highlight div
      if (highlightDivRef.current) {
        highlightDivRef.current.scrollTop = inputDivRef.current.scrollTop;
        highlightDivRef.current.scrollLeft = inputDivRef.current.scrollLeft;
      }
    }
  }, [jwtToken]);

  const handleInputDiv = (e) => {
    isUserTypingRef.current = true;
    const text = e.currentTarget.textContent || "";
    setJwtToken(text);
    // Sync scroll position
    if (highlightDivRef.current) {
      highlightDivRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightDivRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleScroll = (e) => {
    if (highlightDivRef.current) {
      highlightDivRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightDivRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Render highlighted tokens
  const renderHighlightedJWT = () => {
    if (!jwtParts) return jwtToken || '';
    return (
      <>
        <span style={{ color: "#4fb9a0" }}>{jwtParts.header}</span>
        <span style={{ color: "#888" }}>.</span>
        <span style={{ color: "#d7ba7d" }}>{jwtParts.payload}</span>
        <span style={{ color: "#888" }}>.</span>
        <span style={{ color: "#c586c0" }}>{jwtParts.signature}</span>
      </>
    );
  };

  return (
    <div>
      <label htmlFor="jwt-input" style={{ fontWeight: 500 }}>JWT Token</label>
      <div style={{ position: "relative", minHeight: 112, marginBottom: 16 }}>
        {/* Highlight overlay (non-editable) */}
        <div
          ref={highlightDivRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            padding: "10px 8px",
            boxSizing: "border-box",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            overflowY: "auto",
            overflowX: "auto",
            pointerEvents: "none",
            zIndex: 0,
            fontSize: "inherit",
            fontFamily: "inherit",
            lineHeight: "1.5",
            color: "transparent"
          }}
        >
          {renderHighlightedJWT()}
        </div>
        {/* Editable input (transparent text, visible caret) */}
        <div
          ref={inputDivRef}
          id="jwt-input"
          className="vscode-textarea"
          onPaste={(e) => {
            isUserTypingRef.current = true;
            handlePasteJWT(e);
          }}
          onInput={handleInputDiv}
          onKeyDown={handleSelectAll}
          onScroll={handleScroll}
          onBlur={() => {
            isUserTypingRef.current = false;
          }}
          contentEditable={true}
          suppressContentEditableWarning={true}
          style={{
            position: "relative",
            zIndex: 1,
            minHeight: 112,
            resize: "none",
            padding: "10px 8px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            outline: "none",
            cursor: "text",
            background: "transparent",
            color: jwtParts ? "transparent" : "#d4d4d4",
            caretColor: "#d4d4d4",
            overflowY: "auto",
            overflowX: "auto",
            fontSize: "inherit",
            fontFamily: "inherit",
            lineHeight: "1.5",
            margin: 0,
            border: "1px solid var(--vscode-border)",
            boxSizing: "border-box"
          }}
          role="textbox"
          tabIndex={0}
          aria-label="Paste your JWT token here"
        />
      </div>
      {/* Project Description - visible only when no JWT token is present */}
      {!jwtToken && (
        <section className="project-description" style={{
          background: "#23232e",
          color: "#f8f8f2",
          borderRadius: 8,
          padding: 32,
          margin: "32px auto 24px auto",
          maxWidth: 600,
          boxShadow: "0 2px 16px #000a",
          textAlign: "left"
        }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>JWT Decoder Plus</h1>
          <p style={{ fontSize: 18, marginBottom: 16 }}>
            <strong>JWT Decoder Plus</strong> is a simple, open-source web tool for decoding JWT tokens and parsing JSON, built with React.
          </p>
          <ul style={{ fontSize: 16, marginBottom: 16, paddingLeft: 24 }}>
            <li>🔑 Instantly decode and inspect JWT tokens visually</li>
            <li>🧩 Parse and pretty-print JSON with error highlighting</li>
            <li>⏳ View claim details, including expiration countdown</li>
            <li>✨ Responsive, modern UI for quick debugging</li>
          </ul>
          <div style={{ fontSize: 15, color: "#dcdcaa", marginBottom: 8 }}>
            <strong>How to use:</strong>
            <ol style={{ margin: "8px 0 0 20px" }}>
              <li>Paste your JWT token above to decode and view its claims.</li>
              <li>Switch to the JSON Parser tab to validate and pretty-print JSON.</li>
            </ol>
          </div>
          <div style={{ fontSize: 14, color: "#b5cea8" }}>
            <strong>Open Source:</strong> <a href="https://github.com/anoop0/devtools" target="_blank" rel="noopener noreferrer" style={{ color: "#4fb9a0" }}>View on GitHub</a>
          </div>
        </section>
      )}
      {decodeError && <div className="error-message" style={{ color: "var(--vscode-danger)", marginBottom: 12 }}>{decodeError}</div>}
      {decodedToken && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--vscode-border)", paddingBottom: 8 }}>
            <button
              className="vscode-btn"
              onClick={() => setLocalTab("claims")}
              style={{
                background: localTab === "claims" ? "var(--vscode-tab-active)" : "transparent",
                borderBottom: localTab === "claims" ? "2px solid var(--vscode-accent)" : "none",
                borderRadius: 0,
                borderColor: "transparent"
              }}
            >
              Claims
            </button>
            <button
              className="vscode-btn"
              onClick={() => setLocalTab("decoded")}
              style={{
                background: localTab === "decoded" ? "var(--vscode-tab-active)" : "transparent",
                borderBottom: localTab === "decoded" ? "2px solid var(--vscode-accent)" : "none",
                borderRadius: 0,
                borderColor: "transparent"
              }}
            >
              Decoded Token
            </button>
          </div>
          {localTab === "claims" && (
            <table className="vscode-table" aria-label="JWT Claims">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(decodedToken).map(([key, value]) => (
                  <tr key={key} className={key === "exp" ? "exp-claim-row" : ""}>
                    <td>{key}</td>
                    <td>{renderClaimValue(key, value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {localTab === "decoded" && (
            <div className="decoded-token" style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, margin: 0, color: "var(--vscode-text)" }}>Decoded Token</h3>
                <button
                  onClick={() => setIsCompact(!isCompact)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: "var(--vscode-accent)",
                    color: "white",
                    border: "1px solid var(--vscode-border)",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {isCompact ? "Prettify" : "Compress"}
                </button>
              </div>
              <pre
                ref={decodedPreRef}
                className="pretty-json colorized-json"
                tabIndex={0}
                onKeyDown={handleSelectAll}
                style={{
                  fontFamily: "var(--vscode-font-code)",
                  background: "var(--vscode-panel)",
                  padding: 12,
                  borderRadius: 4,
                  ...(isCompact && {
                    maxHeight: "400px",
                    overflowX: "auto",
                    overflowY: "auto",
                    wordWrap: "break-word",
                    whiteSpace: "pre-wrap"
                  })
                }}
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(decodedToken, isCompact) }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default JWTDecoder;
