const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";

const sessions = {};
const DB_FILE = path.join(__dirname, "marketplace-data.json");

const DEFAULT_DB = {
  users: {},
  listings: [],
  buyRequests: [],
  negotiations: [],
  deals: [],
  activities: [],
  counters: {
    listing: 1,
    request: 1,
    negotiation: 1,
    deal: 1,
    member: 1
  }
};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      return {
        ...DEFAULT_DB,
        ...parsed,
        counters: {
          ...DEFAULT_DB.counters,
          ...(parsed.counters || {})
        }
      };
    }
  } catch (error) {
    console.error("Database load error:", error);
  }
  return structuredClone(DEFAULT_DB);
}

const db = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    console.error("Database save error:", error);
  }
}

const TEXT = {
  ar: {
    lang: "🌐 اختر لغة السوق:",
    welcome:
      "🛍️ مرحباً بك في سوق تيليجرام\n\n" +
      "سوق خاص للبيع والشراء والتفاوض وإتمام الصفقات.\n\n" +
      "🔒 خصوصية المستخدمين محفوظة.\n\n" +
      "💰 عمولة المنصة: 5%\n" +
      "2.5% على المشتري + 2.5% على البائع\n\n" +
      "للدخول إلى السوق اضغط على الزر أدناه.",
    agree: "✅ أوافق وأدخل السوق",
    menuTitle: "🛍️ أهلاً بك في سوق تيليجرام!\n\nاختر ما تريد:",
    buy: "🛒 أريد شراء",
    sell: "📦 أريد بيع",
    browse: "🛍️ عروض السوق",
    account: "👤 حسابي",
    chooseProduct: "🛒 أرسل اسم المنتج الذي تبحث عنه.\n\nمثال: iPhone 14",
    chooseMax: "💰 أرسل أقصى سعر تريد دفعه للمنتج.\n\nمثال: 25000",
    chooseRegion:
      "📍 أرسل المنطقة أو المدينة التي تريد البحث فيها.\n\nمثال: Київ\n\nأو اكتب: الكل",
    searching: "🔎 أبحث الآن في عروض سوقنا...",
    noResults: "🔎 انتهى البحث في سوقنا.\n\nلم نجد حاليًا عروضًا مطابقة لطلبك.",
    buySaved:
      "🛒 تم تسجيل طلبك في سوقنا.\n\n" +
      "إذا لم يوجد عرض مناسب الآن، يبقى الطلب مسجلًا ويمكن متابعة السوق.",
    sellProduct: "📦 أرسل اسم المنتج الذي تريد عرضه للبيع.",
    sellDescription: "📝 أرسل وصف المنتج وحالته.",
    sellPrice: "💰 أرسل السعر الذي تريد بيع المنتج به.\n\nمثال: 25000",
    sellRegion: "📍 أرسل المنطقة أو المدينة التي يوجد فيها المنتج.\n\nمثال: Київ",
    photoRequired:
      "📸 أرسل صورة واحدة على الأقل للمنتج.\nيمكنك إرسال عدة صور، ثم اضغط «تم».",
    morePhotos: "📸 أرسل صورة أخرى أو اضغط «تم» عند الانتهاء.",
    done: "✅ تم",
    listingPublished: "✅ تم نشر عرضك في سوق تيليجرام!",
    browseTitle: "🛍️ عروض السوق",
    sellOffers: "📦 عروض البيع",
    buyOffers: "🛒 عروض الشراء",
    noListings: "لا توجد عروض نشطة حاليًا.",
    contact: "💬 تفاوض على العرض",
    contactBuyer: "💬 تفاوض مع المشتري",
    negotiationPage: "💬 صفحة التفاوض",
    negotiationClosed: "❌ انتهى هذا التفاوض.",
    endNegotiation: "❌ إنهاء التفاوض",
    backToMarket: "🛍️ العودة إلى السوق",
    contacted: "✅ تم إرسال اهتمامك بالعرض إلى البائع.",
    sellerNotice: "📩 لديك مشتري مهتم بعرضك!",
    negotiationStarted: "💬 بدأ التفاوض بين المشتري والبائع.",
    negotiationText: "💬 أرسل رسالتك للتفاوض.\n\nاكتب /end لإنهاء التفاوض.",
    dealOffer: "🤝 هل توافق على إتمام الصفقة بالسعر المقترح؟",
    deal_offer: "🤝 تقديم عرض سعر",
    dealCreated: "🤝 تم تسجيل الصفقة.",
    accountText: "👤 حسابي\n\n",
    cancel: "❌ تم إلغاء العملية.",
    registrationName: "📝 للتسجيل في المنصة، أرسل اسمك.",
    registrationPhone: "📱 أرسل رقم هاتفك باستخدام زر مشاركة جهة الاتصال.",
    registered: "✅ تم التسجيل بنجاح!",
    back: "🏠 القائمة الرئيسية",
    error: "❌ حدث خطأ. حاول مرة أخرى.",
    adminFallback: "لم يتم ضبط ADMIN_CHAT_ID بعد."
  },
  uk: {
    lang: "🌐 Оберіть мову ринку:",
    welcome:
      "🛍️ Вітаємо на Telegram Marketplace\n\n" +
      "Приватний майданчик для купівлі, продажу, переговорів та завершення угод.\n\n" +
      "🔒 Конфіденційність користувачів збережена.\n\n" +
      "💰 Комісія платформи: 5%\n" +
      "2.5% покупець + 2.5% продавець\n\n" +
      "Натисніть кнопку нижче, щоб увійти.",
    agree: "✅ Погоджуюсь та входжу",
    menuTitle: "🛍️ Вітаємо на Telegram Marketplace!\n\nОберіть дію:",
    buy: "🛒 Хочу купити",
    sell: "📦 Хочу продати",
    browse: "🛍️ Пропозиції ринку",
    account: "👤 Мій профіль",
    chooseProduct: "🛒 Надішліть назву товару.\n\nНаприклад: iPhone 14",
    chooseMax: "💰 Надішліть максимальну ціну.\n\nНаприклад: 25000",
    chooseRegion: "📍 Надішліть місто або область.\n\nНаприклад: Київ\n\nАбо напишіть: будь-яка",
    searching: "🔎 Шукаю пропозиції на нашому ринку...",
    noResults: "🔎 Пошук завершено.\n\nПідходящих пропозицій зараз немає.",
    buySaved: "🛒 Ваш запит на купівлю збережено.",
    sellProduct: "📦 Надішліть назву товару.",
    sellDescription: "📝 Надішліть опис і стан товару.",
    sellPrice: "💰 Надішліть ціну продажу.\n\nНаприклад: 25000",
    sellRegion: "📍 Надішліть місто або область товару.\n\nНаприклад: Київ",
    photoRequired: "📸 Надішліть щонайменше одне фото товару.\nПісля кількох фото натисніть «Готово».",
    morePhotos: "📸 Надішліть ще фото або натисніть «Готово».",
    done: "✅ Готово",
    listingPublished: "✅ Вашу пропозицію опубліковано!",
    browseTitle: "🛍️ Пропозиції ринку",
    sellOffers: "📦 Пропозиції продажу",
    buyOffers: "🛒 Запити на купівлю",
    noListings: "Активних пропозицій зараз немає.",
    contact: "💬 Перейти до переговорів",
    contactBuyer: "💬 Переговори з покупцем",
    negotiationPage: "💬 Сторінка переговорів",
    negotiationClosed: "❌ Ці переговори завершені.",
    endNegotiation: "❌ Завершити переговори",
    backToMarket: "🛍️ Повернутися до ринку",
    contacted: "✅ Інтерес до пропозиції надіслано продавцю.",
    sellerNotice: "📩 Є покупець, зацікавлений у вашій пропозиції!",
    negotiationStarted: "💬 Переговори між покупцем і продавцем розпочато.",
    negotiationText: "💬 Надсилайте повідомлення для переговорів.\n\n/end — завершити.",
    dealOffer: "🤝 Погоджуєтесь завершити угоду за запропонованою ціною?",
    deal_offer: "🤝 Запропонувати ціну",
    dealCreated: "🤝 Угоду зареєстровано.",
    accountText: "👤 Мій профіль\n\n",
    cancel: "❌ Операцію скасовано.",
    registrationName: "📝 Для реєстрації надішліть своє ім’я.",
    registrationPhone: "📱 Надішліть номер телефону через кнопку контакту.",
    registered: "✅ Реєстрацію завершено!",
    back: "🏠 Головне меню",
    error: "❌ Сталася помилка. Спробуйте ще раз.",
    adminFallback: "ADMIN_CHAT_ID не налаштовано."
  },
  en: {
    lang: "🌐 Choose your marketplace language:",
    welcome:
      "🛍️ Welcome to Telegram Marketplace\n\n" +
      "A private marketplace for buying, selling, negotiation and completing deals.\n\n" +
      "🔒 User privacy is protected.\n\n" +
      "💰 Platform commission: 5%\n" +
      "2.5% buyer + 2.5% seller\n\n" +
      "Press the button below to enter the marketplace.",
    agree: "✅ Agree & enter",
    menuTitle: "🛍️ Welcome to Telegram Marketplace!\n\nChoose an option:",
    buy: "🛒 I want to buy",
    sell: "📦 I want to sell",
    browse: "🛍️ Marketplace offers",
    account: "👤 My account",
    chooseProduct: "🛒 Send the product name.\n\nExample: iPhone 14",
    chooseMax: "💰 Send the maximum price.\n\nExample: 25000",
    chooseRegion: "📍 Send the city or region.\n\nExample: Kyiv\n\nOr type: any",
    searching: "🔎 Searching our marketplace...",
    noResults: "🔎 Search finished.\n\nNo matching offers were found.",
    buySaved: "🛒 Your purchase request has been saved.",
    sellProduct: "📦 Send the product name.",
    sellDescription: "📝 Send the product description and condition.",
    sellPrice: "💰 Send your selling price.\n\nExample: 25000",
    sellRegion: "📍 Send the city or region where the product is located.\n\nExample: Kyiv",
    photoRequired: "📸 Send at least one product photo.\nAfter sending photos, press “Done”.",
    morePhotos: "📸 Send another photo or press “Done”.",
    done: "✅ Done",
    listingPublished: "✅ Your listing has been published!",
    browseTitle: "🛍️ Marketplace offers",
    sellOffers: "📦 Sell offers",
    buyOffers: "🛒 Buy requests",
    noListings: "There are no active offers right now.",
    contact: "💬 Open negotiation",
    contactBuyer: "💬 Negotiate with buyer",
    negotiationPage: "💬 Negotiation page",
    negotiationClosed: "❌ This negotiation is closed.",
    endNegotiation: "❌ End negotiation",
    backToMarket: "🛍️ Back to marketplace",
    contacted: "✅ Your interest was sent to the seller.",
    sellerNotice: "📩 A buyer is interested in your listing!",
    negotiationStarted: "💬 Negotiation between buyer and seller has started.",
    negotiationText: "💬 Send your negotiation messages.\n\nUse /end to finish.",
    dealOffer: "🤝 Do you agree to complete the deal at the proposed price?",
    deal_offer: "🤝 Make a price offer",
    dealCreated: "🤝 Deal registered.",
    accountText: "👤 My account\n\n",
    cancel: "❌ Operation cancelled.",
    registrationName: "📝 Send your name to register.",
    registrationPhone: "📱 Send your phone number using the contact button.",
    registered: "✅ Registration completed!",
    back: "🏠 Main menu",
    error: "❌ Something went wrong. Try again.",
    adminFallback: "ADMIN_CHAT_ID is not configured."
  }
};

