const CONFIG = window.CAFE_CONFIG || {};
const IS_CONFIGURED = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_PUBLISHABLE_KEY && window.supabase);
const USE_REMOTE = IS_CONFIGURED && CONFIG.DEMO_MODE === false;
const PUBLIC_ORDER_BOARD = CONFIG.PUBLIC_ORDER_BOARD === true;
const db = USE_REMOTE
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY)
  : null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const savedLanguage = localStorage.getItem("cafe-kiosk-language") === "en" ? "en" : "ko";
const tr = (ko, en) => state.language === "en" ? en : ko;
const won = (value) => state.language === "en"
  ? `₩${Number(value || 0).toLocaleString("en-US")}`
  : `${Number(value || 0).toLocaleString("ko-KR")}원`;
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

const state = {
  language: savedLanguage,
  categories: [],
  items: [],
  options: [],
  category: "all",
  orderType: "takeout",
  cart: [],
  activeItem: null,
  editingCartKey: null,
  optionQuantity: 1,
  usingRemoteData: false,
  staffDemo: false,
  staffOrders: [],
  staffPin: "",
  staffPollTimer: null,
  ragMessages: [],
  ragPendingOrder: null,
  ragFocusedMenuIds: [],
  ragFocusLevel: "medium",
  preserveCategoryOnNextRagSubmit: false,
  ignoreHistoryOnNextRagSubmit: false,
  ragRequestId: 0,
  ragSending: false,
  pendingOrder: null,
  connectionMessage: "메뉴 준비 중",
  connectionMode: "",
  teamFeedback: [],
};

const categoryKorean = { all: "전체", coffee: "커피", noncoffee: "논커피", tea: "티", dessert: "푸드" };
const categoryEnglish = { all: "All", coffee: "Coffee", noncoffee: "Non-Coffee", tea: "Tea", dessert: "Food" };
const menuImageSources = {
  americano: "./assets/menu/americano.jpg",
  "cafe-latte": "./assets/menu/cafe-latte.jpg",
  "vanilla-latte": "./assets/menu/vanilla-latte.jpg",
  "flat-white": "./assets/menu/flat-white.jpg",
  "matcha-latte": "./assets/menu/matcha-latte.jpg",
  chocolate: "./assets/menu/chocolate.jpg",
  "lemon-ade": "./assets/menu/lemon-ade.jpg",
  "earl-grey": "./assets/menu/earl-grey.jpg",
  "citron-tea": "./assets/menu/citron-tea.jpg",
  croissant: "./assets/menu/croissant.jpg",
  financier: "./assets/menu/financier.jpg",
  cheesecake: "./assets/menu/cheesecake.jpg",
};
const itemEnglish = {
  americano: ["Americano", "Deep espresso with water for a clean finish"],
  "cafe-latte": ["Cafe Latte", "A smooth balance of espresso and milk"],
  "vanilla-latte": ["Vanilla Latte", "Gentle vanilla with rich espresso"],
  "flat-white": ["Flat White", "Bold ristretto with silky milk foam"],
  "matcha-latte": ["Matcha Latte", "Rich Jeju matcha with smooth milk"],
  chocolate: ["Real Chocolate", "A bittersweet dark chocolate drink"],
  "lemon-ade": ["Lemon Ade", "Fresh lemon with sparkling soda"],
  "earl-grey": ["Earl Grey Tea", "Black tea with a bright bergamot aroma"],
  "citron-tea": ["Citron Tea", "Warm tea with sweet citron pieces"],
  croissant: ["Butter Croissant", "Crisp, flaky and buttery pastry"],
  financier: ["Salted Financier", "Brown butter balanced with a hint of salt"],
  cheesecake: ["Basque Cheesecake", "Deep and creamy cheese flavor"],
};
const optionEnglish = {
  "temp-hot": "HOT", "temp-ice": "ICE", "size-regular": "Regular", "size-large": "Large",
  "extra-shot": "Extra Shot", "extra-decaf": "Decaf", "extra-oat": "Oat Milk",
  "warm-dessert": "Warmed", "plain-dessert": "As Is",
};
const groupEnglish = { "온도": "Temperature", "크기": "Size", "추가": "Extras", "데우기": "Heating" };
const itemKoreanDescriptionOverrides = {
  americano: "진한 에스프레소에 물을 더한 깊고 깔끔한 풍미",
};
const itemName = (item) => state.language === "en" ? itemEnglish[item.id]?.[0] || item.name : item.name;
const itemDescription = (item) => state.language === "en"
  ? itemEnglish[item.id]?.[1] || item.description
  : itemKoreanDescriptionOverrides[item.id] || item.description;
const optionName = (option) => state.language === "en" ? optionEnglish[option.id] || option.name : option.name;
const optionGroupName = (name) => state.language === "en" ? groupEnglish[name] || name : name;

const staticTranslations = [
  [".brand strong", "카페 키오스크 - 1조", "Cafe Kiosk - Team 1"],
  ["#orderTab", "주문", "Order"], ["#feedbackTab", "피드백", "Feedback"],
  ["[data-order-type='takeout']", "포장", "Takeout"], ["[data-order-type='dine_in']", "매장", "Dine In"],
  ["#staffButton", "운영자", "Staff"], ["#ragTitle", "AI 주문 도우미", "AI Order Assistant"],
  ["#ragResetButton", "대화·장바구니 초기화", "Reset Chat & Cart"],
  ["[data-rag-prompt]:nth-child(1)", "식사 페어링", "Food Pairing"], ["[data-rag-prompt]:nth-child(2)", "메뉴 비교", "Compare"],
  ["[data-rag-prompt]:nth-child(3)", "옵션 주문", "Custom Order"], ["[data-rag-prompt]:nth-child(4)", "장바구니 확인", "View Cart"],
  ["#ragSendButton", "보내기", "Send"], [".rag-notice", "검색·대화 로직은 브라우저에서 실행되며, 최종 가격과 주문은 Supabase가 다시 검증합니다.", "Search and chat run in your browser. Supabase verifies final prices and orders."],
  ["#cartTitle", "주문 내역", "My Order"], [".cart-summary > div:nth-child(1) span", "상품 금액", "Subtotal"],
  [".cart-summary > div:nth-child(2) span", "할인", "Discount"], [".cart-total span", "결제 예정 금액", "Total"],
  [".cart-summary > div:nth-child(2) strong", "0원", "₩0"],
  [".payment-note", "※ 실제 카드 승인 기능은 결제 단말 연동 후 사용할 수 있습니다.", "※ Card authorization requires a connected payment terminal."],
  ["#feedbackPanel h1", "추가 의견", "Additional Feedback"],
  [".feedback-intro", "키오스크를 사용하며 느낀 점을 간단히 남겨 주세요.", "Leave a short note about your kiosk experience."],
  [".feedback-name > span", "이름", "Name"],
  [".feedback-comment > span", "의견", "Feedback"],
  ["#feedbackSubmitButton", "의견 저장", "Save Feedback"],
  ["#feedbackHistoryTitle", "저장된 의견", "Saved Feedback"],
  ["#optionForm .quantity-row > span", "수량", "Quantity"],
  ["#checkoutDialog h2", "주문 내용을 확인해 주세요", "Review Your Order"],
  [".payment-methods legend", "결제 방법", "Payment Method"],
  [".payment-methods label:nth-of-type(1) strong", "카드 결제", "Card"], [".payment-methods label:nth-of-type(1) small", "단말기에서 결제", "Pay at terminal"],
  [".payment-methods label:nth-of-type(2) strong", "카운터 결제", "Pay at Counter"], [".payment-methods label:nth-of-type(2) small", "직원에게 직접 결제", "Pay a staff member"],
  [".consent-row span", "메뉴와 주문 유형을 확인했습니다.", "I reviewed the items and order type."],
  ["#placeOrderButton", "주문 접수하기", "Place Order"], ["#successDialog h2", "주문이 접수되었습니다", "Order Received"],
  ["#successDialog > p:not(.eyebrow)", "준비가 완료되면 주문번호를 불러드릴게요.", "We will call your number when the order is ready."],
  [".order-number span", "주문번호", "Order Number"], ["#newOrderButton", "새 주문 시작", "Start New Order"],
];

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.title = tr("카페 키오스크 - 1조", "Cafe Kiosk - Team 1");
  $("#languageButton").textContent = state.language === "ko" ? "한 / EN" : "EN / 한";
  $("#languageButton").setAttribute("aria-label", tr("영어로 변경", "Switch to Korean"));
  updateFullscreenButton();
  staticTranslations.forEach(([selector, ko, en]) => {
    const element = $(selector);
    if (element) element.textContent = state.language === "en" ? en : ko;
  });
  $("#ragInput").placeholder = tr("예: 아메리카노 두 잔 담아 줘", "e.g. Add two Americanos");
  $("#feedbackName").placeholder = tr("예: 홍길동", "e.g. Alex");
  $("#feedbackComment").placeholder = tr("예: 메뉴 검색이 편리했습니다.", "e.g. The menu search was convenient.");
  setConnection(state.connectionMessage, state.connectionMode);
  renderCategories();
  renderMenu();
  renderCart();
  renderFeedbackHistory();
  if (state.activeItem && $("#optionDialog").open) openOptions(state.activeItem.id);
}

