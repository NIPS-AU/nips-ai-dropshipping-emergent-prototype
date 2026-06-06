"""
NIPS-AI Dropshipping Cloud — Mock supplier product catalog.

This represents what the real AliExpress capture engine will return in production.
Structure must match the production capture payload exactly.
"""

# Image pool — sourced from design guidelines (royalty-free Unsplash)
ELECTRONICS = "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHw0fHxlbGVjdHJvbmljcyUyMGdhZGdldCUyMHByb2R1Y3R8ZW58MHx8fHwxNzgwNzA0NDA2fDA&ixlib=rb-4.1.0&q=85"
HEADPHONES_BLACK = "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwyfHxoZWFkcGhvbmVzJTIwcHJvZHVjdHxlbnwwfHx8fDE3ODA3MDQ0MDZ8MA&ixlib=rb-4.1.0&q=85"
SMARTWATCH_WHITE = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxzbWFydHdhdGNoJTIwcHJvZHVjdHxlbnwwfHx8fDE3ODA3MDQ0MDZ8MA&ixlib=rb-4.1.0&q=85"
HEADPHONES_FLAT = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxoZWFkcGhvbmVzJTIwcHJvZHVjdHxlbnwwfHx8fDE3ODA3MDQ0MDZ8MA&ixlib=rb-4.1.0&q=85"
SMARTWATCH_BLACK = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxzbWFydHdhdGNoJTIwcHJvZHVjdHxlbnwwfHx8fDE3ODA3MDQ0MDZ8MA&ixlib=rb-4.1.0&q=85"


def _gallery(primary, *extras):
    base = [primary] + list(extras)
    return base + [
        f"{primary}&v=g{i}" for i in range(1, max(0, 8 - len(base)) + 1)
    ]


