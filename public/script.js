(() => {
  "use strict";

  const $input = document.getElementById("nodeInput");
  const $submit = document.getElementById("submitBtn");
  const $btnText = $submit.querySelector(".btn-text");
  const $btnLoader = $submit.querySelector(".btn-loader");
  const $loadExample = document.getElementById("loadExampleBtn");
  const $clear = document.getElementById("clearBtn");
  const $error = document.getElementById("errorBanner");
  const $errorText = document.getElementById("errorText");
  const $dismissError = document.getElementById("dismissError");
  const $results = document.getElementById("resultsSection");
  const $hierarchies = document.getElementById("hierarchiesContainer");
  const $rawJson = document.getElementById("rawJson");
  const $issuesPanel = document.getElementById("issuesPanel");
  const $invalidCard = document.getElementById("invalidEntriesCard");
  const $duplicateCard = document.getElementById("duplicateEdgesCard");
  const $invalidList = document.getElementById("invalidList");
  const $duplicateList = document.getElementById("duplicateList");

  const $valTrees = document.getElementById("valTrees");
  const $valCycles = document.getElementById("valCycles");
  const $valLargest = document.getElementById("valLargest");
  const $valInvalid = document.getElementById("valInvalid");

  const EXAMPLE_DATA = [
    "A->B", "A->C", "B->D", "C->E", "E->F",
    "X->Y", "Y->Z", "Z->X",
    "P->Q", "Q->R",
    "G->H", "G->H", "G->I",
    "hello", "1->2", "A->"
  ];

  const API_BASE = window.location.origin;

  $loadExample.addEventListener("click", () => {
    $input.value = EXAMPLE_DATA.join(", ");
    $input.focus();
  });

  $clear.addEventListener("click", () => {
    $input.value = "";
    $results.hidden = true;
    hideError();
    $input.focus();
  });

  $dismissError.addEventListener("click", hideError);
  $submit.addEventListener("click", handleSubmit);

  $input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
  });

  async function handleSubmit() {
    hideError();

    const raw = $input.value.trim();
    if (!raw) {
      showError("Please enter at least one edge (e.g. A->B).");
      return;
    }

    const data = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bfhl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Server returned ${res.status}`);
      }

      const json = await res.json();
      renderResults(json);
    } catch (err) {
      showError(err.message || "Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  function renderResults(data) {
    $results.hidden = false;

    const s = data.summary || {};
    animateCount($valTrees, s.total_trees || 0);
    animateCount($valCycles, s.total_cycles || 0);
    $valLargest.textContent = s.largest_tree_root || "–";
    animateCount($valInvalid, (data.invalid_entries || []).length);

    $hierarchies.innerHTML = "";
    (data.hierarchies || []).forEach((h, i) => {
      const card = document.createElement("div");
      card.className = "hierarchy-card glass-card";
      card.style.animationDelay = `${i * 0.08}s`;

      const isCycle = !!h.has_cycle;
      const badgeClass = isCycle ? "badge-cycle" : "badge-tree";
      const tagClass = isCycle ? "tag-cycle" : "tag-tree";
      const tagLabel = isCycle ? "Cycle" : "Tree";

      let metaSub = `<span class="tag ${tagClass}">${tagLabel}</span>`;
      if (!isCycle && h.depth != null) {
        metaSub += `<span class="tag tag-depth">Depth ${h.depth}</span>`;
      }

      card.innerHTML = `
        <div class="hierarchy-header">
          <div class="hierarchy-root-badge ${badgeClass}">${h.root}</div>
          <div class="hierarchy-meta">
            <div class="hierarchy-meta-title">Root: ${h.root}</div>
            <div class="hierarchy-meta-sub">${metaSub}</div>
          </div>
        </div>
        <div class="hierarchy-body"></div>
      `;

      const body = card.querySelector(".hierarchy-body");
      if (isCycle) {
        body.innerHTML = `<div class="cycle-message">🔄 Cycle detected – tree structure unavailable</div>`;
      } else {
        body.appendChild(buildTreeView(h.tree));
      }

      $hierarchies.appendChild(card);
    });

    const invalids = data.invalid_entries || [];
    const dupes = data.duplicate_edges || [];
    const hasIssues = invalids.length > 0 || dupes.length > 0;
    $issuesPanel.hidden = !hasIssues;

    renderIssueList($invalidCard, $invalidList, invalids);
    renderIssueList($duplicateCard, $duplicateList, dupes);

    $rawJson.textContent = JSON.stringify(data, null, 2);
    $results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildTreeView(obj) {
    const container = document.createElement("div");
    container.className = "tree-view";
    const ul = buildTreeUl(obj);
    if (ul) container.appendChild(ul);
    return container;
  }

  function buildTreeUl(obj) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return null;

    const ul = document.createElement("ul");
    for (const key of keys) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="tree-node"><span class="tree-node-dot"></span>${key}</span>`;
      const childUl = buildTreeUl(obj[key]);
      if (childUl) li.appendChild(childUl);
      ul.appendChild(li);
    }
    return ul;
  }

  function renderIssueList(cardEl, listEl, items) {
    if (items.length === 0) {
      cardEl.hidden = true;
      return;
    }
    cardEl.hidden = false;
    listEl.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item || '""';
      listEl.appendChild(li);
    });
  }

  function showError(msg) {
    $errorText.textContent = msg;
    $error.hidden = false;
  }

  function hideError() {
    $error.hidden = true;
  }

  function setLoading(on) {
    $submit.disabled = on;
    $btnText.hidden = on;
    $btnLoader.hidden = !on;
  }

  function animateCount(el, target) {
    const duration = 600;
    const start = performance.now();
    const from = parseInt(el.textContent) || 0;
    if (from === target) {
      el.textContent = target;
      return;
    }
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (target - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
