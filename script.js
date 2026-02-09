// counter.html logic (WR-only champion list + Data Dragon icons)

let COUNTERS = {};              // your curated counters (sparse is fine)
let WR_ALLOW = new Set();       // WR champion names (normalized)
let DDRAGON_VERSION = null;     // latest Data Dragon version
let CHAMPS = [];                // [{ name, imageFull }]
let CHAMP_BY_NORM = new Map();  // normalize(name) -> champ object

const searchInput = document.getElementById("champ-search");
const resultsList = document.getElementById("search-results");

const resultsSection = document.getElementById("results-section");
const enemyNameEl = document.getElementById("enemy-name");
const enemyIconEl = document.getElementById("enemy-icon");

const copyBtn = document.getElementById("copy-link");
const copyToast = document.getElementById("copy-toast");

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

  // Build full list from DDragon
  const all = Object.values(json.data).map((c) => ({
    name: c.name,
    imageFull: c.image.full
  }));

  // Filter to Wild Rift champs only (by name match)
  CHAMPS = all
    .filter((c) => WR_ALLOW.has(normalize(c.name)))
    .sort((a, b) => a.name.localeCompare(b.name));

  CHAMP_BY_NORM.clear();
  for (const c of CHAMPS) {
    CHAMP_BY_NORM.set(normalize(c.name), c);
  }
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

function makeIconForName(champName, sizeClass = "") {
  const wrap = document.createElement("div");
  wrap.className = `champ-icon ${sizeClass}`.trim();

  const url = DDRAGON_VERSION ? iconUrlForName(champName) : null;
  if (!url) {
    wrap.innerHTML = `<span class="placeholder">?</span>`;
    return wrap;
  }

  const img = document.createElement("img");
  img.alt = champName;
  img.src = url;
  img.onerror = () => (wrap.innerHTML = `<span class="placeholder">?</span>`);
  wrap.appendChild(img);

  return wrap;
}

function clearResults() {
  resultsList.innerHTML = "";
}

function getMatches(query) {
  const q = normalize(query);
  if (!q) return [];
  return CHAMPS.filter((c) => normalize(c.name).includes(q)).slice(0, 10);
}

function renderResults(matches) {
  resultsList.innerHTML = "";
  matches.forEach((c) => {
    const li = document.createElement("li");
    li.appendChild(makeIconForName(c.name));

    const name = document.createElement("span");
    name.textContent = c.name;
    li.appendChild(name);

    li.addEventListener("click", () => selectChampion(c.name));
    resultsList.appendChild(li);
  });
}

function setUrlEnemy(champName) {
  const url = new URL(window.location.href);
  url.searchParams.set("enemy", champName);
  window.history.replaceState({}, "", url);
}

function getUrlEnemy() {
  return new URL(window.location.href).searchParams.get("enemy");
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

    const icon = makeIconForName(c.champion);

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
    main.appendChild(notes);

    card.appendChild(icon);
    card.appendChild(main);

    listEl.appendChild(card);
  });
}

function renderCounters(enemyChampName) {
  resultsSection.classList.remove("hidden");
  enemyNameEl.textContent = `Enemy: ${enemyChampName}`;

  enemyIconEl.innerHTML = "";
  enemyIconEl.appendChild(makeIconForName(enemyChampName, "champ-icon-lg"));

  const data = COUNTERS[enemyChampName] || {};

  renderLane(document.getElementById("top-counters"), data.top);
  renderLane(document.getElementById("jungle-counters"), data.jungle);
  renderLane(document.getElementById("mid-counters"), data.mid);
  renderLane(document.getElementById("adc-counters"), data.adc);
  renderLane(document.getElementById("support-counters"), data.support);
}

function selectChampion(champName) {
  setUrlEnemy(champName);
  renderCounters(champName);
  clearResults();
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function copyLink() {
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

  copyToast.classList.remove("hidden");
  setTimeout(() => copyToast.classList.add("hidden"), 1200);
}

function wireUI() {
  searchInput.addEventListener("input", (e) => renderResults(getMatches(e.target.value)));

  document.addEventListener("click", (e) => {
    const clickedInSearch = e.target === searchInput || resultsList.contains(e.target);
    if (!clickedInSearch) clearResults();
  });

  copyBtn.addEventListener("click", copyLink);
}

(async function init() {
  await loadDDragonVersion();
  await loadWRAllowlist();
  await loadChampionListFromDDragon();
  await loadCounters();
  wireUI();

  const enemy = getUrlEnemy();
  if (enemy && WR_ALLOW.has(normalize(enemy))) {
    renderCounters(enemy);
  }
})();
