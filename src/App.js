
import React, { useState } from 'react';
import jwtDecode from 'jwt-decode';
import './App.css';

// Cookie helpers (simple, no external deps)
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}
function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}
function colorizeTokenHtml(token) {
  if (!token) return '';
  const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const parts = token.split('.');
  if (parts.length !== 3) {
    return `<span class="token-invalid">${escapeHtml(token)}</span>`;
  }
  return [
    `<span class="token-header">${escapeHtml(parts[0])}</span>`,
    '<span class="token-dot">.</span>',
    `<span class="token-payload">${escapeHtml(parts[1])}</span>`,
    '<span class="token-dot">.</span>',
    `<span class="token-signature">${escapeHtml(parts[2])}</span>`
  ].join('');
}

const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat']);

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

function ExpiryCountdown({ epochSeconds }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const diff = Math.max(0, Math.floor(epochSeconds - now / 1000));
  const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const seconds = String(diff % 60).padStart(2, '0');

  return (
    <span className={diff === 0 ? 'expired' : 'expiring'}>
      {diff === 0 ? 'Expired' : `${hours}:${minutes}:${seconds}`}
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
            {key === 'exp' && (
              <div><strong>Time left:</strong> <ExpiryCountdown epochSeconds={epochSeconds} /></div>
            )}
          </div>
        );
      }
    }
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function ExpandCollapseIcon({ expanded }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {expanded ? (
        <>
          <path d="M9 9 L6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 9 L17.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 15 L6.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 15 L17.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M6.5 6.5 L9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.5 6.5 L15 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 17.5 L9 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.5 17.5 L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function App() {
  // On mount, read last tab from cookie
  const [activeMainTab, setActiveMainTab] = useState(() => getCookie('jwtplus_mainTab') || 'jwt');
  // JWT Decoder state
  const [jwtToken, setJwtToken] = useState('');
  const [decodedToken, setDecodedToken] = useState(null);
  const [decodeError, setDecodeError] = useState('');
  // JSON Parser state
  const [jsonInput, setJsonInput] = useState('');
  const [jsonParsed, setJsonParsed] = useState(null);
  const [jsonError, setJsonError] = useState('');
  const [jsonParseMode, setJsonParseMode] = useState('none');
  // Refs
  const inputRef = React.useRef(null);
  const [jwtExpanded, setJwtExpanded] = React.useState(false);
  // JSON input expand/collapse state and ref
  const [jsonExpanded, setJsonExpanded] = React.useState(false);
  const jsonInputRef = React.useRef(null);

  // JWT Decoder logic
  const moveCaretToEnd = React.useCallback((el) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const syncInputHtml = React.useCallback((token, keepCaretAtEnd = false) => {
    if (!inputRef.current) return;
    inputRef.current.innerHTML = colorizeTokenHtml(token);
    if (keepCaretAtEnd) {
      moveCaretToEnd(inputRef.current);
    }
  }, [moveCaretToEnd]);

  // Persist main tab to cookie
  React.useEffect(() => {
    setCookie('jwtplus_mainTab', activeMainTab);
  }, [activeMainTab]);

  React.useEffect(() => {
    if (activeMainTab !== 'jwt') return;
    if (!jwtToken) {
      setDecodedToken(null);
      setDecodeError('');
      syncInputHtml('');
      return;
    }
    try {
      const decoded = jwtDecode(jwtToken);
      setDecodedToken(decoded);
      setDecodeError('');
    } catch (e) {
      setDecodedToken(null);
      setDecodeError('Invalid JWT token');
    }
  }, [jwtToken, syncInputHtml, activeMainTab]);

  // JSON Parser logic
  React.useEffect(() => {
    if (activeMainTab !== 'json') return;
    if (!jsonInput) {
      setJsonParsed(null);
      setJsonError('');
      setJsonParseMode('none');
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonParsed(parsed);
      setJsonError('');
      setJsonParseMode('full');
    } catch (e) {
      const position = extractJsonErrorPosition(e.message || '');
      const hasPosition = position >= 0;
      const partial = hasPosition ? tryParsePartialJson(jsonInput, position) : null;

      if (partial !== null) {
        setJsonParsed(partial);
        setJsonParseMode('partial');
      } else {
        setJsonParsed(null);
        setJsonParseMode('none');
      }

      if (hasPosition) {
        const { line, column } = getLineColumnFromIndex(jsonInput, position);
        const failingChar = position < jsonInput.length ? jsonInput[position] : 'EOF';
        setJsonError(`Invalid JSON at char ${position} (line ${line}, col ${column}). Failed at: ${failingChar}`);
      } else {
        setJsonError(`Invalid JSON. ${e.message}`);
      }
    }
  }, [jsonInput, activeMainTab]);

  // Handle paste event for JWT
  const handlePasteJWT = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text').trim();
    setJwtToken(text);
    syncInputHtml(text, true);
  };
  // Handle manual typing for JWT
  const handleInputJWT = (e) => {
    const text = e.currentTarget.innerText.replace(/\s+/g, '');
    setJwtToken(text);
    syncInputHtml(text, true);
  };

  // Handle paste/input for JSON
  const handlePasteJSON = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    setJsonInput(text);
  };
  const handleInputJSON = (e) => {
    setJsonInput(e.currentTarget.innerText);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>JWT & JSON Tools</h1>
        <div className="main-tab-header">
          <button
            className={activeMainTab === 'jwt' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveMainTab('jwt')}
          >JWT Decoder</button>
          <button
            className={activeMainTab === 'json' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveMainTab('json')}
          >JSON Parser</button>
        </div>

        {activeMainTab === 'jwt' && (
          <>
            <div className="token-visual-box input-token-box">
              <div className="input-expand-wrap">
                <div
                  className={`token-input-div${jwtExpanded ? ' expanded' : ''}`}
                  contentEditable
                  ref={inputRef}
                  spellCheck={false}
                  placeholder="Paste your JWT token here"
                  onPaste={handlePasteJWT}
                  onInput={handleInputJWT}
                  suppressContentEditableWarning={true}
                  aria-label="Paste your JWT token here"
                  style={{ minHeight: 112, maxHeight: jwtExpanded ? 320 : 112, overflowY: 'auto', paddingRight: 36, textAlign: 'left' }}
                />
                <button
                  className="expand-corner-btn"
                  onClick={() => setJwtExpanded(e => !e)}
                  aria-label={jwtExpanded ? 'Collapse input' : 'Expand input'}
                >
                  <ExpandCollapseIcon expanded={jwtExpanded} />
                </button>
              </div>
            </div>
            {decodeError && <div className="error-message">{decodeError}</div>}
            {decodedToken && <TabbedSections decodedToken={decodedToken} />}
          </>
        )}

        {activeMainTab === 'json' && (
          <>
            <div className="token-visual-box input-token-box">
              <div className="input-expand-wrap">
                <div
                  className={`token-input-div${jsonExpanded ? ' expanded' : ''}`}
                  contentEditable
                  spellCheck={false}
                  placeholder="Paste your JSON here"
                  onPaste={handlePasteJSON}
                  onInput={handleInputJSON}
                  suppressContentEditableWarning={true}
                  aria-label="Paste your JSON here"
                  style={{ minHeight: 88, whiteSpace: 'pre-wrap', maxHeight: jsonExpanded ? 320 : 88, overflowY: 'auto', fontSize: '1.2em', textAlign: 'left', paddingRight: 36 }}
                  dangerouslySetInnerHTML={{ __html: jsonInput ? jsonInput.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') : '' }}
                  ref={jsonInputRef}
                />
                <button
                  className="expand-corner-btn"
                  onClick={() => setJsonExpanded(e => !e)}
                  aria-label={jsonExpanded ? 'Collapse input' : 'Expand input'}
                >
                  <ExpandCollapseIcon expanded={jsonExpanded} />
                </button>
              </div>
            </div>
            {jsonError && <div className="error-message">{jsonError}</div>}
            {jsonParsed && (
              <div className="decoded-token">
                <h2>{jsonParseMode === 'partial' ? 'Parsed JSON (up to error point)' : 'Parsed JSON'}</h2>
                <pre
                  className="pretty-json colorized-json"
                  tabIndex={0}
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonParsed) }}
                />
              </div>
            )}
          </>
        )}
      </header>
    </div>
  );
}