const categoryColors = {
  coffee: "#6d4634",
  noncoffee: "#c46b45",
  tea: "#4f715d",
  dessert: "#b47a3f",
};

function setConnection(message, mode = "") {
  state.connectionMessage = message;
  state.connectionMode = mode;
  const element = $("#connectionStatus");
  const english = {
    "메뉴 준비 중": "Loading menu", "실시간 메뉴": "Live menu", "데모 메뉴": "Demo menu",
    "오프라인 메뉴": "Offline menu", "메뉴 오류": "Menu error",
  };
  element.textContent = state.language === "en" ? english[message] || message : message;
  element.className = `connection-status ${mode}`.trim();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2500);
}

function fullscreenElement() {
  return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement
    || null;
}

function fullscreenEnterMethod() {
  const root = document.documentElement;
  return {
    context: root,
    method: root.requestFullscreen
      || root.webkitRequestFullscreen
      || root.mozRequestFullScreen
      || root.msRequestFullscreen
      || null,
  };
}

function fullscreenExitMethod() {
  return document.exitFullscreen
    || document.webkitExitFullscreen
    || document.webkitCancelFullScreen
    || document.mozCancelFullScreen
    || document.msExitFullscreen
    || null;
}

function waitForFullscreenState(active, timeout = 1200) {
  if (Boolean(fullscreenElement()) === active) return Promise.resolve(true);
  return new Promise((resolve) => {
    const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
    let timer;
    const finish = () => {
      events.forEach((eventName) => document.removeEventListener(eventName, onChange));
      clearTimeout(timer);
      resolve(Boolean(fullscreenElement()) === active);
    };
    const onChange = () => {
      if (Boolean(fullscreenElement()) === active) finish();
    };
    events.forEach((eventName) => document.addEventListener(eventName, onChange));
    timer = setTimeout(finish, timeout);
  });
}

function updateFullscreenButton() {
  const button = $("#fullscreenButton");
  if (!button) return;
  const active = Boolean(fullscreenElement());
  const label = active ? tr("전체화면 종료", "Exit Fullscreen") : tr("전체화면", "Fullscreen");
  const accessibleLabel = active ? tr("전체화면 종료", "Exit fullscreen") : tr("전체화면으로 보기", "View fullscreen");
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-label", accessibleLabel);
  button.title = accessibleLabel;
  const text = $("span", button);
  if (text) text.textContent = label;
}

async function toggleFullscreen() {
  const entering = !fullscreenElement();
  const button = $("#fullscreenButton");
  button.disabled = true;
  try {
    if (!entering) {
      const exit = fullscreenExitMethod();
      if (!exit) throw new Error("Fullscreen exit is unavailable");
      await Promise.resolve(exit.call(document));
    } else {
      const { context, method } = fullscreenEnterMethod();
      if (!method) {
        toast(tr("이 브라우저는 전체화면을 지원하지 않습니다.", "This browser does not support fullscreen."));
        return;
      }
      await Promise.resolve(method.call(context));
    }
    const changed = await waitForFullscreenState(entering);
    if (!changed) {
      const message = entering
        ? tr("전체화면으로 전환되지 않았습니다. 브라우저 권한을 확인해 주세요.", "Fullscreen did not open. Check browser permissions.")
        : tr("전체화면을 종료하지 못했습니다. 브라우저의 뒤로 또는 Esc를 눌러 주세요.", "Fullscreen did not close. Use the browser Back button or Esc.");
      toast(message);
    }
  } catch (error) {
    console.error(error);
    const message = entering
      ? tr("전체화면을 열 수 없습니다. 브라우저 설정을 확인해 주세요.", "Fullscreen could not be opened. Check your browser settings.")
      : tr("전체화면을 종료하지 못했습니다. 브라우저의 뒤로 또는 Esc를 눌러 주세요.", "Fullscreen could not be closed. Use the browser Back button or Esc.");
    toast(message);
  } finally {
    button.disabled = false;
    updateFullscreenButton();
  }
}

