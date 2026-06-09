const MANAGER_TARGET_INCOME_BONUS = 1.05;

function managerSpeedMultiplier(property) {
  const gross = effectiveGrossRent(property);
  const unmanagedUpkeep = baseEffectiveUpkeep(property);
  const unmanagedNet = gross - unmanagedUpkeep;
  const managedNet = gross - unmanagedUpkeep * 2;

  if (managedNet <= 0) return MANAGER_SPEED_MULTIPLIER;

  const requiredSpeed = (unmanagedNet / managedNet) * MANAGER_TARGET_INCOME_BONUS;
  return Math.max(MANAGER_SPEED_MULTIPLIER, requiredSpeed);
}

function effectiveCycleTime(property) {
  const upgradeSpeed = upgradeMultipliers(property).speed;
  const managerSpeed = property.managerHired ? managerSpeedMultiplier(property) : 1;
  return property.cycleTime / (upgradeSpeed * managerSpeed);
}

function refreshManagerLabels() {
  document.querySelectorAll(".metric strong").forEach((element) => {
    if (element.textContent === "Hired: auto +15%, upkeep x2") {
      element.textContent = "Hired: auto, slight IPS boost, upkeep x2";
    }
  });
}

const originalRender = render;
render = function patchedRender() {
  originalRender();
  refreshManagerLabels();
};

const originalRenderDynamic = renderDynamic;
renderDynamic = function patchedRenderDynamic() {
  originalRenderDynamic();
  refreshManagerLabels();
};

render();
