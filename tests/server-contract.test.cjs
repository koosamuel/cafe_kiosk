const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");
const demoMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "202610130004_demo_operator_pin.sql"), "utf8");
const totalFixMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "202610130005_fix_order_total.sql"), "utf8");
const client = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("주문 생성은 보안 RPC를 통해 처리한다", () => {
  assert.match(schema, /create or replace function public\.create_kiosk_order/);
  assert.match(schema, /security definer/);
  assert.match(schema, /grant execute on function public\.create_kiosk_order/);
  assert.match(client, /db\.rpc\("create_kiosk_order"/);
  assert.match(client, /p_request_id: state\.pendingOrder\.id/);
  assert.match(schema, /request_id uuid not null unique/);
  assert.match(schema, /order_number text not null unique/);
});

test("클라이언트 옵션을 서버에서 검증한다", () => {
  assert.match(schema, /one or more options are invalid or duplicated/);
  assert.match(schema, /only one option may be selected per option group/);
});

test("신규 주문 합계는 기존 주문 조회 뒤에도 0부터 안전하게 누적한다", () => {
  assert.match(schema, /if found then[\s\S]*?end if;[\s\S]*?v_total := 0;/);
  assert.match(schema, /insert into public\.orders \(request_id, order_number, order_type, payment_method, total_amount\)/);
  assert.match(schema, /values \(p_request_id, v_order_number, p_order_type, p_payment_method, 0\)/);
  assert.match(totalFixMigration, /create or replace function public\.create_kiosk_order/);
  assert.match(totalFixMigration, /v_total := 0;/);
});

test("기존 운영자 전용 주문 상태 RPC는 인증 사용자에게만 유지한다", () => {
  assert.match(schema, /create or replace function public\.advance_kiosk_order/);
  assert.match(schema, /if not public\.is_cafe_staff\(\)/);
  assert.match(schema, /revoke update on public\.orders from authenticated/);
  assert.doesNotMatch(client, /db\.from\("orders"\)\.update/);
});

test("공용 번호 주문판은 제한형 RPC로 최근 활성 주문만 다룬다", () => {
  assert.match(schema, /create or replace function public\.list_demo_kiosk_orders\(p_operator_pin text\)/);
  assert.match(schema, /create or replace function public\.advance_demo_kiosk_order/);
  assert.match(schema, /extensions\.digest\(coalesce\(p_operator_pin, ''\), 'sha256'\)/);
  assert.match(schema, /o\.created_at >= now\(\) - interval '24 hours'/);
  assert.match(schema, /grant execute on function public\.list_demo_kiosk_orders\(text\) to anon, authenticated/);
  assert.match(schema, /grant execute on function public\.advance_demo_kiosk_order\(text, uuid, text\) to anon, authenticated/);
  assert.match(client, /db\.rpc\("list_demo_kiosk_orders"/);
  assert.match(client, /db\.rpc\("advance_demo_kiosk_order"/);
  assert.match(client, /p_operator_pin: state\.staffPin/);
  assert.match(demoMigration, /alter table public\.orders alter column total_amount set default 0/);
  assert.match(demoMigration, /grant execute on function public\.create_kiosk_order\(text, text, jsonb, uuid\) to anon, authenticated/);
});