function switchPageTab(tabName) {
  const showFeedback = tabName === "feedback";
  $("#orderPanel").hidden = showFeedback;
  $("#feedbackPanel").hidden = !showFeedback;
  $$(`[data-page-tab]`).forEach((button) => {
    const active = button.dataset.pageTab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function feedbackRecords() {
  try {
    const records = JSON.parse(localStorage.getItem("cafe-kiosk-feedback") || "[]");
    return Array.isArray(records) ? records : [];
  } catch (_error) {
    return [];
  }
}

async function loadTeamFeedback() {
  try {
    const response = await fetch("./team-feedback.json");
    if (!response.ok) throw new Error("team feedback unavailable");
    const records = await response.json();
    state.teamFeedback = Array.isArray(records) ? records.map((record) => ({ ...record, seeded: true })) : [];
  } catch (error) {
    console.error(error);
    state.teamFeedback = [];
  }
  renderFeedbackHistory();
}

function renderFeedbackHistory() {
  const personal = feedbackRecords().map((record) => ({ ...record, note: String(record.note || record.comment || "") })).filter((record) => record.note).reverse();
  const records = [...personal, ...state.teamFeedback];
  $("#feedbackCount").textContent = tr(`${records.length}건`, `${records.length} saved`);
  $("#feedbackHistory").innerHTML = records.length ? records.map((record) => `
    <article class="feedback-history-item ${record.seeded ? "team-feedback" : ""}">
      <div><strong>${escapeHtml(record.author ? `${record.author}님` : tr("직접 입력", "Personal"))}</strong>${record.created_at ? `<time datetime="${escapeHtml(record.created_at)}">${escapeHtml(new Date(record.created_at).toLocaleString(state.language === "en" ? "en-US" : "ko-KR"))}</time>` : ""}${record.order_type ? `<span>${record.order_type === "dine_in" ? tr("매장", "Dine In") : tr("포장", "Takeout")}</span>` : ""}</div>
      <p>${escapeHtml(record.note)}</p>
      ${record.seeded ? "" : `<button type="button" data-feedback-id="${escapeHtml(record.id)}">${tr("삭제", "Delete")}</button>`}
    </article>`).join("") : `<p class="feedback-empty">${tr("아직 저장된 의견이 없습니다.", "No feedback has been saved yet.")}</p>`;
}

function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const author = $("#feedbackName").value.trim().replace(/님$/u, "");
  const note = $("#feedbackComment").value.trim();
  const status = $("#feedbackStatus");
  if (!author) {
    status.textContent = tr("이름을 입력해 주세요.", "Please enter your name.");
    return;
  }
  if (!note) {
    status.textContent = tr("의견을 입력해 주세요.", "Please enter your feedback.");
    return;
  }
  const records = feedbackRecords();
  records.push({
    id: crypto.randomUUID?.() || `feedback-${Date.now()}`,
    author,
    note,
    order_type: state.orderType,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem("cafe-kiosk-feedback", JSON.stringify(records.slice(-30)));
  form.reset();
  status.textContent = tr("의견을 저장했습니다.", "Feedback saved.");
  renderFeedbackHistory();
}

async function loadLocalMenu() {
  const response = await fetch("./menu.json");
  if (!response.ok) throw new Error("로컬 메뉴 파일을 읽지 못했습니다.");
  return response.json();
}

async function loadMenu() {
  setConnection("메뉴 준비 중");
  try {
    if (db) {
      const [categoriesResult, itemsResult, optionsResult] = await Promise.all([
        db.from("categories").select("id,name,sort_order").eq("active", true).order("sort_order"),
        db.from("menu_items").select("id,category_id,name,description,price,badge,available,sort_order").eq("available", true).order("sort_order"),
        db.from("menu_options").select("id,menu_item_id,group_name,name,price_delta,sort_order").eq("active", true).order("sort_order"),
      ]);
      const firstError = categoriesResult.error || itemsResult.error || optionsResult.error;
      if (firstError) throw firstError;
      state.categories = [{ id: "all", name: "전체", sort_order: 0 }, ...categoriesResult.data];
      state.items = itemsResult.data;
      state.options = optionsResult.data;
      state.usingRemoteData = true;
      setConnection("실시간 메뉴", "online");
    } else {
      const menu = await loadLocalMenu();
      state.categories = menu.categories;
      state.items = menu.items;
      state.options = menu.options;
      setConnection("데모 메뉴", "offline");
    }
  } catch (error) {
    console.error(error);
    const menu = await loadLocalMenu();
    state.categories = menu.categories;
    state.items = menu.items;
    state.options = menu.options;
    state.usingRemoteData = false;
    setConnection("오프라인 메뉴", "offline");
  }
  renderCategories();
  renderMenu();
}

function renderCategories() {
  $("#categoryTabs").innerHTML = state.categories.map((category) => `
    <button class="category-button ${category.id === state.category ? "active" : ""}"
      type="button" data-category="${escapeHtml(category.id)}">${escapeHtml(state.language === "en" ? categoryEnglish[category.id] || category.name : categoryKorean[category.id] || category.name)}</button>
  `).join("");
}

function renderMenu() {
  const visible = state.items.filter((item) => {
    const categoryMatch = state.category === "all" || item.category_id === state.category;
    return item.available !== false && categoryMatch;
  });

  const selectedCategory = state.categories.find((category) => category.id === state.category);
  $("#categoryTitle").textContent = selectedCategory?.id === "all" ? tr("전체 메뉴", "All Menu") : selectedCategory ? (state.language === "en" ? categoryEnglish[selectedCategory.id] || selectedCategory.name : categoryKorean[selectedCategory.id] || selectedCategory.name) : tr("메뉴", "Menu");
  $("#menuGrid").innerHTML = visible.length ? visible.map((item) => {
    const focusIndex = state.ragFocusedMenuIds.indexOf(item.id);
    const focusClass = focusIndex >= 0 ? `rag-focused rag-focus-${state.ragFocusLevel}` : "";
    return `
    <article class="menu-card ${focusClass}" data-menu-id="${escapeHtml(item.id)}">
      <button class="menu-card-select" type="button" data-menu-selection-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(tr(`${item.name} 메뉴 보기`, `View ${itemName(item)}`))}">
        ${menuImageSources[item.id] ? `<img class="menu-card-image" src="${menuImageSources[item.id]}" alt="${escapeHtml(itemName(item))}" width="300" height="313" loading="lazy" decoding="async" />` : ""}
        <span class="menu-card-copy">
          <h3>${escapeHtml(itemName(item))}</h3>
          <strong>${won(item.price)}</strong>
        </span>
      </button>
    </article>
  `;
  }).join("") : `<div class="menu-empty"><strong>${tr("검색 결과가 없습니다.", "No results found.")}</strong><br />${tr("다른 메뉴 이름을 입력해 보세요.", "Try another menu name.")}</div>`;
}

function isDrink(item) {
  return ["coffee", "noncoffee", "tea"].includes(item.category_id);
}

function isLatte(item) {
  return item.name.includes("라테") || item.id.includes("latte") || item.id === "flat-white";
}

function applicableOptions(item) {
  return state.options.filter((option) => {
    if (option.menu_item_id === item.id) return true;
    if (option.menu_item_id === "*drink") return isDrink(item);
    if (option.menu_item_id === "*coffee") return item.category_id === "coffee";
    if (option.menu_item_id === "*latte") return isLatte(item);
    if (option.menu_item_id === "*dessert") return item.category_id === "dessert";
    return false;
  });
}

function groupOptions(item) {
  return applicableOptions(item).reduce((groups, option) => {
    (groups[option.group_name] ||= []).push(option);
    return groups;
  }, {});
}

function openOptions(itemId, cartEntryKey = null) {
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item) return;
  const cartEntry = cartEntryKey ? state.cart.find((entry) => entry.key === cartEntryKey) : null;
  state.activeItem = item;
  state.editingCartKey = cartEntry?.key || null;
  state.optionQuantity = cartEntry?.quantity || 1;
  $("#optionItemName").textContent = itemName(item);
  $("#optionItemDescription").textContent = itemDescription(item);
  $("#optionQuantity").textContent = state.optionQuantity;

  const groups = groupOptions(item);
  $("#optionGroups").innerHTML = Object.entries(groups).map(([groupName, options]) => {
    const isMultiple = groupName === "추가";
    return `
      <fieldset class="option-group" data-option-group="${escapeHtml(groupName)}">
        <legend>${escapeHtml(optionGroupName(groupName))}${isMultiple ? tr(" (선택)", " (optional)") : ""}</legend>
        <div class="option-choice-grid">
          ${options.map((option, index) => {
            const selected = cartEntry
              ? cartEntry.options.some((entryOption) => entryOption.id === option.id)
              : !isMultiple && index === 0;
            return `
            <label class="option-choice">
              <input type="${isMultiple ? "checkbox" : "radio"}" name="option-${escapeHtml(groupName)}"
                value="${escapeHtml(option.id)}" ${selected ? "checked" : ""} />
              <span>${escapeHtml(optionName(option))}</span>
              <small>${option.price_delta ? `+${won(option.price_delta)}` : tr("추가금 없음", "No extra charge")}</small>
            </label>
          `; }).join("")}
        </div>
      </fieldset>`;
  }).join("");

  updateAddButtonPrice();
  $("#optionDialog").showModal();
}

function selectedDialogOptions() {
  return $$("#optionGroups input:checked").map((input) => state.options.find((option) => option.id === input.value)).filter(Boolean);
}

function selectedUnitPrice() {
  return (state.activeItem?.price || 0) + selectedDialogOptions().reduce((sum, option) => sum + Number(option.price_delta || 0), 0);
}

function updateAddButtonPrice() {
  const actionLabel = state.editingCartKey ? tr("변경사항 적용", "Apply Changes") : tr("장바구니에 담기", "Add to Cart");
  $("#addToCartButton").textContent = `${won(selectedUnitPrice() * state.optionQuantity)} · ${actionLabel}`;
}

function cartKey(itemId, options) {
  return `${itemId}:${options.map((option) => option.id).sort().join(",")}`;
}

function addActiveItemToCart() {
  if (!state.activeItem) return;
  const options = selectedDialogOptions();
  const editingKey = state.editingCartKey;
  if (editingKey) state.cart = state.cart.filter((entry) => entry.key !== editingKey);
  addItemToCart(state.activeItem, options, state.optionQuantity);
  state.editingCartKey = null;
  $("#optionDialog").close();
  toast(editingKey
    ? tr(`${state.activeItem.name} 옵션을 변경했습니다.`, `${itemName(state.activeItem)} options updated.`)
    : tr(`${state.activeItem.name}을(를) 담았습니다.`, `${itemName(state.activeItem)} added to cart.`));
}

function addItemToCart(item, options, quantity = 1) {
  const key = cartKey(item.id, options);
  const existing = state.cart.find((entry) => entry.key === key);
  if (existing) {
    existing.quantity = Math.min(20, existing.quantity + quantity);
  } else {
    const unitPrice = Number(item.price) + options.reduce((sum, option) => sum + Number(option.price_delta || 0), 0);
    state.cart.push({ key, item, options, quantity: Math.min(20, quantity), unitPrice });
  }
  renderCart();
  announceCartChange(tr(`${item.name} ${Math.min(20, quantity)}개를 장바구니에 반영했습니다.`, `${Math.min(20, quantity)} ${itemName(item)} added to the cart.`));
}

function defaultOptionsFor(item) {
  const groups = groupOptions(item);
  return Object.entries(groups)
    .filter(([name]) => name !== "추가")
    .map(([, options]) => options[0])
    .filter(Boolean);
}

function cartTotal() {
  return state.cart.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0);
}

function announceCartChange(message) {
  const status = $("#cartLiveStatus");
  if (status) status.textContent = message;
}

function renderCart() {
  const count = state.cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const total = cartTotal();
  $("#cartCount").textContent = count;
  $(".cart-heading").dataset.mobileLabel = count ? tr(`${count}개 메뉴`, `${count} item${count === 1 ? "" : "s"}`) : tr("장바구니가 비었어요", "Cart is empty");
  $("#cartItems").innerHTML = state.cart.length ? state.cart.map((entry) => `
    <article class="cart-item" data-cart-edit="${escapeHtml(entry.key)}">
      <button class="cart-item-head cart-item-edit" type="button" data-cart-edit="${escapeHtml(entry.key)}" aria-label="${escapeHtml(tr(`${entry.item.name} 옵션 수정`, `Edit options for ${itemName(entry.item)}`))}">
        <div><h3>${escapeHtml(itemName(entry.item))}</h3><p>${escapeHtml(entry.options.map(optionName).join(" · ") || tr("기본", "Default"))}</p></div>
        <strong>${won(entry.unitPrice * entry.quantity)}</strong>
      </button>
      <div class="cart-item-actions">
        <div class="stepper">
          <button type="button" data-cart-action="decrease" data-cart-key="${escapeHtml(entry.key)}" aria-label="${escapeHtml(entry.item.name)} 수량 줄이기">−</button>
          <output>${entry.quantity}</output>
          <button type="button" data-cart-action="increase" data-cart-key="${escapeHtml(entry.key)}" aria-label="${escapeHtml(entry.item.name)} 수량 늘리기">＋</button>
        </div>
        <button class="remove-button" type="button" data-cart-action="remove" data-cart-key="${escapeHtml(entry.key)}">${tr("삭제", "Remove")}</button>
      </div>
    </article>
  `).join("") : `<div class="cart-empty"><div><span aria-hidden="true">☕</span><strong>${tr("아직 담은 메뉴가 없어요", "Your cart is empty")}</strong><br /><small>${tr("왼쪽 메뉴를 눌러 시작해 보세요.", "Select a menu item to get started.")}</small></div></div>`;
  $("#subtotal").textContent = won(total);
  $("#total").textContent = won(total);
  $("#checkoutTotal").textContent = won(total);
  $("#checkoutLabel").textContent = count ? tr(`${count}개 주문하기`, `Order ${count} item${count === 1 ? "" : "s"}`) : tr("메뉴를 담아 주세요", "Add items to cart");
  $("#checkoutButton").disabled = !count;
}

function updateCartItem(key, action) {
  const entry = state.cart.find((candidate) => candidate.key === key);
  if (!entry) return;
  if (action === "increase") entry.quantity = Math.min(20, entry.quantity + 1);
  if (action === "decrease") entry.quantity -= 1;
  if (action === "remove" || entry.quantity < 1) state.cart = state.cart.filter((candidate) => candidate.key !== key);
  renderCart();
  const verb = action === "increase" ? tr("수량을 늘렸습니다.", "Quantity increased.")
    : action === "decrease" ? tr("수량을 줄였습니다.", "Quantity decreased.")
      : tr("장바구니에서 삭제했습니다.", "Removed from the cart.");
  announceCartChange(`${itemName(entry.item)}: ${verb}`);
}

function openCheckout() {
  if (!state.cart.length) return;
  const orderTypeLabel = state.orderType === "takeout" ? tr("포장", "Takeout") : tr("매장 이용", "Dine In");
  $("#checkoutSummary").innerHTML = `
    <div><span>${tr("주문 유형", "Order Type")}</span><strong>${orderTypeLabel}</strong></div>
    <div><span>${tr("메뉴 수량", "Items")}</span><strong>${state.cart.reduce((sum, entry) => sum + entry.quantity, 0)}${tr("개", "")}</strong></div>
    <div class="grand-total"><span>${tr("결제 예정 금액", "Total")}</span><strong>${won(cartTotal())}</strong></div>`;
  $("#orderConsent").checked = false;
  $("#checkoutError").textContent = "";
  $("#checkoutDialog").showModal();
}

function orderPayload() {
  return state.cart.map((entry) => ({
    menu_item_id: entry.item.id,
    quantity: entry.quantity,
    option_ids: entry.options.map((option) => option.id),
  }));
}

function demoOrder(paymentMethod) {
  const orderNumber = String(Math.floor(100 + Math.random() * 900));
  const order = {
    id: crypto.randomUUID?.() || `demo-${Date.now()}`,
    order_number: orderNumber,
    order_type: state.orderType,
    payment_method: paymentMethod,
    status: "received",
    total_amount: cartTotal(),
    created_at: new Date().toISOString(),
    order_items: state.cart.map((entry) => ({
      item_name: entry.item.name,
      quantity: entry.quantity,
      unit_price: entry.unitPrice,
      option_summary: entry.options.map((option) => option.name).join(", "),
    })),
  };
  state.staffOrders.unshift(order);
  return { order_number: orderNumber, id: order.id, total_amount: order.total_amount };
}

async function createOrder(paymentMethod) {
  if (!state.usingRemoteData || !db) return demoOrder(paymentMethod);
  const signature = JSON.stringify({ orderType: state.orderType, paymentMethod, items: orderPayload() });
  if (!state.pendingOrder || state.pendingOrder.signature !== signature) {
    state.pendingOrder = { id: crypto.randomUUID(), signature };
  }
  const { data, error } = await db.rpc("create_kiosk_order", {
    p_order_type: state.orderType,
    p_payment_method: paymentMethod,
    p_items: orderPayload(),
    p_request_id: state.pendingOrder.id,
  });
  if (error) throw error;
  return data;
}

function orderErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("menu item is not available")) return "품절되었거나 판매가 종료된 메뉴가 있습니다. 메뉴를 다시 확인해 주세요.";
  if (message.includes("invalid") || message.includes("must be") || message.includes("required")) return "주문 정보가 올바르지 않습니다. 옵션과 수량을 다시 확인해 주세요.";
  return "주문을 접수하지 못했습니다. 잠시 후 다시 시도하거나 직원에게 문의해 주세요.";
}

