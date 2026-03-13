async function fetchJson(url) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return await resp.json();
}

export async function loadDocuments() {
  const candidates = [
    "./data/documents.json",
    "./data/documents.sample.json",
    "./data/notion_documents.json",
    "./data/notion_documents.sample.json",
  ];

  let data = null;
  let usedUrl = null;
  for (const url of candidates) {
    try {
      data = await fetchJson(url);
      usedUrl = url;
      break;
    } catch {
      // try next
    }
  }
  if (!data) throw new Error("No documents JSON found in ./data/.");
  const documents = Array.isArray(data.documents) ? data.documents : [];
  return { documents, meta: data, usedUrl };
}

export function normalizeText(value) {
  return (value || "").toString().toLowerCase();
}

export function formatDateRange(dateValue) {
  if (!dateValue || typeof dateValue !== "object") return null;
  const start = dateValue.start || "";
  const end = dateValue.end || "";
  if (!start && !end) return null;
  return end && end !== start ? `${start}〜${end}` : start || end;
}

export function sortDocuments(docs) {
  const toEpoch = (iso) => {
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  };
  const toDateStart = (d) => (d && typeof d === "object" ? d.start : null);
  const toSampleSeq = (id) => {
    const m = (id || "").match(/sample-(\d+)/);
    return m ? Number.parseInt(m[1], 10) : null;
  };

  return [...docs].sort((a, b) => {
    const aEdited = toEpoch(a.last_edited_time);
    const bEdited = toEpoch(b.last_edited_time);
    if (aEdited != null || bEdited != null) {
      if (aEdited == null) return 1;
      if (bEdited == null) return -1;
      if (bEdited !== aEdited) return bEdited - aEdited;
    }

    const aSeq = toSampleSeq(a.id);
    const bSeq = toSampleSeq(b.id);
    if (aSeq != null || bSeq != null) {
      if (aSeq == null) return 1;
      if (bSeq == null) return -1;
      if (bSeq !== aSeq) return bSeq - aSeq;
    }

    const aDate = toEpoch(toDateStart(a.date));
    const bDate = toEpoch(toDateStart(b.date));
    if (aDate != null || bDate != null) {
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      if (bDate !== aDate) return bDate - aDate;
    }

    return (a.title || "").localeCompare(b.title || "", "ja");
  });
}
