
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = "@IranGoldPrices";

const API =
  "https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/popular.json";

let lastMessage = "";

async function sendTelegramMessage(text) {
  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL,
        text: text,
      }),
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.description);
  }
}

async function updatePrices() {
  try {
    const response = await fetch(API);

    if (!response.ok) {
      throw new Error("خطا در دریافت قیمت‌ها");
    }

    const result = await response.json();
    const data = result.data;

    function findPrice(symbol) {
      const item = data.find(
        (x) => x.symbol === symbol
      );

      if (!item || !item.price || item.stale) {
        return null;
      }

      return Number(item.price);
    }

    const dollar = findPrice("USD_IRR_FREE");
    const euro = findPrice("EUR_IRR_FREE");
    const gold18 = findPrice("GOLD_18K_IRR");

    function formatPrice(price) {
      return price === null
        ? "اطلاعات موجود نیست"
        : price.toLocaleString("en-US") + " تومان";
    }

    // قیمت ۲۴ عیار، محاسبه تقریبی از قیمت ۱۸ عیار
    const gold24 =
      gold18 === null ? null : Math.round(gold18 / 0.75);

    const message = [
      "📊 قیمت روز طلا و ارز",
      "━━━━━━━━━━━━━━",
      `💵 دلار آزاد: ${formatPrice(dollar)}`,
      `💶 یورو آزاد: ${formatPrice(euro)}`,
      `🇮🇶 دینار عراق: اطلاعات موجود نیست`,
      `🟡 طلای ۱۸ عیار: ${formatPrice(gold18)}`,
      `✨ طلای ۲۴ عیار: ${formatPrice(gold24)} (تقریبی)`,
      "🪙 طلای آب‌شده: منبع قیمت در دسترس نیست",
      "━━━━━━━━━━━━━━",
      "📢 کانال: @IranGoldPrices",
      "📡 منبع: Iran Market Data",
    ].join("\n");

    if (message !== lastMessage) {
      await sendTelegramMessage(message);
      lastMessage = message;
      console.log("قیمت‌ها ارسال شدند");
    }
  } catch (error) {
    console.error("خطا:", error.message);
  }
}

if (!TOKEN) {
  throw new Error("متغیر BOT_TOKEN تنظیم نشده است");
}

updatePrices();
setInterval(updatePrices, 60 * 1000);
