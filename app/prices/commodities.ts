// Shared commodity taxonomy for the Price Tracker.
// Used by:
//   • /app/prices/submit/page.tsx   (Report a Price form)
//   • /app/prices/[id]/edit/page.tsx (Edit report)
//   • /app/prices/prices-client.tsx  (filter chips + category badges)
//
// Adding a new category: add the key here, then wire a colour into
// CATEGORY_COLOURS in prices-client.tsx so the badge renders.
//
// Note on Oils: edible/refined oils are sold by the litre and trade as a
// distinct commodity from the raw crop (Palm Oil ≠ palm fruit kernel),
// so they get their own category rather than living under cash_crops.

export const COMMODITIES: Record<string, string[]> = {
  grains:     ['Maize', 'Rice', 'Sorghum', 'Millet', 'Wheat', 'Barley'],
  legumes:    ['Soybeans', 'Cowpea', 'Groundnut', 'Sesame', 'Beans'],
  tubers:     ['Cassava', 'Yam', 'Sweet Potato', 'Cocoyam', 'Irish Potato'],
  vegetables: ['Tomato', 'Pepper', 'Onion', 'Cabbage', 'Carrot', 'Spinach'],
  fruits:     ['Banana', 'Plantain', 'Mango', 'Orange', 'Pineapple', 'Watermelon'],
  livestock:  ['Cattle', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Fish'],
  oils:       ['Palm Oil', 'Groundnut Oil', 'Vegetable Oil', 'Coconut Oil', 'Sesame Oil', 'Soybean Oil'],
  cash_crops: ['Cocoa', 'Coffee', 'Cotton', 'Rubber', 'Sugarcane'],
}

export type CommodityCategory = keyof typeof COMMODITIES
