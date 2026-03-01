// parser.mjs — Parse Prometheus text exposition format

export function parseExposition(text) {
  const lines = text.trim().split('\n');
  const metrics = [];
  let currentHelp = '';
  let currentType = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# HELP ')) {
      currentHelp = trimmed.slice(7);
      const spaceIdx = currentHelp.indexOf(' ');
      currentHelp = spaceIdx >= 0 ? currentHelp.slice(spaceIdx + 1) : '';
      continue;
    }

    if (trimmed.startsWith('# TYPE ')) {
      const rest = trimmed.slice(7);
      const spaceIdx = rest.indexOf(' ');
      currentType = spaceIdx >= 0 ? rest.slice(spaceIdx + 1) : '';
      continue;
    }

    if (trimmed.startsWith('#')) continue;

    const parsed = parseLine(trimmed);
    if (parsed) {
      parsed.help = currentHelp;
      parsed.type = currentType;
      metrics.push(parsed);
    }
  }

  return metrics;
}

export function parseLine(line) {
  const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([\d.eE+\-NnIif]+)(\s+\d+)?$/);
  if (!match) return null;

  const name = match[1];
  const labelStr = match[3] || '';
  const rawValue = match[4];
  const value = rawValue === '+Inf' ? Infinity : rawValue === 'NaN' ? NaN : parseFloat(rawValue);
  const timestamp = match[5] ? parseInt(match[5].trim()) : undefined;

  const labels = {};
  if (labelStr) {
    const pairs = labelStr.match(/([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g) || [];
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      labels[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 2, -1);
    }
  }

  return { name, labels, value, timestamp, help: '', type: '' };
}

// Group parsed metrics by name for easier evaluation
export function groupByName(metrics) {
  const groups = new Map();
  for (const m of metrics) {
    if (!groups.has(m.name)) {
      groups.set(m.name, { name: m.name, help: m.help, type: m.type, series: [] });
    }
    groups.get(m.name).series.push(m);
  }
  return groups;
}
