const API_BASE = "";
let hasLoadedOnce = false;
let deletePendingCode = null;

// Toast notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");

  const baseClasses =
    "min-w-[220px] max-w-xs px-4 py-2 rounded-lg text-sm shadow-md border backdrop-blur bg-white/90 dark:bg-slate-900/90 flex items-start gap-2";
  const typeClasses =
    type === "success"
      ? "border-emerald-300 text-emerald-800 dark:border-emerald-700 dark:text-emerald-200"
      : type === "error"
      ? "border-red-300 text-red-800 dark:border-red-700 dark:text-red-200"
      : "border-slate-300 text-slate-800 dark:border-slate-700 dark:text-slate-100";

  toast.className = baseClasses + " toast-enter";
  toast.innerHTML = `
    <span class="mt-[2px] text-xs">
      ${type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️"}
    </span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  // trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.remove("toast-enter");
    toast.classList.add("toast-enter-active");
  });

  // auto-dismiss
  setTimeout(() => {
    toast.classList.remove("toast-enter-active");
    toast.classList.add("toast-exit-active");
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, 2500);
}

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

  // Show skeletons only on very first load
  if (!hasLoadedOnce) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="p-4">
          <div class="space-y-3">
            <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
            <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          </div>
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

    // Remove any non-data rows (skeletons / placeholders)
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
    } else {
      showToast("Error refreshing links", "error");
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
      showToast(data.error || "Failed to create link", "error");
      return;
    }

    // Reset form
    urlInput.value = "";
    codeInput.value = "";

    // Update table with the new link immediately
    upsertRow(data);
    showToast("Short link created", "success");
  } catch (err) {
    console.error("Create link error:", err);
    showToast("Error creating link", "error");
  }
}

// Copy short URL to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showToast("Short URL copied", "success");
}

// Delete a link
// ---- Delete Link (uses confirmation modal) ----

function deleteLink(code) {
  deletePendingCode = code;

  const modal = document.getElementById("delete-modal");
  const panel = document.getElementById("delete-modal-panel");

  modal.classList.remove("hidden");
  modal.classList.add("flex", "modal-backdrop-open");

  requestAnimationFrame(() => {
    panel.classList.add("modal-panel-open");
  });
}

async function confirmDelete() {
  if (!deletePendingCode) return;

  try {
    const res = await fetch(`/api/links/${deletePendingCode}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Failed to delete", "error");
    } else {
      // Remove row immediately
      const row = document.querySelector(`tr[data-code="${deletePendingCode}"]`);
      if (row) row.remove();

      showToast("Link deleted", "success");
    }
  } catch (err) {
    console.error(err);
    showToast("Error deleting link", "error");
  }

  closeDeleteModal();
}

function closeDeleteModal() {
  const modal = document.getElementById("delete-modal");
  const panel = document.getElementById("delete-modal-panel");

  modal.classList.remove("modal-backdrop-open");
  panel.classList.remove("modal-panel-open");

  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 180);

  deletePendingCode = null;
}

// Bind buttons:
document.getElementById("delete-cancel-btn").addEventListener("click", closeDeleteModal);
document.getElementById("delete-confirm-btn").addEventListener("click", confirmDelete);

// Close modal when clicking backdrop
document.getElementById("delete-modal").addEventListener("click", (e) => {
  if (e.target.id === "delete-modal") {
    closeDeleteModal();
  }
});


// ---- Details Modal Logic ----

let detailsInterval = null;

function openDetailsModal(code) {
  const modal = document.getElementById("details-modal");
  const modalPanel = document.getElementById("details-modal-panel");
  const content = document.getElementById("details-content");

  // initial skeleton
  content.innerHTML = `
    <div class="space-y-3">
      <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
      <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
      <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div class="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex", "modal-backdrop-open");

  requestAnimationFrame(() => {
    modalPanel.classList.add("modal-panel-open");
  });

  // Load immediately
  loadLinkDetails(code);

  // Auto-refresh every 5 seconds
  detailsInterval = setInterval(() => {
    loadLinkDetails(code);
  }, 5000);
}

function closeDetailsModal() {
  const modal = document.getElementById("details-modal");
  const modalPanel = document.getElementById("details-modal-panel");
  const content = document.getElementById("details-content");

  modal.classList.remove("modal-backdrop-open");
  modalPanel.classList.remove("modal-panel-open");

  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    content.innerHTML = `<p class="text-slate-500">Loading...</p>`;
  }, 180);

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

async function loadLinkDetails(code) {
  const content = document.getElementById("details-content");

  try {
    const res = await fetch(`/api/links/${code}`);
    const data = await res.json();

    if (!res.ok) {
      content.innerHTML = `<p class="text-red-600">Link not found.</p>`;
      return;
    }

    const shortUrl = `${window.location.origin}/${data.code}`;

    content.innerHTML = `
      <div class="flex flex-col gap-4 text-sm">

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Short Code</h3>
          <p class="font-mono text-blue-600">${data.code}</p>
        </div>

        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Short Link</h3>
          <p class="font-mono break-all text-blue-600">${shortUrl}</p>
          <button
            type="button"
            class="mt-1 text-blue-600 text-xs hover:underline"
            onclick="navigator.clipboard.writeText('${shortUrl}'); showToast('Short URL copied', 'success');"
          >
            Copy
          </button>
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
          <p>${
            data.lastClickedAt
              ? new Date(data.lastClickedAt).toLocaleString()
              : "-"
          }</p>
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
    showToast("Error loading link details", "error");
  }
}
