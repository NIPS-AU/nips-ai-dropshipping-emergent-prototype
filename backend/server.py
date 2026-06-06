"""NIPS-AI Dropshipping Cloud — FastAPI prototype.

This service simulates the NIPS-AI Cloud API that the production WordPress plugin
will connect to. In production the Node/Express + PostgreSQL deployment on the
customer's VPS will own the supplier API credentials, license records, plugin
releases and AI rewrite endpoints. Here we mirror those routes for the
prototype dashboard.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
from pathlib import Path
from typing import Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict

from mock_data import (
    MOCK_PRODUCTS,
    find_by_id,
    find_by_url,
    search_keyword,
    search_category,
    search_supplier,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="NIPS-AI Dropshipping Cloud (Prototype)")
api = APIRouter(prefix="/api")

logger = logging.getLogger("nips")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")


# ──────────────────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────────────────
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


async def write_log(kind: str, message: str, meta: Optional[dict] = None) -> None:
    await db.activity_logs.insert_one({
        "id": new_id(),
        "kind": kind,
        "message": message,
        "meta": meta or {},
        "created_at": now_iso(),
    })


def strip_mongo(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ──────────────────────────────────────────────────────────────────────────────
#  Models
# ──────────────────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    mode: str = Field(default="auto")  # auto | name | url | sku | category | supplier
    query: str = ""


class ImportRequest(BaseModel):
    product_id: str
    isolate_variants: bool = False


class StudioEdit(BaseModel):
    model_config = ConfigDict(extra="allow")
    title: Optional[str] = None
    description: Optional[str] = None
    retail_price: Optional[float] = None
    category: Optional[str] = None
    tags: Optional[list] = None
    seo_title: Optional[str] = None
    seo_meta_description: Optional[str] = None
    notes: Optional[str] = None


class AIRewriteRequest(BaseModel):
    draft_id: str
    field: str  # title | description | seo_title | seo_meta_description | tags | category | attributes | specs | translate
    target_language: Optional[str] = None  # only for translate
    instructions: Optional[str] = None


class AISettings(BaseModel):
    title_rewrite: bool = True
    description_cleanup: bool = True
    seo_title: bool = True
    seo_meta_description: bool = True
    tags_suggest: bool = True
    category_suggest: bool = True
    attributes_cleanup: bool = True
    specs_cleanup: bool = True
    translate_enabled: bool = False
    default_language: str = "en"
    default_model: str = "gpt-5.2"


class PublishRequest(BaseModel):
    draft_id: str
    publish_mode: str = "draft"  # draft | simple | variable | isolated_variants


# ──────────────────────────────────────────────────────────────────────────────
#  AliExpress URL detection
# ──────────────────────────────────────────────────────────────────────────────
URL_RE = re.compile(r"^https?://", re.IGNORECASE)
SKU_RE = re.compile(r"^[A-Z0-9_\-]{6,}$", re.IGNORECASE)
PURE_DIGITS = re.compile(r"^\d{8,}$")


def detect_mode(query: str) -> str:
    q = (query or "").strip()
    if URL_RE.match(q):
        if "aliexpress.com" in q.lower() or "/item/" in q.lower():
            return "url"
        return "supplier"
    if PURE_DIGITS.match(q):
        return "sku"
    if SKU_RE.match(q) and "-" in q:
        return "sku"
    return "name"


# ──────────────────────────────────────────────────────────────────────────────
#  Health / dashboard
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/")
async def root():
    return {"service": "nips-ai-dropshipping-cloud", "status": "ok", "version": "2.9.6-prototype"}


@api.get("/dashboard/stats")
async def dashboard_stats():
    drafts = await db.import_drafts.count_documents({})
    published = await db.publish_logs.count_documents({"status": "success"})
    recent_logs_cursor = db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(8)
    recent_logs = await recent_logs_cursor.to_list(8)
    return {
        "license": {
            "status": "active",
            "plan": "Pro",
            "key": "NIPS-ADMIN-LICENSE-0001",
            "expires_at": "2099-12-31",
        },
        "cloud": {
            "status": "connected",
            "endpoint": "api.nipsau.com",
            "latency_ms": 87,
            "version": "2.9.6-prototype",
        },
        "counters": {
            "import_drafts": drafts,
            "published_mock": published,
            "supplier_catalog": len(MOCK_PRODUCTS),
        },
        "recent_activity": recent_logs,
    }


@api.get("/license/status")
async def license_status():
    return {
        "key": "NIPS-ADMIN-LICENSE-0001",
        "valid": True,
        "plan": "Pro",
        "domain": "demo-store.nipsau.com",
        "issued_at": "2026-01-12",
        "expires_at": "2099-12-31",
        "features": ["discovery", "import_list", "product_studio", "ai_rewrite", "updates"],
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Discovery
# ──────────────────────────────────────────────────────────────────────────────
@api.post("/discovery/search")
async def discovery_search(req: SearchRequest):
    mode = req.mode if req.mode and req.mode != "auto" else detect_mode(req.query)

    results: list[dict] = []
    exact = None

    if mode == "url":
        product = find_by_url(req.query)
        if product:
            exact = product
            results = [product]
    elif mode == "sku":
        product = find_by_id(req.query.strip())
        if product:
            exact = product
            results = [product]
        else:
            results = search_keyword(req.query)
    elif mode == "category":
        results = search_category(req.query)
    elif mode == "supplier":
        results = search_supplier(req.query)
    else:
        results = search_keyword(req.query)

    # Persist search history
    await db.search_history.insert_one({
        "id": new_id(),
        "mode": mode,
        "query": req.query,
        "result_count": len(results),
        "created_at": now_iso(),
    })
    await write_log("search", f"{mode.upper()} search '{req.query}' → {len(results)} result(s)")

    return {
        "mode": mode,
        "query": req.query,
        "exact_match": exact is not None,
        "count": len(results),
        "results": results,
    }


@api.get("/discovery/history")
async def discovery_history(limit: int = 25):
    cur = db.search_history.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cur.to_list(limit)


@api.delete("/discovery/history")
async def clear_discovery_history():
    res = await db.search_history.delete_many({})
    await write_log("maintenance", f"Cleared search history ({res.deleted_count} entries)")
    return {"deleted": res.deleted_count}


# ──────────────────────────────────────────────────────────────────────────────
#  Import List drafts
# ──────────────────────────────────────────────────────────────────────────────
def build_draft_from_product(product: dict, isolated_variant: Optional[dict] = None) -> dict:
    """Materialize a supplier product as an Import List draft."""
    draft_id = new_id()
    if isolated_variant:
        title = f"{product['title']} — {isolated_variant['title']}"
        price = isolated_variant["price"]
        retail = isolated_variant.get("retail_price", product["retail_price"])
        sku = isolated_variant["sku"]
        main_image = isolated_variant.get("image") or product["main_image"]
        variants_for_draft = []
        parent_link = product["product_id"]
        is_variant_draft = True
        variant_id = isolated_variant["variant_id"]
    else:
        title = product["title"]
        price = product["price"]
        retail = product["retail_price"]
        sku = product["sku"]
        main_image = product["main_image"]
        variants_for_draft = product.get("variants", [])
        parent_link = None
        is_variant_draft = False
        variant_id = None

    return {
        "id": draft_id,
        "draft_id": draft_id,
        "is_variant_draft": is_variant_draft,
        "parent_product_id": parent_link,
        "variant_id": variant_id,
        "product_id": product["product_id"],
        "sku": sku,
        "supplier_url": product["supplier_url"],
        "title": title,
        "price": price,
        "retail_price": retail,
        "profit_estimate": round(retail - price, 2),
        "currency": product["currency"],
        "category": product["category"],
        "tags": list(product.get("tags", [])),
        "main_image": main_image,
        "gallery_images": list(product.get("gallery_images", [])),
        "description_images": list(product.get("description_images", [])),
        "description": product["description"],
        "specifications": list(product.get("specifications", [])),
        "attributes": list(product.get("attributes", [])),
        "variants": list(variants_for_draft),
        "shipping": dict(product.get("shipping", {})),
        "stock": product.get("stock", 0),
        "supplier": dict(product.get("supplier", {})),
        "studio_edits": {},
        "ai_history": [],
        "publish_status": "draft",
        "wc_product_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


@api.post("/imports")
async def create_import(req: ImportRequest):
    product = find_by_id(req.product_id)
    if not product:
        raise HTTPException(404, "Supplier product not found")

    inserted_ids = []
    if req.isolate_variants and product.get("variants"):
        for v in product["variants"]:
            draft = build_draft_from_product(product, isolated_variant=v)
            await db.import_drafts.insert_one(draft)
            inserted_ids.append(draft["draft_id"])
        await write_log(
            "import",
            f"Imported '{product['title']}' as {len(inserted_ids)} isolated variant drafts",
        )
    else:
        draft = build_draft_from_product(product)
        await db.import_drafts.insert_one(draft)
        inserted_ids.append(draft["draft_id"])
        await write_log("import", f"Imported '{product['title']}' to Import List")

    return {"inserted": inserted_ids}


@api.get("/imports")
async def list_imports():
    cur = db.import_drafts.find({}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(500)


@api.get("/imports/{draft_id}")
async def get_import(draft_id: str):
    doc = await db.import_drafts.find_one({"draft_id": draft_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Draft not found")
    return doc


@api.patch("/imports/{draft_id}")
async def patch_import(draft_id: str, edits: StudioEdit):
    doc = await db.import_drafts.find_one({"draft_id": draft_id})
    if not doc:
        raise HTTPException(404, "Draft not found")

    payload = {k: v for k, v in edits.model_dump(exclude_unset=True).items() if v is not None}

    # Top-level mirrors so the UI sees changes immediately
    set_fields = {"updated_at": now_iso()}
    for k, v in payload.items():
        set_fields[k] = v
    # Track edits separately for audit
    studio_edits = dict(doc.get("studio_edits") or {})
    studio_edits.update(payload)
    set_fields["studio_edits"] = studio_edits

    if "retail_price" in payload:
        set_fields["profit_estimate"] = round(float(payload["retail_price"]) - float(doc["price"]), 2)

    await db.import_drafts.update_one({"draft_id": draft_id}, {"$set": set_fields})
    await write_log("studio_edit", f"Updated draft {draft_id[:8]}: {', '.join(payload.keys())}")
    updated = await db.import_drafts.find_one({"draft_id": draft_id}, {"_id": 0})
    return updated


@api.delete("/imports/{draft_id}")
async def delete_import(draft_id: str):
    doc = await db.import_drafts.find_one({"draft_id": draft_id})
    if not doc:
        raise HTTPException(404, "Draft not found")
    await db.import_drafts.delete_one({"draft_id": draft_id})
    # Note: published WooCommerce products are intentionally NOT affected.
    await write_log("delete_draft", f"Deleted Import List draft '{doc.get('title','')}'")
    return {"deleted": True, "wc_product_preserved": doc.get("wc_product_id") is not None}


@api.delete("/imports")
async def clear_imports():
    res = await db.import_drafts.delete_many({"publish_status": {"$ne": "published"}})
    await write_log("maintenance", f"Cleared {res.deleted_count} Import List drafts (published preserved)")
    return {"deleted": res.deleted_count}


# ──────────────────────────────────────────────────────────────────────────────
#  AI Settings + Rewrite
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/ai/settings")
async def get_ai_settings():
    doc = await db.ai_settings.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        defaults = AISettings().model_dump()
        defaults["id"] = "default"
        await db.ai_settings.insert_one(dict(defaults))
        return defaults
    return doc


@api.put("/ai/settings")
async def update_ai_settings(settings: AISettings):
    payload = settings.model_dump()
    payload["id"] = "default"
    await db.ai_settings.update_one({"id": "default"}, {"$set": payload}, upsert=True)
    await write_log("ai_settings", "AI toggles updated")
    return payload


AI_PROMPTS = {
    "title": "Rewrite this dropshipping product title to be clean, benefit-led and SEO friendly. "
              "Keep under 75 characters. Do not add quotes. Output only the title.",
    "description": "Rewrite this product description for a Shopify/WooCommerce store. "
                    "Use short scannable paragraphs and a 4-6 bullet feature list. "
                    "Strip supplier slang and broken English. Output plain HTML "
                    "(use <p>, <ul>, <li>, <strong>). Do not include script/style tags.",
    "seo_title": "Write an SEO title (max 60 chars) for this product, no quotes, no emojis.",
    "seo_meta_description": "Write an SEO meta description (max 155 chars), single line, no quotes.",
    "tags": "Suggest 6-10 high-intent SEO tags for this product as a JSON array of strings only.",
    "category": "Suggest the single best WooCommerce category path (e.g. 'Electronics > Audio > Earbuds'). "
                 "Output only the category path.",
    "attributes": "Clean and normalise these product attributes. Output a JSON array of "
                   "{name, values: []} objects only.",
    "specs": "Clean and normalise these product specifications. Output a JSON array of "
              "{name, value} objects only.",
    "translate": "Translate this content into {language}. Preserve meaning, brand names "
                  "and units. Output only the translated text.",
}


async def run_llm(system_prompt: str, user_content: str, model: str = "gpt-5.2") -> str:
    """Run a single LLM completion using the Emergent Universal Key."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY missing on server")
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"nips-{uuid.uuid4().hex[:12]}",
        system_message=system_prompt,
    ).with_model("openai", model)
    response = await chat.send_message(UserMessage(text=user_content))
    return response if isinstance(response, str) else str(response)


