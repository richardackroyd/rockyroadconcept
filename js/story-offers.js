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

function renderDetail() {
  if (!storyDetail || storyDetail.hidden || !storyDetail.querySelector("h2")) return;
  if (storyDetail.querySelector(":scope > .story-buy-spot")) return;
  const title = storyDetail.querySelector("h2")?.textContent || "";
  const stopNames = [...storyDetail.querySelectorAll(".road-stop-btn strong")].map(
    (node) => node.textContent
  );
  const items = offersFor([title, ...stopNames]);
  if (!items.length) return;
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
}

function attachListBuys(list) {
  if (!list) return;
  const buttons = [...list.querySelectorAll(":scope > .ann-item")];
  for (const buy of [...list.querySelectorAll(":scope > .ann-buy")]) {
    const prev = buy.previousElementSibling;
    const title = prev?.querySelector("strong")?.textContent || "";
    const wanted = offersFor([title]);
    const stillWanted =
      prev?.classList.contains("ann-item") &&
      wanted.some((item) => buy.getAttribute("href") === partnerUrl(item));
    if (!stillWanted) buy.remove();
  }
  for (const button of buttons) {
    const title = button.querySelector("strong")?.textContent || "";
    let anchor = button;
    for (const item of offersFor([title])) {
      const href = partnerUrl(item);
      const next = anchor.nextElementSibling;
      if (next?.classList.contains("ann-buy") && next.getAttribute("href") === href) {
        anchor = next;
        continue;
      }
      const buy = document.createElement("a");
      buy.className = "btn-buy-here ann-buy";
      buy.href = href;
      buy.target = "_blank";
      buy.rel = "noopener noreferrer";
      buy.textContent = "Buy";
      anchor.after(buy);
      anchor = buy;
    }
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
