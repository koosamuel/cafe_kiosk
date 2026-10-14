(function initializeCafeRagAssistant(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CafeRagAssistant = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const KNOWLEDGE = {
    americano: { aliases: ["아아", "뜨아", "따아", "따뜻한 아메리카노", "아메리까노", "아메리카노오", "americano", "caffe americano"], caffeine: "높음", sugar: "없음", tags: ["진한", "깔끔한", "저당", "무당", "당류없음", "쌉쌀한", "strong", "clean", "sugar free"] },
    "cafe-latte": { aliases: ["카페라떼", "라떼", "카페라테", "cafe latte", "latte"], caffeine: "중간", sugar: "낮음", tags: ["부드러운", "고소한", "우유", "smooth", "milk"] },
    "vanilla-latte": { aliases: ["바닐라라떼", "바닐라라테", "바라", "아바라", "vanilla latte"], caffeine: "중간", sugar: "중간", tags: ["달콤한", "부드러운", "우유", "sweet"] },
    "flat-white": { aliases: ["플랫화이트", "flat white"], caffeine: "높음", sugar: "낮음", tags: ["진한", "고소한", "우유", "strong"] },
    "matcha-latte": { aliases: ["말차라떼", "말차라테", "그린티라떼", "그린티 라떼", "그린티", "matcha latte", "green tea latte"], caffeine: "낮음", sugar: "중간", tags: ["달콤한", "쌉싸름한", "논커피", "matcha"] },
    chocolate: { aliases: ["초코", "초코라떼", "초콜릿라떼", "chocolate", "hot chocolate"], caffeine: "매우 낮음", sugar: "높음", tags: ["달콤한", "초콜릿", "논커피", "sweet"] },
    "lemon-ade": { aliases: ["레몬에이드", "lemon ade", "lemonade"], caffeine: "없음", sugar: "중간", tags: ["상큼한", "청량한", "무카페인", "차가운", "refreshing", "caffeine free"] },
    "earl-grey": { aliases: ["얼그레이", "홍차", "얼그레이티", "얼 그레이", "earl grey", "black tea"], caffeine: "낮음", sugar: "없음", tags: ["향긋한", "깔끔한", "티", "무당", "당류없음", "sugar free"] },
    "citron-tea": { aliases: ["유자티", "유자 차", "유자차", "유자", "citron tea", "yuzu tea"], caffeine: "없음", sugar: "높음", tags: ["상큼한", "달콤한", "무카페인", "따뜻한", "caffeine free", "sweet"] },
    croissant: { aliases: ["크로아상", "플레인 크루아상", "croissant"], caffeine: "없음", sugar: "낮음", tags: ["고소한", "바삭한", "빵", "디저트", "푸드"] },
    financier: { aliases: ["휘낭시에", "financier"], caffeine: "없음", sugar: "중간", tags: ["고소한", "달콤한", "버터", "디저트", "푸드"] },
    cheesecake: { aliases: ["치즈 케이크", "바스크치즈케이크", "cheesecake", "basque cheesecake"], caffeine: "없음", sugar: "중간", tags: ["고소한", "크리미한", "케이크", "디저트", "푸드"] },
  };

  const CATEGORY_LABELS = {
    coffee: "커피",
    noncoffee: "논커피",
    tea: "티",
    dessert: "푸드",
  };

  const QUERY_ALIASES = {
    디카페인: ["무카페인", "카페인 없음", "카페인이 적은", "카페인 적은", "카페인 낮은", "decaf", "caffeine free"],
    달콤한: ["단", "달달한", "디저트 같은", "sweet"],
    상큼한: ["산뜻한", "청량한", "시원한", "refreshing"],
    진한: ["쌉쌀한", "커피 맛", "잠 깨는", "strong"],
    고소한: ["부드러운", "우유", "라테", "smooth", "nutty"],
    무당: ["당 없는", "당이 없는", "당류 없는", "설탕 없는", "sugar free", "no sugar", "zero sugar"],
  };
  const ZERO_SUGAR = /무당|무설탕|당(?:류)?(?:이|가|도)?\s*(?:없|0\s*g)|설탕\s*없|sugar[ -]?free|(?:no|zero) sugar/u;
  const ZERO_CAFFEINE = /무카페인|카페인(?:이|도)?\s*(?:없|0\s*mg)|caffeine[ -]?free|(?:no|zero) caffeine/u;

  const MEAL_PAIRINGS = [
    { label: "샌드위치", aliases: ["샌드위치", "토스트", "햄버거", "sandwich", "toast", "burger"], recommendations: [
      ["americano", "깔끔하고 쌉쌀해 빵과 속재료의 풍미를 정리해 줍니다."],
      ["cafe-latte", "부드럽고 고소해 담백한 샌드위치와 잘 어울립니다."],
      ["earl-grey", "베르가못 향이 산뜻해 채소나 햄과 균형을 이룹니다."],
    ] },
    { label: "샐러드", aliases: ["샐러드", "채소식", "야채식", "salad"], recommendations: [
      ["earl-grey", "향긋하고 깔끔해 신선한 채소 맛을 해치지 않습니다."],
      ["citron-tea", "상큼한 유자 향이 가벼운 샐러드와 잘 어울립니다."],
      ["lemon-ade", "산뜻하고 청량해 고소한 드레싱과 균형을 이룹니다."],
    ] },
    { label: "파스타", aliases: ["파스타", "스파게티", "면요리", "pasta", "spaghetti"], recommendations: [
      ["americano", "쌉쌀하고 깔끔해 크림이나 치즈의 묵직함을 정리해 줍니다."],
      ["lemon-ade", "상큼한 풍미가 진한 소스 뒤 입안을 산뜻하게 합니다."],
      ["citron-tea", "유자 향이 오일이나 토마토소스와 가볍게 어울립니다."],
    ] },
    { label: "치킨", aliases: ["치킨", "닭요리", "닭고기", "chicken"], recommendations: [
      ["citron-tea", "상큼한 유자 향이 기름진 맛을 정리해 줍니다."],
      ["lemon-ade", "청량한 탄산이 튀김이나 양념과 잘 어울립니다."],
      ["americano", "단맛이 적고 쌉쌀해 치킨의 풍미를 방해하지 않습니다."],
    ] },
  ];

  const SHORT_CONTEXT_PATTERN = /^(네|예|응|그래|좋아|둘\s*다|그걸로|그거|둘\s*모두|주문\s*(?:할게(?:요)?|할래(?:요)?|해\s*줘)|이걸로\s*주문\s*(?:할게(?:요)?|할래(?:요)?)|order\s+it|[sml]|중|대|소|레귤러|라지|샷\s*추가)[.!~]?$/iu;
  const STANDALONE_ORDER_INTENT_PATTERN = /^(?:주문\s*(?:하자|할게(?:요)?|할래(?:요)?|할까(?:요)?|해\s*줘)|담아\s*줘|이걸로\s*주문\s*(?:할게(?:요)?|할래(?:요)?)|order(?:\s+it)?|let'?s\s+order|i\s+(?:want|would\s+like)\s+to\s+order)[.!~]?$/iu;

  const STOP_WORDS = new Set(["메뉴", "음료", "추천", "추천해", "추천해줘", "알려", "알려줘", "주세요", "주문", "담아", "담아줘", "비교", "차이", "가격", "얼마", "뭐가", "어떤", "해줘", "해", "좀"]);

  function normalize(value = "") {
    return String(value)
      .toLocaleLowerCase("ko-KR")
      .replace(/[’']/g, "")
      .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, "")
      .replace(/[.,!?~'"()[\]{}:;·/\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(value = "") {
    return normalize(value).replace(/\s+/g, "");
  }

  function mentionsAlias(message, alias) {
    const normalizedMessage = normalize(message);
    const normalizedAlias = normalize(alias);
    const aliasCompact = compact(alias);
    if (!normalizedMessage || !normalizedAlias || !aliasCompact) return false;
    if (aliasCompact.length > 2) return compact(message).includes(aliasCompact);
    return normalizedMessage.split(/\s+/u).some((token) => compact(token.replace(/(은|는|이|가|을|를|에|도|만|와|과)$/u, "")) === aliasCompact);
  }

  function tokens(value = "") {
    return normalize(value)
      .split(" ")
      .map((token) => token.replace(/(으로|에서|하고|이랑|랑|과|와|은|는|이|가|을|를|에|도|만)$/u, ""))
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  }

  function ngrams(value, size = 2) {
    const valueCompact = compact(value);
    const result = new Set();
    for (let index = 0; index <= valueCompact.length - size; index += 1) result.add(valueCompact.slice(index, index + size));
    return result;
  }

  function matchingMealPairings(message) {
    const query = compact(message);
    return MEAL_PAIRINGS.filter((guide) => guide.aliases.some((alias) => query.includes(compact(alias))));
  }

  function itemDocument(item) {
    const knowledge = KNOWLEDGE[item.id] || {};
    const pairingTerms = MEAL_PAIRINGS.flatMap((guide) => guide.recommendations.some(([itemId]) => itemId === item.id) ? [guide.label, ...guide.aliases] : []);
    return normalize([
      item.name,
      item.description,
      CATEGORY_LABELS[item.category_id] || item.category_id,
      knowledge.caffeine,
      ...(knowledge.aliases || []),
      ...(knowledge.tags || []),
      ...pairingTerms,
    ].join(" "));
  }

  function expandedTerms(message) {
    const normalized = normalize(message);
    const result = new Set(tokens(normalized));
    Object.entries(QUERY_ALIASES).forEach(([canonical, aliases]) => {
      if (aliases.some((alias) => normalized.includes(alias))) result.add(canonical);
    });
    if (/카페인.*(없|적|낮)|디카페인|무카페인/u.test(normalized)) {
      result.add("없음");
      result.add("매우 낮음");
      result.add("낮음");
    }
    if (ZERO_SUGAR.test(normalized)) {
      result.add("무당");
      result.add("저당");
      result.add("sugar free");
    }
    return [...result];
  }

  function scoreItem(item, message) {
    const query = normalize(message);
    const compactQuery = compact(message);
    const knowledge = KNOWLEDGE[item.id] || {};
    const names = [item.name, ...(knowledge.aliases || [])];
    const document = itemDocument(item);
    let score = 0;

    const queryGrams = ngrams(query);
    const documentGrams = ngrams(document);
    let overlap = 0;
    queryGrams.forEach((gram) => { if (documentGrams.has(gram)) overlap += 1; });
    score += (overlap / Math.max(1, queryGrams.size)) * 8;

    names.forEach((name) => {
      const nameCompact = compact(name);
      if (nameCompact && mentionsAlias(message, name)) score += 18;
      else if (nameCompact && nameCompact.includes(compactQuery) && compactQuery.length >= 2) score += 8;
    });
    expandedTerms(query).forEach((term) => {
      const normalizedTerm = normalize(term);
      if (normalizedTerm && document.includes(normalizedTerm)) score += normalizedTerm.includes(" ") ? 4 : 3;
    });
    if (query.includes("논커피") && item.category_id === "noncoffee") score += 5;
    if (/(디저트|푸드)/u.test(query) && item.category_id === "dessert") score += 5;
    if (query.includes("커피") && item.category_id === "coffee") score += 3;
    if (/저렴|싼|가성비/u.test(query)) score += Math.max(0, 6 - Number(item.price || 0) / 1000);
    if (ZERO_SUGAR.test(query)) {
      if (knowledge.sugar === "높음") score -= 15;
      if (knowledge.sugar === "없음") score += 10;
    }
    return score;
  }

  function retrieveMenu(items, message, limit = 4) {
    return (items || [])
      .filter((item) => item && item.available !== false)
      .map((item) => ({ item, score: scoreItem(item, message) }))
      .filter((row) => row.score > 0)
      .sort((left, right) => right.score - left.score || Number(left.item.price) - Number(right.item.price))
      .slice(0, Math.max(1, limit));
  }

  function won(value) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function parseQuantity(message) {
    const match = normalize(message).match(/(\d+)\s*(잔|개|조각|병)?/u);
    if (match) return Math.min(20, Math.max(1, Number(match[1])));
    const words = { 한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4 };
    const wordMatch = normalize(message).match(/(한|하나|두|둘|세|셋|네|넷)\s*(잔|개|조각|병)/u);
    if (wordMatch) return words[wordMatch[1]];
    const englishWords = { one: 1, two: 2, three: 3, four: 4 };
    const englishMatch = normalize(message).match(/\b(one|two|three|four)\b/u);
    return englishMatch ? englishWords[englishMatch[1]] : 1;
  }

  function conversationQuery(message, history = [], items = []) {
    const normalizedMessage = normalize(message);
    const previousUser = [...history].reverse().find((entry) => entry?.role === "user" && entry.text);
    if (!previousUser) return message;
    if (SHORT_CONTEXT_PATTERN.test(normalizedMessage)) return `${previousUser.text} ${message}`;
    const previousWasOrderIntent = STANDALONE_ORDER_INTENT_PATTERN.test(normalize(previousUser.text));
    const currentNamesMenu = explicitlyNamedItems(items, message).length > 0;
    return previousWasOrderIntent && currentNamesMenu ? `${previousUser.text} ${message}` : message;
  }

  function requestedOptionIds(message, options = []) {
    const text = normalize(message);
    const requests = [
      [/아아|아바라|아이스|\biced?\b|차가운|차갑|시원한/u, (option) => normalize(option.name) === "ice"],
      [/뜨아|따아|핫|따뜻|뜨겁|hot/u, (option) => normalize(option.name) === "hot"],
      [/(?:^|\s)l(?:로|이요|요)?(?:\s|$)|라지|large|그란데|벤티|grande|venti|큰\s*사이즈|큰\s*거/u, (option) => normalize(option.name) === "large"],
      [/(?:^|\s)(?:m|r)(?:으로|로|이요|요)?(?:\s|$)|미디엄|레귤러|regular|medium|중\s*사이즈|중간|톨|tall/u, (option) => normalize(option.name) === "regular"],
      [/(?:^|\s)s(?:\s|$)|스몰|small|작은\s*사이즈|작은\s*거|숏|short/u, (option) => /small|스몰/u.test(normalize(option.name)) || normalize(option.name) === "regular"],
      [/샷\s*추가|샷|extra shot/u, (option) => /샷 추가|extra shot/u.test(normalize(option.name))],
      [/디카페인|decaf/u, (option) => /디카페인|decaf/u.test(normalize(option.name))],
      [/오트\s*밀크|오트밀크|오트|oat milk|oat/u, (option) => /오트 밀크|oat milk/u.test(normalize(option.name))],
      [/데워|따뜻하게|warmed|warm it|warm/u, (option) => /따뜻하게|warmed/u.test(normalize(option.name))],
      [/그대로|as is/u, (option) => /그대로|as is/u.test(normalize(option.name))],
    ];
    return [...new Set(requests.flatMap(([pattern, matches]) => pattern.test(text)
      ? options.filter(matches).map((option) => option.id)
      : []))];
  }

  function optionApplies(option, item) {
    if (optionGroup(option) === "heating" && (item.can_be_warmed === false || ["financier", "cheesecake"].includes(item.id))) return false;
    if (!option.menu_item_id || option.menu_item_id === item.id) return true;
    if (option.menu_item_id === "*drink") return item.category_id !== "dessert";
    if (option.menu_item_id === "*coffee") return item.category_id === "coffee";
    if (option.menu_item_id === "*latte") return /latte|라테|라떼/u.test(`${item.id} ${item.name}`);
    if (option.menu_item_id === "*dessert") return item.category_id === "dessert";
    return false;
  }

  function requiredGroups(item, options) {
    const applicable = options.filter((option) => optionApplies(option, item));
    return [...new Set(applicable.filter((option) => optionGroup(option) && optionGroup(option) !== "extras"
      && applicable.filter((other) => optionGroup(other) === optionGroup(option)).length > 1).map((option) => option.group_name))];
  }

  function missingGroups(item, optionIds, options) {
    const selected = new Set(optionIds);
    return requiredGroups(item, options).filter((group) => !options.some((option) => optionApplies(option, item) && selected.has(option.id) && option.group_name === group));
  }

  function explicitlyNamedItems(items, message) {
    return [...new Map(namedMentions(items, message).map((row) => [row.item.id, row.item])).values()];
  }

  function missingGroupAnswer(item, groups, options, isEn = false) {
    const details = groups.map((group) => {
      const groupOptions = options.filter((option) => optionApplies(option, item) && option.group_name === group);
      const label = isEn ? ({ temperature: "Temperature", size: "Size", heating: "Heating" })[optionGroup(groupOptions[0] || {})] || group : group;
      const choices = groupOptions
        .map((option) => `${option.name}${Number(option.price_delta || 0) ? `(+${won(option.price_delta)})` : ""}`);
      return `${label}: ${choices.join(" / ")}`;
    });
    return isEn ? `${item.name}: Please select ${details.join(", ")}.` : `${item.name} 주문에 필요한 옵션을 선택해 주세요. ${details.join(", ")}`;
  }

  function cartSummary(cart, isEn = false) {
    const rows = Array.isArray(cart) ? cart : [];
    if (!rows.length) return isEn ? "Your cart is empty." : "현재 장바구니는 비어 있습니다.";
    const count = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const total = rows.reduce((sum, row) => sum + Number(row.unitPrice || 0) * Number(row.quantity || 0), 0);
    const details = rows.map((row) => `${row.item?.name || "메뉴"}${row.options?.length ? ` (${row.options.map((o) => o.name).join(" / ")})` : ""} ×${row.quantity} (${won(Number(row.unitPrice) * row.quantity)})`).join(", ");
    return isEn ? `${details}; ${count} items, total ${won(total)}.` : `현재 ${details}, 총 ${count}개가 담겨 있고 합계는 ${won(total)}입니다.`;
  }

  function repriceCart(cart, items, options) {
    return applyCartActions({ cart, items, options }).cart;
  }

  function cartSignature(cart, orderType) {
    return JSON.stringify({ orderType, lines: cart.map((row) => [row.key, row.item.id, row.quantity, row.unitPrice, (row.options || []).map((o) => o.id).sort()]) });
  }

  function sizePriceAnswer(item, options, isEn) {
    const sizes = options.filter((o) => optionApplies(o, item) && optionGroup(o) === "size");
    const prices = sizes.length ? sizes.map((o) => `${o.name} ${won(Number(item.price) + Number(o.price_delta || 0))}`).join(" / ") : won(item.price);
    return isEn ? `${item.name}: ${prices}. Extras are charged separately.` : `${item.name}: ${prices}입니다. 추가 옵션 요금은 별도입니다.`;
  }

  function knowledgeFor(item) {
    return { caffeine: "정보 없음", tags: [], ...(KNOWLEDGE[item.id] || {}),
      ...(item.category_id === "dessert" ? { caffeine: "정보 없음" } : {}),
      ...(item.caffeine_level ? { caffeine: item.caffeine_level } : {}),
      ...(item.sugar_level ? { sugar: item.sugar_level } : {}) };
  }

  function mentionIndex(item, message) {
    const query = compact(message);
    const knowledge = KNOWLEDGE[item.id] || {};
    const indexes = [item.name, ...(knowledge.aliases || [])]
      .map(compact)
      .map((name) => query.indexOf(name))
      .filter((index) => index >= 0);
    return indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
  }

  function menuSentence(item) {
    const knowledge = knowledgeFor(item);
    return `${item.name} (${won(item.price)})\n${item.description}\n메뉴에 표시된 카페인 수준: ${knowledge.caffeine || "정보 없음"}`;
  }

  function recommendationReason(item, message, isEn = false) {
    const query = normalize(message);
    const knowledge = knowledgeFor(item);
    if (ZERO_SUGAR.test(query)) {
      return isEn ? "Listed as sugar-free in our demo menu; sweetened drinks are excluded." : "가상 카페 메뉴의 당류 없음 분류에 해당합니다. 당류가 있는 음료는 제외했습니다.";
    }
    if (/디카페인|\bdecaf\b/u.test(query)) return isEn ? "A decaf option is available; decaf does not mean zero caffeine." : "디카페인 변경이 가능한 메뉴이며, 디카페인이 카페인 0mg을 뜻하지는 않습니다.";
    if (/카페인.*(없|적|낮)|디카페인|무카페인|caffeine free|decaf/u.test(query)) {
      const level = ({ 없음: "none", "매우 낮음": "very low", 낮음: "low", 중간: "medium", 높음: "high" })[knowledge.caffeine] || "unknown";
      return isEn ? `Demo menu caffeine category: ${level}.` : `가상 카페 메뉴의 카페인 분류가 ${knowledge.caffeine}입니다.`;
    }
    if (/달|디저트|sweet/u.test(query)) {
      return isEn ? "Features a pleasantly sweet flavor." : `${(knowledge.tags || []).includes("달콤한") ? "달콤한 풍미" : item.description}가 특징입니다.`;
    }
    if (/상큼|산뜻|청량|시원|refreshing/u.test(query)) {
      return isEn ? "A refreshing and crisp choice." : "산뜻하게 즐기기 좋은 메뉴입니다.";
    }
    if (/진한|쌉쌀|잠|strong/u.test(query)) {
      return isEn ? "Features a distinct, bold coffee profile." : "커피 풍미가 선명한 메뉴입니다.";
    }
    return item.description;
  }

  // Domain groups stay stable when display labels are translated.
  function optionGroup(option) {
    const name = normalize(option.group_id || option.group_name || "");
    return ({ 온도: "temperature", temperature: "temperature", 크기: "size", size: "size", 추가: "extras", extras: "extras", 데우기: "heating", heating: "heating", warming: "heating" })[name] || name;
  }

  function mergeOptionIds(previous, next, options) {
    const changedGroups = new Set(next.map((id) => options.find((o) => o.id === id)).filter(Boolean)
      .map(optionGroup).filter((group) => group && group !== "extras"));
    return [...new Set([...previous.filter((id) => !changedGroups.has(optionGroup(options.find((o) => o.id === id) || {}))), ...next])];
  }

  function namedMentions(items, message) {
    const text = normalize(message);
    const matches = [];
    for (const item of items.filter((row) => row.available !== false)) {
      for (const alias of [item.name, ...(KNOWLEDGE[item.id]?.aliases || []), ...(item.aliases || [])]) {
        if (typeof alias !== "string" || !mentionsAlias(text, alias)) continue;
        const escaped = normalize(alias).split(/\s+/u).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
        for (const match of text.matchAll(new RegExp(escaped, "gu"))) {
          matches.push({ item, start: match.index, end: match.index + match[0].length });
        }
      }
    }
    const chosen = [];
    for (const match of matches.sort((a, b) => (b.end - b.start) - (a.end - a.start))) {
      if (!chosen.some((row) => match.start < row.end && match.end > row.start)) chosen.push(match);
    }
    return chosen.sort((a, b) => a.start - b.start);
  }

  function menuSegments(items, message) {
    const text = normalize(String(message).replace(/[,;]+/g, " 그리고 "));
    const mentions = namedMentions(items, text);
    const bounds = [0];
    for (let i = 1; i < mentions.length; i += 1) {
      const between = text.slice(mentions[i - 1].end, mentions[i].start);
      const joins = [...between.matchAll(/이랑|랑|하고|그리고|\band\b/gu)];
      const last = joins.at(-1);
      bounds.push(last ? mentions[i - 1].end + last.index + last[0].length : mentions[i].start);
    }
    return mentions.map((row, i) => ({ item: row.item, text: text.slice(bounds[i], bounds[i + 1] ?? text.length) }));
  }

  function actionQuantity(message, remove = false) {
    if (/\d+\.\d+\s*(?:잔|개|조각|병|cups?|items?)/iu.test(message)) return null;
    const text = normalize(message);
    const relevant = remove ? text.split(/중|\bout of\b/u).at(-1) : text;
    const numeric = relevant.match(/(-?\d+)\s*(?:잔|개|조각|병|cups?|items?)/u)
      || relevant.match(/(?:^|\s)(-?\d+)(?:\s|$)/u);
    if (numeric && (!Number.isInteger(Number(numeric[1])) || Number(numeric[1]) < 1 || Number(numeric[1]) > 20)) return null;
    return parseQuantity(relevant);
  }

  function plannedActions(items, message, options = []) {
    if (/\d+\.\d+\s*(?:잔|개|조각|병|cups?|items?)/iu.test(message)) return [{ op: "add", quantity: null }];
    return menuSegments(items, message).map(({ item, text }) => {
      const op = /빼|제거|삭제|취소|remove|delete/u.test(text) ? "remove"
        : /바꿔|바꾸|변경|수정|change|update/u.test(text) ? "update" : "add";
      return { op, itemId: item.id, quantity: op === "update" ? undefined : actionQuantity(text, op === "remove"),
        ...(op === "remove" ? {} : { optionIds: requestedOptionIds(text, options.filter((o) => optionApplies(o, item))), invalidRequest: unsupportedOption(item, text, options) }) };
    });
  }

  function unsupportedOption(item, text, options) {
    const applicable = options.filter((o) => optionApplies(o, item));
    const requested = [
      [/오트|oat/u, /오트|oat/u], [/샷|extra shot/u, /샷|shot/u], [/디카페인|decaf/u, /디카페인|decaf/u],
      [/데워|따뜻하게|warm it|warmed/u, /따뜻하게|warm/u], [/시럽|syrup/u, /시럽|syrup/u],
      [/두유|soy/u, /두유|soy/u], [/휘핑|whip/u, /휘핑|whip/u],
    ];
    return requested.some(([pattern, supported]) => pattern.test(normalize(text)) && !applicable.some((o) => supported.test(normalize(o.name))));
  }

  function compoundCartActions(items, message, options = []) {
    const text = normalize(message);
    const hasAdd = /주문|담|추가해|주세요|\badd\b|order/u.test(text);
    const hasRemove = /빼|제거|삭제|취소|remove|delete/u.test(text);
    if (!hasAdd || !hasRemove) return [];
    const targets = explicitlyNamedItems(items, text);
    if (targets.length < 2) return [];

    return plannedActions(items, message, options);
  }

  function inferIntent(message) {
    const query = normalize(message);
    if (/(전체|전부|장바구니).*?(비워|취소|삭제)|주문\s*초기화|clear (?:the )?cart|cancel (?:the )?order/u.test(query)) return "clear";
    if (/빼|제거|삭제|취소|remove|delete/u.test(query)) return "remove";
    if (/바꿔|바꾸|변경|수정|\bchange\b|\bupdate\b/u.test(query)) return "update";
    if (/비교|차이|뭐가 더|compare|difference/u.test(query)) return "compare";
    if (/주문|담아|담고|추가해|주세요|주세여|살래|(?:잔|개)\s*줘|\badd\b|\border\b|can i (?:get|have)|could i (?:get|have)|may i have|i(?:ll| will) (?:have|take)|i(?:d| would) like|give me/u.test(query)) return "order";
    if (/장바구니|담긴|합계|총액|총\s*얼마|cart|basket|total/u.test(query)) return "cart";
    if (/추천|골라|어울|뭐가 좋|어떤 게|recommend|suggest|pair/u.test(query)) return "recommend";
    if (/가격|얼마|price|how much/u.test(query)) return "price";
    return "inform";
  }

  function pairingResponse(items, message, options = [], isEn = false) {
    const guides = matchingMealPairings(message);
    const asksGeneric = /식사\s*메뉴|식사.*어울|음식.*어울|페어링|같이\s*먹|곁들/u.test(message);
    if (!asksGeneric && !/어울|페어링|같이.*먹|pair|with.*food/u.test(message)) return null;
    if (!guides.length) return { intent: "clarify", answer: isEn ? "What food will you pair with your drink?" : "함께 드실 음식을 말씀해 주세요.", retrieved: [] };

    const picks = [];
    guides.forEach((guide) => guide.recommendations.forEach(([itemId, reason]) => {
      const item = filterCandidates(items, message.replace(/샌드위치|샐러드|파스타|치킨|food|sandwich|salad|pasta|chicken/gu, ""), options).find((candidate) => candidate.id === itemId);
      if (item && !picks.some((row) => row.item.id === item.id) && picks.length < 3) picks.push({ item, reason });
    }));
    return {
      intent: "recommend",
      answer: picks.length ? `${isEn ? "Pairing suggestions from the current menu" : `${guides.map((guide) => guide.label).join("·")}에 어울리는 현재 판매 메뉴입니다.`}\n${picks.map((row, index) => `${index + 1}. ${row.item.name}(${won(row.item.price)}): ${isEn ? recommendationReason(row.item, message, true) : row.reason}`).join("\n")}` : (isEn ? "No pairing satisfies all your restrictions." : "모든 제한 조건을 만족하는 페어링 메뉴가 없습니다."),
      retrieved: picks.map((row) => row.item),
    };
  }

  function filterCandidates(items, message, options = []) {
    const text = normalize(message);
    const zeroSugar = ZERO_SUGAR.test(text);
    const zeroCaffeine = ZERO_CAFFEINE.test(text);
    const noncoffee = /논커피|커피(?:가|는)?\s*(?:아닌|말고|제외|없는)|비커피|non.?coffee|without coffee|no coffee/u.test(text);
    const tea = /(?:^|\s)차(?:\s|를|가|는|추천|$)|티(?:\s|를|추천)|\btea\b/u.test(text);
    const food = /디저트|푸드|케이크|빵|dessert|food|cake/u.test(text);
    const drinks = !food && (/음료|커피|차|티|drink|coffee|tea/u.test(text) || zeroSugar || zeroCaffeine);
    const maxPrice = text.match(/([\d,]+)\s*원\s*이하/u) || text.match(/(?:under|below)\s*[₩]?([\d,]+)/u);
    const maxKcal = text.match(/(\d+)\s*(?:kcal|칼로리)\s*이하/u);
    const maxSugar = text.match(/당(?:류)?\s*(\d+)\s*g\s*이하/u);
    const maxCaffeine = text.match(/카페인\s*(\d+)\s*mg\s*이하/u);
    return items.filter((item) => {
      if (item.available === false) return false;
      const k = knowledgeFor(item);
      if (food && item.category_id !== "dessert") return false;
      if (drinks && item.category_id === "dessert") return false;
      if (tea && item.category_id !== "tea") return false;
      if (noncoffee && item.category_id === "coffee") return false;
      if (!noncoffee && /커피\s*(종류|메뉴)|\bcoffees?\b/u.test(text) && item.category_id !== "coffee") return false;
      if (zeroSugar && !(Object.prototype.hasOwnProperty.call(item, "sugar_g") ? Number.isFinite(item.sugar_g) && item.sugar_g === 0 : k.sugar === "없음")) return false;
      if (zeroCaffeine && !(Object.prototype.hasOwnProperty.call(item, "caffeine_mg") ? Number.isFinite(item.caffeine_mg) && item.caffeine_mg === 0 : k.caffeine === "없음")) return false;
      if (/저카페인|카페인(?:이)?\s*(?:적|낮)|low caffeine/u.test(text) && !["없음", "매우 낮음", "낮음"].includes(k.caffeine)) return false;
      if (/디카페인|\bdecaf\b/u.test(text) && !options.some((o) => optionApplies(o, item) && /디카페인|decaf/u.test(normalize(o.name)))) return false;
      if (/달콤|달달|\bsweet\b/u.test(text) && !/달지\s*않|not sweet/u.test(text) && !(k.tags || []).includes("달콤한")) return false;
      if (maxPrice && Number(item.price) > Number(maxPrice[1].replace(/,/g, ""))) return false;
      if (maxKcal && !(Number.isFinite(item.kcal) && item.kcal <= Number(maxKcal[1]))) return false;
      if (maxSugar && !(Number.isFinite(item.sugar_g) && item.sugar_g <= Number(maxSugar[1]))) return false;
      if (maxCaffeine && !(Number.isFinite(item.caffeine_mg) && item.caffeine_mg <= Number(maxCaffeine[1]))) return false;
      if (/안\s*단|달지\s*않|not sweet/u.test(text) && (k.tags || []).includes("달콤한")) return false;
      const temps = item.temperatures || options.filter((o) => optionApplies(o, item) && optionGroup(o) === "temperature").map((o) => normalize(o.name).toUpperCase());
      if (/따뜻|뜨거|\bhot\b/u.test(text) && temps.length && !temps.includes("HOT")) return false;
      if (/아이스|차가|\biced?\b/u.test(text) && temps.length && !temps.includes("ICE") && !temps.includes("ICED")) return false;
      if (/오트|oat/u.test(text) && !options.some((o) => optionApplies(o, item) && /오트|oat/u.test(normalize(o.name)))) return false;
      return true;
    });
  }

  function queueResult(actions, items, options, isEn, orderTypeLabel, batch = false) {
    if (actions.some((a) => a.invalidRequest)) return { intent: "clarify", answer: isEn ? "One of the requested options is not available for this item. Please choose from its available options." : "해당 메뉴에 적용할 수 없는 옵션이 있습니다. 메뉴의 제공 가능한 옵션 중에서 선택해 주세요.", retrieved: [] };
    actions = actions.map(({ invalidRequest, ...action }) => action);
    if (actions.some((a) => a.quantity === null)) return { intent: "clarify", answer: isEn ? "Please use a whole quantity from 1 to 20." : "수량은 1~20개의 정수로 말씀해 주세요.", retrieved: [] };
    const ready = [];
    const waiting = [];
    for (const action of actions) {
      const item = items.find((row) => row.id === action.itemId && row.available !== false);
      if (!item) continue;
      const validOptions = options.filter((o) => optionApplies(o, item));
      const conflict = validOptions.some((o) => optionGroup(o) !== "extras" && optionGroup(o)
        && validOptions.filter((other) => optionGroup(other) === optionGroup(o) && (action.optionIds || []).includes(other.id)).length > 1);
      if (conflict) return { intent: "clarify", answer: isEn ? "Choose one value per temperature and size group." : "각 음료의 온도와 크기는 하나씩 선택해 주세요.", retrieved: [item] };
      const missing = action.op === "add" ? missingGroups(item, action.optionIds || [], options) : [];
      if (missing.length) waiting.push(action);
      else ready.push(action);
    }
    let pending = null;
    let question = "";
    if (waiting.length) {
      const first = waiting[0];
      const item = items.find((row) => row.id === first.itemId);
      const groups = missingGroups(item, first.optionIds || [], options);
      question = missingGroupAnswer(item, [groups[0]], options, isEn);
      if (batch) pending = { type: "pending_batch", actions: waiting };
      else if (waiting.length > 1) pending = { type: "pending_many", items: waiting.map(({ op, ...rest }) => rest) };
      else pending = { type: "pending", itemId: first.itemId, quantity: first.quantity, optionIds: first.optionIds || [], missingGroups: groups };
    }
    const names = ready.map((a) => items.find((row) => row.id === a.itemId)?.name).join(", ");
    const answer = ready.length
      ? (isEn ? `Added or updated ${names} in your ${orderTypeLabel.toLowerCase()} order. ${question}` : `${orderTypeLabel} 주문으로 ${names} 요청을 확인했습니다. ${question}`)
      : question;
    const retrieved = actions.map((a) => items.find((item) => item.id === a.itemId)).filter(Boolean);
    if (!ready.length) return { intent: "clarify", answer, action: pending, retrieved };
    if (pending || batch || ready.some((a) => a.op !== "add")) return { intent: pending ? "clarify" : "cart_update", answer, action: { type: "batch", actions: ready }, pendingOrder: pending, retrieved };
    if (ready.length > 1) return { intent: "order", answer, action: { type: "add_many", items: ready.map(({ op, ...rest }) => rest) }, retrieved };
    const { op, ...single } = ready[0];
    if (!single.optionIds?.length) delete single.optionIds;
    return { intent: "order", answer, action: { type: "add", ...single }, retrieved };
  }

  function pendingActions(pending) {
    if (pending?.type === "pending_batch") return pending.actions;
    if (pending?.type === "pending_many") return pending.items.map((row) => ({ op: "add", ...row }));
    return pending?.itemId ? [{ op: "add", itemId: pending.itemId, quantity: pending.quantity || 1, optionIds: pending.optionIds || [] }] : [];
  }

  // Pure cart reducer: the browser and runtime tests use the same validation/application path.
  function applyCartActions({ cart = [], actions = [], items = [], options = [] }) {
    let rows = cart.map((row) => ({ ...row, options: [...(row.options || [])] }));
    const changes = [];
    const errors = [];
    const keyFor = (itemId, selected) => `${itemId}:${selected.map((o) => o.id).sort().join(",")}`;
    for (const action of actions) {
      const item = items.find((row) => row.id === action.itemId && row.available !== false);
      if (!item) { errors.push("unavailable_item"); continue; }
      const matches = rows.filter((row) => row.item.id === item.id && (!action.lineId || row.key === action.lineId));
      if (!["add", "remove", "update", "set_qty"].includes(action.op)) { errors.push("invalid_action"); continue; }
      if (action.op !== "add" && matches.length !== 1) { errors.push(matches.length ? "ambiguous_line" : "missing_line"); continue; }
      const quantity = action.quantity !== undefined ? action.quantity : ["add", "set_qty"].includes(action.op) ? null : matches[0]?.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) { errors.push("invalid_quantity"); continue; }
      if (action.op === "remove") {
        const row = matches[0];
        const removed = Math.min(quantity, row.quantity);
        row.quantity -= removed;
        rows = rows.filter((entry) => entry.quantity > 0);
        changes.push({ ...action, quantity: removed });
        continue;
      }
      const applicable = options.filter((o) => optionApplies(o, item));
      const previous = action.op === "add" ? [] : matches[0].options.map((o) => o.id);
      const ids = mergeOptionIds(previous, action.optionIds || [], applicable);
      if (ids.some((id) => !applicable.some((o) => o.id === id))) { errors.push("invalid_option"); continue; }
      const selected = applicable.filter((o) => ids.includes(o.id));
      const groups = [...new Set(applicable.map(optionGroup).filter(Boolean))];
      let valid = true;
      for (const group of groups.filter((g) => g !== "extras")) {
        const choices = applicable.filter((o) => optionGroup(o) === group);
        const picked = selected.filter((o) => optionGroup(o) === group);
        if (!picked.length && choices.length === 1) selected.push(choices[0]);
        else if (picked.length !== 1) valid = false;
      }
      if (!valid) { errors.push("missing_or_conflicting_option"); continue; }
      const key = keyFor(item.id, selected);
      const old = action.op === "add" ? null : matches[0];
      const existing = rows.find((row) => row.key === key && row !== old);
      if (existing && existing.quantity + quantity > 20) { errors.push("quantity_limit"); continue; }
      if (old) rows = rows.filter((row) => row !== old);
      if (existing) existing.quantity += quantity;
      else rows.push({ key, item, options: selected, quantity, unitPrice: Number(item.price) + selected.reduce((sum, o) => sum + Number(o.price_delta || 0), 0) });
      changes.push({ ...action, quantity });
    }
    // unitPrice supplied in cart is never the source of truth for the displayed sum.
    rows = rows.map((row) => {
      const item = items.find((candidate) => candidate.id === row.item.id);
      const selected = options.filter((o) => item && optionApplies(o, item) && row.options.some((picked) => picked.id === o.id));
      return item ? { ...row, item, options: selected, unitPrice: Number(item.price) + selected.reduce((sum, o) => sum + Number(o.price_delta || 0), 0) } : row;
    });
    return { cart: rows, changes, errors, total: rows.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0) };
  }

  function respondInternal({ message, items = [], options = [], cart = [], history = [], pendingOrder = null, orderType = "takeout", language = "ko" }) {
    const acknowledgement = /^(네|예|응|좋아|yes|ok|confirm)[.!\s]*$/iu.test(normalize(message));
    if (acknowledgement && !pendingOrder) return { intent: "clarify", answer: language === "en" ? "There is no pending confirmation. Please name an item or request checkout." : "현재 확인 대기 중인 요청이 없습니다. 메뉴를 지정하거나 결제를 요청해 주세요.", retrieved: [] };
    const contextualMessage = pendingOrder ? message : conversationQuery(message, history, items);
    const text = normalize(contextualMessage);
    const intent = inferIntent(text);
    const isEn = language === "en" || (!/[\uac00-\ud7af\u1100-\u11ff]/u.test(message) && /[a-zA-Z]{2,}/u.test(message));
    const orderTypeLabel = orderType === "dine_in" ? (isEn ? "Dine In" : "매장") : (isEn ? "Takeout" : "포장");
    let retrieved = retrieveMenu(items, text, intent === "compare" ? 6 : 4);
    let itemRows = retrieved.map((row) => row.item);

    if (/(시스템\s*프롬프트|system\s*prompt|chunk[_\s-]?id|내부\s*(문서|지침|정보)|service[_\s-]?role|api\s*key)/u.test(text)) {
      return {
        intent: "guardrail",
        answer: isEn ? "Internal system settings and secret information cannot be provided. I can help you with menu recommendations, prices, options, and ordering." : "내부 설정이나 비밀 정보는 제공할 수 없습니다. 현재 판매 메뉴의 추천·가격·옵션·주문은 도와드릴 수 있어요.",
        retrieved: [],
      };
    }

    if (/알레르기|알러지|allerg|우유.*못\s*먹|견과.*못\s*먹|비건|vegan|dairy[ -]?free/u.test(text)) {
      return {
        intent: "safety",
        answer: isEn ? "Our menu data does not include full allergen information and cannot guarantee safety. Please check with staff before ordering." : "현재 메뉴 데이터에는 전체 원재료·알레르기 정보가 없어 안전하다고 단정할 수 없습니다. 주문 전 직원에게 원재료를 확인해 주세요.",
        retrieved: [],
      };
    }

    if ((/(전체|모든)\s*(메뉴|음료)|메뉴판|what.*menu|전부|종류|목록|\blist\b|\ball\b/u.test(text)) && !["order", "update", "remove", "clear"].includes(intent)
      && !(pendingActions(pendingOrder).length && requestedOptionIds(message, options).length && !/메뉴판|종류|목록|\blist\b|\bmenu\b/u.test(text))) {
      const available = filterCandidates(items, text, options);
      return {
        intent: "menu_list",
        answer: available.length ? (isEn ? `Available menu: ${available.map((item) => `${item.name} ${won(item.price)}`).join(" · ")}` : available.map((item) => `${item.name} ${won(item.price)}`).join(" · ")) : (isEn ? "No menu items satisfy all these conditions." : "모든 조건을 만족하는 메뉴가 없습니다."),
        retrieved: available,
      };
    }

    if ((/자허블|자몽\s*허니\s*블랙\s*티|와퍼|프라푸치노/u.test(text) || /(있어|있나요|팔아|파나요|판매|available|do you have)/u.test(text))
      && explicitlyNamedItems(items, text).length === 0
      && /(자허블|와퍼|라떼|라테|커피|티|차|에이드|프라푸치노|케이크|샌드위치|음료|디저트|푸드)/u.test(text)) {
      return {
        intent: "unavailable",
        answer: isEn ? "The requested item is not on our current menu. Please check our menu board for available items." : "말씀하신 메뉴는 현재 판매 목록에서 확인되지 않습니다. 메뉴판에서 판매 중인 메뉴를 확인해 주세요.",
        retrieved: [],
      };
    }

    if (/(주문\s*유형|포장.*매장|매장.*포장|어디서\s*먹|어떻게\s*받|order type|takeout.*dine|dine.*takeout)/u.test(text)) {
      return {
        intent: "order_type",
        answer: isEn ? `Your current order type is ${orderTypeLabel}. You can change it using the buttons at the top.` : `현재 ${orderTypeLabel} 주문으로 선택되어 있습니다. 상단의 포장·매장 버튼에서 변경할 수 있어요.`,
        retrieved: [],
      };
    }

    const pairing = pairingResponse(items, text, options, isEn);
    if (pairing && !["order", "update", "remove", "price"].includes(intent)) return pairing;

    const rawText = normalize(message);
    const named = explicitlyNamedItems(items, message);
    const optionReply = requestedOptionIds(message, options).length > 0 || /^(네|예|응|둘\s*다|모두|yes|both|all)(?:\s|$)/u.test(rawText);
    const cancelPending = /^(아니요|아니|취소|그만|cancel|no)(?:요)?$/u.test(rawText);
    if (cancelPending && pendingOrder) return { intent: "cancel_pending", answer: isEn ? "The pending request was cancelled. Your cart is unchanged." : "진행 중인 요청을 취소했습니다. 담긴 메뉴는 유지됩니다.", pendingOrder: null, retrieved: [] };
    if (intent === "clear") return { intent, answer: isEn ? "Your cart has been cleared." : "장바구니를 모두 비웠습니다.", action: { type: "clear" }, pendingOrder: null, retrieved: [] };

    if (pendingOrder?.type === "reviewing" && /^(네|예|응|좋아|확인|yes|confirm|ok)[.!\s]*$/u.test(rawText)) {
      if (pendingOrder.signature !== cartSignature(cart, orderType)) return { intent: "clarify", answer: isEn ? "Your order changed. Please review it again." : "주문 내용이 바뀌었습니다. 다시 주문 내용을 확인해 주세요.", pendingOrder: null, retrieved: [] };
      return { intent: "confirm_order", answer: isEn ? "Submitting your order." : "확인하신 주문을 접수합니다.", action: { type: "confirm_order" }, pendingOrder: null, retrieved: [] };
    }
    if (/주문\s*(할게|확정|완료)|결제\s*(할게|진행)|이대로\s*(주문|결제)|\bcheckout\b|ready to pay/u.test(text) && explicitlyNamedItems(items, text).length === 0) {
      if (!cart.length) return { intent: "clarify", answer: isEn ? "Your cart is empty. Please select an item first." : "장바구니가 비어 있습니다. 먼저 메뉴를 선택해 주세요.", retrieved: [] };
      if (pendingActions(pendingOrder).length) return { intent: "clarify", answer: isEn ? "Complete or cancel the pending item before checking out." : "진행 중인 메뉴의 옵션을 완성하거나 취소한 뒤 주문을 확인해 주세요.", retrieved: [] };
      return { intent: "checkout", answer: `${cartSummary(repriceCart(cart, items, options), isEn)} ${isEn ? "Confirm this order? Say yes or cancel." : "이대로 주문할까요? 네 또는 취소로 말씀해 주세요."}`, action: { type: "checkout" }, pendingOrder: { type: "reviewing", signature: cartSignature(cart, orderType) }, retrieved: [] };
    }
    if (intent === "cart") return { intent, answer: `${orderTypeLabel} ${cartSummary(repriceCart(cart, items, options), isEn)}`, retrieved: [] };

    const previousActions = pendingActions(pendingOrder);
    if (previousActions.length && optionReply && ["inform", "order", "update"].includes(intent)
      && (!named.length || named.every((item) => previousActions.some((a) => a.itemId === item.id)))) {
      const all = /둘\s*다|모두|전부|\bboth\b|\ball\b/u.test(rawText);
      const segments = menuSegments(items, message);
      const actions = previousActions.map((action, index) => {
        const segment = segments.find((row) => row.item.id === action.itemId);
        if (!(segment || all || (!named.length && index === 0))) return action;
        const target = items.find((item) => item.id === action.itemId);
        const applicable = options.filter((o) => target && optionApplies(o, target));
        return { ...action, invalidRequest: unsupportedOption(target, segment?.text || message, options), optionIds: mergeOptionIds(action.optionIds || [], requestedOptionIds(segment?.text || message, applicable), applicable) };
      });
      return queueResult(actions, items, options, isEn, orderTypeLabel, pendingOrder.type === "pending_batch");
    }

    const compoundActions = compoundCartActions(items, message, options);
    if (compoundActions.length) return queueResult(compoundActions, items, options, isEn, orderTypeLabel, true);

    if (intent === "update" || intent === "remove") {
      let lines = cart.filter((row) => named.some((item) => row.item.id === item.id));
      if (!named.length && /방금|그거|직전|last|that/u.test(text)) lines = cart.slice(-1);
      if (!lines.length && !cart.length && named.length === 1 && intent === "remove") {
        return { intent, answer: isEn ? "This item is not in your cart." : "해당 메뉴는 현재 장바구니에 없습니다.", action: { type: "remove", itemId: named[0].id, quantity: actionQuantity(text, true) }, retrieved: [named[0]] };
      }
      if (lines.length !== 1) return { intent: "clarify", answer: isEn ? "Please identify one cart item and its options." : "수정하거나 뺄 주문 내역을 옵션과 함께 하나로 지정해 주세요.", retrieved: [] };
      const line = lines[0];
      const target = items.find((item) => item.id === line.item.id);
      const applicable = options.filter((o) => optionApplies(o, target));
      const next = requestedOptionIds(message, applicable);
      if (unsupportedOption(target, message, options)) return { intent: "clarify", answer: isEn ? "That option is not available for this item." : "해당 메뉴에는 요청한 옵션을 적용할 수 없습니다.", retrieved: [target] };
      const quantityRequest = /수량|\d+\s*(잔|개)|(?:한|두|세|네)\s*(잔|개)|quantity/u.test(rawText);
      const quantity = intent === "remove" ? actionQuantity(message, true) : quantityRequest ? actionQuantity(message) : undefined;
      if (quantity === null) return { intent: "clarify", answer: isEn ? "Use a quantity from 1 to 20." : "수량은 1~20개로 말씀해 주세요.", retrieved: [target] };
      if (intent === "remove") return { intent, answer: isEn ? "Removing the requested quantity." : "요청한 수량을 확인했습니다.", action: { type: "remove", itemId: target.id, lineId: line.key, quantity }, retrieved: [target] };
      if (!next.length && !quantityRequest) return { intent: "clarify", answer: isEn ? "Please specify the new options or quantity." : "바꿀 옵션이나 수량을 말씀해 주세요.", retrieved: [target] };
      return { intent: "cart_update", answer: isEn ? "Updating your cart item." : "기존 주문 항목을 수정합니다.", action: { type: "batch", actions: [{ op: quantityRequest && !next.length ? "set_qty" : "update", itemId: target.id, lineId: line.key, ...(quantity !== undefined ? { quantity } : {}), optionIds: next }] }, pendingOrder: null, retrieved: [target] };
    }

    if (intent === "order") {
      const actions = plannedActions(items, contextualMessage, options);
      if (!actions.length) return { intent: "clarify", answer: isEn ? "Please name an available item to add." : "담을 메뉴 이름을 말씀해 주세요. 예: ‘아메리카노 두 잔 담아 줘’.", retrieved: [] };
      return { ...queueResult(actions, items, options, isEn, orderTypeLabel), ...(named.length ? { replacePending: true } : {}) };
    }

    if (intent === "compare") {
      const explicitlyNamed = itemRows
        .filter((item) => scoreItem(item, text) >= 18)
        .sort((left, right) => mentionIndex(left, text) - mentionIndex(right, text));
      const compared = (explicitlyNamed.length >= 2 ? explicitlyNamed : itemRows).slice(0, 2);
      if (compared.length < 2) {
        return { intent: "clarify", answer: isEn ? "Please tell me two menu names to compare." : "비교할 메뉴 두 개의 이름을 말씀해 주세요.", retrieved: itemRows.slice(0, 2) };
      }
      if (/진(?:한|하|해|함)|농도|강한|strong|bold/u.test(text)) {
        const facts = compared.map((item) => `${item.name}(${won(item.price)}): ${item.description}; ${isEn ? "caffeine" : "카페인"} ${Number.isFinite(item.caffeine_mg) ? `${item.caffeine_mg}mg` : (isEn ? "numeric value unavailable" : "함량 수치 정보 없음")}, ${isEn ? "shots" : "샷 수"} ${Number.isFinite(item.shots) ? item.shots : (isEn ? "unavailable" : "정보 없음")}`);
        const caveat = isEn ? "Flavor strength is subjective and is different from caffeine content. Compare numerical values only for the same serving size; missing values cannot establish a ranking." : "진한 풍미는 주관적인 맛이며 카페인 함량과 다릅니다. 같은 사이즈·제공량의 수치로 비교해야 하며, 정보가 없으면 어느 쪽이 더 강하다고 단정할 수 없습니다.";
        return { intent, answer: `${facts.join(" / ")} ${caveat}`, retrieved: compared };
      }
      return {
        intent,
        answer: isEn
          ? `${compared[0].name} (${won(compared[0].price)}): ${compared[0].description}. ${compared[1].name} (${won(compared[1].price)}): ${compared[1].description}.`
          : `${compared.map(menuSentence).join("\n\n")}\n\n주문하실 메뉴를 아래에서 선택해 주세요.`,
        retrieved: compared,
      };
    }

    if (intent === "recommend") {
      if ((/저당|저칼로리|저열량|low sugar|low calorie/u.test(text)) && !/\d+\s*(?:g|kcal|칼로리)/u.test(text)) return { intent: "clarify", answer: isEn ? "What sugar or calorie limit would you like? Nutrition values that are unavailable cannot be verified." : "당류나 열량을 어느 수치 이하로 원하시나요? 영양 수치가 없는 메뉴는 조건 충족을 확인할 수 없습니다.", retrieved: [] };
      const filteredItems = filterCandidates(items, text, options);
      const ranked = retrieveMenu(filteredItems, text, filteredItems.length || 1).map((row) => row.item);
      const picks = (ranked.length ? ranked : filteredItems).slice(0, 3);
      if (!picks.length) return { intent: "no_results", answer: isEn ? "None of our current drinks meet all your requirements. If you would like, I can help you explore different preferences." : "말씀하신 조건에 모두 맞는 음료는 현재 메뉴에 없어요. 원하시면 다른 조건으로도 찾아드릴게요.", retrieved: [] };
      return { intent, answer: picks.map((item) => `${item.name} (${won(item.price)}): ${recommendationReason(item, text, isEn)}`).join("\n"), retrieved: picks };
    }

    if (itemRows.length) {
      const namedItems = explicitlyNamedItems(items, text);
      const target = namedItems.length === 1 ? namedItems[0] : itemRows[0];
      const requested = requestedOptionIds(text, options.filter((option) => optionApplies(option, target)));
      if (intent === "price" && requested.length) {
        const selected = options.filter((option) => requested.includes(option.id));
        const total = Number(target.price) + selected.reduce((sum, option) => sum + Number(option.price_delta || 0), 0);
        return {
          intent: "price",
          answer: isEn ? `The price of ${target.name} with ${selected.map((option) => option.name).join(" · ")} is ${won(total)}.` : `${target.name} ${selected.map((option) => option.name).join(" · ")} 가격은 ${won(total)}입니다.`,
          retrieved: [target],
        };
      }
      return {
        intent: intent === "price" ? "price" : "inform",
        answer: intent === "price"
          ? sizePriceAnswer(target, options, isEn)
          : (isEn ? `${target.name} (${won(target.price)}) is ${target.description}.` : menuSentence(target)),
        retrieved: namedItems.length === 1 ? [target] : itemRows.slice(0, 3),
      };
    }

    return {
      intent: "out_of_scope",
      answer: isEn ? "I can assist with menu recommendations, prices, comparisons, and ordering for our menu." : "현재 판매 중인 메뉴의 추천·가격·비교·장바구니 요청을 도와드릴 수 있어요.",
      retrieved: [],
    };
  }

  function respond(args) {
    const message = String(args.message || "");
    const language = args.language === "en" || (!/[가-힣]/u.test(message) && /[a-z]{2,}/iu.test(message)) ? "en"
      : args.pendingOrder?.language === "en" && /^(네|예|아이스|핫|[smlr](?:이요|요)?|yes|no)$/iu.test(message.trim()) ? "en" : "ko";
    const result = respondInternal({ ...args, language });
    if (result.intent === "out_of_scope" && args.pendingOrder?.type === "reviewing") result.pendingOrder = null;
    if (result.pendingOrder) result.pendingOrder = { ...result.pendingOrder, language };
    return { ...result, language };
  }

  return { applyCartActions, cartSignature, filterCandidates, optionApplies, optionGroup, mergeOptionIds, compoundCartActions, conversationQuery, explicitlyNamedItems, inferIntent, matchingMealPairings, mentionsAlias, ngrams, normalize, parseQuantity, requestedOptionIds, retrieveMenu, respond, scoreItem };
}));