@api.post("/ai/rewrite")
async def ai_rewrite(req: AIRewriteRequest):
    draft = await db.import_drafts.find_one({"draft_id": req.draft_id})
    if not draft:
        raise HTTPException(404, "Draft not found")
    settings = await get_ai_settings()
    model = settings.get("default_model") or "gpt-5.2"

    field = req.field
    if field == "translate":
        prompt = AI_PROMPTS["translate"].format(language=req.target_language or settings.get("default_language") or "en")
        user_content = draft.get("description", "")
    else:
        if field not in AI_PROMPTS:
            raise HTTPException(400, f"Unsupported field: {field}")
        prompt = AI_PROMPTS[field]
        if field == "title":
            user_content = draft.get("title", "")
        elif field == "description":
            user_content = draft.get("description", "")
        elif field in ("seo_title", "seo_meta_description"):
            user_content = f"{draft.get('title', '')}\n\n{draft.get('description', '')}"
        elif field == "tags":
            user_content = f"Title: {draft.get('title','')}\nCategory: {draft.get('category','')}\nDescription: {draft.get('description','')[:1200]}"
        elif field == "category":
            user_content = f"Title: {draft.get('title','')}\nDescription: {draft.get('description','')[:800]}"
        elif field == "attributes":
            user_content = str(draft.get("attributes", []))
        elif field == "specs":
            user_content = str(draft.get("specifications", []))
        else:
            user_content = draft.get(field, "")

    if req.instructions:
        prompt = f"{prompt}\n\nAdditional instructions: {req.instructions}"

    try:
        suggestion = await run_llm(prompt, user_content, model=model)
    except Exception as exc:  # surface clean errors to UI
        logger.exception("AI rewrite failed: %s", exc)
        raise HTTPException(502, f"AI provider error: {exc}")

    # Store history entry
    history_entry = {
        "field": field,
        "before": user_content[:4000],
        "after": suggestion,
        "applied": False,
        "created_at": now_iso(),
        "model": model,
    }
    await db.import_drafts.update_one(
        {"draft_id": req.draft_id},
        {"$push": {"ai_history": history_entry}, "$set": {"updated_at": now_iso()}},
    )
    await write_log("ai_rewrite", f"AI rewrite '{field}' on draft {req.draft_id[:8]}")
    return {"field": field, "model": model, "suggestion": suggestion}