async function placeOrder(event) {
  event?.preventDefault();
  if (!state.cart.length) return;
  const consent = $("#orderConsent");
  if (event && !consent.checked) {
    $("#checkoutError").textContent = tr("주문 내용을 확인한 뒤 확인란을 선택해 주세요.", "Review the order and select the confirmation box.");
    return;
  }
  const button = $("#placeOrderButton");
  const paymentMethod = $("input[name='paymentMethod']:checked")?.value || "card";
  button.disabled = true;
  button.textContent = tr("주문을 접수하는 중…", "Placing order…");
  $("#checkoutError").textContent = "";
  try {
    const result = await createOrder(paymentMethod);
    state.pendingOrder = null;
    $("#orderNumber").textContent = result.order_number || result.pickup_code || "확인";
    $("#checkoutDialog").close();
    $("#successDialog").showModal();
  } catch (error) {
    console.error(error);
    $("#checkoutError").textContent = orderErrorMessage(error);
  } finally {
    button.disabled = false;
    button.textContent = tr("주문 접수하기", "Place Order");
  }
}

function resetOrder() {
  state.cart = [];
  renderCart();
  $("#successDialog").close();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function openStaff() {
  $("#staffPinError").textContent = "";
  $("#staffPinSection").hidden = false;
  $("#staffBoardSection").hidden = true;
  $("#staffDialog").showModal();
  $("#staffPin").focus();
  $("#staffPin").select();
}

async function unlockStaffBoard(event) {
  event.preventDefault();
  const pin = $("#staffPin").value.trim();
  if (!/^\d{6}$/.test(pin)) {
    $("#staffPinError").textContent = "운영 번호 6자리를 입력해 주세요.";
    return;
  }
  state.staffPin = pin;
  state.staffDemo = !db || !PUBLIC_ORDER_BOARD;
  $("#staffBoardNotice").textContent = state.staffDemo
    ? "로컬 샘플 주문판입니다. 상태 변경은 이 브라우저에만 반영됩니다."
    : "공용 번호로 여는 데모 운영판입니다. 최근 24시간의 실제 접수 주문을 조회하고 다음 단계로 변경할 수 있습니다.";
  if (state.staffDemo && pin !== "111111") {
    state.staffPin = "";
    $("#staffPinError").textContent = "운영 번호를 확인해 주세요.";
    return;
  }
  const loaded = await loadStaffOrders();
  if (!loaded) {
    state.staffPin = "";
    $("#staffPinError").textContent = "운영 번호가 올바르지 않거나 주문판을 불러올 수 없습니다.";
    return;
  }
  $("#staffPinSection").hidden = true;
  $("#staffBoardSection").hidden = false;
  startStaffPolling();
}

async function loadStaffOrders() {
  if (state.staffDemo || !db) {
    if (!state.staffOrders.length) {
      state.staffOrders = [
        { id: "demo-1", order_number: "204", order_type: "takeout", payment_method: "card", status: "received", total_amount: 8100, created_at: new Date().toISOString(), order_items: [{ item_name: "카페 라테", quantity: 1, option_summary: "ICE, Regular" }, { item_name: "솔티드 휘낭시에", quantity: 1, option_summary: "그대로" }] },
        { id: "demo-2", order_number: "203", order_type: "dine_in", payment_method: "counter", status: "preparing", total_amount: 5200, created_at: new Date(Date.now() - 240000).toISOString(), order_items: [{ item_name: "말차 라테", quantity: 1, option_summary: "HOT, Regular" }] },
      ];
    }
    renderStaffOrders();
    return true;
  }
  const { data, error } = await db.rpc("list_demo_kiosk_orders", {
    p_operator_pin: state.staffPin,
  });
  if (error) {
    console.error(error);
    return false;
  }
  state.staffOrders = Array.isArray(data) ? data : [];
  renderStaffOrders();
  return true;
}

function startStaffPolling() {
  stopStaffPolling();
  if (state.staffDemo) return;
  state.staffPollTimer = window.setInterval(() => {
    if ($("#staffDialog").open && !$("#staffBoardSection").hidden) loadStaffOrders();
  }, 5000);
}

function stopStaffPolling() {
  if (state.staffPollTimer) window.clearInterval(state.staffPollTimer);
  state.staffPollTimer = null;
}

function renderStaffOrders() {
  const columns = [
    ["received", "접수", "제조 시작", "preparing"],
    ["preparing", "제조 중", "준비 완료", "ready"],
    ["ready", "픽업 대기", "전달 완료", "completed"],
  ];
  $("#staffOrders").innerHTML = columns.map(([status, label, actionLabel, nextStatus]) => {
    const orders = state.staffOrders.filter((order) => order.status === status);
    return `<section class="order-column"><h3>${label}<span>${orders.length}</span></h3>${orders.length ? orders.map((order) => `
      <article class="staff-order-card">
        <header><strong>${escapeHtml(order.order_number)}</strong><small>${order.order_type === "takeout" ? "포장" : "매장"} · ${new Date(order.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</small></header>
        <ul>${(order.order_items || []).map((item) => `<li>${escapeHtml(item.item_name)} × ${item.quantity}<br /><small>${escapeHtml(item.option_summary || "기본")}</small></li>`).join("")}</ul>
        <button type="button" data-order-id="${escapeHtml(order.id)}" data-next-status="${nextStatus}">${actionLabel}</button>
      </article>`).join("") : `<p class="cart-empty">대기 주문 없음</p>`}</section>`;
  }).join("");
}

async function updateOrderStatus(orderId, nextStatus) {
  if (state.staffDemo || !db) {
    const order = state.staffOrders.find((candidate) => candidate.id === orderId);
    if (order) order.status = nextStatus;
    if (nextStatus === "completed") state.staffOrders = state.staffOrders.filter((candidate) => candidate.id !== orderId);
    renderStaffOrders();
    return;
  }
  const { error } = await db.rpc("advance_demo_kiosk_order", {
    p_operator_pin: state.staffPin,
    p_order_id: orderId,
    p_next_status: nextStatus,
  });
  if (error) toast("주문 상태를 변경하지 못했습니다.");
  else await loadStaffOrders();
}

function lockStaffBoard({ closeDialog = true } = {}) {
  stopStaffPolling();
  state.staffDemo = false;
  state.staffPin = "";
  state.staffOrders = [];
  $("#staffBoardSection").hidden = true;
  $("#staffPinSection").hidden = false;
  $("#staffPin").value = "111111";
  $("#staffPinError").textContent = "";
  if (closeDialog && $("#staffDialog").open) $("#staffDialog").close();
}

function clearRagFocus() {
  state.ragFocusedMenuIds = [];
  state.ragFocusLevel = "medium";
}

function ragFocusLevel(result) {
  if (result.intent === "recommend") return "weak";
  const strongActions = new Set(["add", "add_many", "batch", "pending", "pending_many", "pending_batch", "remove"]);
  if (["order", "cart_update", "remove"].includes(result.intent) || strongActions.has(result.action?.type)) return "strong";
  return "medium";
}

function synchronizeRagUi(result, message, requestId, { preserveCategory = false } = {}) {
  if (requestId !== state.ragRequestId) return;
  const validItems = [...new Map((result.retrieved || [])
    .map((row) => state.items.find((item) => item.id === row.id && item.available !== false))
    .filter(Boolean)
    .map((item) => [item.id, item])).values()];

  if (!validItems.length) {
    clearRagFocus();
    renderMenu();
    return;
  }

  if (!preserveCategory) {
    const categories = [...new Set(validItems.map((item) => item.category_id))];
    state.category = categories.length === 1 ? categories[0] : "all";
  }
  state.ragFocusedMenuIds = validItems.map((item) => item.id);
  state.ragFocusLevel = ragFocusLevel(result);
  renderCategories();
  renderMenu();

  window.requestAnimationFrame(() => {
    if (requestId !== state.ragRequestId) return;
    const card = $("#menuGrid .menu-card.rag-focused");
    if (!card) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  });
}

function appendRagMessage(role, text, retrieved = []) {
  const message = { role, text, retrieved };
  state.ragMessages.push(message);
  state.ragMessages = state.ragMessages.slice(-12);

  const article = document.createElement("article");
  article.className = `rag-message ${role}`;
  article.innerHTML = `
    ${role === "assistant" ? `<span class="rag-message-label">${tr("주문 도우미", "Order Assistant")}</span>` : ""}
    <p>${escapeHtml(text)}</p>
    ${retrieved.length ? `<div class="rag-sources" aria-label="검색된 메뉴">${retrieved.map((item) => `
      <button type="button" data-rag-menu-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(tr(`${item.name} 메뉴 보기`, `View ${itemName(item)}`))}">
        <span>${escapeHtml(itemName(item))}</span><strong>${won(item.price)}</strong>
      </button>`).join("")}</div>` : ""}`;
  const messages = $("#ragMessages");
  let turn;
  if (role === "user") {
    turn = document.createElement("section");
    turn.className = "rag-turn";
    turn.setAttribute("aria-label", "질문과 답변");
    turn.append(article);
    messages.prepend(turn);
  } else {
    turn = messages.querySelector(".rag-turn.pending");
    if (!turn) {
      turn = document.createElement("section");
      turn.className = "rag-turn";
      messages.prepend(turn);
    }
    turn.append(article);
    turn.classList.remove("pending");
  }
  if (role === "user") turn.classList.add("pending");
  messages.scrollTop = 0;
}

function openRagAssistant() {
  if (!state.ragMessages.length) {
    appendRagMessage("assistant", "원하는 맛, 카페인 정도, 가격을 말씀해 주세요. 메뉴 비교와 기본 옵션 장바구니 담기도 도와드릴게요.");
  }
  $("#ragDialog").scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => $("#ragInput").focus(), 350);
}

function removeMenuFromCart(itemId, quantity) {
  let remaining = Math.max(1, Number(quantity || 1));
  let removed = 0;
  for (const entry of state.cart) {
    if (entry.item.id !== itemId || remaining < 1) continue;
    const decrement = Math.min(entry.quantity, remaining);
    entry.quantity -= decrement;
    remaining -= decrement;
    removed += decrement;
  }
  state.cart = state.cart.filter((entry) => entry.quantity > 0);
  if (removed) {
    renderCart();
    announceCartChange(tr(`${removed}개를 장바구니에서 뺐습니다.`, `${removed} item${removed === 1 ? "" : "s"} removed from the cart.`));
  }
  return removed;
}

function ragOptionsFor(item, requestedIds = []) {
  const requested = new Set(requestedIds);
  const groups = groupOptions(item);
  return Object.entries(groups).flatMap(([groupName, options]) => {
    const selected = options.filter((option) => requested.has(option.id));
    if (groupName === "추가") return selected;
    return selected.length ? [selected[0]] : options.slice(0, 1);
  });
}

function applyRagAction(result) {
  if (!result.action) return result.answer;

  if (["pending", "pending_many", "pending_batch"].includes(result.action.type)) {
    state.ragPendingOrder = result.action;
    return result.answer;
  }

  if (result.action.type === "checkout") {
    state.ragPendingOrder = null;
    openCheckout();
    return result.answer;
  }

  if (result.action.type === "clear") {
    state.cart = [];
    renderCart();
    announceCartChange(tr("장바구니를 모두 비웠습니다.", "The cart has been cleared."));
    toast("장바구니를 비웠습니다.");
    return result.answer;
  }

  if (result.action.type === "add_many") {
    result.action.items.forEach((action) => {
      const target = state.items.find((candidate) => candidate.id === action.itemId && candidate.available !== false);
      if (target) addItemToCart(target, ragOptionsFor(target, action.optionIds || []), Number(action.quantity || 1));
    });
    state.ragPendingOrder = null;
    toast("여러 메뉴를 장바구니에 담았습니다.");
    return result.answer;
  }

  if (result.action.type === "batch") {
    const changes = [];
    result.action.actions.forEach((action) => {
      const target = state.items.find((candidate) => candidate.id === action.itemId && candidate.available !== false);
      if (!target) return;
      if (action.op === "add") {
        addItemToCart(target, ragOptionsFor(target, action.optionIds || []), Number(action.quantity || 1));
        changes.push(`+ ${target.name} ${Number(action.quantity || 1)}개`);
      }
      if (action.op === "remove") {
        const removed = removeMenuFromCart(target.id, action.quantity);
        changes.push(removed ? `− ${target.name} ${removed}개` : `− ${target.name} 없음`);
      }
    });
    state.ragPendingOrder = null;
    const summary = `${changes.join(" · ")} · 현재 합계 ${won(cartTotal())}`;
    announceCartChange(summary);
    toast("요청한 장바구니 변경을 반영했습니다.");
    return summary;
  }

  const item = state.items.find((candidate) => candidate.id === result.action.itemId && candidate.available !== false);
  if (!item) return "현재 주문 가능한 메뉴를 찾지 못했습니다. 메뉴 목록을 다시 확인해 주세요.";

  if (result.action.type === "add") {
    const selectedOptions = ragOptionsFor(item, result.action.optionIds || []);
    addItemToCart(item, selectedOptions, Number(result.action.quantity || 1));
    const optionSummary = selectedOptions.map((option) => option.name).join(" · ");
    toast(`${item.name}을(를) ${optionSummary || "기본 옵션"}으로 담았습니다.`);
    state.ragPendingOrder = null;
    return result.answer;
  }

  if (result.action.type === "remove") {
    const removed = removeMenuFromCart(item.id, result.action.quantity);
    if (!removed) return `${item.name}은(는) 현재 장바구니에 없습니다.`;
    toast(`${item.name} ${removed}개를 장바구니에서 뺐습니다.`);
    return `${item.name} ${removed}개를 장바구니에서 뺐습니다.`;
  }
  return result.answer;
}

function englishAssistantAnswer(result) {
  const orderType = state.orderType === "dine_in" ? "Dine In" : "Takeout";
  const items = result.retrieved || [];
  if (result.intent === "order_type") return `Your current order type is ${orderType}. You can change it with the buttons at the top.`;
  if (result.intent === "clear") return "Your cart has been cleared.";
  if (result.intent === "cart") {
    const count = state.cart.reduce((sum, entry) => sum + entry.quantity, 0);
    return count ? `${orderType} order: ${count} item${count === 1 ? "" : "s"}, totaling ${won(cartTotal())}.` : `Your ${orderType.toLowerCase()} cart is empty.`;
  }
  if (result.intent === "order" && result.action) {
    const item = state.items.find((candidate) => candidate.id === result.action.itemId);
    return `${result.action.quantity || 1} ${item ? itemName(item) : "item"}${Number(result.action.quantity || 1) === 1 ? "" : "s"} added to your ${orderType.toLowerCase()} order.`;
  }
  if (result.intent === "remove" && result.action) {
    const item = state.items.find((candidate) => candidate.id === result.action.itemId);
    return `${item ? itemName(item) : "Item"} removed from your cart.`;
  }
  if (result.intent === "compare" && items.length >= 2) return `${itemName(items[0])}: ${itemDescription(items[0])}. ${itemName(items[1])}: ${itemDescription(items[1])}.`;
  if (result.intent === "price" && items[0]) return `${itemName(items[0])} starts at ${won(items[0].price)}.`;
  if (result.intent === "recommend" && items.length) return `I recommend ${items.slice(0, 3).map(itemName).join(", ")}. Select an item below to view its options.`;
  if (result.intent === "inform" && items[0]) return `${itemName(items[0])} is ${won(items[0].price)}. ${itemDescription(items[0])}.`;
  if (result.intent === "clarify") return "Please include the menu name or tell me what flavor, caffeine level, or price you prefer.";
  return "I can help with menu recommendations, prices, comparisons, and cart requests.";
}

function sendRagMessage(message, { preserveCategory = false, ignoreHistory = false } = {}) {
  const assistant = window.CafeRagAssistant;
  const history = ignoreHistory ? [] : state.ragMessages.map((entry) => ({ role: entry.role, text: entry.text }));
  const requestId = ++state.ragRequestId;
  appendRagMessage("user", message);
  if (!assistant?.respond) {
    appendRagMessage("assistant", "주문 도우미를 불러오지 못했습니다. 화면을 새로고침해 주세요.");
    return;
  }
  if (!state.items.length) {
    appendRagMessage("assistant", "메뉴를 준비하고 있습니다. 잠시 뒤 다시 말씀해 주세요.");
    return;
  }

  const localizedItems = state.items.map((item) => ({ ...item, name: itemName(item), description: itemDescription(item) }));
  const localizedOptions = state.options.map((option) => ({ ...option, name: optionName(option), group_name: optionGroupName(option.group_name) }));
  const result = assistant.respond({ message, items: localizedItems, options: localizedOptions, cart: state.cart, history, pendingOrder: state.ragPendingOrder, orderType: state.orderType, language: state.language });
  if (requestId !== state.ragRequestId) return;
  const appliedAnswer = applyRagAction(result);
  const answer = state.language === "en" ? englishAssistantAnswer(result) : appliedAnswer;
  synchronizeRagUi(result, message, requestId, { preserveCategory });
  appendRagMessage("assistant", answer, result.retrieved || []);
}

function resetRagSession() {
  state.ragRequestId += 1;
  state.ragMessages = [];
  state.ragPendingOrder = null;
  state.cart = [];
  clearRagFocus();
  $("#ragMessages").innerHTML = "";
  renderCart();
  announceCartChange(tr("새 주문을 시작해 장바구니를 비웠습니다.", "A new order was started and the cart was cleared."));
  appendRagMessage("assistant", tr("새 주문을 시작했습니다. 메뉴 정보, 추천, 비교 또는 옵션 주문을 말씀해 주세요.", "A new order has started. Ask about menu items, recommendations, comparisons, or custom orders."));
  toast(tr("대화와 장바구니를 초기화했습니다.", "Chat and cart were reset."));
}

function submitRagMessage(event) {
  event.preventDefault();
  const preserveCategory = state.preserveCategoryOnNextRagSubmit;
  const ignoreHistory = state.ignoreHistoryOnNextRagSubmit;
  state.preserveCategoryOnNextRagSubmit = false;
  state.ignoreHistoryOnNextRagSubmit = false;
  if (state.ragSending) return;
  const input = $("#ragInput");
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  state.ragSending = true;
  $("#ragSendButton").disabled = true;
  try {
    sendRagMessage(message, { preserveCategory, ignoreHistory });
  } finally {
    state.ragSending = false;
    $("#ragSendButton").disabled = false;
    input.focus();
  }
}

function submitMenuSelection(itemId, { preserveCategory = false } = {}) {
  const item = state.items.find((candidate) => candidate.id === itemId && candidate.available !== false);
  if (!item || state.ragSending) return;
  state.ragPendingOrder = null;
  state.preserveCategoryOnNextRagSubmit = preserveCategory;
  state.ignoreHistoryOnNextRagSubmit = true;
  $("#ragInput").value = itemName(item);
  $("#ragForm").requestSubmit();
}

function submitMenuOrder(itemId, { preserveCategory = false } = {}) {
  const item = state.items.find((candidate) => candidate.id === itemId && candidate.available !== false);
  if (!item || state.ragSending) return;
  state.ragPendingOrder = null;
  state.preserveCategoryOnNextRagSubmit = preserveCategory;
  state.ignoreHistoryOnNextRagSubmit = false;
  $("#ragInput").value = state.language === "en" ? `Order ${itemName(item)}` : `${itemName(item)} 주문할게`;
  $("#ragForm").requestSubmit();
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();

  const register = (tool) => {
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error); }
    catch (error) { console.error(error); }
  };

  register({
    name: "list_cafe_menu",
    title: "카페 메뉴 조회",
    description: "현재 주문 가능한 카페 메뉴와 가격을 조회합니다.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => ({ items: state.items.filter((item) => item.available !== false).map(({ id, name, price, category_id }) => ({ id, name, price, category: category_id })) }),
  });

  register({
    name: "add_menu_item_to_order",
    title: "메뉴 장바구니 담기",
    description: "메뉴 ID와 수량을 받아 기본 옵션으로 현재 장바구니에 추가합니다. 아직 주문은 접수하지 않습니다.",
    inputSchema: {
      type: "object",
      properties: { menuItemId: { type: "string" }, quantity: { type: "integer", minimum: 1, maximum: 20 } },
      required: ["menuItemId", "quantity"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ menuItemId, quantity }) => {
      const item = state.items.find((candidate) => candidate.id === menuItemId && candidate.available !== false);
      if (!item) throw new Error("주문 가능한 메뉴를 찾을 수 없습니다.");
      addItemToCart(item, defaultOptionsFor(item), Number(quantity));
      return { cartCount: state.cart.reduce((sum, entry) => sum + entry.quantity, 0), total: cartTotal() };
    },
  });

  register({
    name: "submit_cafe_order",
    title: "카페 주문 접수",
    description: "현재 화면의 장바구니를 실제 주문으로 접수합니다. 장바구니가 비어 있으면 실패합니다.",
    inputSchema: {
      type: "object",
      properties: {
        orderType: { type: "string", enum: ["takeout", "dine_in"] },
        paymentMethod: { type: "string", enum: ["card", "counter"] },
      },
      required: ["orderType", "paymentMethod"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ orderType, paymentMethod }) => {
      if (!state.cart.length) throw new Error("장바구니가 비어 있습니다.");
      state.orderType = orderType;
      const result = await createOrder(paymentMethod);
      state.cart = [];
      renderCart();
      return { orderNumber: result.order_number, total: result.total_amount, status: "received" };
    },
  });
}

