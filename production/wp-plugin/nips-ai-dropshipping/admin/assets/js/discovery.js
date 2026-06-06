/* global NIPS_AI_DS */
/**
 * Product Discovery UI — calls POST /v1/suppliers/aliexpress/search through
 * wp-admin/admin-ajax.php → NIPS_Cloud_Client → cloud.
 *
 * Reads the canonical product object (every field listed in the spec) and
 * renders it into result cards. Raw payload is only shown in the debug panel.
 */
(function () {
	"use strict";

	const cfg = window.NIPS_AI_DS || {};
	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
	const esc = (s) =>
		String(s == null ? "" : s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	const money = (n, cur) => {
		const v = Number(n || 0);
		try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(v); }
		catch (e) { return (cur || "USD") + " " + v.toFixed(2); }
	};

	// ── Boot defaults ─────────────────────────────────────────────────────
	function fillSelect(el, values, labels) {
		el.innerHTML = "";
		values.forEach((v, i) => {
			const opt = document.createElement("option");
			opt.value = typeof v === "object" ? v.value : v;
			opt.textContent = labels ? labels[i] : (typeof v === "object" ? v.label : v);
			el.appendChild(opt);
		});
	}

	function init() {
		fillSelect($("#nips-shipping-from"), cfg.shipFrom || ["ALL"]);
		fillSelect($("#nips-shipping-to"), cfg.shipTo || ["any"]);
		const sortEl = $("#nips-sort");
		(cfg.sortOptions || []).forEach((o) => {
			const opt = document.createElement("option");
			opt.value = o.value;
			opt.textContent = o.label;
			sortEl.appendChild(opt);
		});
		$("#nips-endpoint").textContent = (cfg.apiUrl || "") + "/v1/suppliers/aliexpress/search";

		if (cfg.debug) $("#nips-debug").checked = true;

		$("#nips-search-btn").addEventListener("click", runSearch);
		$("#nips-query").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });

		$$("#nips-shipping-from, #nips-shipping-to, #nips-sort").forEach((el) => {
			el.addEventListener("change", () => { if (state.lastQuery) runSearch(); });
		});

		$("#nips-debug").addEventListener("change", (e) => {
			$("#nips-debug-panel").hidden = !e.target.checked || !state.lastResponse;
		});

		$("#nips-copy-request").addEventListener("click", () => copy(JSON.stringify(state.lastRequest, null, 2), "Request"));
		$("#nips-copy-response").addEventListener("click", () => copy(JSON.stringify(state.lastResponse, null, 2), "Response"));

		// Delegated click handler for result cards.
		$("#nips-results").addEventListener("click", onResultsClick);
	}

	const state = {
		lastQuery: "",
		lastRequest: null,
		lastResponse: null,
		results: [],
	};

	// ── Search ────────────────────────────────────────────────────────────
	function runSearch() {
		const query = $("#nips-query").value;       // verbatim — no trim()
		if (!query) { showError("Type something to search."); return; }
		const payload = {
			action: "nips_supplier_search",
			nonce: cfg.nonce,
			query,
			shipping_from: $("#nips-shipping-from").value,
			shipping_to: $("#nips-shipping-to").value,
			sort: $("#nips-sort").value,
			limit: Math.max(1, Math.min(60, parseInt($("#nips-limit").value, 10) || 18)),
		};
		state.lastQuery = query;
		setSearchBusy(true);
		hideError();

		const form = new URLSearchParams();
		Object.entries(payload).forEach(([k, v]) => form.set(k, v));

		fetch(cfg.ajaxUrl, { method: "POST", credentials: "same-origin", body: form })
			.then((r) => r.json())
			.then((json) => {
				if (!json || !json.success) {
					const data = (json && json.data) || {};
					showError(`Cloud error: ${data.message || data.error || "request failed"}`);
					state.lastResponse = data;
					renderDebug();
					return;
				}
				const data = json.data;
				state.lastRequest = data.request;
				state.lastResponse = data.raw_response;
				state.results = Array.isArray(data.results) ? data.results : [];
				renderMeta(data);
				renderResults(state.results, data);
				renderDebug();
			})
			.catch((err) => showError(err.message || "Network error"))
			.finally(() => setSearchBusy(false));
	}

	function setSearchBusy(busy) {
		const btn = $("#nips-search-btn");
		btn.disabled = busy;
		btn.textContent = busy ? "Searching…" : "Search";
	}

	function showError(msg) { const el = $("#nips-error"); el.hidden = false; el.textContent = msg; }
	function hideError() { $("#nips-error").hidden = true; }

	// ── Render ────────────────────────────────────────────────────────────
	function renderMeta(d) {
		const meta = $("#nips-meta");
		meta.hidden = false;
		$("#nips-meta-query").textContent = d.exact_query_received || "";
		$("#nips-meta-mode").innerHTML = d.mode ? `Mode <strong>${esc(d.mode)}</strong>` : "";
		$("#nips-meta-sort").innerHTML = d.sort ? `Sort <strong>${esc(d.sort)}</strong>` : "";
		$("#nips-meta-count").innerHTML = `<strong>${d.count}</strong> result(s) ${d.exact_match ? "· exact match" : ""}`;
	}

	function renderResults(products, ctx) {
		const grid = $("#nips-results");
		if (!products || products.length === 0) {
			grid.innerHTML = `<div class="nips-card nips-empty">No products returned. Try a different query or filter.</div>`;
			return;
		}
		grid.innerHTML = products.map((p, i) => cardHtml(p, i)).join("");
	}

	function cardHtml(p, idx) {
		const score = p.meta && typeof p.meta.score === "number" ? p.meta.score : null;
		const scoreCls = score === null ? "" : (score >= 75 ? "is-good" : score >= 55 ? "is-ok" : "is-mid");
		const tagsHtml = (p.tags || []).slice(0, 6).map((t) => `<span class="nips-tag">${esc(t)}</span>`).join("");
		const variants = (p.variants || []).length;
		const imgCount = (p.gallery_images || []).length;
		const ship = p.free_shipping
			? "Free shipping"
			: (p.shipping_price ? money(p.shipping_price, p.currency) : "—");
		const eta = p.estimated_delivery || (p.meta && p.meta.shipping_days_min ? `from ${p.meta.shipping_days_min}d` : "—");
		const profitPct = p.profit_pct !== null && p.profit_pct !== undefined ? ` (${Number(p.profit_pct).toFixed(0)}%)` : "";

		return `
<article class="nips-card nips-product" data-idx="${idx}" data-product-id="${esc(p.product_id)}">
	<div class="nips-product-media">
		${p.main_image ? `<img src="${esc(p.main_image)}" alt="">` : `<div class="nips-no-img">No image</div>`}
		<div class="nips-badges">
			${variants > 0 ? `<span class="nips-badge nips-badge-blue">${variants} variants</span>` : ``}
			<span class="nips-badge">${imgCount} images</span>
		</div>
		${score !== null ? `<span class="nips-score ${scoreCls}" title="Heuristic score">★ ${score.toFixed(0)}</span>` : ``}
	</div>
	<div class="nips-product-body">
		<h3 class="nips-product-title">${esc(p.title)}</h3>
		<div class="nips-price-row">
			<div>
				<div class="nips-price">${money(p.price, p.currency)}</div>
				<div class="nips-sub">Retail ${money(p.retail_price, p.currency)} · <strong class="nips-profit">+${money(p.profit_estimate, p.currency)}</strong>${profitPct}</div>
			</div>
			<code class="nips-pid">${esc(p.product_id)}</code>
		</div>

		<dl class="nips-kv">
			<dt>SKU</dt><dd>${esc(p.sku)}</dd>
			<dt>Category</dt><dd>${esc(p.category) || "—"}</dd>
			<dt>Supplier</dt><dd>${esc(p.supplier && p.supplier.name) || "—"} · ★ ${Number(p.rating || 0).toFixed(1)} (${Number((p.supplier && p.supplier.feedback_count) || 0).toLocaleString()})</dd>
			<dt>Orders</dt><dd>${Number(p.orders || 0).toLocaleString()}</dd>
			<dt>Stock</dt><dd>${Number(p.stock || 0).toLocaleString()}</dd>
			<dt>Shipping</dt><dd>${esc(p.shipping_method) || "—"} · ${ship} · ${esc(p.shipping_from) || "—"} → ${esc(p.shipping_to) || "—"} · ${esc(eta)}</dd>
			<dt>Specs</dt><dd>${(p.specifications || []).length} · Attributes ${(p.attributes || []).length}</dd>
			<dt>Description imgs</dt><dd>${(p.description_images || []).length}</dd>
		</dl>

		${tagsHtml ? `<div class="nips-tags">${tagsHtml}</div>` : ``}

		<div class="nips-product-actions">
			<label class="nips-iso">
				<input type="checkbox" data-action="iso-toggle" ${variants > 0 ? "" : "disabled"} />
				Isolate variants
			</label>
			<a class="button-link" target="_blank" rel="noopener" href="${esc(p.product_url || p.supplier_url || "#")}">Supplier ↗</a>
			<button type="button" class="button" data-action="raw">Raw</button>
			<button type="button" class="button button-primary" data-action="import">Import to List</button>
		</div>

		<pre class="nips-raw" hidden></pre>
	</div>
</article>`;
	}

	function onResultsClick(e) {
		const btn = e.target.closest("[data-action]");
		if (!btn) return;
		const card = btn.closest(".nips-product");
		if (!card) return;
		const idx = parseInt(card.dataset.idx, 10);
		const product = state.results[idx];
		if (!product) return;

		const action = btn.dataset.action;
		if (action === "raw") {
			const pre = card.querySelector(".nips-raw");
			pre.hidden = !pre.hidden;
			if (!pre.hidden) pre.textContent = JSON.stringify(product, null, 2);
			return;
		}
		if (action === "import") {
			const iso = card.querySelector('input[data-action="iso-toggle"]');
			doImport(product, iso && iso.checked, btn);
		}
	}

	function doImport(product, isolate, btn) {
		btn.disabled = true;
		const originalText = btn.textContent;
		btn.textContent = "Importing…";
		const form = new URLSearchParams();
		form.set("action", "nips_import_draft");
		form.set("nonce", cfg.nonce);
		form.set("product_id", product.product_id);
		form.set("isolate_variants", isolate ? "1" : "");
		form.set("product", JSON.stringify(product));

		fetch(cfg.ajaxUrl, { method: "POST", credentials: "same-origin", body: form })
			.then((r) => r.json())
			.then((json) => {
				if (!json || !json.success) {
					const d = (json && json.data) || {};
					alert("Import failed: " + (d.message || d.error || "unknown"));
					return;
				}
				btn.textContent = `Imported (${json.data.inserted.length})`;
			})
			.catch((e) => alert("Import failed: " + e.message))
			.finally(() => setTimeout(() => { btn.disabled = false; btn.textContent = originalText; }, 2000));
	}

	// ── Debug panel ───────────────────────────────────────────────────────
	function renderDebug() {
		const show = $("#nips-debug").checked && state.lastResponse;
		const panel = $("#nips-debug-panel");
		panel.hidden = !show;
		if (!show) return;
		$("#nips-debug-request").textContent = JSON.stringify(state.lastRequest, null, 2);
		$("#nips-debug-response").textContent = JSON.stringify(state.lastResponse, null, 2);
	}

	function copy(text, label) {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(text).then(() => {
			const note = document.createElement("div");
			note.className = "nips-toast";
			note.textContent = `${label} copied`;
			document.body.appendChild(note);
			setTimeout(() => note.remove(), 1500);
		});
	}

	document.addEventListener("DOMContentLoaded", init);
})();
