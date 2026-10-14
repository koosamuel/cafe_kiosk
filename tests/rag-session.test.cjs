const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const assistant = require("../rag-assistant.js");
const menu = require("../menu.json");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

// Execute the real UI application function with small DOM effects stubbed out.
// State transitions and cart calculations are production code, not a parallel test implementation.
function session(language = "ko") {
  const state = { items: menu.items, options: menu.options, cart: [], ragPendingOrder: null, language, orderType: "takeout" };
  const dialogs = new Map();
  const context = vm.createContext({ state, window: { CafeRagAssistant: assistant }, itemEnglish: {},
    renderCart() {}, announceCartChange() {}, won: n => `${n.toLocaleString("ko-KR")}원`,
    openCheckout() {}, placeOrder() { context.submissions += 1; }, submissions: 0,
    $(selector) { if (!dialogs.has(selector)) dialogs.set(selector, { open: false, close() { this.open = false; }, checked: false }); return dialogs.get(selector); },
  });
  vm.runInContext(source.slice(source.indexOf("function applyRagAction(result)"), source.indexOf("function sendRagMessage(")), context);
  context.optionName = option => option.name;
  context.optionGroupName = name => name;
  context.appendRagMessage = () => {};
  vm.runInContext(source.slice(source.indexOf("function isDrink("), source.indexOf("function openOptions(")), context);
  vm.runInContext(source.slice(source.indexOf("function pendingOptionChoices("), source.indexOf("function appendRagMessage(")), context);
  const history = [];
  return { state, context, turn(message) {
    const result = assistant.respond({ message, items: state.items, options: state.options, cart: state.cart, pendingOrder: state.ragPendingOrder, history, language: state.language, orderType: state.orderType });
    const answer = context.applyRagAction(result);
    history.push({ role: "user", text: message }, { role: "assistant", text: answer });
    return { ...result, answer };
  } };
}
const ids = row => row.options.map(o => o.id).sort();

test("각 음료의 온도·크기·추가 옵션과 실제 합계가 분리된다", () => {
  const s = session();
  s.turn("아이스 아메리카노 레귤러 두 잔이랑 따뜻한 카페라테 라지 오트밀크 하나 담아줘");
  assert.equal(s.state.cart.length, 2);
  assert.deepEqual(ids(s.state.cart[0]), ["size-regular", "temp-ice"]);
  assert.deepEqual(ids(s.state.cart[1]), ["extra-oat", "size-large", "temp-hot"]);
  assert.equal(s.state.cart[0].quantity, 2);
  assert.equal(s.state.cart[1].unitPrice, 5700);
  assert.equal(s.state.cart.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0), 12700);
});

test("부분 담기 후 후속 온도 선택은 디저트를 중복 추가하지 않는다", () => {
  const s = session();
  const first = s.turn("아메리카노 큰 거 하나랑 치즈케이크 하나 담아줘");
  assert.equal(s.state.cart.length, 1);
  assert.equal(s.state.cart[0].item.id, "cheesecake");
  assert.equal(s.state.cart[0].unitPrice, 5900);
  assert.match(first.answer, /5,900원/);
  s.turn("아이스");
  assert.equal(s.state.cart.length, 2);
  assert.equal(s.state.cart.find(row => row.item.id === "cheesecake").quantity, 1);
  assert.equal(s.state.cart.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0), 10100);
  assert.equal(s.state.ragPendingOrder, null);
});

test("M이요와 온도 정정은 기존 그룹값을 대체한다", () => {
  const s = session();
  s.turn("뜨아 하나 담아줘");
  s.turn("아이스로");
  s.turn("M이요");
  assert.equal(s.state.cart.length, 1);
  assert.deepEqual(ids(s.state.cart[0]), ["size-regular", "temp-ice"]);
});

test("pending 중 명시한 새 메뉴를 선택하고 이전 메뉴는 담지 않는다", () => {
  const s = session();
  s.turn("아메리카노 담아줘");
  s.turn("그냥 유자차 핫 라지 주세요");
  assert.deepEqual(s.state.cart.map(row => row.item.id), ["citron-tea"]);
});

