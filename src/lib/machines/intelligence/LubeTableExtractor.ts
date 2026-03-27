/**
 * Deterministic lubrication table parser for maintenance plan PDFs.
 * Extracts service points without relying on Gemini text reconstruction.
 */

export type LubeTableRow = {
  service_point: number | string;
  component: string;
  interval: string;
  action: string;
  lubricant?: string;
  page?: string;
};

export function extractLubeTable(rawText: string): LubeTableRow[] {
  const rows: LubeTableRow[] = [];

  // Split into lines
  const lines = rawText.split('\n');
  let currentPage = '1';
  let currentInterval = '';
  const pageMarkerRegex = /\[PAGE\s+(\d+)\]/i;

  // Pending point numbers waiting for components
  const pendingPoints: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Update current page
    const pageMatch = line.match(pageMarkerRegex);
    if (pageMatch) {
      currentPage = pageMatch[1];
      continue;
    }

    // Skip empty or very short lines
    if (!line || line.length < 2) {
      continue;
    }

    // Detect interval lines
    const intervalMatch = line.match(/Toutes les\s+(\d+)\s*heures?/i) ||
                         line.match(/Every\s+(\d+)\s*hours?/i);

    if (intervalMatch) {
      currentInterval = `${intervalMatch[1]}h`;
      pendingPoints.length = 0; // Reset pending points for new interval
      continue;
    }

    // Skip headers and metadata (but NOT "Point de repli" which is a valid component)
    if (/^(Intervalle|Nombre|Type|Etendue|Page\s*\d|Graisse|HAMMEL|Broyeur|modèle|V230|État|Toutes|chaque|après|Le cas échéant)/i.test(line)) {
      continue;
    }

    // Format 1: "1 ▪ Component Name 2" on same line
    if (currentInterval) {
      const singleLineMatch = line.match(/^(\d+)\s*[▪•\-*]?\s*(.+?)(?:\s+\d+)?$/);
      if (singleLineMatch) {
        const pointNum = singleLineMatch[1];
        let component = singleLineMatch[2].trim();

        // Skip if line is just the number and a count
        if (!/^(\d+\s*)+$/.test(component)) {
          component = cleanComponentName(component);

          // Skip section titles and invalid components
          if (!component.match(/^(Plan|Graisse|Type|Intervalle)/i) &&
              component && component.length > 2 && /[a-zàâäçèéêëîïôùûüœæ]/i.test(component)) {
            rows.push({
              service_point: pointNum,
              component,
              interval: currentInterval,
              action: 'Lubrication',
              page: currentPage,
            });
            pendingPoints.length = 0;
            continue;
          }
        }
      }
    }

    // Format 2: Standalone point numbers (e.g., "3", "4", "5" on separate lines)
    const standaloneNum = line.match(/^(\d+)$/);
    if (standaloneNum && currentInterval) {
      const num = standaloneNum[1];
      // Only collect if it looks like a service point (1-20)
      if (parseInt(num) >= 1 && parseInt(num) <= 20) {
        pendingPoints.push(num);
        continue;
      }
    }

    // Format 2b: Multiple consecutive numbers on one line (e.g., "3456789")
    if (currentInterval && line.match(/^\d+$/) && line.length > 1) {
      const digits = line.split('');
      for (const digit of digits) {
        const num = parseInt(digit);
        if (num >= 1 && num <= 12) {
          pendingPoints.push(digit);
        }
      }
      continue;
    }

    // Format 3: Bullet line after accumulated point numbers
    if (currentInterval && pendingPoints.length > 0 && line.match(/^[▪•\-*]\s+/)) {
      const bulletMatch = line.match(/^[▪•\-*]\s+(.+?)(?:\s+\d+)?$/);
      if (bulletMatch) {
        let component = bulletMatch[1].trim();
        component = cleanComponentName(component);

        // Skip known section titles and invalid components
        if (!component.match(/^(Plan|Graisse|Type|Intervalle)/i) &&
            component && component.length > 2 && /[a-zàâäçèéêëîïôùûüœæ]/i.test(component)) {
          // Match with first pending point
          if (pendingPoints.length > 0) {
            const pointNum = pendingPoints.shift();
            rows.push({
              service_point: pointNum,
              component,
              interval: currentInterval,
              action: 'Lubrication',
              page: currentPage,
            });
          }
        }
      }
    }
  }

  return rows;
}

/**
 * Clean component name
 */
function cleanComponentName(component: string): string {
  return component
    .replace(/\s+\d+$/, '') // Remove trailing numbers
    .replace(/[,:;()]/g, '') // Remove punctuation
    .replace(/^\s*[\.•▪\-*]+\s*/, '') // Remove leading bullets
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\ben option\b/i, '') // Remove "en option" suffix
    .trim();
}

/**
 * Convert lubrication table rows to maintenance task entities
 */
export function lubeRowsToMaintenanceTasks(rows: LubeTableRow[]) {
  return rows.map(row => ({
    name: `Lubrication of ${row.component} every ${row.interval}`,
    type: 'maintenance' as const,
    steps: [
      {
        step_number: 1,
        action: `Apply standard polyvalent grease to ${row.component}`,
        tools: [],
        evidence: [
          {
            snippet: `Service point ${row.service_point}: ${row.component}`,
            page: row.page || '1',
          },
        ],
      },
    ],
    evidence: [
      {
        snippet: `Lubricate ${row.component} every ${row.interval}`,
        page: row.page || '1',
      },
    ],
  }));
}

/**
 * Extract unique systems/components from table rows
 */
export function extractSystemsFromRows(rows: LubeTableRow[]) {
  const systems = new Set<string>();

  rows.forEach(row => {
    // Normalize and add component as system
    const normalized = row.component
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    systems.add(normalized);
  });

  return Array.from(systems).sort();
}
