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
  return `<a class="btn-buy-here" href="${escapeHtml(partnerUrl(item))}" target="_blank" rel="noopener noreferrer">Buy Here</a>`;
}

function renderRideButton() {
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

function renderDetail() {
  if (!storyDetail || storyDetail.hidden || !storyDetail.querySelector("h2")) return;
  if (storyDetail.querySelector(":scope > .story-buy-spot")) return;
  const title = storyDetail.querySelector("h2")?.textContent || "";
  const stopNames = [...storyDetail.querySelectorAll(".road-stop-btn strong")].map(
    (node) => node.textContent
  );
  const items = offersFor([title, ...stopNames]);
  if (!items.length) return;
  painting = true;
  storyDetail.insertAdjacentHTML(
    "beforeend",
    `<div class="story-buy-spot">${items
      .map((item) =>
        items.length === 1
          ? buyHere(item)
          : `<div class="story-buy-row"><span>${escapeHtml(item.name)}</span>${buyHere(item)}</div>`
      )
      .join("")}</div>`
  );
  painting = false;
}

function refresh() {
  if (painting || !catalogue) return;
  renderRideButton();
  if (storyDetail && !storyDetail.hidden && storyDetail.querySelector("h2")) renderDetail();
}

buyRide.addEventListener("click", () => {
  rideOpen = !rideOpen;
  buyRide.setAttribute("aria-expanded", rideOpen ? "true" : "false");
  refresh();
});

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
refresh();
