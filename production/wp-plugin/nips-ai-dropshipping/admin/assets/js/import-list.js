/* global NIPS_AI_DS */
/**
 * Import List page — lists drafts (same canonical product object as Discovery)
 * with actions to open in Product Studio, preview raw payload, or delete.
 */
(function () {
	"use strict";
	const cfg = window.NIPS_AI_DS || {};
	const $ = (s) => document.querySelector(s);
	const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
	const money = (n, cur) => {
		try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(Number(n || 0)); }
		catch (e) { return (cur || "USD") + " " + Number(n || 0).toFixed(2); }
	};

	function load() {
		const form = new URLSearchParams();
		form.set("action", "nips_list_drafts");
		form.set("nonce", cfg.nonce);
		fetch(cfg.ajaxUrl, { method: "POST", credentials: "same-origin", body: form })
			.then((r) => r.json())
			.then((json) => {
				const drafts = (json && json.success && json.data.drafts) || [];
				render(drafts);
			});
	}

	function render(drafts) {
		const grid = $("#nips-import-grid");
		$("#nips-import-empty").hidden = drafts.length > 0;
		grid.innerHTML = drafts.map(cardHtml).join("");
		grid.addEventListener("click", onClick, { once: false });
	}

	function cardHtml(p) {
		const dr = p._draft || {};
		const variants = (p.variants || []).length;
		const isVariant = !!dr.is_variant;
		const studio = "admin.php?page=nips-ai-ds-studio&draft=" + encodeURIComponent(dr.draft_uuid);
		return `
<article class="nips-card nips-product" data-uuid="${esc(dr.draft_uuid)}">
	<div class="nips-product-media">
		${p.main_image ? `<img src="${esc(p.main_image)}" alt="">` : ""}
		<div class="nips-badges">
			${isVariant ? `<span class="nips-badge nips-badge-indigo">Variant draft</span>` : ""}
			<span class="nips-badge">${(p.gallery_images || []).length} images</span>
		</div>
		${dr.publish_status === "published" ? `<span class="nips-score is-good">WC #${esc(dr.wc_product_id)}</span>` : ""}
	</div>
	<div class="nips-product-body">
		<h3 class="nips-product-title">${esc(p.title)}</h3>
		<div class="nips-price-row">
			<div>
				<div class="nips-price">${money(p.price, p.currency)}</div>
				<div class="nips-sub">Retail ${money(p.retail_price, p.currency)} · <strong class="nips-profit">+${money(p.profit_estimate, p.currency)}</strong></div>
			</div>
			<code class="nips-pid">${esc(p.product_id)}</code>
		</div>
		<dl class="nips-kv">
			<dt>SKU</dt><dd>${esc(p.sku)}</dd>
			<dt>Variants</dt><dd>${variants}</dd>
			<dt>Shipping</dt><dd>${esc(p.estimated_delivery) || "—"} · ${p.free_shipping ? "Free" : money(p.shipping_price, p.currency)}</dd>
			<dt>Supplier</dt><dd>${esc(p.supplier && p.supplier.name) || "—"}</dd>
		</dl>
		<div class="nips-product-actions">
			<a class="button button-primary" href="${esc(studio)}">Open in Studio</a>
			<button type="button" class="button" data-action="raw">Raw</button>
			<button type="button" class="button" data-action="delete">Delete</button>
		</div>
		<pre class="nips-raw" hidden></pre>
	</div>
</article>`;
	}

	function onClick(e) {
		const btn = e.target.closest("[data-action]");
		if (!btn) return;
		const card = btn.closest(".nips-product");
		const uuid = card.dataset.uuid;
		const action = btn.dataset.action;
		if (action === "raw") {
			const pre = card.querySelector(".nips-raw");
			pre.hidden = !pre.hidden;
			if (!pre.hidden) {
				const form = new URLSearchParams({ action: "nips_get_draft", nonce: cfg.nonce, draft_uuid: uuid });
				fetch(cfg.ajaxUrl + "?" + form.toString(), { credentials: "same-origin" })
					.then((r) => r.json())
					.then((j) => { pre.textContent = JSON.stringify(j.data && j.data.draft, null, 2); });
			}
		}
		if (action === "delete") {
			if (!confirm("Delete this draft? Any already-published WooCommerce product will be preserved.")) return;
			const form = new URLSearchParams({ action: "nips_delete_draft", nonce: cfg.nonce, draft_uuid: uuid });
			fetch(cfg.ajaxUrl, { method: "POST", credentials: "same-origin", body: form })
				.then(() => load());
		}
	}

	document.querySelector("#nips-clear-drafts")?.addEventListener("click", () => {
		if (!confirm("Clear all unpublished drafts? Published WooCommerce products are not affected.")) return;
		const form = new URLSearchParams({ action: "nips_clear_drafts", nonce: cfg.nonce });
		fetch(cfg.ajaxUrl, { method: "POST", credentials: "same-origin", body: form }).then(() => load());
	});

	document.addEventListener("DOMContentLoaded", load);
})();
