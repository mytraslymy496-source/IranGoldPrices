const https = require('https');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = '@IranGoldPrices';

const PRICE_URL =
  'https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/popular.json';

if (!TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not configured');
}

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP error: ${res.statusCode}`));
        return;
      }

      let data = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function formatPrice(value) {
  return Number(value).toLocaleString('en-US');
}

function formatChange(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return 'نامشخص';
  }

  const number = Number(value);
  const sign = number > 0 ? '+' : '';

  return sign + number.toLocaleString('en-US');
}

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  const body = JSON.stringify({
    chat_id: CHANNEL,
    text,
    disable_web_page_preview: true
  });

  await new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (res.statusCode !== 200 || !result.ok) {
            reject(new Error(
              result.description || `Telegram HTTP ${res.statusCode}`
            ));
            return;
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(15000, () => {
      request.destroy(new Error('Telegram request timed out'));
    });

    request.write(body);
    request.end();
  });
}

async function publishPrices() {
  try {
    console.log('Fetching market prices...');

    const result = await getJSON(PRICE_URL);
    const items = result.data;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Price data is empty or invalid');
    }

    const wanted = [
      ['USD_IRR_FREE', '💵 دلار آمریکا'],
      ['EUR_IRR_FREE', '💶 یورو'],
      ['GBP_IRR_FREE', '💷 پوند انگلیس'],
      ['GOLD_18K_IRR', '🪙 طلای ۱۸ عیار (هر گرم)'],
      ['COIN_EMAMI_IRR', '🟡 سکه امامی'],
      ['USDT_IRR', '₮ تتر']
    ];

    const lines = [];

    for (const [symbol, name] of wanted) {
      const item = items.find((entry) => entry.symbol === symbol);

      if (item && Number.isFinite(Number(item.price))) {
        lines.push(
          `${name}: ${formatPrice(item.price)} تومان\n` +
          `تغییر: ${formatChange(item.change)} تومان`
        );
      } else {
        lines.push(`${name}: اطلاعات موجود نیست`);
      }
    }

    const updatedAt =
      result.meta?.updated_at || new Date().toISOString();

    const message =
      `📊 قیمت روز طلا و ارز\n\n` +
      `${lines.join('\n\n')}\n\n` +
      `🕒 زمان آخرین به‌روزرسانی منبع: ${updatedAt}\n` +
      `📌 منبع داده: TGJU\n` +
      `⚠️ قیمت‌ها ممکن است با بازار لحظه‌ای تفاوت داشته باشند.`;

    await sendTelegramMessage(message);

    console.log('Prices published successfully.');
  } catch (error) {
    console.error('Price publishing failed:', error.message);
  }
}

publishPrices();

setInterval(publishPrices, 30 * 60 * 1000);
