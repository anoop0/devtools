import React, { useState, useEffect, useRef } from "react";

function extractJsonErrorPosition(errorMessage) {
  if (!errorMessage) return -1;
  const match = errorMessage.match(/position\s+(\d+)/i);
  if (!match) return -1;
  return Number(match[1]);
}

function getLineColumnFromIndex(text, index) {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const lines = text.slice(0, safeIndex).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function trimDanglingJson(text) {
  let result = text.trimEnd();
  while (result && /[[,{:]\s*$/.test(result)) {
    result = result.slice(0, -1).trimEnd();
  }
  result = result.replace(/,\s*$/, '');
  return result;
}

function getMissingClosers(text) {
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === '}' || ch === ']') {
      const top = stack[stack.length - 1];
      const matches = (top === '{' && ch === '}') || (top === '[' && ch === ']');
      if (matches) stack.pop();
    }
  }
  let closers = '';
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    closers += stack[i] === '{' ? '}' : ']';
  }
  return closers;
}

function tryParsePartialJson(input, errorPosition) {
  if (!Number.isFinite(errorPosition) || errorPosition < 0) return null;
  const prefix = input.slice(0, errorPosition);
  const candidates = [];
  const pushCandidate = (value) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  };
  const trimmed = trimDanglingJson(prefix);
  pushCandidate(trimmed);
  pushCandidate(trimmed + getMissingClosers(trimmed));
  const tighter = trimDanglingJson(trimmed);
  pushCandidate(tighter);
  pushCandidate(tighter + getMissingClosers(tighter));
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      return JSON.parse(candidates[i]);
    } catch (e) {
      // Continue trying simpler/closed candidates.
    }
  }
  return null;
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

function JSONParser({ jsonInput, setJsonInput, setStatus }) {
  const [jsonParsed, setJsonParsed] = useState(null);
  const [jsonError, setJsonError] = useState("");
  const [errorPosition, setErrorPosition] = useState(-1);
  const [jsonParseMode, setJsonParseMode] = useState("none");
  const [isCompact, setIsCompact] = useState(false);
  const jsonPreRef = useRef(null);

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
    if (!jsonInput) {
      setJsonParsed(null);
      setJsonError("");
      setJsonParseMode("none");
      setStatus && setStatus("");
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonParsed(parsed);
      setJsonError("");
      setErrorPosition(-1);
      setJsonParseMode("full");
      setStatus && setStatus("JSON valid");
    } catch (e) {
      const position = extractJsonErrorPosition(e.message || "");
      const hasPosition = position >= 0;
      const partial = hasPosition ? tryParsePartialJson(jsonInput, position) : null;
      if (partial !== null) {
        setJsonParsed(partial);
        setJsonParseMode("partial");
        setStatus && setStatus("JSON partial");
      } else {
        setJsonParsed(null);
        setJsonParseMode("none");
        setStatus && setStatus("JSON invalid");
      }
      if (hasPosition) {
        const { line, column } = getLineColumnFromIndex(jsonInput, position);
        const failingChar = position < jsonInput.length ? jsonInput[position] : 'EOF';
        setJsonError(`Invalid JSON at char ${position} (line ${line}, col ${column}). Failed at: ${failingChar}`);
        setErrorPosition(position);
      } else {
        setJsonError(`Invalid JSON. ${e.message}`);
        setErrorPosition(-1);
      }
    }
  }, [jsonInput, setStatus]);

  const handlePasteJSON = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    setJsonInput(text);
  };
  const handleInputJSON = (e) => {
    setJsonInput(e.currentTarget.value);
  };

  const getFormattedjson = () => {
    return syntaxHighlight(jsonParsed, isCompact);
  };

  return (
    <div>
      <label htmlFor="json-input" style={{ fontWeight: 500 }}>JSON Input</label>
      <div style={{ marginBottom: 16 }}>
        <textarea
          id="json-input"
          className="vscode-textarea"
          value={jsonInput}
          onChange={handleInputJSON}
          onPaste={handlePasteJSON}
          placeholder="Paste your JSON here"
          style={{
            minHeight: 88,
            fontSize: "1.1em",
            border: errorPosition >= 0 ? "2px solid #f14c4c" : "1px solid var(--vscode-border)",
          }}
          aria-label="Paste your JSON here"
        />
        {errorPosition >= 0 && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "rgba(241, 76, 76, 0.15)",
              border: "1px solid #f14c4c",
              borderRadius: 4,
              fontFamily: "var(--vscode-font-code)",
              fontSize: "0.95em",
              overflow: "auto",
            }}
          >
            <div style={{ color: "#f14c4c", marginBottom: 6, fontWeight: 500 }}>Error Context:</div>
            <pre style={{ margin: 0, color: "var(--vscode-text)" }}>
              {jsonInput.split("").map((char, idx) => {
                const dist = Math.abs(idx - errorPosition);
                const isError = idx === errorPosition;
                const isNear = dist <= 20 && dist > 0;
                
                if (idx < errorPosition - 20 || idx > errorPosition + 20) return null;
                
                return (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: isError ? "#f14c4c" : "transparent",
                      color: isError ? "white" : isNear ? "#ff9999" : "var(--vscode-text)",
                      padding: isError ? "2px 4px" : "0",
                      borderRadius: isError ? "2px" : "0",
                      fontWeight: isError ? "bold" : "normal",
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </pre>
            <div style={{ marginTop: 6, fontSize: "0.9em", color: "var(--vscode-text)" }}>
              Position: <span style={{ color: "#f14c4c", fontWeight: 500 }}>{errorPosition}</span>
            </div>
          </div>
        )}
      </div>
      {jsonError && <div className="error-message" style={{ color: "var(--vscode-danger)", marginBottom: 12 }}>{jsonError}</div>}
      {jsonParsed && (
        <div className="decoded-token" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ fontSize: 16, margin: "8px 0" }}>{jsonParseMode === "partial" ? "Parsed JSON (up to error point)" : "Parsed JSON"}</h2>
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
            ref={jsonPreRef}
            className="pretty-json colorized-json"
            tabIndex={0}
            onKeyDown={handleSelectAll}
            style={{ fontFamily: "var(--vscode-font-code)", background: "var(--vscode-panel)", padding: 12, borderRadius: 4 }}
            dangerouslySetInnerHTML={{ __html: getFormattedjson() }}
          />
        </div>
      )}
    </div>
  );
}

export default JSONParser;
