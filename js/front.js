const countrySelect = document.querySelector("#country");
const regionSelect = document.querySelector("#region");
const seeCatalogueBtn = document.querySelector("#see-catalogue");
const seeAllBtn = document.querySelector("#see-all");
const results = document.querySelector("#catalogue-results");
const resultsTitle = document.querySelector("#catalogue-title");
const resultsNote = document.querySelector("#catalogue-note");
const rideList = document.querySelector("#ride-list");
const basketCount = document.querySelector("#basket-count");
const basketList = document.querySelector("#basket-items");
const basketEmpty = document.querySelector("#basket-empty");
const basketNote = document.querySelector("#basket-note");

const BASKET_KEY = "rrh-basket";

let catalogue = null;
let basketIds = loadBasket();

function regionsFor(countryId) {
  const country = catalogue.countries.find((item) => item.id === countryId);
  return country ? country.regions : [];
}

function fillRegions(countryId, preferredRegionId) {
  const regions = regionsFor(countryId);
  regionSelect.replaceChildren();
  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region.id;
    option.textContent = region.name;
    regionSelect.append(option);
  }
  const match = regions.some((region) => region.id === preferredRegionId);
  regionSelect.value = match ? preferredRegionId : regions[0]?.id ?? "";
}

function placeLabel(ride) {
  const country = catalogue.countries.find((item) => item.id === ride.country);
  const region = country?.regions.find((item) => item.id === ride.region);
  const days = ride.days ? `${ride.days} days` : "";
  return [country?.name, region?.name, days].filter(Boolean).join(" · ");
}

function bundleItems(ride) {
  return ride.bundle?.items ?? [];
}

function partnerUrl(item) {
  const affiliate = item.affiliate ? catalogue.affiliates?.[item.affiliate] : null;
  if (!affiliate?.id) return item.url;
  const url = new URL(item.url);
  url.searchParams.set(affiliate.param, affiliate.id);
  return url.toString();
}

function loadBasket() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(BASKET_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveBasket() {
  sessionStorage.setItem(BASKET_KEY, JSON.stringify(basketIds));
}

function findItem(itemId) {
  for (const ride of catalogue.rides) {
    const item = bundleItems(ride).find((entry) => entry.id === itemId);
    if (item) return { ride, item };
  }
  return null;
}

function bundleInBasket(ride) {
  const items = bundleItems(ride);
  return items.length > 0 && items.every((item) => basketIds.includes(item.id));
}

function addBundle(ride) {
  for (const item of bundleItems(ride)) {
    if (!basketIds.includes(item.id)) basketIds.push(item.id);
  }
  saveBasket();
  renderBasket();
  refreshRideButtons();
}

function removeItem(itemId) {
  basketIds = basketIds.filter((id) => id !== itemId);
  saveBasket();
  renderBasket();
  refreshRideButtons();
}

function renderBasket() {
  basketList.replaceChildren();
  const lines = basketIds.map(findItem).filter(Boolean);
  basketCount.textContent = String(lines.length);
  basketEmpty.hidden = lines.length > 0;
  basketList.hidden = lines.length === 0;
  basketNote.hidden = lines.length === 0;

  for (const { item } of lines) {
    const row = document.createElement("li");
    row.className = "basket-item";

    const kind = document.createElement("p");
    kind.className = "basket-kind";
    kind.textContent = item.kind === "stay" ? "Stay" : "Ticket";

    const name = document.createElement("h3");
    name.textContent = item.name;

    const detail = document.createElement("p");
    detail.className = "basket-detail";
    detail.textContent = item.detail;

    const actions = document.createElement("div");
    actions.className = "basket-item-actions";

    const link = document.createElement("a");
    link.href = partnerUrl(item);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.linkLabel;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn-text";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeItem(item.id));

    actions.append(link, remove);
    row.append(kind, name, detail, actions);
    basketList.append(row);
  }
}

function rideCard(ride) {
  const item = document.createElement("li");
  const card = document.createElement("article");
  card.className = "ride-card";
  card.dataset.rideId = ride.id;

  const place = document.createElement("p");
  place.className = "ride-card-place";
  place.textContent = ride.place ? `${ride.place}${ride.days ? ` · ${ride.days} days` : ""}` : placeLabel(ride);

  const title = document.createElement("h3");
  title.textContent = ride.title;

  const summary = document.createElement("p");
  summary.className = "ride-card-summary";
  summary.textContent = ride.summary;

  card.append(place, title, summary);

  const items = bundleItems(ride);
  if (items.length > 0) {
    const list = document.createElement("ul");
    list.className = "bundle-list";
    for (const bundleItem of items) {
      const line = document.createElement("li");
      const label = bundleItem.kind === "stay" ? "Stay" : "Ticket";
      line.textContent = `${label} — ${bundleItem.name}`;
      list.append(line);
    }
    card.append(list);
  }

  const actions = document.createElement("div");
  actions.className = "ride-card-actions";

  if (items.length > 0) {
    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = "btn-primary";
    buy.dataset.bundleFor = ride.id;
    buy.textContent = bundleInBasket(ride) ? "In the basket" : ride.bundle.label;
    buy.disabled = bundleInBasket(ride);
    buy.addEventListener("click", () => addBundle(ride));
    actions.append(buy);
  }

  const mapLink = document.createElement("a");
  mapLink.className = "ride-card-action";
  mapLink.href = ride.href;
  mapLink.textContent = "Open map";
  actions.append(mapLink);
  card.append(actions);
  item.append(card);
  return item;
}

function refreshRideButtons() {
  for (const ride of catalogue.rides) {
    const button = rideList.querySelector(`[data-bundle-for="${ride.id}"]`);
    if (!button) continue;
    const packed = bundleInBasket(ride);
    button.textContent = packed ? "In the basket" : ride.bundle.label;
    button.disabled = packed;
  }
}

function renderRides(rides, heading, note) {
  results.hidden = false;
  resultsTitle.textContent = heading;
  resultsNote.textContent = note;
  rideList.replaceChildren();

  if (rides.length === 0) {
    const empty = document.createElement("p");
    empty.className = "catalogue-empty";
    empty.textContent = "No rides in this selection yet.";
    rideList.append(empty);
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  for (const ride of rides) rideList.append(rideCard(ride));
  results.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showFiltered() {
  const countryId = countrySelect.value;
  const regionId = regionSelect.value;
  const rides = catalogue.rides.filter(
    (ride) => ride.country === countryId && ride.region === regionId
  );
  const country = catalogue.countries.find((item) => item.id === countryId);
  const region = country?.regions.find((item) => item.id === regionId);
  const heading = [country?.name, region?.name].filter(Boolean).join(" · ");
  renderRides(rides, heading || "Catalogue", "Rides matching the filters above.");
}

function showAll() {
  renderRides(catalogue.rides, "All rides", "Every ride in the catalogue.");
}

countrySelect.addEventListener("change", () => {
  fillRegions(countrySelect.value);
});

seeCatalogueBtn.addEventListener("click", showFiltered);
seeAllBtn.addEventListener("click", showAll);

const response = await fetch("data/catalogue.json");
if (!response.ok) {
  throw new Error(`Could not load catalogue (${response.status})`);
}
catalogue = await response.json();

basketIds = basketIds.filter((id) => findItem(id));
saveBasket();
renderBasket();

countrySelect.replaceChildren();
for (const country of catalogue.countries) {
  const option = document.createElement("option");
  option.value = country.id;
  option.textContent = country.name;
  countrySelect.append(option);
}
countrySelect.value = "uk";
fillRegions("uk", "dorset");
