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
    setJwtToken(text);
  };
  const handleInputJWT = (e) => {
    const text = e.currentTarget.value;
    setJwtToken(text);
  };

  return (
    <div>
      <label htmlFor="jwt-input" style={{ fontWeight: 500 }}>JWT Token</label>
      <textarea
        id="jwt-input"
        className="vscode-textarea"
        value={jwtToken}
        onChange={handleInputJWT}
        onPaste={handlePasteJWT}
        placeholder="Paste your JWT token here"
        style={{ minHeight: 112, marginBottom: 16 }}
        aria-label="Paste your JWT token here"
      />
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
                style={{ fontFamily: "var(--vscode-font-code)", background: "var(--vscode-panel)", padding: 12, borderRadius: 4 }}
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