test("다중 pending은 첫 대상만 답을 받고 둘 다라고 해야 공통 옵션이 된다", () => {
  const s = session();
  s.turn("아메리카노 하나랑 카페라테 하나 담아줘");
  s.turn("아이스 레귤러");
  assert.deepEqual(s.state.cart.map(row => row.item.id), ["americano"]);
  assert.equal(s.state.ragPendingOrder.itemId, "cafe-latte");
  s.turn("핫 라지");
  assert.deepEqual(ids(s.state.cart[1]), ["size-large", "temp-hot"]);
});

test("두 잔 중 한 잔만 취소하고 이후 합계를 안내한다", () => {
  const s = session();
  s.turn("아아 톨 두 잔 담아줘");
  const result = s.turn("아아 두 잔 중 한 잔 취소해줘. 총 얼마야?");
  assert.equal(s.state.cart[0].quantity, 1);
  assert.match(result.answer, /3,500원/);
});

test("직전 항목 옵션과 수량 수정은 중복 품목을 만들지 않는다", () => {
  const s = session();
  s.turn("아아 톨 하나 담아줘");
  s.turn("방금 그거 L로 바꾸고 샷 추가해줘");
  assert.equal(s.state.cart.length, 1);
  assert.deepEqual(ids(s.state.cart[0]), ["extra-shot", "size-large", "temp-ice"]);
  assert.equal(s.state.cart[0].unitPrice, 4700);
  s.turn("아메리카노 수량 두 잔으로 바꿔줘");
  assert.equal(s.state.cart[0].quantity, 2);
  assert.equal(s.state.cart.length, 1);
});

test("같은 메뉴 다른 옵션의 수정 대상은 임의로 고르지 않는다", () => {
  const s = session();
  s.turn("아아 톨 하나 담아줘");
  s.turn("뜨아 라지 하나 담아줘");
  const result = s.turn("아메리카노 라지로 바꿔줘");
  assert.equal(result.intent, "clarify");
  assert.equal(s.state.cart.length, 2);
});

test("영어 축약 주문·영문 그룹·오트 옵션이 실제로 적용된다", () => {
  for (const prefix of ["I'd like", "I’d like", "I'll have", "Can I get"]) {
    const s = session("en");
    const groups = { 온도: "Temperature", 크기: "Size", 추가: "Extras", 데우기: "Heating" };
    s.state.options = menu.options.map(o => ({ ...o, group_name: groups[o.group_name] }));
    const result = s.turn(`${prefix} a hot latte, medium, with oat milk`);
    assert.equal(s.state.cart.length, 1, prefix);
    assert.deepEqual(ids(s.state.cart[0]), ["extra-oat", "size-regular", "temp-hot"]);
    assert.match(result.answer, /Added/);
    assert.match(result.answer, /5,000/);
  }
  const s = session("en");
  s.turn("I'd like a hot latte, medium");
  assert.equal(s.state.cart.length, 1); // Extras are optional.
});

test("아바라는 바닐라 라테의 ICE를 채우고 겹치는 latte를 추가하지 않는다", () => {
  const s = session();
  s.turn("아바라 톨 하나 담아줘");
  assert.deepEqual(s.state.cart.map(row => row.item.id), ["vanilla-latte"]);
  assert.deepEqual(ids(s.state.cart[0]), ["size-regular", "temp-ice"]);
  const other = session();
  other.turn("I'd like a vanilla latte, hot, medium");
  assert.equal(other.state.cart.length, 1);
});

test("무당·무카페인·차 제약을 동시에 만족하지 않으면 0건이며 조건을 완화하지 않는다", () => {
  const s = session();
  const result = s.turn("카페인 없고 당류도 없는 따뜻한 차 추천해줘");
  assert.equal(result.intent, "no_results");
  assert.deepEqual(result.retrieved, []);
  assert.match(result.answer, /조건에 모두 맞는 음료는 현재 메뉴에 없어요/);
  const zero = s.turn("카페인 없는 음료 추천해줘");
  assert.deepEqual(zero.retrieved.map(row => row.id).sort(), ["citron-tea", "lemon-ade"]);
  const sugar = s.turn("당류 0g 음료 전부 알려줘");
  assert.deepEqual(sugar.retrieved.map(row => row.id).sort(), ["americano", "earl-grey"]);
});