function TabbedSections({ decodedToken }) {
  // Use claimsTab from parent, but allow override for local state
  const [tab, setTab] = React.useState(() => getCookie('jwtplus_claimsTab') || 'claims');
  React.useEffect(() => {
    setCookie('jwtplus_claimsTab', tab);
  }, [tab]);

  return (
    <div className="tabbed-section">
      <div className="tab-header">
        <button
          className={tab === 'claims' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('claims')}
        >
          Claims
        </button>
        <button
          className={tab === 'decoded' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('decoded')}
        >
          Decoded Token
        </button>
      </div>

      <div className="tab-content">
        {tab === 'claims' && (
          <div className="claims-section">
            <div className="claims-pane">
              <table className="claims-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(decodedToken).map(([key, value]) => (
                    <tr key={key} className={key === 'exp' ? 'exp-claim-row' : ''}>
                      <td>{key}</td>
                      <td>{renderClaimValue(key, value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'decoded' && (
          <div className="decoded-token"> 
            <pre
              className="pretty-json colorized-json"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key.toLowerCase() === 'a') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  const sel = window.getSelection();
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }}
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(decodedToken) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Colorize JSON output
function syntaxHighlight(json) {
  if (!json) return '';
  let jsonStr = JSON.stringify(json, null, 2);
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

export default App;