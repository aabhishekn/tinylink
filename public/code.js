// public/code.js

const API_BASE = "";
let hasStatsLayout = false;

document.addEventListener("DOMContentLoaded", () => {
  const code = window.location.pathname.split("/").pop();
  loadStats(code);

  // Auto-refresh this link's stats every 5 seconds, but only update text
  setInterval(() => {
    loadStats(code);
  }, 5000);
});

async function loadStats(code) {
  const container = document.getElementById("stats-container");

  if (!hasStatsLayout) {
    container.innerHTML = `<p class="text-slate-500">Loading...</p>`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/links/${code}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `
        <p class="text-red-600 mb-2">Link not found.</p>
        <a href="/" class="text-blue-600 underline">Back to Dashboard</a>
      `;
      hasStatsLayout = false;
      return;
    }

    const shortUrl = `${window.location.origin}/${data.code}`;

    // First time: build the layout
    if (!hasStatsLayout) {
      container.innerHTML = `
        <div class="flex flex-col gap-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-800">Short Code</h3>
            <p id="stat-code" class="font-mono text-blue-600"></p>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-slate-800">Short Link</h3>
            <p id="stat-short-url" class="font-mono text-blue-600 break-all"></p>
            <button id="stat-copy-btn" class="mt-1 text-sm text-blue-600 hover:underline">
              Copy
            </button>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-slate-800">Target URL</h3>
            <p id="stat-target-url" class="break-all text-slate-700"></p>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-slate-800">Total Clicks</h3>
            <p id="stat-clicks"></p>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-slate-800">Last Clicked</h3>
            <p id="stat-last-clicked"></p>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-slate-800">Created At</h3>
            <p id="stat-created-at"></p>
          </div>

          <a href="/" class="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Back to Dashboard
          </a>
        </div>
      `;

      // Wire up copy button once
      document
        .getElementById("stat-copy-btn")
        .addEventListener("click", () => copyToClipboard(shortUrl));

      hasStatsLayout = true;
    }

    // Now just update text nodes (smooth updates)
    document.getElementById("stat-code").textContent = data.code;
    document.getElementById("stat-short-url").textContent = shortUrl;
    document.getElementById("stat-target-url").textContent = data.targetUrl;
    document.getElementById("stat-clicks").textContent = data.totalClicks;
    document.getElementById("stat-last-clicked").textContent = data.lastClickedAt
      ? new Date(data.lastClickedAt).toLocaleString()
      : "-";
    document.getElementById("stat-created-at").textContent = new Date(
      data.createdAt
    ).toLocaleString();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-red-600">Error loading stats.</p>`;
    hasStatsLayout = false;
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Copied!");
}
