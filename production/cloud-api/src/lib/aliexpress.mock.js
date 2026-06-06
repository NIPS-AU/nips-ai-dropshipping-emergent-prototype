// Minimal mock catalog mirroring /app/backend/mock_data.py so the cloud
// starts up out-of-the-box. Replace by setting ALIEXPRESS_PROVIDER in .env.

const ELECTRONICS = "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800";
const HEADPHONES = "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800";
const SMARTWATCH = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";

export default [
  {
    product_id: "1005007250240074",
    sku: "AE-1005007250240074",
    supplier_url: "https://www.aliexpress.com/item/1005007250240074.html",
    title: "Wireless Bluetooth 5.3 Earbuds — TWS Noise Cancelling Headphones",
    price: 12.49,
    retail_price: 39.99,
    profit_estimate: 27.50,
    currency: "USD",
    category: "Consumer Electronics > Audio > Earbuds & In-Ear",
    tags: ["wireless", "bluetooth", "earbuds", "tws", "anc"],
    main_image: HEADPHONES,
    gallery_images: [HEADPHONES, ELECTRONICS, HEADPHONES, ELECTRONICS],
    description_images: [HEADPHONES],
    description: "True Wireless Stereo earbuds powered by Bluetooth 5.3 with ANC, IPX5 sweat resistance and a USB-C charging case delivering up to 32 hours of playtime.",
    specifications: [
      { name: "Bluetooth", value: "5.3" },
      { name: "Battery Life", value: "32 hours w/ case" },
      { name: "Water Resistance", value: "IPX5" },
      { name: "Charging Port", value: "USB-C" },
    ],
    attributes: [
      { name: "Color", values: ["Midnight Black", "Pearl White", "Sage Green"] },
    ],
    shipping: {
      has_shipping: true, price: 0, from_country: "CN", to_country: "US",
      estimated_delivery: "12-20 days", method: "AliExpress Standard Shipping",
    },
    stock: 5421,
    supplier: {
      name: "ShenZhen Audio Direct Store",
      store_url: "https://aliexpress.com/store/910223",
      rating: 4.7, feedback_count: 18421, country: "CN",
    },
    variants: [
      { variant_id: "v_black", sku: "AE-1005007250240074-BK", title: "Midnight Black", image: HEADPHONES, price: 12.49, retail_price: 39.99, attributes: { Color: "Midnight Black" }, stock: 2000 },
      { variant_id: "v_white", sku: "AE-1005007250240074-WH", title: "Pearl White", image: ELECTRONICS, price: 12.49, retail_price: 39.99, attributes: { Color: "Pearl White" }, stock: 1800 },
    ],
  },
  {
    product_id: "1005009912345001",
    sku: "AE-1005009912345001",
    supplier_url: "https://www.aliexpress.com/item/1005009912345001.html",
    title: "Smart Fitness Watch — 1.9\" AMOLED Heart Rate & SpO2 Tracker",
    price: 18.90, retail_price: 59.00, profit_estimate: 40.10, currency: "USD",
    category: "Consumer Electronics > Wearables > Smartwatches",
    tags: ["smartwatch", "fitness", "heart-rate", "spo2"],
    main_image: SMARTWATCH,
    gallery_images: [SMARTWATCH, ELECTRONICS, SMARTWATCH],
    description_images: [SMARTWATCH],
    description: "Premium smartwatch with 1.9-inch AMOLED, 100+ workout modes, HR, SpO2 and 14-day battery life.",
    specifications: [{ name: "Display", value: "1.9\" AMOLED" }, { name: "Battery", value: "14 days" }, { name: "Water Resistance", value: "IP68" }],
    attributes: [{ name: "Case Color", values: ["Silver", "Space Black", "Rose Gold"] }],
    shipping: { has_shipping: true, price: 2.99, from_country: "CN", to_country: "US", estimated_delivery: "10-18 days", method: "AliExpress Standard Shipping" },
    stock: 1240,
    supplier: { name: "Global Wearables Outlet", store_url: "https://aliexpress.com/store/710998", rating: 4.6, feedback_count: 9821, country: "CN" },
    variants: [
      { variant_id: "sw_silver", sku: "AE-1005009912345001-SV", title: "Silver", image: SMARTWATCH, price: 18.90, retail_price: 59.00, attributes: { "Case Color": "Silver" }, stock: 500 },
      { variant_id: "sw_black", sku: "AE-1005009912345001-BK", title: "Space Black", image: SMARTWATCH, price: 21.50, retail_price: 64.00, attributes: { "Case Color": "Space Black" }, stock: 420 },
    ],
  },
  {
    product_id: "1005008811223344",
    sku: "AE-1005008811223344",
    supplier_url: "https://www.aliexpress.com/item/1005008811223344.html",
    title: "Portable USB-C Hub 7-in-1 — 4K HDMI, SD/TF, USB 3.0, 100W PD",
    price: 9.75, retail_price: 32.00, profit_estimate: 22.25, currency: "USD",
    category: "Computer & Office > Adapters & Hubs",
    tags: ["usb-c", "hub", "hdmi", "macbook"],
    main_image: ELECTRONICS,
    gallery_images: [ELECTRONICS, HEADPHONES, ELECTRONICS],
    description_images: [ELECTRONICS],
    description: "Compact aluminium 7-in-1 USB-C hub: 4K HDMI, 100W PD, USB-A 3.0 x2, SD/MicroSD readers and 3.5mm audio.",
    specifications: [{ name: "HDMI Output", value: "4K @ 30Hz" }, { name: "Power Delivery", value: "100W" }],
    attributes: [{ name: "Color", values: ["Space Grey", "Silver"] }],
    shipping: { has_shipping: true, price: 1.49, from_country: "CN", to_country: "US", estimated_delivery: "9-15 days", method: "AliExpress Saver" },
    stock: 3340,
    supplier: { name: "TechHub Direct", store_url: "https://aliexpress.com/store/881022", rating: 4.8, feedback_count: 22034, country: "CN" },
    variants: [
      { variant_id: "hub_grey", sku: "AE-1005008811223344-GR", title: "Space Grey", image: ELECTRONICS, price: 9.75, retail_price: 32.00, attributes: { Color: "Space Grey" }, stock: 1700 },
    ],
  },
];
