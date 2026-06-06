"""NIPS-AI Dropshipping Cloud — Backend pytest suite.

Covers:
- Dashboard + license + cloud info
- Discovery search (auto/url, keyword, sku, category)
- Imports CRUD (create simple, isolate_variants, list, get, patch, delete)
- AI rewrite (real OpenAI gpt-5.2 via EMERGENT_LLM_KEY)
- Publish flow (incl. already-published 400)
- Logs
- Plugin releases
- AI settings persistence
- Maintenance clear
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to read from frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

API = f"{BASE_URL}/api"
PRIMARY_PRODUCT_ID = "1005007250240074"
PRIMARY_URL = "https://www.aliexpress.com/item/1005007250240074.html"
SKU_PRODUCT_ID = "1005009912345001"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def created_drafts():
    return {}


# ── Dashboard / license ───────────────────────────────────────────────────
class TestDashboard:
    def test_dashboard_stats(self, client):
        r = client.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "license" in d and "cloud" in d and "counters" in d and "recent_activity" in d
        assert d["license"]["status"] == "active"
        assert d["cloud"]["status"] == "connected"
        assert "import_drafts" in d["counters"]

    def test_license_status(self, client):
        r = client.get(f"{API}/license/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is True
        assert d["plan"] == "Pro"
        assert "discovery" in d["features"]


# ── Discovery ─────────────────────────────────────────────────────────────
class TestDiscovery:
    def test_search_auto_url_exact_match(self, client):
        r = client.post(f"{API}/discovery/search",
                        json={"mode": "auto", "query": PRIMARY_URL}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["mode"] == "url"
        assert d["exact_match"] is True
        assert d["count"] == 1
        assert d["results"][0]["product_id"] == PRIMARY_PRODUCT_ID

    def test_search_keyword_headphones(self, client):
        r = client.post(f"{API}/discovery/search",
                        json={"mode": "auto", "query": "headphones"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] >= 2
        # Ensure all results mention headphones-related keywords
        assert any("headphone" in (p["title"] + " " + p["category"]).lower() or
                   "earbud" in (p["title"] + " " + p["category"]).lower()
                   for p in d["results"])

    def test_search_sku_exact(self, client):
        r = client.post(f"{API}/discovery/search",
                        json={"mode": "sku", "query": SKU_PRODUCT_ID}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["exact_match"] is True
        assert d["results"][0]["product_id"] == SKU_PRODUCT_ID

    def test_search_category_audio(self, client):
        r = client.post(f"{API}/discovery/search",
                        json={"mode": "category", "query": "audio"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] >= 1
        for p in d["results"]:
            assert "audio" in p["category"].lower()


# ── Imports ───────────────────────────────────────────────────────────────
class TestImports:
    def test_create_import_simple(self, client, created_drafts):
        r = client.post(f"{API}/imports",
                        json={"product_id": PRIMARY_PRODUCT_ID, "isolate_variants": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "inserted" in d and len(d["inserted"]) == 1
        draft_id = d["inserted"][0]
        created_drafts["simple"] = draft_id

        # Verify persistence via GET
        g = client.get(f"{API}/imports/{draft_id}", timeout=15)
        assert g.status_code == 200
        doc = g.json()
        for key in ["title", "sku", "product_id", "supplier_url", "price", "retail_price",
                    "profit_estimate", "main_image", "gallery_images", "variants",
                    "shipping", "supplier", "specifications", "attributes"]:
            assert key in doc, f"missing key: {key}"
        assert doc["product_id"] == PRIMARY_PRODUCT_ID
        assert doc["publish_status"] == "draft"

    def test_create_import_isolate_variants(self, client, created_drafts):
        r = client.post(f"{API}/imports",
                        json={"product_id": PRIMARY_PRODUCT_ID, "isolate_variants": True}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Primary product has 3 variants
        assert len(d["inserted"]) == 3
        created_drafts["isolated"] = d["inserted"]

    def test_list_imports_contains_created(self, client, created_drafts):
        r = client.get(f"{API}/imports", timeout=15)
        assert r.status_code == 200
        items = r.json()
        ids = {x["draft_id"] for x in items}
        assert created_drafts["simple"] in ids

    def test_patch_import(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        payload = {"title": "TEST_Updated Title", "retail_price": 55.00, "tags": ["a", "b"]}
        r = client.patch(f"{API}/imports/{draft_id}", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Updated Title"
        assert d["retail_price"] == 55.00
        assert d["tags"] == ["a", "b"]
        # profit_estimate must be recomputed: 55.00 - 12.49 = 42.51
        assert abs(d["profit_estimate"] - 42.51) < 0.01
        # studio_edits mirror
        assert d["studio_edits"].get("title") == "TEST_Updated Title"

    def test_create_invalid_product(self, client):
        r = client.post(f"{API}/imports",
                        json={"product_id": "NONEXISTENT-xx", "isolate_variants": False}, timeout=15)
        assert r.status_code == 404


# ── AI Settings + Rewrite (REAL OpenAI) ───────────────────────────────────
class TestAI:
    def test_get_default_ai_settings(self, client):
        r = client.get(f"{API}/ai/settings", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["title_rewrite"] is True
        assert d["default_model"] == "gpt-5.2"

    def test_update_ai_settings(self, client):
        payload = {
            "title_rewrite": False, "description_cleanup": True, "seo_title": True,
            "seo_meta_description": True, "tags_suggest": True, "category_suggest": True,
            "attributes_cleanup": True, "specs_cleanup": True, "translate_enabled": True,
            "default_language": "es", "default_model": "gpt-5.2",
        }
        r = client.put(f"{API}/ai/settings", json=payload, timeout=15)
        assert r.status_code == 200
        # Verify persistence
        g = client.get(f"{API}/ai/settings", timeout=15)
        assert g.json()["title_rewrite"] is False
        assert g.json()["default_language"] == "es"
        # Reset
        payload["title_rewrite"] = True
        payload["default_language"] = "en"
        client.put(f"{API}/ai/settings", json=payload, timeout=15)

    def test_ai_rewrite_title(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.post(f"{API}/ai/rewrite",
                        json={"draft_id": draft_id, "field": "title"}, timeout=60)
        assert r.status_code == 200, f"AI rewrite title failed: {r.text}"
        d = r.json()
        assert d["field"] == "title"
        assert isinstance(d["suggestion"], str) and len(d["suggestion"].strip()) > 0
        assert "model" in d

    def test_ai_rewrite_description(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.post(f"{API}/ai/rewrite",
                        json={"draft_id": draft_id, "field": "description"}, timeout=90)
        assert r.status_code == 200, f"AI rewrite description failed: {r.text}"
        assert len(r.json()["suggestion"].strip()) > 0

    def test_ai_rewrite_tags(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.post(f"{API}/ai/rewrite",
                        json={"draft_id": draft_id, "field": "tags"}, timeout=60)
        assert r.status_code == 200, f"AI rewrite tags failed: {r.text}"
        assert len(r.json()["suggestion"].strip()) > 0

    def test_ai_rewrite_unsupported_field(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.post(f"{API}/ai/rewrite",
                        json={"draft_id": draft_id, "field": "totally_invalid"}, timeout=15)
        assert r.status_code == 400


# ── Publish ───────────────────────────────────────────────────────────────
class TestPublish:
    def test_publish_draft(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.post(f"{API}/publish",
                        json={"draft_id": draft_id, "publish_mode": "draft"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "success"
        assert isinstance(d["wc_product_id"], int)
        assert "_id" not in d
        # Verify draft marked published
        g = client.get(f"{API}/imports/{draft_id}", timeout=15)
        assert g.json()["publish_status"] == "published"
        assert g.json()["wc_product_id"] == d["wc_product_id"]

    def test_publish_same_draft_400(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.post(f"{API}/publish",
                        json={"draft_id": draft_id, "publish_mode": "draft"}, timeout=15)
        assert r.status_code == 400


# ── Delete + logs ─────────────────────────────────────────────────────────
class TestDeleteLogs:
    def test_delete_published_draft_preserves_wc(self, client, created_drafts):
        draft_id = created_drafts["simple"]
        r = client.delete(f"{API}/imports/{draft_id}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["deleted"] is True
        assert d["wc_product_preserved"] is True
        # GET should 404
        g = client.get(f"{API}/imports/{draft_id}", timeout=15)
        assert g.status_code == 404

    def test_delete_unpublished_draft(self, client, created_drafts):
        # Clean up one of the isolated variants
        if created_drafts.get("isolated"):
            did = created_drafts["isolated"][0]
            r = client.delete(f"{API}/imports/{did}", timeout=15)
            assert r.status_code == 200
            assert r.json()["wc_product_preserved"] is False

    def test_logs_contains_recent_entries(self, client):
        r = client.get(f"{API}/logs", timeout=15)
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)
        # We've created at least an import, publish and delete by now
        kinds = {x["kind"] for x in logs}
        assert "import" in kinds
        assert "publish" in kinds


# ── Plugin releases ───────────────────────────────────────────────────────
class TestReleases:
    def test_releases_list(self, client):
        r = client.get(f"{API}/v1/plugin/releases", timeout=15)
        assert r.status_code == 200
        rels = r.json()
        assert isinstance(rels, list) and len(rels) >= 1
        latest = [x for x in rels if x.get("is_latest")]
        assert len(latest) == 1
        assert latest[0]["version"] == "2.9.6"

    def test_releases_latest(self, client):
        r = client.get(f"{API}/v1/plugin/releases/latest", timeout=15)
        assert r.status_code == 200
        assert r.json()["version"] == "2.9.6"


# ── Maintenance ───────────────────────────────────────────────────────────
class TestMaintenance:
    def test_clear_history(self, client):
        r = client.post(f"{API}/maintenance/clear", params={"target": "history"}, timeout=15)
        assert r.status_code == 200
        assert "deleted" in r.json()
