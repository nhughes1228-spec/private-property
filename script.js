const STORAGE_KEY = "private-property-save-v1";
const AUTOSAVE_MS = 10000;
const MANAGER_COST_RATE = 0.5;
const MANAGER_SPEED_MULTIPLIER = 1.15;
const OFFLINE_CAP_SECONDS = 60 * 60 * 4;

const PROPERTY_TEMPLATES = [
  { id: "starter-bungalow", name: "Starter Bungalow", price: 500, grossRent: 25, upkeep: 3, cycleTime: 10, map: { x: "18%", y: "68%" } },
  { id: "tiny-rental-cabin", name: "Tiny Rental Cabin", price: 650, grossRent: 34, upkeep: 5, cycleTime: 12, map: { x: "34%", y: "72%" } },
  { id: "cedar-lane-cottage", name: "Cedar Lane Cottage", price: 850, grossRent: 45, upkeep: 6, cycleTime: 14, map: { x: "52%", y: "70%" } },
  { id: "oak-street-cottage", name: "Oak Street Cottage", price: 1250, grossRent: 70, upkeep: 9, cycleTime: 15, map: { x: "70%", y: "66%" } },
  { id: "blue-door-ranch", name: "Blue Door Ranch", price: 1600, grossRent: 92, upkeep: 13, cycleTime: 18, map: { x: "22%", y: "52%" } },
  { id: "garden-view-house", name: "Garden View House", price: 2100, grossRent: 125, upkeep: 18, cycleTime: 22, map: { x: "42%", y: "55%" } },
  { id: "pine-duplex", name: "Pine Duplex", price: 3000, grossRent: 180, upkeep: 25, cycleTime: 25, map: { x: "62%", y: "53%" } },
  { id: "corner-lot-duplex", name: "Corner Lot Duplex", price: 4200, grossRent: 260, upkeep: 38, cycleTime: 30, map: { x: "80%", y: "50%" } },
  { id: "brick-ranch", name: "Brick Ranch", price: 7500, grossRent: 475, upkeep: 70, cycleTime: 40, map: { x: "18%", y: "36%" } },
  { id: "sunset-split-level", name: "Sunset Split-Level", price: 9500, grossRent: 620, upkeep: 95, cycleTime: 45, map: { x: "36%", y: "38%" } },
  { id: "willow-creek-triplex", name: "Willow Creek Triplex", price: 12500, grossRent: 850, upkeep: 140, cycleTime: 50, map: { x: "54%", y: "36%" } },
  { id: "downtown-townhome", name: "Downtown Townhome", price: 18000, grossRent: 1250, upkeep: 210, cycleTime: 60, map: { x: "74%", y: "34%" } },
  { id: "historic-row-house", name: "Historic Row House", price: 24000, grossRent: 1700, upkeep: 330, cycleTime: 70, map: { x: "24%", y: "22%" } },
  { id: "lakeside-rental", name: "Lakeside Rental", price: 45000, grossRent: 3400, upkeep: 650, cycleTime: 90, map: { x: "44%", y: "22%" } },
  { id: "maple-fourplex", name: "Maple Fourplex", price: 65000, grossRent: 5100, upkeep: 1100, cycleTime: 105, map: { x: "64%", y: "20%" } },
  { id: "small-office-conversion", name: "Small Office Conversion", price: 85000, grossRent: 6800, upkeep: 1500, cycleTime: 115, map: { x: "82%", y: "20%" } },
  { id: "campus-rental-house", name: "Campus Rental House", price: 145000, grossRent: 12000, upkeep: 2900, cycleTime: 140, map: { x: "50%", y: "10%" } },
  { id: "small-apartment-building", name: "Small Apartment Building", price: 275000, grossRent: 24000, upkeep: 5500, cycleTime: 180, map: { x: "70%", y: "10%" } },
];