# ──────────────────────────────────────────────────────────────────────────────
#  Publish (mock WooCommerce)
# ──────────────────────────────────────────────────────────────────────────────
@api.post("/publish")
async def publish_draft(req: PublishRequest):
    draft = await db.import_drafts.find_one({"draft_id": req.draft_id})
    if not draft:
        raise HTTPException(404, "Draft not found")
    if draft.get("publish_status") == "published":
        raise HTTPException(400, "Draft already published")

    wc_product_id = 1000 + int(datetime.now(timezone.utc).timestamp() % 90000)
    log_entry = {
        "id": new_id(),
        "draft_id": req.draft_id,
        "publish_mode": req.publish_mode,
        "wc_product_id": wc_product_id,
        "wc_status": "draft",
        "title": draft.get("title"),
        "status": "success",
        "created_at": now_iso(),
        "steps": [
            "Resolved draft from Import List",
            "Mapped title, SKU, price, category, tags",
            "Built WooCommerce product payload",
            f"Created WooCommerce product (mode={req.publish_mode}) → ID #{wc_product_id}",
            "Attached supplier metadata",
            "Saved NIPS import draft ID on product",
        ],
    }
    await db.publish_logs.insert_one(log_entry)
    await db.import_drafts.update_one(
        {"draft_id": req.draft_id},
        {"$set": {
            "publish_status": "published",
            "wc_product_id": wc_product_id,
            "wc_publish_mode": req.publish_mode,
            "updated_at": now_iso(),
        }},
    )
    await write_log(
        "publish",
        f"Published draft {req.draft_id[:8]} → WC product #{wc_product_id} ({req.publish_mode})",
    )
    return strip_mongo(log_entry)


