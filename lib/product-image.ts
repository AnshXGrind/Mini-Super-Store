const SEED_CATALOGUE_IMAGE_IDS = new Set([
  "1474979266404-7eaacbcd87c5",
  "1508061253366-f7da158b6d46",
  "1509440159596-0249088772ff",
  "1549007994-cb92caebd54b",
  "1550583724-b2692b85b150",
  "1558961363-fa8fdf82db35",
  "1559591937-e10c71a36413",
  "1566478989037-eec170784d0b",
  "1576092768241-dec231879fc3",
  "1581441363689-1f3c3c414635",
  "1583947215259-38e31be8751f",
  "1585421514738-01798e348b17",
  "1586201375761-83865001e31c",
  "1589301760014-d929f3979dbc",
  "1596040033229-a9821ebd058d",
  "1596797038530-2c107229654b",
  "1601050690597-df0568f70950",
  "1608248597359-009c9511de75",
  "1612927601601-6638404737ce",
  "1622483767028-3f66f32aef97",
  "1631451095765-2c91616fc9e6",
]);

const PRODUCT_IMAGE_ART: Array<{ pattern: RegExp; emoji: string; theme: string }> = [
  { pattern: /spice|masala|chilli|pepper|turmeric|cumin|jeera/i, emoji: "🌶️", theme: "spices" },
  { pattern: /rice|poha|murmura/i, emoji: "🍚", theme: "rice" },
  { pattern: /dal|pulses|chana|rajma|lobia|beans|peas/i, emoji: "🫘", theme: "pulses" },
  { pattern: /sugar|salt|jaggery|gur|mishri/i, emoji: "🧂", theme: "sugar" },
  { pattern: /almond|cashew|raisin|walnut|pistachio|dry fruit|nuts/i, emoji: "🥜", theme: "nuts" },
  { pattern: /oil|ghee|vanaspati/i, emoji: "🫙", theme: "oil" },
  { pattern: /atta|flour|besan|maida|suji|semolina|sattu|ragi|jowar|bajra/i, emoji: "🌾", theme: "grains" },
  { pattern: /milk|dairy|curd|yogurt|butter|cheese|paneer/i, emoji: "🥛", theme: "dairy" },
  { pattern: /tea|coffee|chai/i, emoji: "☕", theme: "beverages" },
  { pattern: /bread|bakery|rusk/i, emoji: "🍞", theme: "bakery" },
  { pattern: /biscuit|cookie/i, emoji: "🍪", theme: "snacks" },
  { pattern: /chip|snack|namkeen|bhujia/i, emoji: "🥨", theme: "snacks" },
  { pattern: /juice|drink|cola|beverage/i, emoji: "🥤", theme: "beverages" },
  { pattern: /cereal|oat|muesli|corn flakes/i, emoji: "🥣", theme: "breakfast" },
  { pattern: /noodle|pasta|maggi/i, emoji: "🍜", theme: "breakfast" },
  { pattern: /soap|shampoo|toothpaste|lotion|cream|personal care/i, emoji: "🧴", theme: "personal-care" },
  { pattern: /detergent|cleaner|dishwash|floor|toilet/i, emoji: "🧼", theme: "cleaning" },
];

export function shouldLoadProductImageDirectly(source: string): boolean {
  try {
    const imageUrl = new URL(source);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return true;
    const storageUrl = new URL(supabaseUrl);
    return imageUrl.protocol !== "https:" || imageUrl.hostname !== storageUrl.hostname;
  } catch {
    return true;
  }
}

export function isSeedCatalogueImage(source: string): boolean {
  try {
    const imageUrl = new URL(source);
    const imageId = imageUrl.pathname.match(/\/photo-([^/]+)/)?.[1];
    return (
      imageUrl.hostname === "images.unsplash.com" &&
      imageId !== undefined &&
      SEED_CATALOGUE_IMAGE_IDS.has(imageId)
    );
  } catch {
    return false;
  }
}

export function getProductImageArt(name: string): { emoji: string; theme: string } {
  const art = PRODUCT_IMAGE_ART.find(({ pattern }) => pattern.test(name));
  return art ? { emoji: art.emoji, theme: art.theme } : { emoji: "🛒", theme: "general" };
}

export function getProductImageUrl(
  source: string,
  width: number,
): string {
  try {
    const imageUrl = new URL(source);
    if (imageUrl.hostname === "images.unsplash.com") {
      imageUrl.searchParams.set("w", String(width));
      imageUrl.searchParams.set("q", "75");
    }
    return imageUrl.toString();
  } catch {
    return source;
  }
}
