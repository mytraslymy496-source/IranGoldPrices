const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = "@IranGoldPrices";

const API =
"https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/popular.json";

async function sendMessage(text) {
const response = await fetch(
"https://api.telegram.org/bot${TOKEN}/sendMessage",
{
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
chat_id: CHANNEL,
text,
}),
}
);

const result = await response.json();

if (!result.ok) {
throw new Error("Telegram: " + result.description);
}

console.log("پیام با موفقیت ارسال شد.");
}

async function updatePrices() {
try {
console.log("در حال دریافت قیمت‌ها...");

const response = await fetch(API);

if (!response.ok) {
  throw new Error("خطای دریافت منبع قیمت: " + response.status);
}

const result = await response.json();

const items = Array.isArray(result)
  ? result
  : Array.isArray(result.data)
  ? result.data
  : Array.isArray(result.results)
  ? result.results
  : null;

if (!items) {
  throw new Error(
    "ساختار اطلاعات منبع قیمت شناخته نشد."
  );
}

function findItem(words) {
  return items.find((item) => {
    const text = [
      item.name_fa,
      item.name,
      item.symbol,
      item.slug,
      item.key,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return words.some((word) =>
      text.includes(word.toLowerCase())
    );
  });
}

function getPrice(item) {
  if (!item) return null;

  const value =
    item.price ??
    item.value ??
    item.sell ??
    item.sell_price ??
    item.latest;

  if (value === undefined || value === null) return null;

  const number = Number(
    String(value).replace(/,/g, "")
  );

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function formatPrice(value) {
  return value === null
    ? "ناموجود"
    : value.toLocaleString("en-US");
}

const dollar = getPrice(
  findItem(["دلار آزاد", "دلار آمریکا", "usd_irr_free"])
);

const euro = getPrice(
  findItem(["یورو آزاد", "یورو", "eur_irr_free"])
);

const pound = getPrice(
  findItem(["پوند انگلیس", "پوند"])
);

const gold18 = getPrice(
  findItem(["طلای ۱۸ عیار", "طلای 18 عیار", "gold_18k"])
);

const gold24 =
  gold18 === null ? null : Math.round(gold18 / 0.75);

const now = new Date().toLocaleString("fa-IR", {
  timeZone: "Asia/Tehran",
});

const message = [
  "📊 نبض بازار | قیمت طلا و ارز",
  "━━━━━━━━━━━━━━",
  `💵 دلار آزاد: ${formatPrice(dollar)}${dollar === null ? "" : " تومان"}`,
  `💶 یورو آزاد: ${formatPrice(euro)}${euro === null ? "" : " تومان"}`,
  `🇬🇧 پوند انگلیس: ${formatPrice(pound)}${pound === null ? "" : " تومان"}`,
  `🟡 طلای ۱۸ عیار: ${formatPrice(gold18)}${gold18 === null ? "" : " تومان"}`,
  `✨ طلای ۲۴ عیار: ${formatPrice(gold24)}${gold24 === null ? "" : " تومان"}${gold24 === null ? "" : " (تقریبی)"}`,
  "🇮🇶 دینار عراق: در انتظار منبع معتبر",
  "🪙 طلای آب‌شده: در انتظار منبع معتبر",
  "━━━━━━━━━━━━━━",
  `🕒 زمان به‌روزرسانی: ${now}`,
  "📢 @IranGoldPrices",
].join("\n");

await sendMessage(message);

} catch (error) {
console.error("خطا در به‌روزرسانی:", error.message);
}
}

if (!TOKEN) {
throw new Error(
"متغیر TELEGRAM_BOT_TOKEN در تنظیمات FadeHost تنظیم نشده است."
);
}

updatePrices();
setInterval(updatePrices, 60 * 1000);
