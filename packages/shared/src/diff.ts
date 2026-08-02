export interface DiffLine {
  type: "add" | "remove" | "unchanged";
  content: string;
  lineNumber?: { old?: number; new?: number };
}

export function diffJson(
  before: unknown,
  after: unknown
): { lines: DiffLine[]; summary: { additions: number; removals: number } } {
  const beforeLines = JSON.stringify(before, null, 2).split("\n");
  const afterLines = JSON.stringify(after, null, 2).split("\n");
  return diffLines(beforeLines, afterLines);
}

export function diffLines(
  before: string[],
  after: string[]
): { lines: DiffLine[]; summary: { additions: number; removals: number } } {
  const lines: DiffLine[] = [];
  let additions = 0;
  let removals = 0;

  const maxLen = Math.max(before.length, after.length);
  let bi = 0;
  let ai = 0;

  while (bi < before.length || ai < after.length) {
    const bLine = before[bi];
    const aLine = after[ai];

    if (bi >= before.length) {
      lines.push({ type: "add", content: aLine!, lineNumber: { new: ai + 1 } });
      additions++;
      ai++;
    } else if (ai >= after.length) {
      lines.push({ type: "remove", content: bLine!, lineNumber: { old: bi + 1 } });
      removals++;
      bi++;
    } else if (bLine === aLine) {
      lines.push({ type: "unchanged", content: bLine, lineNumber: { old: bi + 1, new: ai + 1 } });
      bi++;
      ai++;
    } else {
      const nextMatchInAfter = after.slice(ai + 1, ai + 5).indexOf(bLine);
      const nextMatchInBefore = before.slice(bi + 1, bi + 5).indexOf(aLine);

      if (nextMatchInAfter >= 0 && (nextMatchInBefore < 0 || nextMatchInAfter <= nextMatchInBefore)) {
        lines.push({ type: "add", content: aLine!, lineNumber: { new: ai + 1 } });
        additions++;
        ai++;
      } else {
        lines.push({ type: "remove", content: bLine!, lineNumber: { old: bi + 1 } });
        removals++;
        bi++;
      }
    }

    if (lines.length > maxLen * 3) break;
  }

  return { lines, summary: { additions, removals } };
}

export interface RuleComparisonResult {
  additions: Array<{ path: string; value: unknown }>;
  removals: Array<{ path: string; value: unknown }>;
  changes: Array<{ path: string; before: unknown; after: unknown }>;
  conflicts: string[];
}

export function compareRuleDsl(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): RuleComparisonResult {
  const additions: RuleComparisonResult["additions"] = [];
  const removals: RuleComparisonResult["removals"] = [];
  const changes: RuleComparisonResult["changes"] = [];
  const conflicts: string[] = [];

  const leftBlocks = (left.blocks as unknown[]) ?? [];
  const rightBlocks = (right.blocks as unknown[]) ?? [];

  if (leftBlocks.length !== rightBlocks.length) {
    changes.push({
      path: "blocks.length",
      before: leftBlocks.length,
      after: rightBlocks.length,
    });
  }

  const maxBlocks = Math.max(leftBlocks.length, rightBlocks.length);
  for (let i = 0; i < maxBlocks; i++) {
    const lb = leftBlocks[i];
    const rb = rightBlocks[i];
    if (!lb && rb) additions.push({ path: `blocks[${i}]`, value: rb });
    else if (lb && !rb) removals.push({ path: `blocks[${i}]`, value: lb });
    else if (lb && rb && JSON.stringify(lb) !== JSON.stringify(rb)) {
      changes.push({ path: `blocks[${i}]`, before: lb, after: rb });
      const lDec = (lb as { outcome?: string }).outcome;
      const rDec = (rb as { outcome?: string }).outcome;
      if (lDec && rDec && lDec !== rDec) {
        conflicts.push(`Block ${i}: conflicting decisions (${lDec} vs ${rDec})`);
      }
    }
  }

  return { additions, removals, changes, conflicts };
}