test("목록은 전체 조건 일치 항목을 반환하고 가격은 모든 현재 사이즈를 안내한다", () => {
  const s = session();
  assert.equal(s.turn("커피 종류 전부 알려줘").retrieved.length, 4);
  assert.equal(s.turn("전체 메뉴 보여줘").retrieved.length, menu.items.length);
  const price = s.turn("아메리카노 얼마예요?");
  assert.match(price.answer, /Regular 3,500원/);
  assert.match(price.answer, /Large 4,200원/);
  assert.equal(s.state.cart.length, 0);
});

test("미판매 별칭·불가 옵션·0/음수/과다 수량은 주문으로 적용되지 않는다", () => {
  for (const message of ["자허블 톨 하나 담아줘", "치즈케이크 데워서 담아줘", "아메리카노 핫 톨 오트밀크 담아줘", "아아 톨 0잔 담아줘", "아아 톨 -1잔 담아줘", "아아 톨 21잔 담아줘", "아아 톨 1.5잔 담아줘"]) {
    const s = session(); s.turn(message);
    assert.equal(s.state.cart.length, 0, message);
  }
});

test("같은 그룹의 충돌 값·알 수 없는 옵션은 reducer에서 거부한다", () => {
  for (const optionIds of [["temp-hot", "temp-ice", "size-regular"], ["temp-hot", "size-regular", "unknown"]]) {
    const result = assistant.applyCartActions({ cart: [], items: menu.items, options: menu.options, actions: [{ op: "add", itemId: "americano", quantity: 1, optionIds }] });
    assert.equal(result.cart.length, 0);
    assert.equal(result.errors.length, 1);
  }
});

test("클라이언트 unitPrice 조작은 화면 합계 계산의 근거가 되지 않는다", () => {
  const s = session();
  s.turn("아아 톨 하나 담아줘");
  s.state.cart[0].unitPrice = 0;
  assert.match(s.turn("장바구니 총 얼마야?").answer, /3,500원/);
});

test("주문 확인은 같은 내용에 대해서만 한 번 접수하며 변경·취소 후에는 접수하지 않는다", () => {
  const s = session();
  s.turn("아아 톨 하나 담아줘");
  s.turn("결제할게요");
  assert.equal(s.state.ragPendingOrder.type, "reviewing");
  s.turn("네");
  assert.equal(s.context.submissions, 1);
  s.turn("네");
  assert.equal(s.context.submissions, 1);
  const changed = session();
  changed.turn("아아 톨 하나 담아줘"); changed.turn("결제할게요");
  changed.state.cart[0].quantity = 2;
  changed.turn("네");
  assert.equal(changed.context.submissions, 0);
  const cancelled = session();
  cancelled.turn("아아 톨 하나 담아줘"); cancelled.turn("결제할게요"); cancelled.turn("취소"); cancelled.turn("네");
  assert.equal(cancelled.context.submissions, 0);
  assert.equal(cancelled.state.cart.length, 1);
});

test("실제 주문 접수 함수는 성공 시에만 장바구니를 비우고 중복 접수를 막는다", async () => {
  const nodes = new Map();
  let finish;
  let calls = 0;
  const state = { cart: [{ item: menu.items[0], key: "a", quantity: 1, unitPrice: 3500, options: [] }], orderType: "takeout", language: "ko", orderSubmitting: false };
  const messages = [];
  const context = vm.createContext({ state, window: { CafeRagAssistant: assistant }, console: { error() {} },
    $(key) { if (!nodes.has(key)) nodes.set(key, { checked: true, disabled: false, value: "counter", close() {}, showModal() {} }); return nodes.get(key); },
    tr: ko => ko, won: n => `${n}원`, renderCart() {}, orderErrorMessage: () => "failed", appendRagMessage: (role, text) => messages.push(text),
    createOrder() { calls += 1; return new Promise(resolve => { finish = resolve; }); },
  });
  vm.runInContext(source.slice(source.indexOf("async function placeOrder("), source.indexOf("function resetOrder()")), context);
  const first = context.placeOrder(undefined, { conversational: true, language: "ko" });
  await context.placeOrder(undefined, { conversational: true });
  assert.equal(calls, 1);
  assert.equal(state.cart.length, 1);
  finish({ order_number: "TEST-1", total_amount: 3500 });
  await first;
  assert.equal(state.cart.length, 0);
  assert.equal(state.orderSubmitting, false);
  assert.match(messages[0], /TEST-1/);
});

