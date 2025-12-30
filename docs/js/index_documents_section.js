import { formatDateRange, loadDocuments, sortDocuments } from "./documents_data.js";

function cardHtml(doc) {
  const category = doc.category || "未分類";
  const title = doc.title || "(無題)";
  const dateStr = formatDateRange(doc.date);
  const subtitle = dateStr ? dateStr : doc.description ? doc.description : "";
  const href = `./documents.html?id=${encodeURIComponent(doc.id || "")}`;
  const imageUrl = doc.image_url;

  const thumb = imageUrl
    ? `<img src="${imageUrl}" alt="" class="doc-thumb" loading="lazy">`
    : `<div class="doc-thumbPlaceholder">[サムネイル]</div>`;

  return `
    <a href="${href}" class="doc-card">
      ${thumb}
      <div class="doc-cardBody">
        <div class="doc-badge">${escapeHtml(category)}</div>
        <h5 class="doc-title">${escapeHtml(title)}</h5>
        <p class="doc-sub">${escapeHtml(subtitle)}</p>
      </div>
    </a>
  `;
}

function escapeHtml(s) {
  return (s || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function main() {
  const grid = document.getElementById("documents-grid");
  const empty = document.getElementById("documents-grid-empty");
  if (!grid || !empty) return;

  try {
    const { documents } = await loadDocuments();
    const sorted = sortDocuments(documents);
    const items = sorted.slice(0, 8);

    if (items.length === 0) {
      empty.classList.remove("hidden");
      return;
    }

    grid.innerHTML = items.map(cardHtml).join("");
  } catch (e) {
    empty.classList.remove("hidden");
    empty.textContent = "資料データの読み込みに失敗しました。";
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

main();
