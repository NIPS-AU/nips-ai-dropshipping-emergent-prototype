"""Iteration 3 — Canonical supplier search contract + CORS + license/plan/cloud refresh.

Targets:
- POST /api/v1/suppliers/aliexpress/search (verbatim query, rich payload, exact_match, filters, platform whitelist, limit clamp)
- GET  /api/license/status (plan=Business, key NIPS-ADMIN-LICENSE-0001, domain alloutspares.com)
- GET  /api/dashboard/stats (license.plan=Business, cloud.endpoint=api.nipsdownloads.com, version=2.9.8-prototype)
- GET  /api/maintenance (6 targets)
- CORS preflight from production + Emergent preview origins
- GET  /api/v1/plugin/releases (v2.9.8 latest, updates.nipsdownloads.com download URL)
- Search history persists with endpoint=v1.suppliers.aliexpress.search
"""
import os
import pytest
import requests

# IMPORTANT: REACT_APP_BACKEND_URL is intentionally pointed at the user's PROD
# (api.nipsdownloads.com). For these contract tests we must hit the Emergent
# backend directly.
BASE_URL = os.environ.get(
    "EMERGENT_BACKEND_URL",
    "https://product-forge-61.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

VERBATIM_QUERY = "Makita Cordless Charger & Battery"
PRIMARY_URL = "https://www.aliexpress.com/item/1005007250240074.html"

PRODUCTION_ORIGINS = [
    "https://dropshipping.nips.live",
    "https://alloutspares.com",
    "https://product-forge-61.preview.emergentagent.com",  # regex match
]

REQUIRED_TOP_LEVEL = [
    "product_id", "sku", "title", "product_url", "supplier_url",
    "price", "retail_price", "profit_estimate", "profit_pct", "currency",
    "category", "tags",
    "main_image", "gallery_images", "description_images",
    "description", "specifications", "attributes", "variants",
    "shipping_method", "shipping_price", "shipping_from", "shipping_to",
    "estimated_delivery", "has_shipping", "free_shipping",
    "rating", "orders", "stock",
    "supplier", "meta",
]
REQUIRED_SUPPLIER_KEYS = {"name", "store_url", "rating", "feedback_count", "country"}
REQUIRED_VARIANT_KEYS = {"variant_id", "sku", "title", "image", "price",
                         "retail_price", "attributes", "stock"}


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── /v1/suppliers/aliexpress/search ──────────────────────────────────────
class TestSupplierSearchContract:
    def test_verbatim_query_passthrough_and_shape(self, client):
        body = {
            "query": VERBATIM_QUERY,
            "platform": "aliexpress",
            "shipping_from": "ALL",
            "shipping_to": "AU",
            "sort": "cheapest",
            "limit": 18,
        }
        r = client.post(f"{API}/v1/suppliers/aliexpress/search", json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # Top-level envelope
        for key in ("platform", "query", "mode", "sort", "shipping_from",
                    "shipping_to", "limit", "exact_match", "count", "results"):
            assert key in d, f"envelope missing key: {key}"
        # CRITICAL: query echoed byte-for-byte
        assert d["query"] == VERBATIM_QUERY
        assert d["platform"] == "aliexpress"
        assert d["sort"] == "cheapest"
        assert d["shipping_from"] == "ALL"
        assert d["shipping_to"] == "AU"
        assert d["limit"] == 18
        assert isinstance(d["results"], list)

    def test_result_item_shape_full_contract(self, client):
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": "headphones", "limit": 5}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] >= 1
        for item in d["results"]:
            for key in REQUIRED_TOP_LEVEL:
                assert key in item, f"result missing top-level key: {key}"
            # supplier object shape
            assert isinstance(item["supplier"], dict)
            assert REQUIRED_SUPPLIER_KEYS.issubset(item["supplier"].keys())
            # meta block with score and breakdown
            assert isinstance(item["meta"], dict)
            assert "score" in item["meta"]
            assert "score_breakdown" in item["meta"]
            # variants shape
            assert isinstance(item["variants"], list)
            for v in item["variants"]:
                assert REQUIRED_VARIANT_KEYS.issubset(v.keys()), \
                    f"variant missing keys: {REQUIRED_VARIANT_KEYS - set(v.keys())}"

    def test_url_query_exact_match(self, client):
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": PRIMARY_URL}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["exact_match"] is True
        assert d["count"] == 1
        assert d["mode"] == "url"

    def test_shipping_from_cn_filter(self, client):
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": "", "shipping_from": "CN", "limit": 60}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        # Every returned shipping_from must equal CN (case insensitive)
        for item in d["results"]:
            assert (item.get("shipping_from") or "").upper() == "CN", \
                f"non-CN result leaked: {item.get('shipping_from')}"

    def test_shipping_from_all_no_filter(self, client):
        r_all = client.post(f"{API}/v1/suppliers/aliexpress/search",
                            json={"query": "", "shipping_from": "ALL", "limit": 60}, timeout=20)
        r_any = client.post(f"{API}/v1/suppliers/aliexpress/search",
                            json={"query": "", "shipping_from": "any", "limit": 60}, timeout=20)
        r_blank = client.post(f"{API}/v1/suppliers/aliexpress/search",
                              json={"query": "", "shipping_from": "", "limit": 60}, timeout=20)
        # All three should return identical count (no filter applied)
        assert r_all.status_code == r_any.status_code == r_blank.status_code == 200
        c_all = r_all.json()["count"]
        assert c_all == r_any.json()["count"] == r_blank.json()["count"]
        assert c_all >= 1

    def test_unsupported_platform_400(self, client):
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": "x", "platform": "shopee"}, timeout=15)
        assert r.status_code == 400
        body = r.json()
        text = (body.get("detail") or body.get("message") or "").lower()
        assert "unsupported platform" in text

    def test_limit_clamped_to_60(self, client):
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": "", "limit": 999}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["limit"] == 60
        assert len(d["results"]) <= 60

    def test_limit_minimum_one(self, client):
        # Negative values should clamp to 1 (0 falls through to default 18 due
        # to `req.limit or 18` semantics, which is acceptable per spec).
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": "", "limit": -5}, timeout=20)
        assert r.status_code == 200
        assert r.json()["limit"] == 1

    def test_search_history_logged_with_endpoint_field(self, client):
        unique_q = "TEST_iter3_history_marker_42"
        r = client.post(f"{API}/v1/suppliers/aliexpress/search",
                        json={"query": unique_q, "limit": 5}, timeout=20)
        assert r.status_code == 200
        h = client.get(f"{API}/discovery/history", params={"limit": 25}, timeout=15)
        assert h.status_code == 200
        entries = h.json()
        match = [x for x in entries if x.get("query") == unique_q]
        assert match, "search history did not record the v1 supplier query"
        assert match[0].get("endpoint") == "v1.suppliers.aliexpress.search"


# ── /license/status, /dashboard/stats, /maintenance ──────────────────────
class TestLicenseAndDashboard:
    def test_license_status_business_plan(self, client):
        r = client.get(f"{API}/license/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["plan"] == "Business"
        assert d["plan_label"] == "Business"
        assert d["key"] == "NIPS-ADMIN-LICENSE-0001"
        assert d["key_last4"] == "0001"
        assert "0001" in d["key_masked"]
        assert d["domain"] == "alloutspares.com"
        assert d["valid"] is True

    def test_dashboard_stats_business_and_cloud(self, client):
        r = client.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["license"]["plan"] == "Business"
        assert d["cloud"]["endpoint"] == "api.nipsdownloads.com"
        assert d["cloud"]["version"] == "2.9.8-prototype"

    def test_maintenance_list_targets(self, client):
        r = client.get(f"{API}/maintenance", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "available_targets" in d
        assert "descriptions" in d
        assert "endpoint" in d
        expected = {"history", "saved", "drafts", "cache", "logs", "all"}
        assert set(d["available_targets"]) == expected
        # descriptions should cover all targets
        assert expected.issubset(set(d["descriptions"].keys()))


# ── Plugin releases refresh ──────────────────────────────────────────────
class TestPluginReleases298:
    def test_latest_is_298_with_updates_subdomain(self, client):
        r = client.get(f"{API}/v1/plugin/releases", timeout=15)
        assert r.status_code == 200
        rels = r.json()
        latest = [x for x in rels if x.get("is_latest")]
        assert len(latest) == 1
        assert latest[0]["version"] == "2.9.8"
        assert "updates.nipsdownloads.com" in latest[0]["download_url"]
        assert "nipsau.com" not in latest[0]["download_url"]


# ── CORS preflight ───────────────────────────────────────────────────────
class TestCORS:
    ENDPOINT = "/api/v1/suppliers/aliexpress/search"

    @pytest.mark.parametrize("origin", PRODUCTION_ORIGINS)
    def test_preflight_allows_origin(self, client, origin):
        r = requests.options(
            f"{BASE_URL}{self.ENDPOINT}",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=15,
        )
        # Starlette CORS returns 200 (or 204) for valid preflight
        assert r.status_code in (200, 204), f"preflight from {origin} returned {r.status_code}: {r.text}"
        acao = r.headers.get("access-control-allow-origin")
        assert acao is not None, f"missing ACAO for origin {origin}"
        # Must echo origin OR wildcard
        assert acao == origin or acao == "*", f"ACAO for {origin} was '{acao}'"


# ── Legacy regression — endpoints from iter 1/2 still work ───────────────
class TestLegacyRegression:
    def test_legacy_discovery_search_still_works(self, client):
        r = client.post(f"{API}/discovery/search",
                        json={"mode": "auto", "query": PRIMARY_URL}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["mode"] == "url"
        assert d["exact_match"] is True
        assert d["count"] == 1

    def test_legacy_imports_crud(self, client):
        # Create
        r = client.post(f"{API}/imports",
                        json={"product_id": "1005007250240074",
                              "isolate_variants": False}, timeout=15)
        assert r.status_code == 200
        draft_id = r.json()["inserted"][0]
        # Get
        g = client.get(f"{API}/imports/{draft_id}", timeout=15)
        assert g.status_code == 200
        # Patch
        p = client.patch(f"{API}/imports/{draft_id}",
                         json={"title": "TEST_iter3_legacy"}, timeout=15)
        assert p.status_code == 200
        assert p.json()["title"] == "TEST_iter3_legacy"
        # Delete
        d = client.delete(f"{API}/imports/{draft_id}", timeout=15)
        assert d.status_code == 200
        assert d.json()["deleted"] is True

    def test_legacy_ai_rewrite_real_openai(self, client):
        # Create a draft to rewrite
        r = client.post(f"{API}/imports",
                        json={"product_id": "1005007250240074",
                              "isolate_variants": False}, timeout=15)
        draft_id = r.json()["inserted"][0]
        try:
            ai = client.post(f"{API}/ai/rewrite",
                             json={"draft_id": draft_id, "field": "title"}, timeout=90)
            assert ai.status_code == 200, ai.text
            d = ai.json()
            assert isinstance(d["suggestion"], str) and len(d["suggestion"].strip()) > 0
            assert d["field"] == "title"
        finally:
            client.delete(f"{API}/imports/{draft_id}", timeout=15)

    def test_legacy_publish_flow(self, client):
        r = client.post(f"{API}/imports",
                        json={"product_id": "1005007250240074",
                              "isolate_variants": False}, timeout=15)
        draft_id = r.json()["inserted"][0]
        try:
            pub = client.post(f"{API}/publish",
                              json={"draft_id": draft_id, "publish_mode": "draft"}, timeout=15)
            assert pub.status_code == 200
            assert pub.json()["status"] == "success"
            assert "_id" not in pub.json()
        finally:
            client.delete(f"{API}/imports/{draft_id}", timeout=15)

    def test_legacy_logs_endpoint(self, client):
        r = client.get(f"{API}/logs", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
