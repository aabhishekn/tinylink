// public/dashboard.js

// API base URL (in production we may change it)
const API_BASE = "";

// When page loads, fetch all existing links
document.addEventListener("DOMContentLoaded", () => {
  loadLinks();
  
  const form = document.getElementById("create-form");
  form.addEventListener("submit", handleCreateLink);
});

// Fetch all links from backend
async function loadLinks() {
  const tableBody = document.getElementById("links-table-body");
  tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">Loading...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/api/links`);
    const links = await res.json();

    if (!Array.isArray(links)) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Failed to load links</td></tr>`;
      return;
    }

    if (links.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">No links created yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = "";
    links.forEach(link => renderTableRow(link));
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error loading links</td></tr>`;
  }
}

// Render each link as a row in the table
function renderTableRow(link) {
  const tableBody = document.getElementById("links-table-body");

  const shortUrl = `${window.location.origin}/${link.code}`;

  const row = document.createElement("tr");
  row.className = "border-b";

  row.innerHTML = `
    <td class="p-3 font-mono text-blue-600 underline cursor-pointer" onclick="window.open('/code/${link.code}', '_self')">
      ${link.code}
    </td>

    <td class="p-3 text-slate-700 break-all">
      ${link.targetUrl}
    </td>

    <td class="p-3 text-center">${link.totalClicks}</td>

    <td class="p-3 text-center">
      ${link.lastClickedAt ? new Date(link.lastClickedAt).toLocaleString() : "-"}
    </td>

    <td class="p-3 flex gap-3 justify-center">
      <button onclick="copyToClipboard('${shortUrl}')" class="text-sm text-blue-600 hover:underline">Copy</button>
      <button onclick="deleteLink('${link.code}')" class="text-sm text-red-600 hover:underline">Delete</button>
    </td>
  `;

  tableBody.appendChild(row);
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

    // Reload table
    loadLinks();
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

    loadLinks();
  } catch (err) {
    console.error(err);
    alert("Error deleting link");
  }
}