test("API 접수 실패 시 실제 주문 함수는 주문 내역과 재확인 상태를 보존한다", async () => {
  const nodes = new Map();
  const state = { cart: [{ item: menu.items[0], key: "a", quantity: 1, unitPrice: 3500, options: [] }], orderType: "takeout", language: "en" };
  const messages = [];
  const context = vm.createContext({ state, window: { CafeRagAssistant: assistant }, console: { error() {} },
    $(key) { if (!nodes.has(key)) nodes.set(key, { checked: true, value: "card", close() {}, showModal() {} }); return nodes.get(key); },
    tr: (ko, en) => en, won: n => `${n}`, renderCart() {}, orderErrorMessage: () => "failed", appendRagMessage: (role, text) => messages.push(text),
    async createOrder() { throw new Error("simulated network failure"); },
  });
  vm.runInContext(source.slice(source.indexOf("async function placeOrder("), source.indexOf("function resetOrder()")), context);
  await context.placeOrder(undefined, { conversational: true, language: "en" });
  assert.equal(state.cart.length, 1);
  assert.equal(state.ragPendingOrder.type, "reviewing");
  assert.equal(state.orderSubmitting, false);
  assert.match(messages[0], /cart is preserved/);
});

test("영양 null과 저당 태그를 카페인·당류 0으로 해석하지 않는다", () => {
  const items = [{ ...menu.items[0], sugar_g: null, caffeine_mg: null }, { id: "unknown", name: "미확인 티", category_id: "tea", price: 1000, tags: ["저당"] }];
  assert.deepEqual(assistant.filterCandidates(items, "카페인 없고 당류도 없는 음료"), []);
});

test("추가 완료 뒤 네를 말해도 같은 주문을 다시 담지 않는다", () => {
  const s = session();
  s.turn("아아 톨 하나 담아줘");
  s.turn("네");
  assert.equal(s.state.cart[0].quantity, 1);
  assert.equal(s.state.cart.length, 1);
});

test("다중 대기의 모두/all 답변은 메뉴 목록이 아니라 옵션 응답이다", () => {
  for (const reply of ["전부 아이스 레귤러", "all iced medium"]) {
    const s = session();
    s.turn("아메리카노 하나랑 카페라테 하나 담아줘");
    s.turn(reply);
    assert.equal(s.state.cart.length, 2);
    assert.ok(s.state.cart.every(row => ids(row).join() === ["size-regular", "temp-ice"].join()));
  }
});

test("덜 단 맛을 무당으로 단정하지 않고 수치 제한은 알려진 데이터에만 적용한다", () => {
  const result = assistant.respond({ message: "달지 않은 음료 추천해줘", items: menu.items, options: menu.options });
  assert.doesNotMatch(result.answer, /당류가 없어|Contains zero sugar/);
  assert.ok(result.retrieved.every(row => row.id !== "citron-tea"));
  const measured = [
    { ...menu.items[0], sugar_g: 0, caffeine_mg: 100 },
    { ...menu.items[1], sugar_g: 4, caffeine_mg: 60 },
    { ...menu.items[2], sugar_g: null, caffeine_mg: null },
  ];
  assert.deepEqual(assistant.filterCandidates(measured, "당류 5g 이하 카페인 70mg 이하 음료").map(row => row.id), ["cafe-latte"]);
});