function t(chatId, key) {
  const lang = db.users[chatId]?.language || "ar";
  return TEXT[lang]?.[key] || TEXT.ar[key] || key;
}

function getUser(chatId) {
  return db.users[String(chatId)] || null;
}

function generateMemberId() {
  const number = db.counters.member++;
  return `TM-${String(number).padStart(6, "0")}`;
}

function setUser(chatId, data = {}) {
  if (!db.users[chatId]) {
    db.users[chatId] = {
      chatId: String(chatId),
      language: null,
      memberId: null,
      agreedAt: null,
      name: null,
      phone: null,
      registeredAt: null,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };
  }
  Object.assign(db.users[chatId], data, {
    lastSeenAt: new Date().toISOString()
  });
  saveDb();
  return db.users[chatId];
}

function ensureMemberId(chatId) {
  const user = setUser(chatId);
  if (!user.memberId) {
    user.memberId = generateMemberId();
    saveDb();
  }
  return user.memberId;
}

function logActivity(chatId, type, extra = {}) {
  db.activities.push({
    id: db.activities.length + 1,
    chatId: String(chatId),
    type,
    ...extra,
    createdAt: new Date().toISOString()
  });
  if (db.activities.length > 10000) db.activities.shift();
  saveDb();
}

async function sendTelegram(chatId, text, replyMarkup = null) {
  if (!TELEGRAM_TOKEN) return;
  const body = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    console.error("Telegram sendMessage error:", await response.text());
  }
}