$("#categoryTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  clearRagFocus();
  state.category = button.dataset.category;
  renderCategories();
  renderMenu();
});

const menuSelectionClickTimers = new Map();

$("#menuGrid").addEventListener("click", (event) => {
  const selectionButton = event.target.closest("[data-menu-selection-id]");
  if (!selectionButton) return;
  const itemId = selectionButton.dataset.menuSelectionId;
  const pendingTimer = menuSelectionClickTimers.get(itemId);

  if (event.detail >= 2) {
    if (pendingTimer) window.clearTimeout(pendingTimer);
    menuSelectionClickTimers.delete(itemId);
    submitMenuOrder(itemId, { preserveCategory: true });
    return;
  }

  if (event.detail === 0) {
    submitMenuSelection(itemId, { preserveCategory: true });
    return;
  }

  if (pendingTimer) window.clearTimeout(pendingTimer);
  menuSelectionClickTimers.set(itemId, window.setTimeout(() => {
    menuSelectionClickTimers.delete(itemId);
    submitMenuSelection(itemId, { preserveCategory: true });
  }, 250));
});

$$(`[data-order-type]`).forEach((button) => button.addEventListener("click", () => {
  state.orderType = button.dataset.orderType;
  $$(`[data-order-type]`).forEach((candidate) => candidate.classList.toggle("active", candidate === button));
  const label = state.orderType === "dine_in" ? tr("매장", "Dine In") : tr("포장", "Takeout");
  appendRagMessage("assistant", tr(`${label} 주문으로 진행합니다. 이후 메뉴 추천과 장바구니 안내에 이 선택을 반영할게요.`, `${label} selected. I will use it for recommendations and cart guidance.`));
}));