const UPGRADE_TEMPLATES = [
  { id: "curb-appeal", name: "Curb Appeal", costRate: 0.25, description: "+10% gross rent", rentMultiplier: 1.1, upkeepMultiplier: 1, speedMultiplier: 1 },
  { id: "efficient-appliances", name: "Efficient Appliances", costRate: 0.35, description: "-15% upkeep", rentMultiplier: 1, upkeepMultiplier: 0.85, speedMultiplier: 1 },
  { id: "premium-fixtures", name: "Premium Fixtures", costRate: 0.55, description: "+15% gross rent", rentMultiplier: 1.15, upkeepMultiplier: 1, speedMultiplier: 1 },
  { id: "preventive-maintenance", name: "Preventive Maintenance", costRate: 0.7, description: "-20% upkeep", rentMultiplier: 1, upkeepMultiplier: 0.8, speedMultiplier: 1 },
  { id: "smart-access", name: "Smart Access", costRate: 0.85, description: "10% faster cycles", rentMultiplier: 1, upkeepMultiplier: 1, speedMultiplier: 1.1 },
];

const defaultSettings = {
  sound: false,
  compactNumbers: false,
  reducedMotion: false,
};

const defaultStats = {
  lifetimeGrossRent: 0,
  lifetimeUpkeep: 0,
  lifetimeManagerSalaries: 0,
  lifetimeNetIncome: 0,
  manualCollections: 0,
  automaticCollections: 0,
  offlineCollections: 0,
  timePlayed: 0,
};

let state = createNewState();
let activeScreen = "properties";
let lastFrameTime = performance.now();
let lastAutosave = performance.now();
let autosaveLabel = "Autosave ready";
let audioContext = null;

const dom = {
  cashDisplay: document.querySelector("#cashDisplay"),
  propertiesList: document.querySelector("#propertiesList"),
  mapGrid: document.querySelector("#mapGrid"),
  emptyMap: document.querySelector("#emptyMap"),
  statsGrid: document.querySelector("#statsGrid"),
  managerUnlockNote: document.querySelector("#managerUnlockNote"),
  autosaveIndicator: document.querySelector("#autosaveIndicator"),
  toastRegion: document.querySelector("#toastRegion"),
  soundToggle: document.querySelector("#soundToggle"),
  compactToggle: document.querySelector("#compactToggle"),
  motionToggle: document.querySelector("#motionToggle"),
};

function managerCost(property) {
  return Math.round(property.price * MANAGER_COST_RATE);
}

function hasUpgrade(property, upgradeId) {
  return Array.isArray(property.upgrades) && property.upgrades.includes(upgradeId);
}

function upgradeCost(property, upgrade) {
  return Math.round(property.price * upgrade.costRate);
}

function upgradeMultipliers(property) {
  return UPGRADE_TEMPLATES.reduce((multipliers, upgrade) => {
    if (!hasUpgrade(property, upgrade.id)) return multipliers;
    return {
      rent: multipliers.rent * upgrade.rentMultiplier,
      upkeep: multipliers.upkeep * upgrade.upkeepMultiplier,
      speed: multipliers.speed * upgrade.speedMultiplier,
    };
  }, { rent: 1, upkeep: 1, speed: 1 });
}

function effectiveGrossRent(property) {
  return property.grossRent * upgradeMultipliers(property).rent;
}

function baseEffectiveUpkeep(property) {
  return property.upkeep * upgradeMultipliers(property).upkeep;
}

function effectiveUpkeep(property) {
  const baseUpkeep = baseEffectiveUpkeep(property);
  return property.managerHired ? baseUpkeep * 2 : baseUpkeep;
}

function effectiveCycleTime(property) {
  const speed = upgradeMultipliers(property).speed * (property.managerHired ? MANAGER_SPEED_MULTIPLIER : 1);
  return property.cycleTime / speed;
}

function effectiveNetRent(property) {
  return effectiveGrossRent(property) - effectiveUpkeep(property);
}

function effectiveIncomePerSecond(property) {
  return effectiveNetRent(property) / effectiveCycleTime(property);
}

