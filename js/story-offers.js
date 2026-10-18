const storyEmpty = document.querySelector("#cartoon-story-empty");
const storyDetail = document.querySelector("#cartoon-story-detail");
const storyBuys = document.querySelector("#story-buys");
const routeButtons = document.querySelector("#route-buttons");

let catalogue = null;
let painting = false;

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
  return (
    catalogue.rides.find((ride) => ride.mapTitle && label.startsWith(ride.mapTitle)) || null
  );
}

function offersFor(names) {
  const ride = activeRide();
  const items = ride?.bundle?.items || [];
  if (!names) return items;
  const haystack = names.join("\n").toLowerCase();
  return items.filter((item) =>
    (item.storyMatch || [item.name]).some((match) => haystack.includes(match.toLowerCase()))
  );
}

function buysHtml(items, heading) {
  const rows = items
    .map((item) => {
      const kind = item.kind === "stay" ? "Stay" : "Ticket";
      return `<li>
        <p class="story-buy-kind">${kind}</p>
        <strong>${escapeHtml(item.name)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        <a href="${escapeHtml(partnerUrl(item))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.linkLabel)}</a>
      </li>`;
    })
    .join("");
  return `<section class="story-buys">
    <p class="story-section-title">${escapeHtml(heading)}</p>
    <ul>${rows}</ul>
  </section>`;
}

function renderOverview() {
  if (!storyBuys) return;
  const items = offersFor(null);
  storyBuys.hidden = items.length === 0;
  storyBuys.innerHTML = items.length ? buysHtml(items, "Buy from this ride") : "";
}

function renderDetail() {
  if (!storyDetail || storyDetail.hidden) {
    renderOverview();
    return;
  }
  if (storyBuys) storyBuys.hidden = true;
  if (storyDetail.querySelector(":scope > .story-buys")) return;
  const title = storyDetail.querySelector("h2")?.textContent || "";
  const stopNames = [...storyDetail.querySelectorAll(".road-stop-btn strong")].map(
    (node) => node.textContent
  );
  const items = offersFor([title, ...stopNames]);
  if (!items.length) return;
  painting = true;
  storyDetail.insertAdjacentHTML("beforeend", buysHtml(items, "Link to buy"));
  painting = false;
}

function refresh() {
  if (painting || !catalogue) return;
  if (storyDetail && !storyDetail.hidden && storyDetail.querySelector("h2")) {
    renderDetail();
    return;
  }
  storyDetail?.querySelector(":scope > .story-buys")?.remove();
  renderOverview();
}

const response = await fetch("data/catalogue.json");
if (!response.ok) throw new Error(`Could not load catalogue (${response.status})`);
catalogue = await response.json();

const observer = new MutationObserver(() => refresh());
if (storyDetail) observer.observe(storyDetail, { childList: true, attributes: true, attributeFilter: ["hidden"] });
if (routeButtons) observer.observe(routeButtons, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
refresh();
