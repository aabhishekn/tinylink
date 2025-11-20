// public/dashboard.js

const API_BASE = "";
let hasLoadedOnce = false;

document.addEventListener("DOMContentLoaded", () => {
  loadLinks();

  const form = document.getElementById("create-form");
  form.addEventListener("submit", handleCreateLink);

  // Auto-refresh links every 5 seconds, but now with smooth updates
  setInterval(() => {
    loadLinks();
  }, 5000);
});

// Fetch all links from backend
async function loadLinks() {
  const tableBody = document.getElementById("links-table-body");

  // Show loading only on first-ever load
  if (!hasLoadedOnce) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="p-4 text-center text-slate-500">
          Loading...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch(`${API_BASE}/api/links`);
    const links = await res.json();

    if (!Array.isArray(links)) {
      if (!hasLoadedOnce) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="p-4 text-center text-red-500">
              Failed to load links
            </td>
          </tr>
        `;
      }
      return;
    }

    hasLoadedOnce = true;

    // If no links at all → show placeholder and stop
    if (links.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="p-4 text-center text-slate-500">
            No links created yet
          </td>
        </tr>
      `;
      return;
    }

    // We have real data now → remove any placeholder rows
    Array.from(tableBody.querySelectorAll("tr:not([data-code])")).forEach(
      (row) => row.remove()
    );

    // Build a set of codes from the latest data
    const latestCodes = new Set(links.map((l) => l.code));

    // Remove rows that no longer exist in the latest data
    const existingRows = Array.from(
      tableBody.querySelectorAll("tr[data-code]")
    );
    existingRows.forEach((row) => {
      const code = row.getAttribute("data-code");
      if (!latestCodes.has(code)) {
        row.remove();
      }
    });

    // Upsert rows (update if exists, create if missing)
    links.forEach((link) => upsertRow(link));
  } catch (err) {
    console.error(err);
    if (!hasLoadedOnce) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="p-4 text-center text-red-500">
            Error loading links
          </td>
        </tr>
      `;
    }
  }
}

// Create or update a single table row
function upsertRow(link) {
  const tableBody = document.getElementById("links-table-body");
  const shortUrl = `${window.location.origin}/${link.code}`;

  let row = tableBody.querySelector(`tr[data-code="${link.code}"]`);

  if (!row) {
    // Create a new row if it doesn't exist
    row = document.createElement("tr");
    row.setAttribute("data-code", link.code);
    row.className = "border-b";

    row.innerHTML = `
      <td class="p-3 font-mono text-blue-600 underline cursor-pointer cell-code">
        ${link.code}
      </td>

      <td class="p-3 text-slate-700 break-all cell-target">
      </td>

      <td class="p-3 text-center cell-clicks"></td>

      <td class="p-3 text-center cell-last-clicked"></td>

      <td class="p-3 flex gap-3 justify-center cell-actions">
        <button class="text-sm text-blue-600 hover:underline btn-copy">
          Copy
        </button>
        <button class="text-sm text-red-600 hover:underline btn-delete">
          Delete
        </button>
      </td>
    `;

    // Click on code -> go to stats page
    row.querySelector(".cell-code").addEventListener("click", () => {
  openDetailsModal(link.code);
});

    // Copy button
    row.querySelector(".btn-copy").addEventListener("click", () => {
      copyToClipboard(shortUrl);
    });

    // Delete button
    row.querySelector(".btn-delete").addEventListener("click", () => {
      deleteLink(link.code);
    });

    tableBody.appendChild(row);
  }

  // Update dynamic cells (smooth update, no flicker)
  row.querySelector(".cell-target").textContent = link.targetUrl;
  row.querySelector(".cell-clicks").textContent = link.totalClicks;
  row.querySelector(".cell-last-clicked").textContent = link.lastClickedAt
    ? new Date(link.lastClickedAt).toLocaleString()
    : "-";
}

// Handle form submission
async function handleCreateLink(event) {
  event.preventDefault();

  const urlInput = document.getElementById("targetUrl");
  const codeInput = document.getElementById("customCode");

  const targetUrl = urlInput.value.trim();
  const customCode = codeInput.value.trim() || null;

  const payload = customCode ? { targetUrl, code: customCode } : { targetUrl };

  try {
    const res = await fetch(`${API_BASE}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to create link");
      return;
    }

    // Reset form
    urlInput.value = "";
    codeInput.value = "";

    // Update table with the new link immediately
    upsertRow(data);
  } catch (err) {
    console.error("Create link error:", err);
    alert("Error creating link");
  }
}

// Copy short URL to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Copied!");
}

// Delete a link
async function deleteLink(code) {
  if (!confirm(`Delete short link: ${code}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/links/${code}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to delete");
      return;
    }

    // Remove row from table immediately
    const row = document.querySelector(`tr[data-code="${code}"]`);
    if (row) row.remove();
  } catch (err) {
    console.error(err);
    alert("Error deleting link");
  }
}

// ---- Details Modal Logic ----

let detailsInterval = null;

function openDetailsModal(code) {
  const modal = document.getElementById("details-modal");
  const content = document.getElementById("details-content");

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Load immediately
  loadLinkDetails(code);

  // Auto-refresh every 5 seconds
  detailsInterval = setInterval(() => {
    loadLinkDetails(code);
  }, 5000);
}

function closeDetailsModal() {
  const modal = document.getElementById("details-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");

  const content = document.getElementById("details-content");
  content.innerHTML = `<p class="text-slate-500">Loading...</p>`;

  // Stop auto-refresh
  if (detailsInterval) {
    clearInterval(detailsInterval);
    detailsInterval = null;
  }
}

document
  .getElementById("close-details-modal")
  .addEventListener("click", closeDetailsModal);

document.getElementById("details-modal").addEventListener("click", (e) => {
  if (e.target.id === "details-modal") {
    closeDetailsModal();
  }
});

// Fetch & render details
async function loadLinkDetails(code) {
  const content = document.getElementById("details-content");
  content.innerHTML = `<p class="text-slate-500">Loading...</p>`;

  try {
    const res = await fetch(`/api/links/${code}`);
    const data = await res.json();

    if (!res.ok) {
      content.innerHTML = `<p class="text-red-600">Link not found.</p>`;
      return;
    }

    const shortUrl = `${window.location.origin}/${data.code}`;

    content.innerHTML = `
      <div class="flex flex-col gap-4">

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Short Code</h3>
          <p class="font-mono text-blue-600">${data.code}</p>
        </div>

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Short Link</h3>
          <p class="font-mono break-all text-blue-600">${shortUrl}</p>
          <button onclick="navigator.clipboard.writeText('${shortUrl}')" class="mt-1 text-blue-600 text-xs hover:underline">Copy</button>
        </div>

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Target URL</h3>
          <p class="break-all">${data.targetUrl}</p>
        </div>

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Total Clicks</h3>
          <p class="text-slate-800 dark:text-slate-100">${data.totalClicks}</p>
        </div>

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Last Clicked</h3>
          <p>${data.lastClickedAt ? new Date(data.lastClickedAt).toLocaleString() : "-"}</p>
        </div>

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Created At</h3>
          <p>${new Date(data.createdAt).toLocaleString()}</p>
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    content.innerHTML = `<p class="text-red-600">Error loading details.</p>`;
  }
}
