// ============================================================
// RepostShield — frontend logic (vanilla JS, no build step)
// ============================================================

// 👉 上线前唯一要改的地方：把这里换成你的 Lemon Squeezy 付款链接。
//   没有付款链接前，付费按钮会暂时指向"#"。
const UPGRADE_URL = "#";

const FREE_DAILY_LIMIT = 3;
const USAGE_KEY = "rs_usage";

const PLATFORMS = [
  { id: "youtube",   label: "YouTube",     icon: "▶️" },
  { id: "instagram", label: "Instagram",   icon: "📷" },
  { id: "tiktok",    label: "TikTok",      icon: "🎵" },
  { id: "twitter",   label: "X (Twitter)", icon: "🐦" },
  { id: "linkedin",  label: "LinkedIn",    icon: "💼" },
  { id: "facebook",  label: "Facebook",    icon: "👥" },
];

const $ = (sel) => document.querySelector(sel);

// ---------- usage tracking (localStorage) ----------
function today() { return new Date().toISOString().slice(0, 10); }

function getUsage() {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
    if (raw.date !== today()) return { date: today(), count: 0 };
    return raw;
  } catch (_) { return { date: today(), count: 0 }; }
}

function bumpUsage() {
  const u = getUsage();
  u.count += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  renderUsage();
}

function renderUsage() {
  const u = getUsage();
  const left = Math.max(0, FREE_DAILY_LIMIT - u.count);
  const el = $("#usageText");
  if (el) el.textContent = `${left} rewrite${left === 1 ? "" : "s"} left today`;
}

// ---------- platform checkboxes ----------
function renderPlatforms() {
  const wrap = $("#platforms");
  wrap.innerHTML = "";
  PLATFORMS.forEach((p) => {
    const label = document.createElement("label");
    label.className =
      "flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm hover:border-violet-500";
    label.innerHTML = `
      <input type="checkbox" value="${p.id}" checked class="accent-violet-500" />
      <span>${p.icon} ${p.label}</span>`;
    wrap.appendChild(label);
  });
}

function selectedPlatforms() {
  return [...document.querySelectorAll("#platforms input:checked")].map((i) => i.value);
}

// ---------- generate ----------
async function generate() {
  const content = $("#content").value.trim();
  const err = $("#errMsg");
  err.classList.add("hidden");

  if (content.length < 10) {
    showError("Please paste at least a short paragraph of content first.");
    return;
  }
  const platforms = selectedPlatforms();
  if (platforms.length === 0) {
    showError("Pick at least one platform.");
    return;
  }

  const btn = $("#generateBtn");
  btn.disabled = true;
  $("#btnLabel").textContent = "Generating…";
  $("#emptyState").classList.add("hidden");
  $("#results").classList.add("hidden");
  $("#loading").classList.remove("hidden");

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, platforms }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (data?.error === "SERVER_NOT_CONFIGURED") {
        showError("Server not configured yet: the owner needs to add the OpenRouter API key. See README.md → Step 2.");
      } else {
        showError(data?.message || `Request failed (${res.status}).`);
      }
      return;
    }

    bumpUsage();
    renderResults(data, platforms);
  } catch (e) {
    showError("Network error — is the server running? See README.md → Local preview.");
  } finally {
    btn.disabled = false;
    $("#btnLabel").textContent = "Generate for all platforms";
    $("#loading").classList.add("hidden");
  }
}

function showError(msg) {
  const err = $("#errMsg");
  err.textContent = msg;
  err.classList.remove("hidden");
}