test("가격 상한의 천 단위 쉼표를 주문 품목 구분자로 오해하지 않는다", () => {
  const result = assistant.respond({ message: "5,000원 이하 음료 전부 알려줘", items: menu.items, options: menu.options });
  assert.ok(result.retrieved.length > 0);
  assert.ok(result.retrieved.every(row => row.category_id !== "dessert" && row.price <= 5000));
});

test("페어링 추천 카드 선택은 설명 반복 대신 선택 메뉴의 옵션 주문으로 이어진다", () => {
  for (const language of ["ko", "en"]) {
    const s = session(language);
    const recommended = s.turn(language === "en" ? "Recommend a drink that pairs with a sandwich" : "샌드위치와 어울리는 음료 추천해 줘");
    assert.ok(recommended.retrieved.some(row => row.id === "cafe-latte"));
    s.context.itemName = item => item.name;
    s.context.tr = (ko, en) => language === "en" ? en : ko;
    s.context.$("#ragForm").requestSubmit = () => s.turn(s.context.$("#ragInput").value);
    vm.runInContext(source.slice(source.indexOf("function submitMenuSelection("), source.indexOf("function addMenuWithDefaults(")), s.context);
    s.context.submitMenuSelection("cafe-latte", { order: true });
    assert.equal(s.state.ragPendingOrder.itemId, "cafe-latte");
    assert.deepEqual(Array.from(s.state.ragPendingOrder.missingGroups), ["온도", "크기"]);
    assert.equal(s.state.cart.length, 0);
    s.turn(language === "en" ? "hot medium" : "핫 레귤러");
    assert.equal(s.state.cart[0].item.id, "cafe-latte");
    assert.equal(s.state.cart[0].unitPrice, 4300);
  }
});

test("메인 메뉴 카드 한 번 클릭은 추천 이후에도 정보를 조회하고 담지 않는다", () => {
  const s = session();
  s.turn("샌드위치와 어울리는 음료 추천해 줘");
  s.context.itemName = item => item.name;
  s.context.tr = ko => ko;
  s.context.$("#ragForm").requestSubmit = () => s.turn(s.context.$("#ragInput").value);
  vm.runInContext(source.slice(source.indexOf("function submitMenuSelection("), source.indexOf("function addMenuWithDefaults(")), s.context);
  s.context.submitMenuSelection("cafe-latte", { preserveCategory: true });
  assert.equal(s.state.ragPendingOrder, null);
  assert.equal(s.state.cart.length, 0);
  assert.equal(s.context.$("#ragInput").value, "카페 라테");
});

test("추천 카드→ICE 버튼→Regular 버튼 클릭만으로 실제 장바구니에 담긴다", () => {
  const s = session();
  s.context.itemName = item => item.name;
  s.context.tr = ko => ko;
  s.context.$("#ragForm").requestSubmit = () => s.turn(s.context.$("#ragInput").value);
  vm.runInContext(source.slice(source.indexOf("function submitMenuSelection("), source.indexOf("function addMenuWithDefaults(")), s.context);
  const click = (selector, dataset) => s.context.handleRagMenuClick({ target: { closest: value => value === selector ? { dataset } : null } });
  s.turn("샌드위치와 어울리는 음료 추천해 줘");
  click("[data-rag-menu-id]", { ragMenuId: "cafe-latte", ragMenuAction: "order" });
  assert.equal(s.context.pendingOptionChoices().group, "온도");
  click("[data-rag-option-id]", { ragOptionId: "temp-ice" });
  assert.equal(s.context.pendingOptionChoices().group, "크기");
  // Clicking the same recommendation again must not erase the selected ICE option.
  click("[data-rag-menu-id]", { ragMenuId: "cafe-latte", ragMenuAction: "order" });
  assert.ok(s.state.ragPendingOrder.optionIds.includes("temp-ice"));
  click("[data-rag-option-id]", { ragOptionId: "size-regular" });
  assert.equal(s.state.cart.length, 1);
  assert.equal(s.state.cart[0].item.id, "cafe-latte");
  assert.deepEqual(ids(s.state.cart[0]), ["size-regular", "temp-ice"]);
  assert.equal(s.state.cart[0].unitPrice, 4300);
  assert.equal(s.state.ragPendingOrder, null);
  // A stale temperature button after completion must not create another item.
  click("[data-rag-option-id]", { ragOptionId: "temp-hot" });
  assert.equal(s.state.cart[0].quantity, 1);
});