async function sendPhoto(chatId, photoId, caption = "", replyMarkup = null) {
  const body = { chat_id: chatId, photo: photoId };
  if (caption) body.caption = caption;
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    console.error("Telegram sendPhoto error:", await response.text());
  }
}

async function answerCallback(callbackId) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId })
    }
  );
}

async function notifyAdmin(text) {
  if (!ADMIN_CHAT_ID) return;
  await sendTelegram(ADMIN_CHAT_ID, text);
}

function parsePrice(text) {
  const n = Number(
    String(text || "")
      .replace(/\s/g, "")
      .replace(/₴/g, "")
      .replace(",", ".")
  );
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatPrice(price) {
  if (price === null || price === undefined) return "—";
  return `${Math.round(price).toLocaleString("uk-UA")} ₴`;
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function languageKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🇺🇦 Українська", callback_data: "lang_uk" },
        { text: "🇸🇦 العربية", callback_data: "lang_ar" }
      ],
      [{ text: "🇬🇧 English", callback_data: "lang_en" }]
    ]
  };
}

async function askLanguage(chatId) {
  await sendTelegram(chatId, TEXT.ar.lang, languageKeyboard());
}

async function showWelcome(chatId) {
  await sendTelegram(chatId, t(chatId, "welcome"), {
    inline_keyboard: [[
      { text: t(chatId, "agree"), callback_data: "agree" }
    ]]
  });
}

async function showMainMenu(chatId) {
  const buttons = [
    [{ text: t(chatId, "buy"), callback_data: "buy" }],
    [{ text: t(chatId, "sell"), callback_data: "sell" }],
    [{ text: t(chatId, "browse"), callback_data: "browse" }],
    [{ text: t(chatId, "account"), callback_data: "account" }]
  ];
  await sendTelegram(chatId, t(chatId, "menuTitle"), {
    inline_keyboard: buttons
  });
}

function accountKeyboard(chatId) {
  return {
    inline_keyboard: [
      [{ text: t(chatId, "back"), callback_data: "menu" }]
    ]
  };
}