$("#optionGroups").addEventListener("change", updateAddButtonPrice);
$("#decreaseQuantity").addEventListener("click", () => { state.optionQuantity = Math.max(1, state.optionQuantity - 1); $("#optionQuantity").textContent = state.optionQuantity; updateAddButtonPrice(); });
$("#increaseQuantity").addEventListener("click", () => { state.optionQuantity = Math.min(20, state.optionQuantity + 1); $("#optionQuantity").textContent = state.optionQuantity; updateAddButtonPrice(); });
$("#optionForm").addEventListener("submit", (event) => { event.preventDefault(); addActiveItemToCart(); });

$("#cartItems").addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-cart-action]");
  if (actionButton) {
    updateCartItem(actionButton.dataset.cartKey, actionButton.dataset.cartAction);
    return;
  }
  const editButton = event.target.closest("[data-cart-edit]");
  if (editButton) {
    const entry = state.cart.find((candidate) => candidate.key === editButton.dataset.cartEdit);
    if (entry) openOptions(entry.item.id, entry.key);
  }
});

$("#checkoutButton").addEventListener("click", openCheckout);
$("#checkoutForm").addEventListener("submit", placeOrder);
$("#newOrderButton").addEventListener("click", resetOrder);
$("#staffButton").addEventListener("click", openStaff);
$("#staffPinForm").addEventListener("submit", unlockStaffBoard);
$("#staffRefreshButton").addEventListener("click", async () => {
  if (!await loadStaffOrders()) toast("주문 목록을 새로고침하지 못했습니다.");
});
$("#staffLockButton").addEventListener("click", () => lockStaffBoard());
$$(`[data-page-tab]`).forEach((button) => button.addEventListener("click", () => switchPageTab(button.dataset.pageTab)));
$("#feedbackForm").addEventListener("submit", submitFeedback);
$("#feedbackHistory").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feedback-id]");
  if (!button) return;
  const records = feedbackRecords().filter((record) => record.id !== button.dataset.feedbackId);
  localStorage.setItem("cafe-kiosk-feedback", JSON.stringify(records));
  $("#feedbackStatus").textContent = tr("선택한 의견을 삭제했습니다.", "Feedback deleted.");
  renderFeedbackHistory();
});
$("#ragResetButton").addEventListener("click", resetRagSession);
$("#ragForm").addEventListener("submit", submitRagMessage);
$("#ragInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    $("#ragForm").requestSubmit();
  }
});
$(".rag-prompts").addEventListener("click", (event) => {
  const button = event.target.closest("[data-rag-prompt]");
  if (!button) return;
  $("#ragInput").value = state.language === "en" ? button.dataset.ragPromptEn : button.dataset.ragPrompt;
  $("#ragForm").requestSubmit();
});
$("#ragMessages").addEventListener("click", (event) => {
  const button = event.target.closest("[data-rag-menu-id]");
  if (!button) return;
  submitMenuSelection(button.dataset.ragMenuId);
});
$("#staffOrders").addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-id]");
  if (button) updateOrderStatus(button.dataset.orderId, button.dataset.nextStatus);
});
$("#languageButton").addEventListener("click", () => {
  state.language = state.language === "ko" ? "en" : "ko";
  localStorage.setItem("cafe-kiosk-language", state.language);
  state.ragMessages = [];
  clearRagFocus();
  $("#ragMessages").innerHTML = "";
  applyLanguage();
  appendRagMessage("assistant", tr("한국어 화면으로 전환했습니다.", "The interface is now in English."));
});
$("#fullscreenButton").addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
document.addEventListener("mozfullscreenchange", updateFullscreenButton);
document.addEventListener("MSFullscreenChange", updateFullscreenButton);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fullscreenElement()) void toggleFullscreen();
}, true);
$$(`[data-close]`).forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.close).close()));
$$(`dialog`).forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog && dialog.id !== "successDialog") dialog.close(); }));
$("#staffDialog").addEventListener("close", () => lockStaffBoard({ closeDialog: false }));

if (db) {
  db.channel("cafe-menu").on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, loadMenu).subscribe();
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=53").catch(console.error));

renderCart();
applyLanguage();
loadMenu().then(registerWebMcpTools).catch((error) => {
  console.error(error);
  setConnection("메뉴 오류", "offline");
  $("#menuGrid").innerHTML = `<div class="menu-empty">메뉴를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</div>`;
});
loadTeamFeedback();
