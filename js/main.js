"use strict";
const CFG = window.SITE_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Участки — данные из презентации «Элгрант Пестрецы» (цена за сотку, ₽) */
const SITES = [
  { area: 20,   price: 700000, place: "Пестречинский р-н, Кощаковское с/п, д. Старое Кощаково" },
  { area: 25,   price: 750000, place: "Пестречинский р-н, Кощаковское с/п, д. Старое Кощаково" },
  { area: 32,   price: 624688, place: "Пестречинский р-н, Кощаковское с/п, д. Старое Кощаково" },
  { area: 38.7, price: 850659, place: "Пестречинский р-н, Кощаковское с/п, д. Старое Кощаково" },
  { area: 30,   price: 800000, place: "Пестречинский р-н, Шигалеевское с/п, с. Старое Шигалеево" }
];
const fmt = n => n.toLocaleString("ru-RU");

function renderSites(filter = "all") {
  const list = SITES.filter(s => filter === "all" || (filter === "small" ? s.area < 30 : s.area >= 30));
  $("#sites-grid").innerHTML = list.map(s => `
    <article class="card site">
      <div class="site__area">${fmt(s.area)} сот.</div>
      <div class="site__price">${fmt(s.price)} ₽ за сотку</div>
      <dl><dt>Назначение</dt><dd>промышленное</dd><dt>Расположение</dt><dd>${s.place}</dd></dl>
      <a href="#contacts">Оставить заявку</a>
    </article>`).join("");
  observe($$(".card", $("#sites-grid")));
}

/* Мобильное меню */
const burger = $("#burger"), nav = $("#nav");
const setMenu = open => {
  nav.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", open);
};
burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
nav.addEventListener("click", e => e.target.tagName === "A" && setMenu(false));
document.addEventListener("keydown", e => e.key === "Escape" && setMenu(false));

/* Анимации: появление при скролле и счётчики */
function countUp(el) {
  const to = +el.dataset.count, t0 = performance.now(), dur = 1200;
  const step = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add("is-in");
  $$("[data-count]", en.target).forEach(countUp);
  io.unobserve(en.target);
}), { threshold: .15 });
function observe(els) { els.forEach(el => { el.classList.add("reveal"); io.observe(el); }); }
observe($$(".reveal"));
$$(".hero [data-count]").forEach(countUp);

/* Фильтр участков */
$$(".chip").forEach(c => c.addEventListener("click", () => {
  $$(".chip").forEach(x => x.classList.toggle("is-active", x === c));
  renderSites(c.dataset.filter);
}));
renderSites();

/* Карта: контейнер и конфиг (координаты в презентации отсутствуют) */
const mapEl = $("#map");
if (CFG.mapEmbedUrl) {
  mapEl.innerHTML = `<iframe src="${CFG.mapEmbedUrl}" title="Карта проезда" loading="lazy"></iframe>`;
} else {
  mapEl.innerHTML = "<span>Точное расположение: [УТОЧНИТЬ]. Подключение карты — в js/config.js</span>";
}

/* Форма: валидация и состояния */
const form = $("#form"), status = $("#status");
const RULES = {
  name:  v => v.trim().length >= 2 || "Укажите имя",
  phone: v => /^[+\d][\d\s()-]{9,}$/.test(v.trim()) || "Укажите телефон, например +7 900 000-00-00",
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Укажите корректный email"
};
function validate() {
  let ok = true;
  Object.entries(RULES).forEach(([name, rule]) => {
    const input = form.elements[name], res = rule(input.value);
    input.classList.toggle("is-invalid", res !== true);
    input.nextElementSibling.textContent = res === true ? "" : res;
    if (res !== true) ok = false;
  });
  return ok;
}
function setStatus(text, type = "") { status.textContent = text; status.className = "form__status " + type; }

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!validate()) return setStatus("Проверьте поля формы", "err");
  if (!CFG.formEndpoint) {
    // TODO: подключить backend — укажите formEndpoint в js/config.js
    return setStatus("Приём заявок через сайт пока не подключён. Позвоните: +7 (843) 212-60-20", "err");
  }
  const btn = form.querySelector("button"); btn.disabled = true; setStatus("Отправка…");
  try {
    const res = await fetch(CFG.formEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    if (!res.ok) throw new Error(res.status);
    form.reset(); setStatus("Спасибо! Заявка отправлена, мы свяжемся с вами.", "ok");
  } catch { setStatus("Не удалось отправить заявку. Попробуйте позже или позвоните нам.", "err"); }
  finally { btn.disabled = false; }
});
form.addEventListener("input", e => e.target.classList.remove("is-invalid"));
