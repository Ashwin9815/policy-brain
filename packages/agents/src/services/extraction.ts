import { readFile } from "node:fs/promises";
import { extname } from "node:path";

export async function extractDocumentText(
  storagePath: string,
  mimeType: string
): Promise<{ text: string; pageCount: number }> {
  const ext = extname(storagePath).toLowerCase();

  if (ext === ".txt" || mimeType === "text/plain") {
    const text = await readFile(storagePath, "utf-8");
    return { text, pageCount: Math.ceil(text.length / 3000) };
  }

  if (ext === ".md" || mimeType === "text/markdown") {
    const text = await readFile(storagePath, "utf-8");
    return { text, pageCount: 1 };
  }

  // Structured placeholder extraction for other formats
  const buffer = await readFile(storagePath);
  const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length > 100) {
    return { text: cleaned, pageCount: Math.ceil(cleaned.length / 3000) };
  }

  return {
    text: `[Document at ${storagePath}] Policy content requires manual review or supported format (.txt, .md).`,
    pageCount: 1,
  };
}

export function extractKnowledgeObjects(text: string) {
  const objects: Array<{
    type: string;
    content: string;
    confidence: number;
    tags: string[];
  }> = [];

  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  for (const sentence of sentences.slice(0, 20)) {
    let type = "policy_fragment";
    let confidence = 0.75;
    const tags: string[] = [];

    if (/cpt|hcpcs|icd|procedure code|\b\d{5}\b/i.test(sentence)) {
      type = "procedure_code";
      confidence = 0.92;
      tags.push("coding");
    } else if (/prior auth|authorization|pre-cert/i.test(sentence)) {
      type = "authorization_rule";
      confidence = 0.88;
      tags.push("prior-auth");
    } else if (/weeks|months|days|duration/i.test(sentence)) {
      type = "temporal_requirement";
      confidence = 0.85;
      tags.push("timeline");
    } else if (/deny|denied|exclusion|not covered/i.test(sentence)) {
      type = "exclusion";
      confidence = 0.9;
      tags.push("denial");
    } else if (/approve|approved|covered|eligible/i.test(sentence)) {
      type = "eligibility";
      confidence = 0.87;
      tags.push("approval");
    }

    objects.push({ type, content: sentence, confidence, tags });
  }

  return objects;
}

export function suggestGraphEdges(
  objects: Array<{ type: string; content: string }>,
  ruleIds: string[] = []
) {
  const edges: Array<{
    fromIndex: number;
    toIndex?: number;
    toRuleId?: string;
    relation: string;
  }> = [];

  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]!;
      const b = objects[j]!;
      if (a.type === "procedure_code" && b.type === "authorization_rule") {
        edges.push({ fromIndex: i, toIndex: j, relation: "requires_authorization" });
      }
      if (a.type === "temporal_requirement" && b.type === "eligibility") {
        edges.push({ fromIndex: i, toIndex: j, relation: "precedes" });
      }
    }
    if (ruleIds[0] && objects[i]!.type === "policy_fragment") {
      edges.push({ fromIndex: i, toRuleId: ruleIds[0], relation: "supports_rule" });
    }
  }

  return edges;
}
