import { formatDateRange, loadDocuments, normalizeText, sortDocuments } from "./documents_data.js";

function escapeHtml(s) {
  return (s || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toQueryId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id");
}

function setQueryId(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  history.pushState({ id }, "", url);
}

function isMatch(doc, q, category) {
  if (category && (doc.category || "") !== category) return false;
  if (!q) return true;
  const hay = `${doc.title || ""} ${doc.category || ""} ${doc.description || ""}`;
  return normalizeText(hay).includes(q);
}

function listItemHtml(doc, selectedId) {
  const isSelected = selectedId && doc.id === selectedId;
  const category = doc.category || "未分類";
  const title = doc.title || "(無題)";
  const dateStr = formatDateRange(doc.date);
  const imageUrl = doc.image_url;
  const thumb = imageUrl
    ? `<img src="${imageUrl}" alt="" class="doc-thumb doc-thumb--sm" loading="lazy">`
    : `<div class="doc-thumbPlaceholder doc-thumbPlaceholder--sm">No<br>Img</div>`;

  return `
    <button
      type="button"
      data-id="${escapeHtml(doc.id || "")}"
      class="doc-item ${isSelected ? "doc-item--selected" : ""}"
    >
      ${thumb}
      <div class="doc-itemText">
        <div class="doc-badge">${escapeHtml(category)}</div>
        <div class="doc-title">${escapeHtml(title)}</div>
        <div class="doc-sub">${escapeHtml(dateStr || "")}</div>
      </div>
    </button>
  `;
}

function propertiesTable(properties) {
  if (!properties || typeof properties !== "object") return "";
  const entries = Object.entries(properties).filter(([, v]) => v != null && `${v}`.trim() !== "");
  if (entries.length === 0) return "";

  const rows = entries
    .slice(0, 50)
    .map(([k, v]) => {
      const value = typeof v === "string" ? v : JSON.stringify(v);
      return `
        <tr>
          <td>${escapeHtml(k)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>
      `;
    })
    .join("");

  const note = entries.length > 50 ? `<div class="doc-sub">※ 表示は先頭50項目まで</div>` : "";

  return `
    <details class="doc-section doc-props">
      <summary style="cursor:pointer; font-size:0.9rem; color:#334155; text-decoration:underline;">その他プロパティ</summary>
      <div>
        <table>${rows}</table>
        ${note}
      </div>
    </details>
  `;
}

function detailHtml(doc, imageMode) {
  const category = doc.category || "未分類";
  const title = doc.title || "(無題)";
  const description = doc.description || "";
  const dateStr = formatDateRange(doc.date);
  const imageUrl = doc.image_url;

  const links = [
    doc.source_url ? `<a class="doc-link" href="${doc.source_url}" target="_blank" rel="noreferrer">出典URL</a>` : null,
    doc.url ? `<a class="doc-link" href="${doc.url}" target="_blank" rel="noreferrer">原ページ</a>` : null,
  ].filter(Boolean);

  const imageBlock = imageUrl
    ? `
      <div>
        <div class="doc-imageToolbar">
          <div class="doc-k">画像</div>
          <button
            type="button"
            id="image-toggle"
            class="doc-btn"
            title="表示切替"
          >
            <span style="font-weight:800;">${imageMode === "fit" ? "フィット" : "原寸"}</span>
            <span style="color:#64748b;">切替</span>
          </button>
        </div>
        <div
          id="image-frame"
          class="doc-imageFrame"
          style="${imageMode === "fit" ? "padding:0.5rem;" : "padding:0;"}"
        >
          <img
            src="${imageUrl}"
            alt="${escapeHtml(title)}"
            style="${
              imageMode === "fit"
                ? "display:block; width:100%; max-height:58vh; object-fit:contain;"
                : "display:block; max-width:none; width:auto; height:auto;"
            }"
            loading="lazy"
          />
        </div>
      </div>
    `
    : `
      <div style="border:1px dashed #cbd5e1; border-radius:0.5rem; background:#f8fafc; padding:1.5rem; font-size:0.9rem; color:#64748b;">
        画像が登録されていません。
      </div>
    `;

  return `
    <div class="doc-detailHeader">
      <div style="min-width:0;">
        <div class="doc-badge">${escapeHtml(category)}</div>
        <h3 style="font-size:1.6rem; font-weight:800; color:#0f172a; word-break:break-word;">${escapeHtml(
          title
        )}</h3>
      </div>
      <div class="doc-id">${escapeHtml(doc.id || "")}</div>
    </div>

    <div class="doc-kvGrid">
      <div>
        <div class="doc-k">日付</div>
        <div class="doc-v">${escapeHtml(dateStr || "—")}</div>
      </div>
      <div>
        <div class="doc-k">リンク</div>
        <div class="doc-links">${links.length ? links.join("") : "<span class='doc-v'>—</span>"}</div>
      </div>
    </div>

    <div class="doc-section">
      <div class="doc-k">概要</div>
      <div class="doc-v doc-desc">${escapeHtml(description || "—")}</div>
    </div>

    <div class="doc-section">${imageBlock}</div>
    ${propertiesTable(doc.properties)}
  `;
}

async function main() {
  const qEl = document.getElementById("q");
  const categoryEl = document.getElementById("category");
  const listEl = document.getElementById("documents-list");
  const detailEl = document.getElementById("documents-detail");
  const countEl = document.getElementById("result-count");
  const metaEl = document.getElementById("documents-meta");

  if (!qEl || !categoryEl || !listEl || !detailEl || !countEl || !metaEl) return;

  const { documents, meta, usedUrl } = await loadDocuments();
  const allDocs = sortDocuments(documents);

  const categories = Array.from(
    new Set(allDocs.map((d) => d.category).filter((c) => typeof c === "string" && c.trim() !== ""))
  ).sort((a, b) => a.localeCompare(b, "ja"));

  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);
  }

  const generatedAt = meta && typeof meta === "object" ? meta.generated_at : null;
  metaEl.textContent = `${usedUrl}${generatedAt ? ` / generated_at: ${generatedAt}` : ""}`;

  const state = {
    selectedId: toQueryId(),
    imageMode: "fit",
  };

  const render = () => {
    const q = normalizeText(qEl.value);
    const category = categoryEl.value;
    const filtered = allDocs.filter((d) => isMatch(d, q, category));

    countEl.textContent = `${filtered.length} 件`;

    if (!state.selectedId || !filtered.some((d) => d.id === state.selectedId)) {
      state.selectedId = filtered[0] ? filtered[0].id : null;
      if (state.selectedId) {
        const url = new URL(window.location.href);
        url.searchParams.set("id", state.selectedId);
        history.replaceState({ id: state.selectedId }, "", url);
      }
    }

    listEl.innerHTML = filtered.map((d) => listItemHtml(d, state.selectedId)).join("");

    const selected = filtered.find((d) => d.id === state.selectedId) || null;
    if (!selected) {
      detailEl.innerHTML = `<div style="font-size:0.9rem; color:#64748b;">資料が見つかりませんでした。</div>`;
      return;
    }

    detailEl.innerHTML = detailHtml(selected, state.imageMode);

    const toggle = document.getElementById("image-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        state.imageMode = state.imageMode === "fit" ? "actual" : "fit";
        render();
      });
    }
  };

  listEl.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target.closest("[data-id]") : null;
    if (!target) return;
    const id = target.getAttribute("data-id");
    if (!id) return;
    state.selectedId = id;
    state.imageMode = "fit";
    setQueryId(id);
    render();
  });

  qEl.addEventListener("input", render);
  categoryEl.addEventListener("change", render);

  window.addEventListener("popstate", () => {
    state.selectedId = toQueryId();
    state.imageMode = "fit";
    render();
  });

  render();
}

main().catch((e) => {
  const el = document.getElementById("documents-detail");
  if (el) el.innerHTML = `<div style="font-size:0.9rem; color:#b91c1c;">読み込みに失敗しました。</div>`;
  // eslint-disable-next-line no-console
  console.error(e);
});
