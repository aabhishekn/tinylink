// public/code.js

const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
  const code = window.location.pathname.split("/").pop();
  loadStats(code);
});

async function loadStats(code) {
  const container = document.getElementById("stats-container");

  container.innerHTML = `<p class="text-slate-500">Loading...</p>`;

  try {
    const res = await fetch(`${API_BASE}/api/links/${code}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `
        <p class="text-red-600">Link not found.</p>
        <a href="/" class="text-blue-600 underline">Back to Dashboard</a>
      `;
      return;
    }

    const shortUrl = `${window.location.origin}/${data.code}`;

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">Short Code</h3>
          <p class="font-mono text-blue-600">${data.code}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-800">Short Link</h3>
          <p class="font-mono text-blue-600 break-all">${shortUrl}</p>
          <button onclick="copyToClipboard('${shortUrl}')" class="mt-1 text-sm text-blue-600 hover:underline">
            Copy
          </button>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-800">Target URL</h3>
          <p class="break-all text-slate-700">${data.targetUrl}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-800">Total Clicks</h3>
          <p>${data.totalClicks}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-800">Last Clicked</h3>
          <p>${data.lastClickedAt ? new Date(data.lastClickedAt).toLocaleString() : "-"}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-800">Created At</h3>
          <p>${new Date(data.createdAt).toLocaleString()}</p>
        </div>

        <a href="/" class="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Back to Dashboard
        </a>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-red-600">Error loading stats.</p>`;
    console.error(err);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Copied!");
}