@api.get("/publish/logs")
async def publish_logs(limit: int = 50):
    cur = db.publish_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cur.to_list(limit)


# ──────────────────────────────────────────────────────────────────────────────
#  Activity logs
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/logs")
async def get_logs(limit: int = 100):
    cur = db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cur.to_list(limit)


@api.delete("/logs")
async def clear_logs():
    res = await db.activity_logs.delete_many({})
    return {"deleted": res.deleted_count}


# ──────────────────────────────────────────────────────────────────────────────
#  Plugin releases (mock release server)
# ──────────────────────────────────────────────────────────────────────────────
PLUGIN_RELEASES = [
    {
        "version": "2.9.6",
        "channel": "stable",
        "released_at": "2026-02-12",
        "notes": "Product Studio draft loader repair. Clean separation between Import List and Studio.",
        "download_url": "https://updates.nipsau.com/v1/plugin/releases/download?version=2.9.6&license_key=NIPS-ADMIN-LICENSE-0001",
        "size_kb": 482,
        "is_latest": True,
    },
    {
        "version": "2.9.5",
        "channel": "stable",
        "released_at": "2026-02-05",
        "notes": "Discovery polish, exact URL capture stability.",
        "download_url": "https://updates.nipsau.com/v1/plugin/releases/download?version=2.9.5&license_key=NIPS-ADMIN-LICENSE-0001",
        "size_kb": 471,
        "is_latest": False,
    },
    {
        "version": "2.9.4",
        "channel": "stable",
        "released_at": "2026-01-28",
        "notes": "Release/update server hardening.",
        "download_url": "https://updates.nipsau.com/v1/plugin/releases/download?version=2.9.4&license_key=NIPS-ADMIN-LICENSE-0001",
        "size_kb": 463,
        "is_latest": False,
    },
]


@api.get("/v1/plugin/releases/latest")
async def releases_latest():
    return next(r for r in PLUGIN_RELEASES if r["is_latest"])


@api.get("/v1/plugin/releases")
async def releases_list():
    return PLUGIN_RELEASES


# ──────────────────────────────────────────────────────────────────────────────
#  Maintenance
# ──────────────────────────────────────────────────────────────────────────────
@api.post("/maintenance/clear")
async def maintenance_clear(target: str = Query(..., regex="^(history|saved|drafts|cache|logs|all)$")):
    deleted = {}
    if target in ("history", "all"):
        r = await db.search_history.delete_many({})
        deleted["search_history"] = r.deleted_count
    if target in ("drafts", "all"):
        r = await db.import_drafts.delete_many({"publish_status": {"$ne": "published"}})
        deleted["import_drafts"] = r.deleted_count
    if target in ("logs", "all"):
        r = await db.activity_logs.delete_many({})
        deleted["activity_logs"] = r.deleted_count
    await write_log("maintenance", f"Cleared {target}: {deleted}")
    return {"target": target, "deleted": deleted}


# ──────────────────────────────────────────────────────────────────────────────
#  Bootstrap
# ──────────────────────────────────────────────────────────────────────────────
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