function searchListings(product, maxPrice, region) {
  const wantedProduct = normalizeText(product);
  const wantedRegion = normalizeText(region);

  return db.listings
    .filter((listing) => {
      if (listing.status !== "active") return false;
      if (listing.price > maxPrice) return false;

      const lp = normalizeText(listing.product);
      const lr = normalizeText(listing.region);
      const productMatch =
        lp.includes(wantedProduct) || wantedProduct.includes(lp);

      if (!productMatch) return false;

      if (
        wantedRegion &&
        !["الكل", "будь-яка", "any"].includes(wantedRegion) &&
        !lr.includes(wantedRegion) &&
        !wantedRegion.includes(lr)
      ) return false;

      return true;
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, 10);
}

function createBuyRequest(chatId, session) {
  const request = {
    id: db.counters.request++,
    buyerChatId: String(chatId),
    product: session.product,
    maxPrice: session.maxPrice,
    region: session.region,
    status: "open",
    createdAt: new Date().toISOString()
  };
  db.buyRequests.push(request);
  saveDb();
  return request;
}

function createListing(chatId, session) {
  const listing = {
    id: db.counters.listing++,
    sellerChatId: String(chatId),
    product: session.product,
    description: session.description,
    price: session.price,
    region: session.region,
    photos: session.photos || [],
    status: "active",
    createdAt: new Date().toISOString()
  };
  db.listings.push(listing);
  saveDb();
  return listing;
}

function negotiationKeyboard(chatId, negotiation) {
  return {
    inline_keyboard: [
      [{ text: t(chatId, "deal_offer"), callback_data: `deal_offer_${negotiation.id}` }],
      [{ text: t(chatId, "endNegotiation"), callback_data: `neg_end_${negotiation.id}` }],
      [{ text: t(chatId, "backToMarket"), callback_data: "browse" }]
    ]
  };
}

async function showNegotiationPage(chatId, negotiationId) {
  const negotiation = db.negotiations.find(
    n => n.id === negotiationId &&
      (String(n.buyerChatId) === String(chatId) || String(n.sellerChatId) === String(chatId))
  );

  if (!negotiation) {
    await sendTelegram(chatId, t(chatId, "negotiationClosed"), accountKeyboard(chatId));
    return;
  }

  const offer = negotiation.offerType === "buy"
    ? db.buyRequests.find(x => x.id === negotiation.offerId)
    : db.listings.find(x => x.id === negotiation.offerId);

  if (!offer) {
    await sendTelegram(chatId, t(chatId, "negotiationClosed"), accountKeyboard(chatId));
    return;
  }

  const isBuyOffer = negotiation.offerType === "buy";
  const price = isBuyOffer ? offer.maxPrice : offer.price;
  const title = isBuyOffer ? t(chatId, "buyOffers") : t(chatId, "sellOffers");
  const role = String(negotiation.buyerChatId) === String(chatId) ? "buyer" : "seller";

  sessions[chatId] = {
    step: "negotiation",
    negotiationId: negotiation.id
  };

  await sendTelegram(
    chatId,
    `${t(chatId, "negotiationPage")}\n\n` +
    `📌 ${title} #${offer.id}\n` +
    `🛒 ${offer.product}\n` +
    `💰 ${isBuyOffer ? "حتى " : "السعر: "}${formatPrice(price)}\n` +
    `📍 ${offer.region}\n\n` +
    `👤 ${role === "buyer" ? "أنت المشتري" : "أنت البائع"}\n\n` +
    t(chatId, "negotiationText"),
    negotiationKeyboard(chatId, negotiation)
  );
}

async function showBrowse(chatId) {
  logActivity(chatId, "browse_marketplace");

  const sellOffers = db.listings.filter(x => x.status === "active" && getUser(x.sellerChatId)?.registeredAt).slice(0, 10);
  const buyOffers = db.buyRequests.filter(x => x.status === "open" && String(x.buyerChatId) !== String(chatId) && getUser(x.buyerChatId)?.registeredAt).slice(0, 10);

  if (!sellOffers.length && !buyOffers.length) {
    await sendTelegram(chatId, t(chatId, "noListings"), accountKeyboard(chatId));
    return;
  }

  await sendTelegram(chatId, t(chatId, "browseTitle"));

  if (sellOffers.length) {
    await sendTelegram(chatId, `📦 ${t(chatId, "sellOffers")}`);
    for (const item of sellOffers) {
      const caption =
        `📌 عرض بيع #${item.id}\n\n` +
        `🛒 ${item.product}\n` +
        `💰 ${formatPrice(item.price)}\n` +
        `📍 ${item.region}\n\n` +
        `📝 ${item.description || ""}`;
      const markup = { inline_keyboard: [[{ text: t(chatId, "contact"), callback_data: `contact_sell_${item.id}` }]] };
      if (item.photos?.length) await sendPhoto(chatId, item.photos[0], caption, markup);
      else await sendTelegram(chatId, caption, markup);
      logActivity(chatId, "view_sell_offer", { listingId: item.id });
    }
  }

  if (buyOffers.length) {
    await sendTelegram(chatId, `🛒 ${t(chatId, "buyOffers")}`);
    for (const item of buyOffers) {
      const caption =
        `📌 عرض شراء #${item.id}\n\n` +
        `🛒 ${item.product}\n` +
        `💰 حتى ${formatPrice(item.maxPrice)}\n` +
        `📍 ${item.region}\n`;
      await sendTelegram(chatId, caption, {
        inline_keyboard: [[{ text: t(chatId, "contactBuyer"), callback_data: `contact_buy_${item.id}` }]]
      });
      logActivity(chatId, "view_buy_offer", { requestId: item.id });
    }
  }
}

async function sendMarketplaceResults(chatId, session, results) {
  if (!results.length) {
    const request = createBuyRequest(chatId, session);
    logActivity(chatId, "buy_request_created", { requestId: request.id });

    await sendTelegram(
      chatId,
      t(chatId, "noResults") +
      `\n\n🛒 ${session.product}\n💰 ${formatPrice(session.maxPrice)}\n📍 ${session.region}\n\n` +
      t(chatId, "buySaved"),
      {
        inline_keyboard: [
          [{ text: t(chatId, "browse"), callback_data: "browse" }],
          [{ text: t(chatId, "back"), callback_data: "menu" }]
        ]
      }
    );

    await notifyAdmin(
      `🔔 طلب شراء جديد #${request.id}\n\n` +
      `🛒 ${request.product}\n` +
      `💰 حتى ${formatPrice(request.maxPrice)}\n` +
      `📍 ${request.region}\n` +
      `👤 المستخدم: ${request.buyerChatId}`
    );
    return;
  }

  await sendTelegram(chatId, `🔎 وجدنا ${results.length} عرض/عروض مناسبة.`);

  for (const item of results) {
    logActivity(chatId, "view_matching_listing", { listingId: item.id, product: session.product });
    const message =
      `📌 عرض بيع #${item.id}\n\n` +
      `🛒 ${item.product}\n` +
      `💰 ${formatPrice(item.price)}\n` +
      `📍 ${item.region}\n\n` +
      `📝 ${item.description || ""}`;
    const markup = { inline_keyboard: [[{ text: t(chatId, "contact"), callback_data: `contact_sell_${item.id}` }]] };
    if (item.photos?.length) await sendPhoto(chatId, item.photos[0], message, markup);
    else await sendTelegram(chatId, message, markup);
  }
}

function createNegotiation({ buyerChatId, sellerChatId, offerType, offerId }) {
  const existing = db.negotiations.find(
    n => n.offerType === offerType &&
      n.offerId === offerId &&
      n.buyerChatId === String(buyerChatId) &&
      n.sellerChatId === String(sellerChatId) &&
      n.status === "active"
  );
  if (existing) return existing;

  const negotiation = {
    id: db.counters.negotiation++,
    offerType,
    offerId,
    buyerChatId: String(buyerChatId),
    sellerChatId: String(sellerChatId),
    status: "active",
    proposedPrice: null,
    agreedPrice: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.negotiations.push(negotiation);
  saveDb();
  return negotiation;
}

async function contactSellOffer(chatId, listingId) {
  const listing = db.listings.find(x => x.id === listingId && x.status === "active");
  if (!listing) {
    await sendTelegram(chatId, "❌ هذا العرض لم يعد متاحًا.");
    return;
  }
  if (String(listing.sellerChatId) === String(chatId)) {
    await sendTelegram(chatId, "❌ لا يمكنك التفاوض على عرضك مع نفسك.");
    return;
  }

  const negotiation = createNegotiation({
    buyerChatId: chatId,
    sellerChatId: listing.sellerChatId,
    offerType: "sell",
    offerId: listing.id
  });

  await showNegotiationPage(chatId, negotiation.id);
  await sendTelegram(
    listing.sellerChatId,
    `📩 لديك مشتري مهتم بعرض البيع #${listing.id}.\n\n🛒 ${listing.product}\n💰 ${formatPrice(listing.price)}`,
    { inline_keyboard: [[{ text: t(listing.sellerChatId, "negotiationPage"), callback_data: `neg_open_${negotiation.id}` }]] }
  );
  logActivity(chatId, "negotiation_started", { negotiationId: negotiation.id, offerType: "sell", offerId: listing.id });
  await notifyAdmin(`💬 بدأ تفاوض #${negotiation.id}\n📦 عرض البيع: #${listing.id}\n👤 المشتري: ${chatId}\n👤 البائع: ${listing.sellerChatId}`);
}

async function contactBuyOffer(chatId, requestId) {
  const request = db.buyRequests.find(x => x.id === requestId && x.status === "open");
  if (!request) {
    await sendTelegram(chatId, "❌ طلب الشراء لم يعد متاحًا.");
    return;
  }
  if (String(request.buyerChatId) === String(chatId)) {
    await sendTelegram(chatId, "❌ لا يمكنك التفاوض مع نفسك.");
    return;
  }

  const negotiation = createNegotiation({
    buyerChatId: request.buyerChatId,
    sellerChatId: chatId,
    offerType: "buy",
    offerId: request.id
  });

  await showNegotiationPage(chatId, negotiation.id);
  await sendTelegram(
    request.buyerChatId,
    `📩 لديك بائع مهتم بطلب الشراء #${request.id}.\n\n🛒 ${request.product}\n💰 حتى ${formatPrice(request.maxPrice)}`,
    { inline_keyboard: [[{ text: t(request.buyerChatId, "negotiationPage"), callback_data: `neg_open_${negotiation.id}` }]] }
  );
  logActivity(chatId, "negotiation_started", { negotiationId: negotiation.id, offerType: "buy", offerId: request.id });
  await notifyAdmin(`💬 بدأ تفاوض #${negotiation.id}\n🛒 طلب شراء: #${request.id}\n👤 المشتري: ${request.buyerChatId}\n👤 البائع: ${chatId}`);
}

async function forwardNegotiationMessage(chatId, text) {
  const session = sessions[chatId];
  const negotiation = db.negotiations.find(
    n => n.id === session?.negotiationId &&
      n.status === "active" &&
      (String(n.buyerChatId) === String(chatId) || String(n.sellerChatId) === String(chatId))
  );
  if (!negotiation) return false;

  const other = String(negotiation.buyerChatId) === String(chatId)
    ? negotiation.sellerChatId
    : negotiation.buyerChatId;

  await sendTelegram(other, `💬 رسالة من الطرف الآخر:\n\n${text}`, {
    inline_keyboard: [[{ text: t(other, "negotiationPage"), callback_data: `neg_open_${negotiation.id}` }]]
  });
  negotiation.updatedAt = new Date().toISOString();
  saveDb();
  logActivity(chatId, "negotiation_message", { negotiationId: negotiation.id });
  return true;
}

async function createDeal(negotiation, agreedPrice) {
  const deal = {
    id: db.counters.deal++,
    negotiationId: negotiation.id,
    offerType: negotiation.offerType,
    offerId: negotiation.offerId,
    listingId: negotiation.offerType === "sell" ? negotiation.offerId : null,
    requestId: negotiation.offerType === "buy" ? negotiation.offerId : null,
    buyerChatId: negotiation.buyerChatId,
    sellerChatId: negotiation.sellerChatId,
    amount: agreedPrice,
    commission: agreedPrice * 0.05,
    buyerCommission: agreedPrice * 0.025,
    sellerCommission: agreedPrice * 0.025,
    status: "agreed",
    createdAt: new Date().toISOString()
  };

  negotiation.status = "agreed";
  negotiation.agreedPrice = agreedPrice;
  negotiation.updatedAt = new Date().toISOString();
  db.deals.push(deal);
  if (negotiation.offerType === "sell") {
    const listing = db.listings.find(x => x.id === negotiation.offerId);
    if (listing) listing.status = "reserved";
  } else {
    const request = db.buyRequests.find(x => x.id === negotiation.offerId);
    if (request) request.status = "matched";
  }
  saveDb();

  await sendTelegram(
    negotiation.buyerChatId,
    `${t(negotiation.buyerChatId, "dealCreated")}\n\n` +
    `🤝 الصفقة #${deal.id}\n` +
    `💰 القيمة: ${formatPrice(deal.amount)}\n` +
    `💵 عمولة المنصة: ${formatPrice(deal.commission)}`
  );

  await sendTelegram(
    negotiation.sellerChatId,
    `${t(negotiation.sellerChatId, "dealCreated")}\n\n` +
    `🤝 الصفقة #${deal.id}\n` +
    `💰 القيمة: ${formatPrice(deal.amount)}\n` +
    `💵 عمولة المنصة: ${formatPrice(deal.commission)}`
  );

  await notifyAdmin(
    `🤝 صفقة جديدة #${deal.id}\n\n` +
    `📦 العرض: ${deal.offerType === "sell" ? "بيع" : "شراء"} #${deal.offerId}\n` +
    `💰 قيمة الصفقة: ${formatPrice(deal.amount)}\n` +
    `💵 عمولة 5%: ${formatPrice(deal.commission)}\n` +
    `├─ المشتري 2.5%: ${formatPrice(deal.buyerCommission)}\n` +
    `└─ البائع 2.5%: ${formatPrice(deal.sellerCommission)}`
  );
}

async function handleCallback(query) {
  await answerCallback(query.id);
  if (!query.message) return;

  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("lang_")) {
    const language = data.slice(5);
    if (!TEXT[language]) return;

    setUser(chatId, { language });
    logActivity(chatId, "language_selected", { language });
    await showWelcome(chatId);
    return;
  }

  if (data === "agree") {
    setUser(chatId, { agreedAt: new Date().toISOString() });
    logActivity(chatId, "entered_marketplace");
    const user = getUser(chatId);
    if (!user?.registeredAt) {
      sessions[chatId] = { step: "registration_name" };
      await sendTelegram(chatId, t(chatId, "registrationName"));
      return;
    }
    if (!user.memberId) ensureMemberId(chatId);
    await showMainMenu(chatId);
    return;
  }

  if (data === "menu") {
    sessions[chatId] = { step: "menu" };
    await showMainMenu(chatId);
    return;
  }

  if (data === "buy") {
    if (!getUser(chatId)?.registeredAt) {
      sessions[chatId] = { step: "registration_name" };
      await sendTelegram(chatId, t(chatId, "registrationName"));
      return;
    }
    sessions[chatId] = { step: "buy_product" };
    logActivity(chatId, "start_buy");
    await sendTelegram(chatId, t(chatId, "chooseProduct"));
    return;
  }

  if (data === "sell") {
    if (!getUser(chatId)?.registeredAt) {
      sessions[chatId] = { step: "registration_name" };
      await sendTelegram(chatId, t(chatId, "registrationName"));
      return;
    }
    sessions[chatId] = { step: "sell_product", photos: [] };
    logActivity(chatId, "start_sell");
    await sendTelegram(chatId, t(chatId, "sellProduct"));
    return;
  }

  if (data === "browse") {
    sessions[chatId] = { step: "menu" };
    await showBrowse(chatId);
    return;
  }

  if (data === "account") {
    const mine = db.listings.filter(
      x => String(x.sellerChatId) === String(chatId)
    );
    const buys = db.buyRequests.filter(
      x => String(x.buyerChatId) === String(chatId)
    );
    const deals = db.deals.filter(
      x =>
        String(x.buyerChatId) === String(chatId) ||
        String(x.sellerChatId) === String(chatId)
    );
    const negotiations = db.negotiations.filter(
      x => x.status === "active" && (String(x.buyerChatId) === String(chatId) || String(x.sellerChatId) === String(chatId))
    );

    await sendTelegram(
      chatId,
      t(chatId, "accountText") +
      `🆔 رقم العضوية: ${getUser(chatId)?.memberId || "—"}\n` +
      `📦 عروض البيع: ${mine.length}\n` +
      `🛒 طلبات الشراء: ${buys.length}\n` +
      `🤝 الصفقات: ${deals.length}\n` +
      `💬 مفاوضات نشطة: ${negotiations.length}`,
      accountKeyboard(chatId)
    );
    return;
  }

  if (data === "done_photos") {
    const session = sessions[chatId];
    if (!session?.photos?.length) {
      await sendTelegram(chatId, t(chatId, "photoRequired"));
      return;
    }
    session.step = "sell_region";
    await sendTelegram(chatId, t(chatId, "sellRegion"));
    return;
  }

  if (data.startsWith("contact_sell_")) {
    const listingId = Number(data.slice(13));
    if (Number.isInteger(listingId)) await contactSellOffer(chatId, listingId);
    return;
  }

  if (data.startsWith("contact_buy_")) {
    const requestId = Number(data.slice(12));
    if (Number.isInteger(requestId)) await contactBuyOffer(chatId, requestId);
    return;
  }

  if (data.startsWith("neg_open_")) {
    const negotiationId = Number(data.slice(9));
    if (Number.isInteger(negotiationId)) await showNegotiationPage(chatId, negotiationId);
    return;
  }

  if (data.startsWith("neg_end_")) {
    const negotiationId = Number(data.slice(8));
    const negotiation = db.negotiations.find(n => n.id === negotiationId);
    if (!negotiation || (String(negotiation.buyerChatId) !== String(chatId) && String(negotiation.sellerChatId) !== String(chatId))) return;
    negotiation.status = "closed";
    negotiation.updatedAt = new Date().toISOString();
    saveDb();
    const other = String(negotiation.buyerChatId) === String(chatId) ? negotiation.sellerChatId : negotiation.buyerChatId;
    sessions[chatId] = { step: "menu" };
    sessions[other] = { step: "menu" };
    await sendTelegram(chatId, t(chatId, "negotiationClosed"));
    await sendTelegram(other, t(other, "negotiationClosed"), { inline_keyboard: [[{ text: t(other, "browse"), callback_data: "browse" }]] });
    await showMainMenu(chatId);
    return;
  }

  if (data.startsWith("deal_approve_")) {
    const negotiationId = Number(data.slice(13));
    const negotiation = db.negotiations.find(
      n => n.id === negotiationId && n.status === "active"
    );
    if (!negotiation) {
      await sendTelegram(chatId, "❌ التفاوض غير متاح.");
      return;
    }

    if (String(negotiation.sellerChatId) !== String(chatId)) {
      await sendTelegram(chatId, "❌ قبول الصفقة متاح للبائع فقط.");
      return;
    }

    const price = negotiation.proposedPrice;
    if (!price) {
      await sendTelegram(chatId, "❌ لا يوجد عرض سعر بانتظار القبول.");
      return;
    }

    await createDeal(negotiation, price);
    return;
  }

  if (data.startsWith("deal_offer_")) {
    const negotiationId = Number(data.slice(11));
    const negotiation = db.negotiations.find(
      n => n.id === negotiationId && n.status === "active"
    );
    if (!negotiation) return;
    if (String(negotiation.buyerChatId) !== String(chatId) && String(negotiation.sellerChatId) !== String(chatId)) return;

    sessions[chatId] = {
      step: "offer_price",
      negotiationId
    };

    await sendTelegram(
      chatId,
      "💰 أرسل السعر الذي تقترحه لإتمام الصفقة."
    );
    return;
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  setUser(chatId, {
    username: message.from?.username || null,
    firstName: message.from?.first_name || null
  });

  if (message.photo?.length) {
    const session = sessions[chatId];
    if (session?.step === "sell_photos") {
      session.photos.push(
        message.photo[message.photo.length - 1].file_id
      );
      logActivity(chatId, "upload_listing_photo");
      await sendTelegram(chatId, t(chatId, "morePhotos"), {
        inline_keyboard: [[
          { text: t(chatId, "done"), callback_data: "done_photos" }
        ]]
      });
      return;
    }
  }

  if (text === "/start") {
    sessions[chatId] = { step: "language" };
    setUser(chatId);
    logActivity(chatId, "start");
    await askLanguage(chatId);
    return;
  }

  if (!db.users[chatId]?.language) {
    await askLanguage(chatId);
    return;
  }

  const sessionBeforeCommands = sessions[chatId];

  if (sessionBeforeCommands?.step === "registration_name") {
    if (!text) return;
    setUser(chatId, { name: text });
    sessions[chatId] = { step: "registration_phone" };
    await sendTelegram(chatId, t(chatId, "registrationPhone"), {
      keyboard: [[{ text: "📱 مشاركة رقم الهاتف", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true
    });
    return;
  }

  if (sessionBeforeCommands?.step === "registration_phone") {
    const contact = message.contact;
    if (!contact?.phone_number) {
      await sendTelegram(chatId, t(chatId, "registrationPhone"));
      return;
    }
    if (contact.user_id && String(contact.user_id) !== String(chatId)) {
      await sendTelegram(chatId, "❌ يجب مشاركة رقم هاتف حسابك أنت.");
      return;
    }
    setUser(chatId, { phone: contact.phone_number, registeredAt: new Date().toISOString() });
    ensureMemberId(chatId);
    logActivity(chatId, "registered");
    sessions[chatId] = { step: "menu" };
    await sendTelegram(chatId, t(chatId, "registered") + `\n\n🆔 رقم العضوية: ${getUser(chatId).memberId}`, { remove_keyboard: true });
    await showMainMenu(chatId);
    return;
  }

  if (text === "/cancel") {
    sessions[chatId] = { step: "menu" };
    await sendTelegram(chatId, t(chatId, "cancel"));
    await showMainMenu(chatId);
    return;
  }

  if (text === "/menu") {
    sessions[chatId] = { step: "menu" };
    await showMainMenu(chatId);
    return;
  }

  if (text === "/negotiations") {
    const active = db.negotiations.filter(n => n.status === "active" && (String(n.buyerChatId) === String(chatId) || String(n.sellerChatId) === String(chatId)));
    if (!active.length) {
      await sendTelegram(chatId, "💬 لا توجد مفاوضات نشطة.", { inline_keyboard: [[{ text: t(chatId, "browse"), callback_data: "browse" }]] });
      return;
    }
    await sendTelegram(chatId, t(chatId, "negotiationPage"));
    for (const n of active) {
      await sendTelegram(chatId, `💬 تفاوض #${n.id}`, { inline_keyboard: [[{ text: t(chatId, "negotiationPage"), callback_data: `neg_open_${n.id}` }]] });
    }
    return;
  }

  if (text === "/account") {
    await handleCallback({
      id: "internal",
      message: { chat: { id: chatId } },
      data: "account"
    });
    return;
  }

  if (text === "/end") {
    const session = sessions[chatId];
    if (session?.step === "negotiation") {
      const negotiation = db.negotiations.find(n => n.id === session.negotiationId && n.status === "active");
      if (negotiation && (String(negotiation.buyerChatId) === String(chatId) || String(negotiation.sellerChatId) === String(chatId))) {
        negotiation.status = "closed";
        negotiation.updatedAt = new Date().toISOString();
        saveDb();
        const other = String(negotiation.buyerChatId) === String(chatId) ? negotiation.sellerChatId : negotiation.buyerChatId;
        sessions[chatId] = { step: "menu" };
        sessions[other] = { step: "menu" };
        await sendTelegram(chatId, t(chatId, "negotiationClosed"));
        await sendTelegram(other, t(other, "negotiationClosed"), { inline_keyboard: [[{ text: t(other, "browse"), callback_data: "browse" }]] });
        await showMainMenu(chatId);
        return;
      }
    }
  }

  const session = sessions[chatId];

  if (session?.step === "buy_product") {
    if (!text) return;
    session.product = text;
    session.step = "buy_max_price";
    await sendTelegram(chatId, t(chatId, "chooseMax"));
    return;
  }

  if (session?.step === "buy_max_price") {
    const price = parsePrice(text);
    if (!price) {
      await sendTelegram(chatId, t(chatId, "chooseMax"));
      return;
    }
    session.maxPrice = price;
    session.step = "buy_region";
    await sendTelegram(chatId, t(chatId, "chooseRegion"));
    return;
  }

  if (session?.step === "buy_region") {
    if (!text) return;
    session.region = text;
    session.step = "buy_results";
    logActivity(chatId, "buy_search", {
      product: session.product,
      maxPrice: session.maxPrice,
      region: session.region
    });

    await sendTelegram(
      chatId,
      t(chatId, "searching") +
      `\n\n🛒 ${session.product}\n💰 ${formatPrice(session.maxPrice)}\n📍 ${session.region}`
    );

    const results = searchListings(
      session.product,
      session.maxPrice,
      session.region
    );

    await sendMarketplaceResults(chatId, session, results);
    return;
  }

  if (session?.step === "sell_product") {
    if (!text) return;
    session.product = text;
    session.step = "sell_description";
    await sendTelegram(chatId, t(chatId, "sellDescription"));
    return;
  }

  if (session?.step === "sell_description") {
    if (!text) return;
    session.description = text;
    session.step = "sell_price";
    await sendTelegram(chatId, t(chatId, "sellPrice"));
    return;
  }

  if (session?.step === "sell_price") {
    const price = parsePrice(text);
    if (!price) {
      await sendTelegram(chatId, t(chatId, "sellPrice"));
      return;
    }
    session.price = price;
    session.step = "sell_region";
    await sendTelegram(chatId, t(chatId, "sellRegion"));
    return;
  }

  if (session?.step === "sell_region") {
    if (!text) return;
    session.region = text;
    session.step = "sell_photos";
    await sendTelegram(chatId, t(chatId, "photoRequired"), {
      inline_keyboard: [[
        { text: t(chatId, "done"), callback_data: "done_photos" }
      ]]
    });
    return;
  }

  if (session?.step === "negotiation") {
    if (text && await forwardNegotiationMessage(chatId, text)) {
      return;
    }
  }

  if (session?.step === "offer_price") {
    const price = parsePrice(text);
    if (!price) {
      await sendTelegram(chatId, "❌ السعر غير صحيح. أرسل رقمًا.");
      return;
    }

    session.proposedPrice = price;

    const negotiation = db.negotiations.find(
      n => n.id === session.negotiationId && n.status === "active"
    );

    if (!negotiation) {
      await sendTelegram(chatId, "❌ التفاوض غير متاح.");
      return;
    }

    if (String(negotiation.buyerChatId) !== String(chatId) && String(negotiation.sellerChatId) !== String(chatId)) {
      await sendTelegram(chatId, "❌ أنت لست طرفًا في هذا التفاوض.");
      return;
    }

    negotiation.proposedPrice = price;
    negotiation.updatedAt = new Date().toISOString();
    saveDb();

    const other =
      String(negotiation.buyerChatId) === String(chatId)
        ? negotiation.sellerChatId
        : negotiation.buyerChatId;

    sessions[other] = {
      step: "negotiation",
      negotiationId: negotiation.id
    };

    await sendTelegram(
      other,
      `💰 الطرف الآخر اقترح ${formatPrice(price)} لإتمام الصفقة.\n\n` +
      t(other, "dealOffer"),
      {
        inline_keyboard: [
          [{ text: "🤝 موافق", callback_data: `deal_approve_${negotiation.id}` }],
          [{ text: "💬 تفاوض", callback_data: `neg_open_${negotiation.id}` }]
        ]
      }
    );

    await sendTelegram(
      chatId,
      `📨 تم إرسال عرض السعر ${formatPrice(price)} للطرف الآخر.`
    );
    return;
  }

  await sendTelegram(chatId, "ℹ️ استخدم /start للبدء من جديد.");
}

async function handleWebhook(body) {
  if (body.callback_query) {
    await handleCallback(body.callback_query);
    return;
  }

  if (body.message) {
    await handleMessage(body.message);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!doctype html>
      <html lang="uk" dir="ltr">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body>
        <h1>🛍️ Telegram Marketplace</h1>
        <p>Marketplace працює.</p>
      </body>
      </html>
    `);
    return;
  }

  if (req.method === "POST" && req.url === "/webhook") {
    let data = "";

    req.on("data", chunk => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        const body = JSON.parse(data);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");

        handleWebhook(body).catch(error => {
          console.error("Webhook processing error:", error);
        });
      } catch (error) {
        console.error("Webhook JSON error:", error);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

if (!TELEGRAM_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not configured");
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Telegram Marketplace server running on port ${PORT}`);
});
