// Read-only review probes. A FAIL means the current implementation misses the stated requirement.
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const a = require(path.join(root, 'rag-assistant.js'));
const menu = require(path.join(root, 'menu.json'));
const base = { items: menu.items, options: menu.options, cart: [] };
const probes = [];
function check(name, input, accepts, extra = {}) {
  const result = a.respond({ ...base, ...extra, message: input });
  probes.push({ name, input, pass: !!accepts(result), actual: { intent: result.intent, answer: result.answer, action: result.action, ids: result.retrieved.map(x => x.id) } });
}
check('HOT alias', '뜨아 톨 하나 담아줘', r => r.action?.optionIds.includes('temp-hot'));
check('English Can I get with oat', 'Can I get a hot latte, medium, with oat milk?', r => r.action?.optionIds.includes('extra-oat'));
check('Sugar-free excludes citron', '당 없는 음료 추천해줘', r => r.retrieved.length && r.retrieved.every(x => ['americano', 'earl-grey'].includes(x.id)));
check('Contracted English order', "I'd like a hot latte, medium, with oat milk", r => r.action?.type === 'add');
check('Iced vanilla alias preserves ICE', '아바라 톨 하나 담아줘', r => r.action?.optionIds.includes('temp-ice'));
check('Zero caffeine and zero sugar tea has no false positives', '카페인 없고 당류도 없는 따뜻한 차 추천해줘', r => r.retrieved.length === 0);
check('Zero caffeine excludes chocolate', '카페인 없는 음료 추천해줘', r => !r.retrieved.some(x => ['chocolate', 'americano', 'earl-grey'].includes(x.id)));
check('Different options stay on each drink', '아이스 아메리카노 레귤러 하나랑 따뜻한 카페라테 라지 하나 담아줘', r => {
  const rows = r.action?.items || [];
  return rows.length === 2 && JSON.stringify(rows[0].optionIds) === JSON.stringify(['temp-ice', 'size-regular']) && JSON.stringify(rows[1].optionIds) === JSON.stringify(['temp-hot', 'size-large']);
});
const drinkOptions = menu.options.filter(o => o.menu_item_id !== '*dessert');
check('Completed dessert yields an executable add while drink remains pending', '아메리카노 큰 거 하나랑 치즈케이크 하나 담아줘', r => ['add', 'add_many', 'batch'].includes(r.action?.type), { options: drinkOptions });
check('Partial cancellation removes one', '아아 두 잔 중 한 잔 취소해줘. 총 얼마야?', r => r.action?.quantity === 1, { cart: [{ item: menu.items[0], quantity: 2, unitPrice: 3500 }] });
check('Coffee category list includes all catalog coffees', '커피 종류 전부 알려줘', r => r.retrieved.length === menu.items.filter(x => x.category_id === 'coffee').length && r.retrieved.every(x => x.category_id === 'coffee'));
let pending = a.respond({ ...base, message: '아메리카노 담아줘' }).action;
pending = a.respond({ ...base, message: '아이스', pendingOrder: pending }).action;
check('M이요 completes pending size', 'M이요', r => r.action?.type === 'add' && r.action.optionIds.includes('size-regular'), { pendingOrder: pending });
check('Explicit new item supersedes pending item', '그냥 유자차 핫 라지 주세요', r => r.action?.itemId === 'citron-tea', { pendingOrder: pending });
const groupNames = { '온도': 'Temperature', '크기': 'Size', '추가': 'Extras', '데우기': 'Heating' };
check('English UI does not require optional extras', 'Can I get a hot latte, medium?', r => r.action?.type === 'add', { language: 'en', options: menu.options.map(o => ({ ...o, group_name: groupNames[o.group_name] })) });
for (const probe of probes) console.log(JSON.stringify(probe));
console.log(JSON.stringify({ total: probes.length, passed: probes.filter(x => x.pass).length, failed: probes.filter(x => !x.pass).length }));
