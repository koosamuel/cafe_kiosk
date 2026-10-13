const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const menu = JSON.parse(fs.readFileSync(path.join(root, "menu.json"), "utf8"));
const plan = fs.readFileSync(path.join(root, "03_구현계획.md"), "utf8");

test("고객 화면은 푸드 탭과 내부 dessert ID를 호환한다", () => {
  assert.equal(menu.categories.find((category) => category.id === "dessert")?.name, "푸드");
  assert.match(app, /dessert: "푸드"/);
  assert.match(app, /dessert: "Food"/);
});

test("검증 근거 패널과 접근성 장바구니 알림을 제공한다", () => {
  assert.match(html, /id="ragEvidence"/);
  assert.match(html, /id="ragEvidenceItems"/);
  assert.match(html, /id="cartLiveStatus"[^>]+aria-live="polite"/);
  assert.match(css, /\.rag-evidence-card/);
});

test("유효한 메뉴 ID만 화면 동기화하고 카드에 비색상 강조를 제공한다", () => {
  assert.match(app, /function synchronizeRagUi/);
  assert.match(app, /state\.items\.find\(\(item\) => item\.id === row\.id && item\.available !== false\)/);
  assert.match(css, /\.menu-card\.rag-focused::after/);
  assert.match(css, /content: "AI 추천 근거"/);
});

test("인라인 주문 도우미의 근거 메뉴 클릭은 옵션 창을 연다", () => {
  assert.match(app, /openOptions\(button\.dataset\.ragMenuId\)/);
  assert.doesNotMatch(app, /\$\("#ragDialog"\)\.close\(\)/);
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

test("03 구현계획은 현재 범위와 다음 단계를 분리한다", () => {
  assert.match(plan, /12개.*현재/);
  assert.match(plan, /단계 A — 이번 구현/);
  assert.match(plan, /단계 B — 카탈로그와 검색 확장/);
  assert.match(plan, /단계 C — 서버 Agent와 주문 상태 강화/);
});