test("대화는 시간순으로 쌓이고 담기 완료에는 재선택 카드가 남지 않는다", () => {
  const s = session();
  s.state.ragMessages = [];
  const oldControls = [{ removed: false, remove() { this.removed = true; } }];
  const node = () => {
    const classes = new Set();
    return { children: [], innerHTML: "", className: "", setAttribute() {},
      classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key) },
      append(child) { this.children.push(child); },
      querySelector() { return this.children.find(child => child.classList.contains("pending")); },
      querySelectorAll() { return oldControls; }, scrollHeight: 700,
    };
  };
  const messages = node();
  s.context.$ = () => messages;
  s.context.document = { createElement: node };
  s.context.tr = ko => ko;
  s.context.escapeHtml = value => String(value);
  s.context.itemName = item => item.name;
  vm.runInContext(source.slice(source.indexOf("function appendRagMessage("), source.indexOf("function openRagAssistant(")), s.context);
  s.context.appendRagMessage("user", "첫 질문");
  s.context.appendRagMessage("assistant", "첫 답변", [menu.items[1]], "order");
  s.context.appendRagMessage("user", "다음 질문");
  s.context.appendRagMessage("assistant", "카페 라테 ×1: 담았습니다 · 현재 합계 5,000원", [menu.items[1]], "none");
  assert.equal(messages.children.length, 2);
  assert.match(messages.children[0].children[0].innerHTML, /첫 질문/);
  assert.match(messages.children[1].children[0].innerHTML, /다음 질문/);
  assert.doesNotMatch(messages.children[1].children[1].innerHTML, /data-rag-menu-id|4,300원/);
  assert.equal(oldControls[0].removed, true);
  assert.equal(messages.scrollTop, messages.scrollHeight);
});


test("비교 결과의 실제 UI 카드 선택은 옵션을 채운 뒤 한 잔만 담는다", () => {
  const s = session();
  s.state.ragMessages = [];
  s.state.ragRequestId = 0;
  const messages = [];
  s.context.appendRagMessage = (role, text, retrieved, menuAction) => {
    s.state.ragMessages.push({ role, text });
    messages.push({ role, text, retrieved, menuAction });
  };
  s.context.itemName = item => item.name;
  s.context.itemDescription = item => item.description;
  s.context.optionName = option => option.name;
  s.context.tr = ko => ko;
  s.context.synchronizeRagUi = () => {};
  vm.runInContext(source.slice(source.indexOf("function sendRagMessage("), source.indexOf("function resetRagSession(")), s.context);
  vm.runInContext(source.slice(source.indexOf("function submitMenuSelection("), source.indexOf("function addMenuWithDefaults(")), s.context);
  s.context.$("#ragForm").requestSubmit = () => s.context.sendRagMessage(s.context.$("#ragInput").value);
  s.context.sendRagMessage("아메리카노와 카페 라테를 비교해 줘");
  const compared = messages.at(-1);
  assert.equal(compared.menuAction, "order");
  assert.equal(compared.retrieved.length, 2);
  assert.doesNotMatch(compared.text, /은\(는\)|카페인은 높음입니다/);
  s.context.handleRagMenuClick({ target: { closest: selector => selector === "[data-rag-menu-id]" ? { dataset: { ragMenuId: "americano", ragMenuAction: compared.menuAction } } : null } });
  assert.equal(s.state.ragPendingOrder.itemId, "americano");
  assert.equal(s.state.cart.length, 0);
  s.context.sendRagMessage("아이스 레귤러");
  assert.equal(s.state.cart.length, 1);
  assert.equal(s.state.cart[0].quantity, 1);
  assert.equal(s.state.cart[0].unitPrice, 3500);
  assert.equal(messages.at(-1).menuAction, "none");
});

