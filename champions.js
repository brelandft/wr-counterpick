// champions.html + champion.html (WR-only list + Data Dragon icons)

let COUNTERS = {};
let WR_ALLOW = new Set();
let DDRAGON_VERSION = null;
let CHAMPS = [];
let CHAMP_BY_NORM = new Map();

function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function loadDDragonVersion() {
  const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
  const versions = await res.json();
  DDRAGON_VERSION = versions[0];
}

async function loadWRAllowlist() {
  const res = await fetch("./data/wr_champions.json");
  const list = await res.json();
  WR_ALLOW = new Set(list.map(normalize));
}

async function loadChampionListFromDDragon() {
  const url = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`;
  const res = await fetch(url);
  const json = await res.json();

  const all = Object.values(json.data).map((c) => ({
    name: c.name,
    imageFull: c.image.full
  }));

  CHAMPS = all
    .filter((c) => WR_ALLOW.has(normalize(c.name)))
    .sort((a, b) => a.name.localeCompare(b.name));

  CHAMP_BY_NORM.clear();
  for (const c of CHAMPS) CHAMP_BY_NORM.set(normalize(c.name), c);
}

async function loadCounters() {
  const res = await fetch("./data/counters.json");
  COUNTERS = await res.json();
}

function iconUrlForName(champName) {
  const champ = CHAMP_BY_NORM.get(normalize(champName));
  if (!champ) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${champ.imageFull}`;
}

function makeIconInto(el, champName) {
  el.innerHTML = "";
  const url = DDRAGON_VERSION ? iconUrlForName(champName) : null;
  if (!url) {
    el.innerHTML = `<span class="placeholder">?</span>`;
    return;
  }
  const img = document.createElement("img");
  img.alt = champName;
  img.src = url;
  img.onerror = () => (el.innerHTML = `<span class="placeholder">?</span>`);
  el.appendChild(img);
}

function renderLane(listEl, counters) {
  listEl.innerHTML = "";
  if (!counters || counters.length === 0) {
    listEl.innerHTML = `<div class="counter-notes">Coming soon.</div>`;
    return;
  }

  counters.forEach((c) => {
    const card = document.createElement("div");
    card.className = "counter-card";

    const icon = document.createElement("div");
    icon.className = "champ-icon";
    makeIconInto(icon, c.champion);

    const main = document.createElement("div");
    main.className = "counter-main";

    const name = document.createElement("div");
    name.className = "counter-name";
    name.textContent = c.champion;

    const meta = document.createElement("div");
    meta.className = "counter-meta";

    const strength = c.strength || "Skill";
    const badge = document.createElement("span");
    badge.className = `badge ${strength.toLowerCase()}`;
    badge.textContent = strength;

    const notes = document.createElement("div");
    notes.className = "counter-notes";
    notes.textContent = c.notes || "";

    meta.appendChild(badge);
    main.appendChild(name);
    main.appendChild(meta);
    // NEW: tags row (optional)
if (Array.isArray(c.tags) && c.tags.length) {
  const tags = document.createElement("div");
  tags.className = "tag-row";
  tags.textContent = c.tags.join(" • ");
  main.appendChild(tags);
}

    main.appendChild(notes);

    card.appendChild(icon);
    card.appendChild(main);
    listEl.appendChild(card);
  });
}

function getParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

/* champions.html */
function initChampionsPage() {
  const grid = document.getElementById("champ-grid");
  const input = document.getElementById("champions-search");
  if (!grid || !input) return;

  function draw(list) {
    grid.innerHTML = "";
    list.forEach((c) => {
      const a = document.createElement("a");
      a.className = "champ-tile";
      a.href = `champion.html?name=${encodeURIComponent(c.name)}`;

      const icon = document.createElement("div");
      icon.className = "champ-icon champ-icon-lg";
      makeIconInto(icon, c.name);

      const label = document.createElement("div");
      label.className = "champ-label";
      label.textContent = c.name;

      a.appendChild(icon);
      a.appendChild(label);
      grid.appendChild(a);
    });
  }

  draw(CHAMPS);

  input.addEventListener("input", (e) => {
    const q = normalize(e.target.value);
    const filtered = !q ? CHAMPS : CHAMPS.filter((c) => normalize(c.name).includes(q));
    draw(filtered);
  });
}

/* champion.html */
function initChampionPage() {
  const title = document.getElementById("champion-title");
  const icon = document.getElementById("champion-icon");
  if (!title || !icon) return;

  const champName = getParam("name");
  const champ = champName ? CHAMP_BY_NORM.get(normalize(champName)) : null;

  if (!champ) {
    title.textContent = "Champion not found";
    return;
  }

  document.title = `${champ.name} • WR Counterpick`;
  title.textContent = champ.name;
  makeIconInto(icon, champ.name);

  const openBtn = document.getElementById("open-in-tool");
  if (openBtn) openBtn.href = `counter.html?enemy=${encodeURIComponent(champ.name)}`;

const data = (COUNTERS.champions && COUNTERS.champions[champ.name]) ? COUNTERS.champions[champ.name] : {};
  renderLane(document.getElementById("c-top"), data.top);
  renderLane(document.getElementById("c-jungle"), data.jungle);
  renderLane(document.getElementById("c-mid"), data.mid);
  renderLane(document.getElementById("c-adc"), data.adc);
  renderLane(document.getElementById("c-support"), data.support);

  const copyBtn = document.getElementById("copy-champ-link");
  const toast = document.getElementById("champ-toast");
  if (copyBtn && toast) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        const temp = document.createElement("input");
        temp.value = window.location.href;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
      }
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 1200);
    });
  }
}

(async function init() {
  await loadDDragonVersion();
  await loadWRAllowlist();
  await loadChampionListFromDDragon();
  await loadCounters();
  initChampionsPage();
  initChampionPage();
})();

