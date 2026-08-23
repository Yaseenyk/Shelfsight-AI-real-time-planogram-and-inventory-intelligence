/**
 * A picture for every kind of product.
 *
 * The people this screen is for read slowly or not at all in English. A milk
 * carton is recognised in a glance; "Amul Toned Milk 500 ml" has to be decoded
 * first, and by the time it has been the person has looked away from the shelf.
 *
 * So every product carries a symbol. It is never the only signal — the name is
 * always beside it — but it is the one that lands first, and it is what makes
 * the difference between reading a list and recognising a shelf.
 *
 * Matched on the category first, since that is what the inventory system gives
 * us, then on words in the product name for anything uncategorised.
 */

const BY_CATEGORY: Record<string, string> = {
  "Dairy": "🥛",
  "Frozen & ready to eat": "🧊",
  "Soft drinks": "🥤",
  "Packaged water & juice": "💧",
  "Namkeen & chips": "🍟",
  "Biscuits & cookies": "🍪",
  "Chocolate & confectionery": "🍫",
  "Staples & grains": "🌾",
  "Edible oil & ghee": "🛢️",
  "Spices & masala": "🌶️",
  "Noodles & pasta": "🍜",
  "Breakfast & spreads": "🥣",
  "Tea & coffee": "☕",
  "Baby & health": "🍼",
  "Personal care": "🧼",
  "Hair care": "🧴",
  "Oral care": "🦷",
  "Home care": "🧹",
  "Fresh produce": "🥬",
};

/** Fallbacks for a product whose category we do not recognise. */
const BY_KEYWORD: [RegExp, string][] = [
  [/milk|curd|paneer|butter|cheese|lassi|dahi|ghee/i, "🥛"],
  [/water|juice|jal/i, "💧"],
  [/cola|soda|drink|pepsi|sprite|thums/i, "🥤"],
  [/chips|namkeen|bhujia|sev|mixture/i, "🍟"],
  [/biscuit|cookie|marie|bourbon|rusk/i, "🍪"],
  [/chocolate|candy|toffee|eclair/i, "🍫"],
  [/rice|atta|dal|flour|sugar|salt|poha/i, "🌾"],
  [/oil|tel/i, "🛢️"],
  [/masala|chilli|turmeric|haldi|jeera/i, "🌶️"],
  [/noodle|pasta|maggi|macaroni/i, "🍜"],
  [/tea|coffee|chai/i, "☕"],
  [/soap|wash|shampoo|cream|lotion/i, "🧼"],
  [/baby|diaper|cerelac/i, "🍼"],
  [/detergent|cleaner|phenyl/i, "🧹"],
];

/**
 * Only symbols that have been in the emoji set long enough to be everywhere.
 *
 * A newer codepoint renders as an empty box on an older Android or a Windows
 * build that has not been updated -- and this screen is aimed at people for
 * whom the picture is the part that works, so a blank square is worse than a
 * plain box.
 */
export function productIcon(category?: string | null, name?: string | null): string {
  if (category && BY_CATEGORY[category]) return BY_CATEGORY[category];
  if (name) {
    for (const [pattern, icon] of BY_KEYWORD) {
      if (pattern.test(name)) return icon;
    }
  }
  // A neutral box rather than a question mark: an unrecognised product is
  // still a product, and a "?" reads as an error nobody can act on.
  return "📦";
}

/** Where in the shop, drawn as a symbol so the place is recognisable too. */
export function sectionIcon(location?: string | null): string {
  if (!location) return "🏪";
  const where = location.toLowerCase();
  if (where.includes("cold") || where.includes("fridge") || where.includes("chill")) return "❄️";
  if (where.includes("entrance") || where.includes("front of")) return "🚪";
  if (where.includes("till") || where.includes("counter")) return "🧾";
  if (where.includes("back")) return "📦";
  if (where.includes("wall") || where.includes("side")) return "🧱";
  return "🏪";
}