MOCK_PRODUCTS = [
    # Primary exact-match product referenced in the problem statement.
    {
        "product_id": "1005007250240074",
        "sku": "AE-1005007250240074",
        "supplier_url": "https://www.aliexpress.com/item/1005007250240074.html",
        "title": "Wireless Bluetooth 5.3 Earbuds — TWS Noise Cancelling Headphones with Charging Case",
        "price": 12.49,
        "retail_price": 39.99,
        "profit_estimate": 27.50,
        "currency": "USD",
        "category": "Consumer Electronics > Audio > Earbuds & In-Ear",
        "tags": ["wireless", "bluetooth", "earbuds", "tws", "anc", "noise-cancelling"],
        "main_image": HEADPHONES_BLACK,
        "gallery_images": _gallery(HEADPHONES_BLACK, HEADPHONES_FLAT, ELECTRONICS),
        "description_images": [HEADPHONES_FLAT, HEADPHONES_BLACK],
        "description": (
            "True Wireless Stereo earbuds powered by Bluetooth 5.3 with active noise "
            "cancellation. ENC microphones, touch controls, IPX5 sweat resistance, and "
            "a compact USB-C charging case delivering up to 32 hours of playtime."
        ),
        "specifications": [
            {"name": "Bluetooth", "value": "5.3"},
            {"name": "Battery (buds)", "value": "40 mAh"},
            {"name": "Battery (case)", "value": "400 mAh"},
            {"name": "Charging Port", "value": "USB-C"},
            {"name": "Water Resistance", "value": "IPX5"},
            {"name": "Driver", "value": "13 mm dynamic"},
            {"name": "Codec", "value": "SBC, AAC"},
            {"name": "Weight", "value": "4.2 g per bud"},
        ],
        "attributes": [
            {"name": "Color", "values": ["Midnight Black", "Pearl White", "Sage Green"]},
            {"name": "Bundle", "values": ["Standard", "With silicone case"]},
        ],
        "shipping": {
            "has_shipping": True,
            "price": 0.00,
            "from_country": "CN",
            "to_country": "US",
            "estimated_delivery": "12-20 days",
            "method": "AliExpress Standard Shipping",
        },
        "stock": 5421,
        "supplier": {
            "name": "ShenZhen Audio Direct Store",
            "store_url": "https://aliexpress.com/store/910223",
            "rating": 4.7,
            "feedback_count": 18421,
            "country": "CN",
        },
        "variants": [
            {
                "variant_id": "v_black_std",
                "sku": "AE-1005007250240074-BK-STD",
                "title": "Midnight Black / Standard",
                "image": HEADPHONES_BLACK,
                "price": 12.49,
                "retail_price": 39.99,
                "attributes": {"Color": "Midnight Black", "Bundle": "Standard"},
                "stock": 2000,
            },
            {
                "variant_id": "v_white_std",
                "sku": "AE-1005007250240074-WH-STD",
                "title": "Pearl White / Standard",
                "image": HEADPHONES_FLAT,
                "price": 12.49,
                "retail_price": 39.99,
                "attributes": {"Color": "Pearl White", "Bundle": "Standard"},
                "stock": 1800,
            },
            {
                "variant_id": "v_green_case",
                "sku": "AE-1005007250240074-GR-CASE",
                "title": "Sage Green / With silicone case",
                "image": ELECTRONICS,
                "price": 14.99,
                "retail_price": 44.99,
                "attributes": {"Color": "Sage Green", "Bundle": "With silicone case"},
                "stock": 1621,
            },
        ],
    },
    {
        "product_id": "1005009912345001",
        "sku": "AE-1005009912345001",
        "supplier_url": "https://www.aliexpress.com/item/1005009912345001.html",
        "title": "Smart Fitness Watch — 1.9\" AMOLED Heart Rate & SpO2 Tracker",
        "price": 18.90,
        "retail_price": 59.00,
        "profit_estimate": 40.10,
        "currency": "USD",
        "category": "Consumer Electronics > Wearables > Smartwatches",
        "tags": ["smartwatch", "fitness", "heart-rate", "spo2", "amoled"],
        "main_image": SMARTWATCH_WHITE,
        "gallery_images": _gallery(SMARTWATCH_WHITE, SMARTWATCH_BLACK, ELECTRONICS),
        "description_images": [SMARTWATCH_BLACK],
        "description": (
            "Premium smartwatch with a 1.9-inch AMOLED display, 100+ workout modes, "
            "24/7 heart rate, blood oxygen and sleep tracking, IP68 water resistance "
            "and 14-day battery life. Compatible with Android and iOS."
        ),
        "specifications": [
            {"name": "Display", "value": "1.9\" AMOLED 390x450"},
            {"name": "Battery", "value": "300 mAh"},
            {"name": "Battery Life", "value": "Up to 14 days"},
            {"name": "Water Resistance", "value": "IP68"},
            {"name": "Sensors", "value": "HR, SpO2, accelerometer"},
            {"name": "Compatibility", "value": "Android 6.0+, iOS 11+"},
        ],
        "attributes": [
            {"name": "Case Color", "values": ["Silver", "Space Black", "Rose Gold"]},
            {"name": "Strap", "values": ["Silicone", "Milanese Loop", "Leather"]},
        ],
        "shipping": {
            "has_shipping": True,
            "price": 2.99,
            "from_country": "CN",
            "to_country": "US",
            "estimated_delivery": "10-18 days",
            "method": "AliExpress Standard Shipping",
        },
        "stock": 1240,
        "supplier": {
            "name": "Global Wearables Outlet",
            "store_url": "https://aliexpress.com/store/710998",
            "rating": 4.6,
            "feedback_count": 9821,
            "country": "CN",
        },
        "variants": [
            {
                "variant_id": "sw_silver_silicone",
                "sku": "AE-1005009912345001-SV-SIL",
                "title": "Silver / Silicone",
                "image": SMARTWATCH_WHITE,
                "price": 18.90,
                "retail_price": 59.00,
                "attributes": {"Case Color": "Silver", "Strap": "Silicone"},
                "stock": 500,
            },
            {
                "variant_id": "sw_black_milanese",
                "sku": "AE-1005009912345001-BK-MIL",
                "title": "Space Black / Milanese Loop",
                "image": SMARTWATCH_BLACK,
                "price": 21.50,
                "retail_price": 64.00,
                "attributes": {"Case Color": "Space Black", "Strap": "Milanese Loop"},
                "stock": 420,
            },
            {
                "variant_id": "sw_rose_leather",
                "sku": "AE-1005009912345001-RG-LEA",
                "title": "Rose Gold / Leather",
                "image": SMARTWATCH_BLACK,
                "price": 22.40,
                "retail_price": 65.99,
                "attributes": {"Case Color": "Rose Gold", "Strap": "Leather"},
                "stock": 320,
            },
        ],
    },
    {
        "product_id": "1005008811223344",
        "sku": "AE-1005008811223344",
        "supplier_url": "https://www.aliexpress.com/item/1005008811223344.html",
        "title": "Portable USB-C Hub 7-in-1 — 4K HDMI, SD/TF, USB 3.0, 100W PD",
        "price": 9.75,
        "retail_price": 32.00,
        "profit_estimate": 22.25,
        "currency": "USD",
        "category": "Computer & Office > Adapters & Hubs",
        "tags": ["usb-c", "hub", "hdmi", "macbook", "dock"],
        "main_image": ELECTRONICS,
        "gallery_images": _gallery(ELECTRONICS, HEADPHONES_FLAT),
        "description_images": [ELECTRONICS],
        "description": (
            "Compact aluminum 7-in-1 USB-C hub: 4K HDMI, 100W Power Delivery, USB-A 3.0 x2, "
            "SD/MicroSD card readers and 3.5mm audio. Plug-and-play with MacBook, iPad Pro, "
            "Surface and any USB-C laptop."
        ),
        "specifications": [
            {"name": "Ports", "value": "7 (HDMI, PD, USB-A x2, SD, TF, Audio)"},
            {"name": "HDMI Output", "value": "4K @ 30Hz"},
            {"name": "Power Delivery", "value": "100W"},
            {"name": "Material", "value": "Aluminum alloy"},
            {"name": "Cable Length", "value": "15 cm"},
        ],
        "attributes": [
            {"name": "Color", "values": ["Space Grey", "Silver"]},
        ],
        "shipping": {
            "has_shipping": True,
            "price": 1.49,
            "from_country": "CN",
            "to_country": "US",
            "estimated_delivery": "9-15 days",
            "method": "AliExpress Saver",
        },
        "stock": 3340,
        "supplier": {
            "name": "TechHub Direct",
            "store_url": "https://aliexpress.com/store/881022",
            "rating": 4.8,
            "feedback_count": 22034,
            "country": "CN",
        },
        "variants": [
            {
                "variant_id": "hub_grey",
                "sku": "AE-1005008811223344-GR",
                "title": "Space Grey",
                "image": ELECTRONICS,
                "price": 9.75,
                "retail_price": 32.00,
                "attributes": {"Color": "Space Grey"},
                "stock": 1700,
            },
            {
                "variant_id": "hub_silver",
                "sku": "AE-1005008811223344-SV",
                "title": "Silver",
                "image": HEADPHONES_FLAT,
                "price": 9.75,
                "retail_price": 32.00,
                "attributes": {"Color": "Silver"},
                "stock": 1640,
            },
        ],
    },
    {
        "product_id": "1005007777999111",
        "sku": "AE-1005007777999111",
        "supplier_url": "https://www.aliexpress.com/item/1005007777999111.html",
        "title": "Over-Ear Wireless Headphones — Hi-Res, 50h Battery, ANC",
        "price": 28.50,
        "retail_price": 89.00,
        "profit_estimate": 60.50,
        "currency": "USD",
        "category": "Consumer Electronics > Audio > Headphones",
        "tags": ["headphones", "wireless", "anc", "hi-res", "bluetooth"],
        "main_image": HEADPHONES_FLAT,
        "gallery_images": _gallery(HEADPHONES_FLAT, HEADPHONES_BLACK),
        "description_images": [HEADPHONES_BLACK],
        "description": (
            "Studio-grade over-ear wireless headphones featuring hybrid active noise "
            "cancellation, Bluetooth 5.3, 50-hour battery life, Hi-Res Audio certification "
            "and memory-foam ear cushions for all-day comfort."
        ),
        "specifications": [
            {"name": "Bluetooth", "value": "5.3"},
            {"name": "Driver", "value": "40 mm Hi-Res"},
            {"name": "Battery Life", "value": "50 hours"},
            {"name": "ANC", "value": "Hybrid -38 dB"},
            {"name": "Weight", "value": "245 g"},
        ],
        "attributes": [
            {"name": "Color", "values": ["Black", "Beige", "Navy"]},
        ],
        "shipping": {
            "has_shipping": True,
            "price": 3.50,
            "from_country": "CN",
            "to_country": "US",
            "estimated_delivery": "11-19 days",
            "method": "AliExpress Standard Shipping",
        },
        "stock": 940,
        "supplier": {
            "name": "Pro Audio Factory",
            "store_url": "https://aliexpress.com/store/302211",
            "rating": 4.5,
            "feedback_count": 5821,
            "country": "CN",
        },
        "variants": [
            {
                "variant_id": "hp_black",
                "sku": "AE-1005007777999111-BK",
                "title": "Black",
                "image": HEADPHONES_BLACK,
                "price": 28.50,
                "retail_price": 89.00,
                "attributes": {"Color": "Black"},
                "stock": 410,
            },
            {
                "variant_id": "hp_beige",
                "sku": "AE-1005007777999111-BG",
                "title": "Beige",
                "image": HEADPHONES_FLAT,
                "price": 28.50,
                "retail_price": 89.00,
                "attributes": {"Color": "Beige"},
                "stock": 320,
            },
        ],
    },
    {
        "product_id": "1005006543210987",
        "sku": "AE-1005006543210987",
        "supplier_url": "https://www.aliexpress.com/item/1005006543210987.html",
        "title": "Apple Watch Sport Loop Compatible Strap — Breathable Nylon, 38/40/41mm",
        "price": 3.20,
        "retail_price": 14.99,
        "profit_estimate": 11.79,
        "currency": "USD",
        "category": "Watches > Accessories > Bands",
        "tags": ["apple-watch", "strap", "nylon", "band"],
        "main_image": SMARTWATCH_BLACK,
        "gallery_images": _gallery(SMARTWATCH_BLACK, SMARTWATCH_WHITE),
        "description_images": [SMARTWATCH_BLACK],
        "description": (
            "Soft, breathable nylon sport-loop strap compatible with Apple Watch sizes "
            "38/40/41 mm. Hook-and-loop closure with reinforced edge stitching."
        ),
        "specifications": [
            {"name": "Material", "value": "Reinforced nylon weave"},
            {"name": "Closure", "value": "Hook-and-loop"},
            {"name": "Compatibility", "value": "38/40/41 mm"},
        ],
        "attributes": [
            {"name": "Color", "values": ["Charcoal", "Pine Green", "Coral", "Cobalt"]},
        ],
        "shipping": {
            "has_shipping": True,
            "price": 0.99,
            "from_country": "CN",
            "to_country": "US",
            "estimated_delivery": "8-14 days",
            "method": "AliExpress Saver",
        },
        "stock": 9921,
        "supplier": {
            "name": "Band Lab Accessories",
            "store_url": "https://aliexpress.com/store/661001",
            "rating": 4.9,
            "feedback_count": 41098,
            "country": "CN",
        },
        "variants": [
            {
                "variant_id": "band_char",
                "sku": "AE-1005006543210987-CH",
                "title": "Charcoal",
                "image": SMARTWATCH_BLACK,
                "price": 3.20,
                "retail_price": 14.99,
                "attributes": {"Color": "Charcoal"},
                "stock": 3000,
            },
            {
                "variant_id": "band_pine",
                "sku": "AE-1005006543210987-PG",
                "title": "Pine Green",
                "image": SMARTWATCH_WHITE,
                "price": 3.20,
                "retail_price": 14.99,
                "attributes": {"Color": "Pine Green"},
                "stock": 2500,
            },
        ],
    },
    {
        "product_id": "1005005432109876",
        "sku": "AE-1005005432109876",
        "supplier_url": "https://www.aliexpress.com/item/1005005432109876.html",
        "title": "20000mAh Power Bank — PD 22.5W Fast Charge, Triple Output",
        "price": 14.99,
        "retail_price": 44.99,
        "profit_estimate": 30.00,
        "currency": "USD",
        "category": "Consumer Electronics > Power > Power Banks",
        "tags": ["power-bank", "pd", "fast-charge", "20000mah"],
        "main_image": ELECTRONICS,
        "gallery_images": _gallery(ELECTRONICS, HEADPHONES_FLAT, HEADPHONES_BLACK),
        "description_images": [ELECTRONICS],
        "description": (
            "High-capacity 20,000 mAh power bank with PD 22.5W fast charge, dual USB-A + USB-C, "
            "LED capacity indicator and pass-through charging. Charge a smartphone up to 5 times."
        ),
        "specifications": [
            {"name": "Capacity", "value": "20,000 mAh"},
            {"name": "Output", "value": "USB-C PD 22.5W, USB-A QC 18W"},
            {"name": "Input", "value": "USB-C PD 20W"},
            {"name": "Weight", "value": "385 g"},
        ],
        "attributes": [
            {"name": "Color", "values": ["Black", "White"]},
        ],
        "shipping": {
            "has_shipping": True,
            "price": 0.00,
            "from_country": "CN",
            "to_country": "US",
            "estimated_delivery": "10-17 days",
            "method": "AliExpress Standard Shipping",
        },
        "stock": 2100,
        "supplier": {
            "name": "Charge Master Store",
            "store_url": "https://aliexpress.com/store/430022",
            "rating": 4.7,
            "feedback_count": 14021,
            "country": "CN",
        },
        "variants": [
            {
                "variant_id": "pb_black",
                "sku": "AE-1005005432109876-BK",
                "title": "Black",
                "image": ELECTRONICS,
                "price": 14.99,
                "retail_price": 44.99,
                "attributes": {"Color": "Black"},
                "stock": 1200,
            },
            {
                "variant_id": "pb_white",
                "sku": "AE-1005005432109876-WH",
                "title": "White",
                "image": HEADPHONES_FLAT,
                "price": 14.99,
                "retail_price": 44.99,
                "attributes": {"Color": "White"},
                "stock": 900,
            },
        ],
    },
]


