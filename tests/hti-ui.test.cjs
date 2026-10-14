const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const menu = JSON.parse(fs.readFileSync(path.join(root, "menu.json"), "utf8"));
const officialCatalog = JSON.parse(fs.readFileSync(path.join(root, "reference", "starbucks-official-menu-2026-10-14.json"), "utf8"));
const plan = fs.readFileSync(path.join(root, "03_구현계획.md"), "utf8");
const buildScript = fs.readFileSync(path.join(root, "scripts", "build-static.sh"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

test("고객 화면은 푸드 탭과 내부 dessert ID를 호환한다", () => {
  assert.equal(menu.categories.find((category) => category.id === "dessert")?.name, "푸드");
  assert.match(app, /dessert: "푸드"/);
  assert.match(app, /dessert: "Food"/);
});

test("검증 근거 패널을 제거하고 접근성 장바구니 알림은 유지한다", () => {
  assert.doesNotMatch(html, /id="ragEvidence"/);
  assert.doesNotMatch(html, /id="ragEvidenceItems"/);
  assert.match(html, /id="cartLiveStatus"[^>]+aria-live="polite"/);
  assert.doesNotMatch(css, /\.rag-evidence/);
});

test("유효한 메뉴 ID만 화면 동기화하고 카드에 노랑·그린·빨강 테두리 강조를 제공한다", () => {
  assert.match(app, /function synchronizeRagUi/);
  assert.match(app, /state\.items\.find\(\(item\) => item\.id === row\.id && item\.available !== false\)/);
  assert.match(app, /function ragFocusLevel\(result\)/);
  assert.match(app, /result\.intent === "recommend"\) return "weak"/);
  assert.match(app, /strongActions\.has\(result\.action\?\.type\)/);
  assert.match(app, /rag-focus-\$\{state\.ragFocusLevel\}/);
  assert.match(css, /\.menu-card\.rag-focused \{[\s\S]*border: 3px solid/);
  assert.match(css, /\.menu-card\.rag-focus-weak \{ border-color: var\(--highlight-yellow\);/);
  assert.match(css, /\.menu-card\.rag-focus-medium \{ border-color: var\(--highlight-green\);/);
  assert.match(css, /\.menu-card\.rag-focus-strong \{ border-color: var\(--highlight-red\);/);
});

test("인라인 주문 도우미의 근거 메뉴 클릭은 메뉴명만 전송한다", () => {
  assert.match(app, /function submitMenuSelection\(itemId\)/);
  assert.match(app, /candidate\.id === itemId && candidate\.available !== false/);
  assert.match(app, /\$\("#ragInput"\)\.value = itemName\(item\)/);
  assert.doesNotMatch(app, /\$\("#ragInput"\)\.value = tr\(`\$\{item\.name\} 주문할게`/);
  assert.match(app, /\$\("#ragForm"\)\.requestSubmit\(\)/);
  assert.doesNotMatch(app, /openOptions\(button\.dataset\.ragMenuId\)/);
});

test("사용자 메시지는 노란 배경과 진한 글자로 주문 도우미 답변과 구분한다", () => {
  assert.match(css, /--chat-user-yellow: #f2d675/);
  assert.match(css, /--chat-user-ink: #3a2b0b/);
  assert.match(css, /\.rag-message \{ align-self: flex-start;/);
  assert.match(css, /\.rag-message\.user \{ align-self: flex-end;[^}]*color: var\(--chat-user-ink\);[^}]*background: var\(--chat-user-yellow\);/);
  assert.match(app, /role === "assistant" \? `<span class="rag-message-label">\$\{tr\("주문 도우미", "Order Assistant"\)\}<\/span>` : ""/);
  assert.doesNotMatch(app, /tr\("나", "You"\)/);
  assert.match(css, /\.rag-message-label \{/);
  assert.match(html, /data-rag-prompt-en="Recommend a drink that pairs with a sandwich"/);
  assert.match(app, /state\.language === "en" \? button\.dataset\.ragPromptEn : button\.dataset\.ragPrompt/);
});

test("아메리카노 설명은 실제 초콜릿 첨가로 오해되지 않는 문구를 사용한다", () => {
  const americano = menu.items.find((item) => item.id === "americano");
  assert.equal(americano?.description, "진한 에스프레소에 물을 더한 깊고 깔끔한 풍미");
  assert.doesNotMatch(americano?.description || "", /초콜릿/);
  assert.match(app, /itemKoreanDescriptionOverrides/);
  assert.match(app, /americano: "진한 에스프레소에 물을 더한 깊고 깔끔한 풍미"/);
});

test("주문 내역의 메뉴를 누르면 기존 옵션과 수량을 불러와 수정한다", () => {
  assert.match(app, /<article class="cart-item" data-cart-edit=/);
  assert.match(app, /data-cart-edit=/);
  assert.match(app, /openOptions\(entry\.item\.id, entry\.key\)/);
  assert.match(app, /const actionButton = event\.target\.closest\("\[data-cart-action\]"\)/);
  assert.ok(app.indexOf("const actionButton = event.target.closest") < app.indexOf("const editButton = event.target.closest"));
  assert.match(app, /state\.editingCartKey = cartEntry\?\.key \|\| null/);
  assert.match(app, /cartEntry\.options\.some/);
  assert.match(app, /변경사항 적용/);
  assert.match(app, /state\.cart = state\.cart\.filter\(\(entry\) => entry\.key !== editingKey\)/);
  assert.match(css, /\.cart-item \{[^}]*border: 1px solid var\(--line\);[^}]*border-radius: var\(--radius-md\);/);
  assert.match(css, /\.cart-item-edit:focus-visible/);
});

test("복합 장바구니 액션은 모든 항목을 순서대로 적용한다", () => {
  assert.match(app, /result\.action\.type === "batch"/);
  assert.match(app, /result\.action\.actions\.forEach/);
  assert.match(app, /현재 합계/);
});

test("전체화면 버튼은 진입·해제와 브라우저 상태 변경을 동기화한다", () => {
  assert.match(html, /id="fullscreenButton"[^>]+aria-pressed="false"/);
  assert.match(app, /function fullscreenEnterMethod/);
  assert.match(app, /root\.requestFullscreen/);
  assert.match(app, /function fullscreenExitMethod/);
  assert.match(app, /document\.exitFullscreen/);
  assert.match(app, /addEventListener\("fullscreenchange", updateFullscreenButton\)/);
  assert.match(app, /setAttribute\("aria-pressed", String\(active\)\)/);
  assert.match(css, /\.fullscreen-button\.is-active/);
});

test("전체화면 종료는 브라우저별 API와 실패 감지를 제공한다", () => {
  assert.match(app, /document\.webkitCancelFullScreen/);
  assert.match(app, /document\.mozCancelFullScreen/);
  assert.match(app, /document\.msExitFullscreen/);
  assert.match(app, /waitForFullscreenState\(entering\)/);
  assert.match(app, /전체화면을 종료하지 못했습니다/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(css, /\.fullscreen-button\.is-active \{[\s\S]*position: fixed/);
});

test("서비스워커와 정적 자산은 같은 배포 캐시 버전을 사용한다", () => {
  assert.match(html, /styles\.css\?v=51/);
  assert.match(html, /app\.js\?v=51/);
  assert.match(app, /serviceWorker\.register\("\.\/sw\.js\?v=51"\)/);
  assert.match(serviceWorker, /CACHE_NAME = "morning-brew-v51"/);
  assert.match(serviceWorker, /app\.js\?v=51/);
});

test("데모 운영판은 이메일 없이 미리 입력된 공용 번호만 사용한다", () => {
  assert.match(html, /id="staffPin"[^>]+value="111111"/);
  assert.match(html, /id="staffPinForm"/);
  assert.doesNotMatch(html, /id="staffEmail"/);
  assert.doesNotMatch(html, /운영자 로그인/);
  assert.match(app, /function unlockStaffBoard/);
  assert.match(app, /function lockStaffBoard/);
});

test("데스크톱 화면은 메뉴·주문 도우미·주문 내역 순서이며 전체화면 왼쪽에 화면 탭을 둔다", () => {
  assert.ok(html.indexOf('class="menu-panel"') < html.indexOf('class="assistant-panel'));
  assert.ok(html.indexOf('class="assistant-panel') < html.indexOf('class="cart-panel"'));
  assert.ok(html.indexOf('class="page-tabs header-page-tabs"') < html.indexOf('id="fullscreenButton"'));
  assert.ok(html.indexOf('id="cartTitle"') < html.indexOf('class="order-type cart-order-type"'));
  assert.match(css, /\.assistant-panel \{[^}]*height: calc\(100dvh - 156px\)/);
  assert.match(css, /\.cart-panel \{[\s\S]*height: calc\(100dvh - 156px\)/);
});

test("검색창을 제거하고 메뉴 제목 옆에 카테고리 기능을 배치한다", () => {
  assert.doesNotMatch(html, /id="searchInput"/);
  assert.doesNotMatch(css, /\.search-field/);
  assert.match(html, /class="menu-toolbar"[\s\S]*id="categoryTabs"/);
  assert.match(html, /id="categoryTabs"[^>]+toolbar-category-tabs/);
});

test("메뉴 카드는 이미지·이름·가격만 표시하고 클릭 시 메뉴명만 전송한다", () => {
  assert.match(app, /data-menu-selection-id=/);
  assert.doesNotMatch(app, /data-menu-order-id=/);
  assert.doesNotMatch(app, /data-menu-option-id=/);
  assert.doesNotMatch(app, /data-chat-menu-id=/);
  assert.doesNotMatch(app, /data-add-menu-id=/);
  assert.match(app, /class="menu-card-image"/);
  assert.doesNotMatch(app, /class="badge"/);
  assert.doesNotMatch(app, /class="category-dot"/);
  assert.doesNotMatch(app, /class="add-symbol"/);
  assert.match(css, /\.menu-grid \{[^}]*grid-template-columns: repeat\(3,/);
  assert.match(css, /\.menu-card-image \{[^}]*width: min\(100%, 210px\)/);
  assert.match(css, /\.menu-card-copy \{[^}]*align-items: center;[^}]*text-align: center;/);
  assert.doesNotMatch(app, /function prefillRagInput\(itemId\)/);
  assert.match(app, /submitMenuSelection\(selectionButton\.dataset\.menuSelectionId\)/);
  assert.match(app, /submitMenuSelection\(button\.dataset\.ragMenuId\)/);
});

test("12개 주문 메뉴와 공식 316개 카탈로그 감사를 구분한다", () => {
  assert.match(app, /const menuImageSources =/);
  assert.match(app, /class="menu-card-image"/);
  assert.match(html, /스타벅스 코리아 공식 메뉴/);
  assert.match(html, /제휴하거나 후원받지 않았으며/);
  menu.items.forEach((item) => {
    assert.ok(fs.existsSync(path.join(root, "assets", "menu", `${item.id}.jpg`)), `${item.id} image is missing`);
  });
  assert.equal(officialCatalog.counts.total, 316);
  assert.equal(officialCatalog.counts.drink, 198);
  assert.equal(officialCatalog.counts.food, 118);
  assert.equal(officialCatalog.counts.with_image, 316);
  assert.equal(officialCatalog.counts.with_official_price, 0);
  assert.match(buildScript, /cp -R "\$PROJECT_DIR\/assets\/\." "\$STAGING_DIR\/assets\/"/);
});

test("03 구현계획은 현재 범위와 다음 단계를 분리한다", () => {
  assert.match(plan, /12개.*현재/);
  assert.match(plan, /단계 A — 이번 구현/);
  assert.match(plan, /단계 B — 카탈로그와 검색 확장/);
  assert.match(plan, /단계 C — 서버 Agent와 주문 상태 강화/);
});