test("뜨아는 HOT과 수량이 채워져 크기만 묻고 레귤러 응답으로 담긴다", () => {
  const s = session();
  s.turn("뜨아 하나 담아줘");
  assert.deepEqual(Array.from(s.state.ragPendingOrder.missingGroups), ["크기"]);
  s.turn("레귤러");
  assert.equal(s.state.cart.length, 1);
  assert.deepEqual(ids(s.state.cart[0]), ["size-regular", "temp-hot"]);
  assert.equal(s.state.cart[0].quantity, 1);
  assert.equal(s.state.cart[0].unitPrice, 3500);
});


test("크루아상만 데우기를 묻고 휘낭시에·치즈케이크는 옵션 없이 담는다", () => {
  const croissant = session();
  croissant.turn("버터 크루아상 하나 담아줘");
  assert.deepEqual(Array.from(croissant.state.ragPendingOrder.missingGroups), ["데우기"]);
  croissant.turn("따뜻하게");
  assert.equal(croissant.state.cart[0].item.id, "croissant");
  assert.deepEqual(ids(croissant.state.cart[0]), ["warm-dessert"]);
  for (const itemId of ["financier", "cheesecake"]) {
    const s = session();
    // Remote menu rows may not yet expose can_be_warmed.
    s.state.items = menu.items.map(({ can_be_warmed, ...item }) => item);
    s.turn(`${s.state.items.find(item => item.id === itemId).name} 하나 담아줘`);
    assert.equal(s.state.ragPendingOrder, null);
    assert.equal(s.state.cart[0].item.id, itemId);
    assert.deepEqual(ids(s.state.cart[0]), []);
    assert.equal(assistant.optionApplies(menu.options.find(o => o.id === "warm-dessert"), s.state.cart[0].item), false);
  }
});

test("아이스 톨 아메리카노와 휘낭시에 복합 주문은 데우기 질문 없이 모두 담긴다", () => {
  const s = session();
  s.turn("아메리카노 아이스 톨 그리고 솔티드 휘낭시에 담아줘");
  assert.equal(s.state.ragPendingOrder, null);
  assert.equal(s.state.cart.length, 2);
  assert.deepEqual(ids(s.state.cart.find(row => row.item.id === "financier")), []);
  assert.equal(s.state.cart.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0), 6700);
});


test("첫 메뉴판 정보 조회 뒤 응답 카드는 설명 반복 대신 옵션 주문을 시작한다", () => {
  const s = session();
  s.state.ragMessages = [];
  s.state.ragRequestId = 0;
  const messages = [];
  s.context.appendRagMessage = (role, text, retrieved, menuAction) => {
    s.state.ragMessages.push({ role, text });
    messages.push({ role, text, retrieved, menuAction });
  };
  s.context.itemName = item => item.name;
  s.context.itemDescription = item => item.description;
  s.context.tr = ko => ko;
  s.context.synchronizeRagUi = () => {};
  vm.runInContext(source.slice(source.indexOf("function sendRagMessage("), source.indexOf("function resetRagSession(")), s.context);
  vm.runInContext(source.slice(source.indexOf("function submitMenuSelection("), source.indexOf("function addMenuWithDefaults(")), s.context);
  s.context.$("#ragForm").requestSubmit = () => s.context.sendRagMessage(s.context.$("#ragInput").value);
  s.context.submitMenuSelection("cafe-latte", { preserveCategory: true });
  assert.equal(s.state.cart.length, 0);
  assert.equal(s.state.ragPendingOrder, null);
  assert.equal(messages.at(-1).menuAction, "order");
  const card = { dataset: { ragMenuId: "cafe-latte", ragMenuAction: messages.at(-1).menuAction } };
  s.context.handleRagMenuClick({ target: { closest: selector => selector === "[data-rag-menu-id]" ? card : null } });
  assert.equal(s.state.ragPendingOrder.itemId, "cafe-latte");
  s.context.sendRagMessage("아이스 레귤러");
  assert.equal(s.state.cart.length, 1);
  assert.equal(s.state.cart[0].quantity, 1);
  assert.equal(s.state.cart[0].unitPrice, 4300);
  assert.equal(messages.at(-1).menuAction, "none");
});