def find_by_id(product_id: str):
    """Lookup a mock product by its supplier product ID."""
    for p in MOCK_PRODUCTS:
        if p["product_id"] == product_id or p["sku"].endswith(product_id):
            return p
    return None


def find_by_url(url: str):
    """Lookup a mock product by AliExpress URL.

    The product ID is the digit-run before .html. If no exact match exists in
    the mock catalog we still return the canonical primary product to simulate
    real exact-URL capture for the demo, but we replace its product_id/URL so
    the response reflects what was actually requested.
    """
    import re
    m = re.search(r"/item/(\d+)", url) or re.search(r"(\d{10,})", url)
    if not m:
        return None
    pid = m.group(1)
    direct = find_by_id(pid)
    if direct:
        return direct
    # Synthesize an exact-URL capture from the primary template product.
    base = dict(MOCK_PRODUCTS[0])
    base["product_id"] = pid
    base["sku"] = f"AE-{pid}"
    base["supplier_url"] = url
    return base


def search_keyword(query: str, limit: int = 12):
    """Simulate keyword search across the mock catalog."""
    q = (query or "").strip().lower()
    if not q:
        return MOCK_PRODUCTS[:limit]
    hits = []
    for p in MOCK_PRODUCTS:
        haystack = " ".join([
            p["title"], p["category"], " ".join(p["tags"]),
            p["description"],
        ]).lower()
        if q in haystack:
            hits.append(p)
    return hits[:limit] if hits else MOCK_PRODUCTS[:limit]


def search_category(category: str, limit: int = 12):
    q = (category or "").strip().lower()
    if not q:
        return MOCK_PRODUCTS[:limit]
    return [p for p in MOCK_PRODUCTS if q in p["category"].lower()][:limit]


def search_supplier(store_url: str, limit: int = 12):
    q = (store_url or "").strip().lower()
    if not q:
        return []
    return [p for p in MOCK_PRODUCTS if q in p["supplier"]["store_url"].lower()][:limit]
