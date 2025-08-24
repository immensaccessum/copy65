const SITE = {
  brand: "Copy65",
  full: "Фотосалон «Фотография»",
  tagline: "Сувениры • фотопечать • ключи",
  phones: ["+7 914 090-83-81", "+7 924 196-10-42"],
  phoneLinks: ["+79140908381", "+79241961042"],
  addressLines: [
    "694500, Сахалинская область, Южно‑Курильск,",
    "квартал Ильичёва, 1А, Дом быта, оф.31",
  ],
  hours: [
    "Пн–Пт: 10:00–17:00 (обед 13:00–14:00)",
    "Суббота: 10:00–15:00",
    "Воскресенье: выходной",
  ],
  telegram: "https://t.me/Suveniry_Kunashir",
  mapLink: "https://yandex.ru/maps/?text=Южно-Курильск%20квартал%20Ильичёва%2C%201А%20Дом%20быта%20оф.%2031"
};

function prefix(depth){ return depth > 0 ? "../".repeat(depth) : ""; }
function humanize(s){ return s.replace(/-/g," ").replace(/(^|\s)\S/g, t=>t.toUpperCase()); }

function applyStoredTheme(){
  const key = localStorage.getItem("theme");
  if (key === "light" || key === "dark") document.documentElement.setAttribute("data-theme", key);
  else document.documentElement.removeAttribute("data-theme");
}

function toggleTheme(){
  const el = document.documentElement;
  const cur = el.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  el.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

function renderHeader(depth){
  const p = prefix(depth);
  const header = document.getElementById("site-header");
  header.innerHTML = `
    <div class="container topbar">
      <div class="brand-wrap">
        <!-- ИСПРАВЛЕНИЕ 1: Добавлен index.html -->
        <a href="${p}index.html" class="brand" style="text-decoration: none;">Copy<span class="dot">65</span></a>
        <div class="tagline">
          <a href="${p}souvenirs/">Сувениры</a> • 
          <a href="${p}services/">фотопечать</a> • 
          <a href="${p}services/#key-making">ключи</a>
        </div>
      </div>
      <div class="actions">
        <button class="theme-toggle" title="Сменить тему" type="button">🌓</button>
        <button class="nav-toggle" aria-expanded="false" aria-controls="topnav" title="Меню" type="button">☰</button>
        <nav id="topnav" class="nav" role="navigation">
          <!-- ИСПРАВЛЕНИЕ 1: Добавлен index.html -->
          <a href="${p}index.html">Главная</a>
          <a href="${p}services/">Услуги и цены</a>
          <a href="${p}souvenirs/">Сувениры</a>
          <a href="${p}guides/">Справочник</a>
          <a href="${p}contacts.html">Контакты</a>
        </nav>
      </div>
    </div>`;

  const btnMenu = header.querySelector(".nav-toggle");
  const nav = header.querySelector("#topnav");
  
  btnMenu.addEventListener("click", (event) => {
    // Останавливаем "всплытие" события, чтобы клик по кнопке не закрывал меню сразу же
    event.stopPropagation(); 
    const open = nav.classList.toggle("open");
    btnMenu.setAttribute("aria-expanded", String(open));
  });

  // ИСПРАВЛЕНИЕ 2: Закрытие меню по клику вне его
  document.addEventListener("click", (event) => {
    // Проверяем, открыто ли меню и был ли клик НЕ по меню и НЕ по кнопке
    if (nav.classList.contains("open") && !nav.contains(event.target) && !btnMenu.contains(event.target)) {
      nav.classList.remove("open");
      btnMenu.setAttribute("aria-expanded", "false");
    }
  });

  // Также останавливаем "всплытие" для кликов внутри самого меню
  nav.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const btnTheme = header.querySelector(".theme-toggle");
  btnTheme.addEventListener("click", toggleTheme);
}

// ИЗМЕНЕНО: Функция подвала теперь не содержит код Метрики
function renderFooter(){
  const el = document.getElementById("site-footer");
  el.innerHTML = `
    <div class="container">
      <div class="grid">
        <div>
          <strong>${SITE.full}</strong><br>
          ${SITE.addressLines[0]}<br>
          ${SITE.addressLines[1]}<br>
          <a href="${SITE.mapLink}" target="_blank" rel="noopener">Открыть в Яндекс Картах</a>
        </div>
        <div class="muted">
          Тел: <a href="tel:${SITE.phoneLinks[0]}">${SITE.phones[0]}</a>, <a href="tel:${SITE.phoneLinks[1]}">${SITE.phones[1]}</a><br>
          Часы: ${SITE.hours.join(" · ")}<br>
          TG: <a href="${SITE.telegram}" target="_blank" rel="noopener">${SITE.telegram}</a>
        </div>
      </div>
    </div>`;
}

// НОВАЯ ФУНКЦИЯ: Динамически создает и вставляет скрипт Метрики
function renderMetrika() {
  const metrikaId = 103867306; // Ваш ID счётчика
  
  (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
  })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

  ym(metrikaId, "init", {
      clickmap:true,
      trackLinks:true,
      accurateTrackBounce:true,
      webvisor:true
  });

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${metrikaId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
  document.body.appendChild(noscript);
}


(function init(){
  applyStoredTheme();
  const depth = Number(document.body.getAttribute("data-depth")||"0");
  const slug = document.body.getAttribute("data-slug") || "";
  renderHeader(depth);
  renderFooter();
  renderMetrika(); // ИЗМЕНЕНО: Добавлен вызов функции Метрики
})();