function formatMoneyPerSecond(value) {
  const formatted = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 10 ? 1 : 2,
    maximumFractionDigits: value >= 10 ? 1 : 2,
  }).format(value);
  return `${formatted}/sec`;
}

function createNewState() {
  return {
    cash: 750,
    properties: PROPERTY_TEMPLATES.map((property) => ({
      ...property,
      managerCost: managerCost(property),
      managerSalary: 0,
      netRent: property.grossRent - property.upkeep,
      upgrades: [],
      owned: false,
      progress: 0,
      readyToCollect: false,
      managerHired: false,
    })),
    stats: { ...defaultStats },
    settings: { ...defaultSettings },
    lastSavedAt: null,
  };
}

function ownedProperties() {
  return state.properties.filter((property) => property.owned);
}

function managersUnlocked() {
  return true;
}

function formatMoney(value, options = {}) {
  const rounded = Math.round(value);
  if (state.settings.compactNumbers && Math.abs(rounded) >= 10000) {
    return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(rounded)}`;
  }
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    signDisplay: options.sign ? "always" : "auto",
  }).format(rounded);
}

function formatNumber(value) {
  if (state.settings.compactNumbers && Math.abs(value) >= 10000) {
    return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return Intl.NumberFormat("en-US").format(value);
}

function formatTime(totalSeconds) {
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function setScreen(screen) {
  activeScreen = screen;
  document.querySelectorAll(".screen").forEach((element) => {
    element.classList.toggle("active", element.id === `${screen}Screen`);
  });
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screen);
  });
  render();
}

function render() {
  renderChrome();
  renderProperties();
  renderMap();
  renderMenu();
}

function renderChrome() {
  dom.cashDisplay.textContent = formatMoney(state.cash);
  dom.managerUnlockNote.textContent = "Managers are available immediately. Owned buildings can also buy upgrades.";
  document.body.classList.toggle("reduced-motion", state.settings.reducedMotion);
}

function renderDynamic() {
  renderChrome();
  if (activeScreen === "map") updateMapProgress();
  if (activeScreen === "menu") renderMenu();
}

function renderProperties() {
  dom.propertiesList.innerHTML = state.properties.map((property) => {
    const statusClass = property.managerHired ? "managed" : property.owned ? "owned" : "";
    const statusText = property.managerHired ? "Managed" : property.owned ? "Owned" : "For sale";
    const netLabel = property.managerHired ? "Managed net" : "Net rent";
    const cycleLabel = property.managerHired
      ? `${effectiveCycleTime(property).toFixed(1)}s managed cycle`
      : `${effectiveCycleTime(property).toFixed(1)}s rent cycle`;
    const managerLine = property.owned
      ? `<div class="metric"><span>Manager</span><strong>${property.managerHired ? "Hired: auto +15%, upkeep x2" : `${formatMoney(managerCost(property))} bonus`}</strong></div>`
      : "";
    const upgradesLine = property.owned
      ? `<div class="metric"><span>Upgrades</span><strong>${property.upgrades.length}/${UPGRADE_TEMPLATES.length}</strong></div>`
      : "";
    const actions = property.owned
      ? `<button class="secondary-action" data-action="view-map" data-id="${property.id}" type="button">View on Map</button>${managerButtonMarkup(property)}${upgradeListMarkup(property)}`
      : `<button class="primary-action" data-action="buy" data-id="${property.id}" ${state.cash < property.price ? "disabled" : ""} type="button">Buy for ${formatMoney(property.price)}</button>`;

    return `
      <article class="property-card">
        <div class="property-top">
          <div>
            <h3 class="property-title">${property.name}</h3>
            <p class="muted">${cycleLabel}</p>
          </div>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="money-grid">
          <div class="metric"><span>Price</span><strong>${formatMoney(property.price)}</strong></div>
          <div class="metric"><span>Gross rent</span><strong>${formatMoney(effectiveGrossRent(property))}</strong></div>
          <div class="metric"><span>Upkeep</span><strong>${formatMoney(effectiveUpkeep(property))}</strong></div>
          <div class="metric"><span>${netLabel}</span><strong>${formatMoney(effectiveNetRent(property))}</strong></div>
          <div class="metric"><span>Income/sec</span><strong>${formatMoneyPerSecond(effectiveIncomePerSecond(property))}</strong></div>
          ${managerLine}
          ${upgradesLine}
        </div>
        <div class="card-actions">${actions}</div>
      </article>
    `;
  }).join("");
}

function managerButtonMarkup(property) {
  if (!property.owned || property.managerHired) return "";
  const cost = managerCost(property);
  const disabled = state.cash < cost ? "disabled" : "";
  return `<button data-action="hire-manager" data-id="${property.id}" ${disabled} type="button">Hire Manager ${formatMoney(cost)}</button>`;
}

function upgradeListMarkup(property) {
  const buttons = UPGRADE_TEMPLATES.map((upgrade) => {
    const purchased = hasUpgrade(property, upgrade.id);
    const cost = upgradeCost(property, upgrade);
    const disabled = purchased || state.cash < cost ? "disabled" : "";
    const label = purchased ? `${upgrade.name} purchased` : `${upgrade.name} ${formatMoney(cost)}`;
    return `<button class="upgrade-action" data-action="buy-upgrade" data-id="${property.id}" data-upgrade="${upgrade.id}" ${disabled} type="button"><span>${label}</span><small>${upgrade.description}</small></button>`;
  }).join("");
  return `<div class="upgrade-list"><strong>Building upgrades</strong>${buttons}</div>`;
}

function renderMap() {
  const owned = ownedProperties();
  dom.emptyMap.style.display = owned.length ? "none" : "grid";
  dom.mapGrid.classList.toggle("has-properties", owned.length > 0);
  dom.mapGrid.innerHTML = owned.map((property) => {
    const cycleTime = effectiveCycleTime(property);
    const progressPercent = Math.min(100, Math.round((property.progress / cycleTime) * 100));
    const label = property.readyToCollect ? "$" : `${progressPercent}%`;
    const status = property.managerHired ? "managed" : property.readyToCollect ? "ready to collect" : "filling";
    const collectDisabled = property.readyToCollect && !property.managerHired ? "" : "disabled";
    return `
      <article class="map-tile" style="--x:${property.map.x}; --y:${property.map.y};">
        <button class="rent-circle ${property.readyToCollect ? "ready" : ""}" style="--progress:${progressPercent}%;" data-label="${label}" data-action="collect" data-id="${property.id}" ${collectDisabled} type="button" aria-label="Collect rent from ${property.name}"></button>
        <span class="house-icon" aria-hidden="true">${property.managerHired ? "🏢" : "🏠"}</span>
        <div class="tile-name">${property.name}</div>
        <div class="tile-status" data-status="${property.id}">${status}</div>
      </article>
    `;
  }).join("");
}

function updateMapProgress() {
  ownedProperties().forEach((property) => {
    const circle = dom.mapGrid.querySelector(`.rent-circle[data-id="${property.id}"]`);
    const statusElement = dom.mapGrid.querySelector(`[data-status="${property.id}"]`);
    if (!circle || !statusElement) return;
    const progressPercent = Math.min(100, Math.round((property.progress / effectiveCycleTime(property)) * 100));
    const status = property.managerHired ? "managed" : property.readyToCollect ? "ready to collect" : "filling";
    circle.style.setProperty("--progress", `${progressPercent}%`);
    circle.dataset.label = property.readyToCollect ? "$" : `${progressPercent}%`;
    circle.classList.toggle("ready", property.readyToCollect);
    circle.disabled = !(property.readyToCollect && !property.managerHired);
    statusElement.textContent = status;
  });
}

function renderMenu() {
  const owned = ownedProperties();
  const managerCount = owned.filter((property) => property.managerHired).length;
  const upgradeCount = owned.reduce((total, property) => total + property.upgrades.length, 0);
  const stats = [
    ["Current cash", formatMoney(state.cash)],
    ["Lifetime gross", formatMoney(state.stats.lifetimeGrossRent)],
    ["Lifetime upkeep", formatMoney(state.stats.lifetimeUpkeep)],
    ["Manager overhead", formatMoney(state.stats.lifetimeManagerSalaries)],
    ["Lifetime net", formatMoney(state.stats.lifetimeNetIncome)],
    ["Properties owned", `${owned.length}`],
    ["Managers hired", `${managerCount}`],
    ["Upgrades purchased", `${upgradeCount}`],
    ["Manual collections", formatNumber(state.stats.manualCollections)],
    ["Auto collections", formatNumber(state.stats.automaticCollections)],
    ["Offline collections", formatNumber(state.stats.offlineCollections || 0)],
    ["Time played", formatTime(state.stats.timePlayed)],
  ];
  dom.statsGrid.innerHTML = stats.map(([label, value]) => `
    <div class="metric"><span>${label}</span><strong>${value}</strong></div>
  `).join("");

  dom.autosaveIndicator.textContent = autosaveLabel;
  dom.soundToggle.checked = state.settings.sound;
  dom.compactToggle.checked = state.settings.compactNumbers;
  dom.motionToggle.checked = state.settings.reducedMotion;
}

function buyProperty(id) {
  const property = state.properties.find((item) => item.id === id);
  if (!property || property.owned || state.cash < property.price) return;
  property.owned = true;
  property.progress = 0;
  state.cash -= property.price;
  toast(`${property.name} purchased`);
  saveGame("Saved after purchase");
  setScreen("map");
}

function buyUpgrade(propertyId, upgradeId) {
  const property = state.properties.find((item) => item.id === propertyId);
  const upgrade = UPGRADE_TEMPLATES.find((item) => item.id === upgradeId);
  if (!property || !property.owned || !upgrade || hasUpgrade(property, upgrade.id)) return;
  const cost = upgradeCost(property, upgrade);
  if (state.cash < cost) return;
  state.cash -= cost;
  property.upgrades.push(upgrade.id);
  toast(`${upgrade.name} added to ${property.name}`);
  saveGame("Saved after upgrade");
  render();
}

function collectRent(id, automatic = false, sourceElement = null) {
  const property = state.properties.find((item) => item.id === id);
  if (!property || !property.owned) return;
  if (!automatic && (!property.readyToCollect || property.managerHired)) return;

  applyRentCollection(property, automatic ? "automatic" : "manual", 1);
  property.progress = 0;
  property.readyToCollect = false;

  if (!automatic) {
    showFloatingMoney(formatMoney(effectiveNetRent(property), { sign: true }), sourceElement);
    playCollectSound();
    saveGame("Saved after rent collection");
  }
}

function applyRentCollection(property, type, count) {
  const gross = effectiveGrossRent(property) * count;
  const upkeep = effectiveUpkeep(property) * count;
  const managerOverhead = property.managerHired ? baseEffectiveUpkeep(property) * count : 0;
  const net = gross - upkeep;
  state.cash += net;
  state.stats.lifetimeGrossRent += gross;
  state.stats.lifetimeUpkeep += upkeep;
  state.stats.lifetimeManagerSalaries += managerOverhead;
  state.stats.lifetimeNetIncome += net;
  if (type === "offline") state.stats.offlineCollections = (state.stats.offlineCollections || 0) + count;
  else state.stats[type === "automatic" ? "automaticCollections" : "manualCollections"] += count;
  return net;
}

function hireManager(id) {
  const property = state.properties.find((item) => item.id === id);
  if (!property || !property.owned || property.managerHired) return;
  const cost = managerCost(property);
  if (state.cash < cost) return;
  state.cash -= cost;
  property.managerHired = true;
  property.managerCost = cost;
  property.managerSalary = 0;
  toast(`Manager hired for ${property.name}`);
  saveGame("Saved after manager hire");
  render();
}

function update(dt) {
  state.stats.timePlayed += dt;
  ownedProperties().forEach((property) => {
    const cycleTime = effectiveCycleTime(property);
    if (property.readyToCollect && !property.managerHired) return;
    property.progress += dt;
    if (property.managerHired) {
      while (property.progress >= cycleTime) {
        property.progress -= cycleTime;
        collectRent(property.id, true);
      }
      property.readyToCollect = false;
      return;
    }
    if (property.progress >= cycleTime) {
      property.progress = cycleTime;
      property.readyToCollect = true;
    }
  });
}

function applyOfflineProgress(elapsedSeconds) {
  if (elapsedSeconds <= 0) return 0;
  let offlineNet = 0;
  ownedProperties().forEach((property) => {
    const cycleTime = effectiveCycleTime(property);
    if (property.managerHired) {
      const totalProgress = property.progress + elapsedSeconds;
      const cycles = Math.floor(totalProgress / cycleTime);
      property.progress = totalProgress % cycleTime;
      property.readyToCollect = false;
      if (cycles > 0) offlineNet += applyRentCollection(property, "offline", cycles);
      return;
    }
    property.progress = Math.min(cycleTime, property.progress + elapsedSeconds);
    property.readyToCollect = property.progress >= cycleTime;
  });
  return offlineNet;
}

function gameLoop(now) {
  const dt = Math.min(1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  update(dt);
  if (now - lastAutosave >= AUTOSAVE_MS) {
    saveGame("Autosaved");
    lastAutosave = now;
  }
  renderDynamic();
  requestAnimationFrame(gameLoop);
}

function serializeState() {
  return {
    cash: state.cash,
    properties: state.properties.map((property) => ({
      id: property.id,
      owned: property.owned,
      progress: property.progress,
      readyToCollect: property.readyToCollect,
      managerHired: property.managerHired,
      upgrades: property.upgrades,
    })),
    stats: state.stats,
    settings: state.settings,
    lastSavedAt: Date.now(),
  };
}

function saveGame(label = "Saved") {
  const saveState = serializeState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
  state.lastSavedAt = saveState.lastSavedAt;
  autosaveLabel = `${label} at ${new Date(state.lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  renderMenu();
}

function loadGame(showToast = true) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    if (showToast) toast("No save found");
    return false;
  }
  try {
    const saved = JSON.parse(raw);
    const fresh = createNewState();
    fresh.cash = typeof saved.cash === "number" ? saved.cash : fresh.cash;
    fresh.stats = { ...defaultStats, ...saved.stats };
    fresh.settings = { ...defaultSettings, ...saved.settings };
    fresh.lastSavedAt = saved.lastSavedAt || null;
    const savedProperties = Array.isArray(saved.properties) ? saved.properties : [];
    fresh.properties = fresh.properties.map((property) => {
      const savedProperty = savedProperties.find((item) => item.id === property.id);
      if (!savedProperty) return property;
      return {
        ...property,
        owned: Boolean(savedProperty.owned),
        progress: clampNumber(savedProperty.progress, 0, effectiveCycleTime(property)),
        readyToCollect: Boolean(savedProperty.readyToCollect),
        managerHired: Boolean(savedProperty.managerHired),
        upgrades: Array.isArray(savedProperty.upgrades) ? savedProperty.upgrades.filter((id) => UPGRADE_TEMPLATES.some((upgrade) => upgrade.id === id)) : [],
      };
    });
    state = fresh;
    const elapsedSeconds = state.lastSavedAt ? Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (Date.now() - state.lastSavedAt) / 1000)) : 0;
    const offlineNet = applyOfflineProgress(elapsedSeconds);
    autosaveLabel = state.lastSavedAt
      ? `Loaded save from ${new Date(state.lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "Loaded save";
    if (showToast) toast(offlineNet > 0 ? `Offline earnings: ${formatMoney(offlineNet)}` : "Game loaded");
    render();
    if (offlineNet > 0) saveGame("Saved offline progress");
    return true;
  } catch (error) {
    console.error("Could not load save", error);
    toast("Save could not be loaded");
    return false;
  }
}

function resetGame() {
  if (!confirm("Reset your Private Property save?")) return;
  state = createNewState();
  localStorage.removeItem(STORAGE_KEY);
  autosaveLabel = "Save reset";
  saveGame("Saved reset");
  setScreen("properties");
  toast("Game reset");
}

function clampNumber(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toast(message) {
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  dom.toastRegion.append(element);
  setTimeout(() => element.remove(), 2100);
}

function showFloatingMoney(text, sourceElement) {
  const element = document.createElement("div");
  const rect = sourceElement?.getBoundingClientRect();
  element.className = "float-money";
  element.textContent = text;
  element.style.left = `${rect ? rect.left + rect.width / 2 - 22 : window.innerWidth / 2}px`;
  element.style.top = `${rect ? rect.top + 4 : window.innerHeight / 2}px`;
  document.body.append(element);
  setTimeout(() => element.remove(), 920);
}

function playCollectSound() {
  if (!state.settings.sound) return;
  audioContext ||= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(580, audioContext.currentTime);
  gain.gain.setValueAtTime(0.06, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.13);
}

function bindEvents() {
  document.querySelector(".bottom-nav").addEventListener("click", (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;
    setScreen(button.dataset.screen);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    if (action === "buy") buyProperty(id);
    if (action === "view-map") setScreen("map");
    if (action === "collect") collectRent(id, false, button);
    if (action === "hire-manager") hireManager(id);
    if (action === "buy-upgrade") buyUpgrade(id, button.dataset.upgrade);
  });

  document.querySelector("#saveBtn").addEventListener("click", () => {
    saveGame("Saved manually");
    toast("Game saved");
  });
  document.querySelector("#loadBtn").addEventListener("click", () => loadGame(true));
  document.querySelector("#resetBtn").addEventListener("click", resetGame);

  dom.soundToggle.addEventListener("change", () => updateSetting("sound", dom.soundToggle.checked));
  dom.compactToggle.addEventListener("change", () => updateSetting("compactNumbers", dom.compactToggle.checked));
  dom.motionToggle.addEventListener("change", () => updateSetting("reducedMotion", dom.motionToggle.checked));

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") toggleFullscreen();
  });
}

function updateSetting(key, value) {
  state.settings[key] = value;
  saveGame("Saved settings");
  render();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function renderGameToText() {
  const payload = {
    screen: activeScreen,
    cash: Math.round(state.cash),
    managersUnlocked: managersUnlocked(),
    stats: {
      grossRent: Math.round(state.stats.lifetimeGrossRent),
      upkeep: Math.round(state.stats.lifetimeUpkeep),
      managerOverhead: Math.round(state.stats.lifetimeManagerSalaries),
      netIncome: Math.round(state.stats.lifetimeNetIncome),
      manualCollections: state.stats.manualCollections,
      automaticCollections: state.stats.automaticCollections,
      offlineCollections: state.stats.offlineCollections || 0,
      timePlayedSeconds: Math.floor(state.stats.timePlayed),
    },
    visibleProperties: state.properties.map((property) => ({
      id: property.id,
      name: property.name,
      owned: property.owned,
      progressPercent: Math.round((property.progress / effectiveCycleTime(property)) * 100),
      readyToCollect: property.readyToCollect,
      managerHired: property.managerHired,
      managerCost: managerCost(property),
      upgrades: property.upgrades,
      effectiveGrossRent: effectiveGrossRent(property),
      effectiveCycleTime: effectiveCycleTime(property),
      effectiveUpkeep: effectiveUpkeep(property),
      effectiveNetRent: effectiveNetRent(property),
      effectiveIncomePerSecond: effectiveIncomePerSecond(property),
    })),
    coordinateSystem: "Map tile positions are percentages from the top-left of the map; x increases right, y increases down.",
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let index = 0; index < steps; index += 1) update(1 / 60);
  render();
};

bindEvents();
loadGame(false);
if (ownedProperties().length > 0) {
  setScreen("map");
} else {
  setScreen("properties");
}
requestAnimationFrame(gameLoop);
