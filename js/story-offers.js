const storyDetail = document.querySelector("#cartoon-story-detail");
const buyRide = document.querySelector("#buy-ride");
const buyList = document.querySelector("#ride-buy-list");
const routeButtons = document.querySelector("#route-buttons");

let catalogue = null;
let painting = false;
let rideOpen = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function partnerUrl(item) {
  const affiliate = item.affiliate ? catalogue.affiliates?.[item.affiliate] : null;
  if (!affiliate?.id) return item.url;
  const url = new URL(item.url);
  url.searchParams.set(affiliate.param, affiliate.id);
  return url.toString();
}

function activeRide() {
  if (!catalogue) return null;
  const active = routeButtons?.querySelector(".route-btn.is-active");
  const label = active?.textContent || "";
  return catalogue.rides.find((ride) => ride.mapTitle && label.startsWith(ride.mapTitle)) || null;
}

function rideItems() {
  return activeRide()?.bundle?.items || [];
}

function offersFor(names) {
  const items = rideItems();
  if (!names) return items;
  const haystack = names.join("\n").toLowerCase();
  return items.filter((item) =>
    (item.storyMatch || [item.name]).some((match) => haystack.includes(match.toLowerCase()))
  );
}

function buyHere(item) {
  return `<a class="btn-buy-here" href="${escapeHtml(partnerUrl(item))}" target="_blank" rel="noopener noreferrer">Buy</a>`;
}

function renderRideButton() {
  if (!buyRide || !buyList) return;
  const items = rideItems();
  buyRide.hidden = items.length === 0;
  if (items.length === 0) {
    rideOpen = false;
    buyList.hidden = true;
    buyList.innerHTML = "";
    return;
  }
  buyList.hidden = !rideOpen;
  if (!rideOpen) {
    buyList.innerHTML = "";
    return;
  }
  buyList.innerHTML = `<ul class="ride-buy-list">${items
    .map(
      (item) => `<li>
        <strong>${escapeHtml(item.name)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        ${buyHere(item)}
      </li>`
    )
    .join("")}</ul>`;
}

function makeStageBuy(item) {
  const buy = document.createElement("a");
  buy.className = "stage-buy";
  buy.href = partnerUrl(item);
  buy.target = "_blank";
  buy.rel = "noopener noreferrer";
  buy.textContent = "Buy";
  return buy;
}

function syncStageBuys(host, items) {
  const hrefs = items.map((item) => partnerUrl(item));
  const current = [...host.querySelectorAll(":scope > .stage-buy")].map((buy) => buy.getAttribute("href"));
  if (current.length === hrefs.length && current.every((href, index) => href === hrefs[index])) return;
  host.querySelectorAll(":scope > .stage-buy").forEach((buy) => buy.remove());
  for (const item of items) host.append(makeStageBuy(item));
}

function renderDetail() {
  if (!storyDetail || storyDetail.hidden || !storyDetail.querySelector("h2")) return;
  storyDetail.querySelector(":scope > .story-buy-spot")?.remove();
  const heading = storyDetail.querySelector("h2");
  const items = offersFor([heading.textContent || ""]);
  const row = heading.parentElement?.classList.contains("story-title-row") ? heading.parentElement : null;
  if (!items.length) {
    if (row) {
      row.querySelectorAll(":scope > .stage-buy").forEach((buy) => buy.remove());
      row.replaceWith(heading);
    }
  } else {
    const titleRow = row || document.createElement("div");
    if (!row) {
      titleRow.className = "story-title-row";
      heading.replaceWith(titleRow);
      titleRow.append(heading);
    }
    syncStageBuys(titleRow, items);
  }
  for (const button of storyDetail.querySelectorAll(".road-stop-btn")) {
    const stop = button.closest("li");
    if (!stop) continue;
    const stopItems = offersFor([button.querySelector("strong")?.textContent || ""]);
    if (!stopItems.length) {
      stop.classList.remove("has-stage-buy");
      stop.querySelectorAll(":scope > .stage-buy").forEach((buy) => buy.remove());
      continue;
    }
    stop.classList.add("has-stage-buy");
    syncStageBuys(stop, stopItems);
  }
}

function attachListBuys(list) {
  if (!list) return;
  for (const button of [...list.querySelectorAll(".ann-item")]) {
    const items = offersFor([button.querySelector("strong")?.textContent || ""]);
    const stage = button.parentElement?.classList.contains("ann-stage") ? button.parentElement : null;
    if (!items.length) {
      if (!stage) continue;
      stage.querySelectorAll(":scope > .stage-buy").forEach((buy) => buy.remove());
      stage.replaceWith(button);
      continue;
    }
    const host = stage || document.createElement("div");
    if (!stage) {
      host.className = "ann-stage";
      button.replaceWith(host);
      host.append(button);
    }
    syncStageBuys(host, items);
  }
}

function refresh() {
  if (painting || !catalogue) return;
  painting = true;
  renderRideButton();
  attachListBuys(document.querySelector("#list-cartoon"));
  attachListBuys(document.querySelector("#list-story"));
  attachListBuys(document.querySelector("#list-flyalong"));
  if (storyDetail && !storyDetail.hidden && storyDetail.querySelector("h2")) renderDetail();
  painting = false;
}

if (buyRide) {
  buyRide.addEventListener("click", () => {
    rideOpen = !rideOpen;
    buyRide.setAttribute("aria-expanded", rideOpen ? "true" : "false");
    refresh();
  });
}

const response = await fetch("data/catalogue.json");
if (!response.ok) throw new Error(`Could not load catalogue (${response.status})`);
catalogue = await response.json();

const observer = new MutationObserver(() => {
  const label = routeButtons?.querySelector(".route-btn.is-active")?.textContent || "";
  const ride = catalogue?.rides.find((item) => item.mapTitle && label.startsWith(item.mapTitle));
  if (!ride) rideOpen = false;
  refresh();
});
if (storyDetail) {
  observer.observe(storyDetail, { childList: true, attributes: true, attributeFilter: ["hidden"] });
}
if (routeButtons) {
  observer.observe(routeButtons, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}
for (const id of ["list-cartoon", "list-story", "list-flyalong"]) {
  const list = document.querySelector(`#${id}`);
  if (list) observer.observe(list, { childList: true });
}
refresh();