// ---------- render results ----------
function renderResults(data, platforms) {
  const box = $("#results");
  box.innerHTML = "";
  box.classList.remove("hidden");

  if (data.summary) {
    const s = document.createElement("div");
    s.className = "rounded-xl border border-violet-500/30 bg-violet-600/10 p-3 text-sm text-violet-100";
    s.textContent = "💡 " + data.summary;
    box.appendChild(s);
  }

  // compliance report first (the differentiator)
  const compliance = Array.isArray(data.compliance) ? data.compliance : [];
  if (compliance.length > 0) {
    const head = document.createElement("div");
    head.className = "fade-in";
    head.innerHTML = `<h3 class="text-lg font-bold">🛡️ Compliance Report</h3>`;
    box.appendChild(head);
    compliance.forEach((c) => {
      const card = document.createElement("div");
      card.className =
        "fade-in mt-3 rounded-xl border p-3 text-sm " +
        (c.severity === "high" ? "sev-high" : c.severity === "medium" ? "sev-medium" : "sev-low");
      const plat = (PLATFORMS.find((p) => p.id === c.platform)?.label || c.platform).toUpperCase();
      card.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 font-semibold">
          <span>${plat}</span>
          <span class="rounded-full border px-2 py-0.5 text-xs uppercase">${c.severity}</span>
          <span class="text-xs opacity-80">${(c.type || "").replace(/_/g, " ")}</span>
        </div>
        <p class="mt-1 opacity-90">${escapeHtml(c.detail || "")}</p>
        <p class="mt-1">✏️ <b>Fix:</b> ${escapeHtml(c.suggestion || "")}</p>`;
      box.appendChild(card);
    });
  } else {
    const ok = document.createElement("div");
    ok.className = "fade-in rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200";
    ok.textContent = "🛡️ No compliance issues detected in the generated drafts.";
    box.appendChild(ok);
  }

  // platform versions
  const versions = data.versions || {};
  platforms.forEach((id) => {
    const v = versions[id];
    if (!v) return;
    const p = PLATFORMS.find((x) => x.id === id);
    const card = document.createElement("div");
    card.className = "fade-in card-glow rounded-2xl border border-white/10 bg-black/30 p-4";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <h4 class="font-bold">${p.icon} ${p.label}</h4>
        <button data-copy class="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/10">📋 Copy</button>
      </div>
      <div class="mt-3 space-y-3"></div>`;
    const body = card.querySelector("div.mt-3");

    Object.entries(v).forEach(([key, value]) => {
      const block = document.createElement("div");
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (Array.isArray(value)) {
        block.innerHTML = `<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">${label}</p>`;
        const chips = document.createElement("div");
        chips.className = "mt-1 flex flex-wrap gap-1.5";
        value.forEach((t) => {
          const chip = document.createElement("span");
          chip.className = "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs";
          chip.textContent = t;
          chips.appendChild(chip);
        });
        block.appendChild(chips);
      } else {
        block.innerHTML = `
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">${label}</p>
          <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-white/5 p-2 text-sm">${escapeHtml(String(value))}</pre>`;
      }
      body.appendChild(block);
    });

    card.querySelector("[data-copy]").addEventListener("click", () => {
      copyText(`${p.label}\n\n` + collectPlain(v));
    });
    box.appendChild(card);
  });

  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectPlain(v) {
  const lines = [];
  Object.entries(v).forEach(([key, value]) => {
    if (Array.isArray(value)) lines.push(key + ": " + value.join(", "));
    else lines.push(String(value));
  });
  return lines.join("\n\n");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();
  renderPlatforms();
  renderUsage();
  $("#generateBtn").addEventListener("click", generate);

  // if free limit reached, block generation (non-blocking hint)
  const u = getUsage();
  const canUse = u.count < FREE_DAILY_LIMIT;
  if (!canUse) {
    $("#generateBtn").disabled = true;
    $("#upgradeBox").classList.remove("hidden");
    $("#usageText").textContent = "Daily free limit reached";
  }

  // upgrade links
  document.querySelectorAll("[id^='upgradeLink'], #upgradeBtn2").forEach((a) => {
    a.href = UPGRADE_URL;
    if (UPGRADE_URL === "#") {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Paste your Lemon Squeezy link into app.js → UPGRADE_URL to enable checkout.");
      });
    }
  });
});
