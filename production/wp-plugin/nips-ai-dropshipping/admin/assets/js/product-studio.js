/* global NIPS_AI_DS */
/**
 * Product Studio — loads one draft and renders every canonical field with
 * inline editors. Saving PATCHes the draft (studio_edits column). Raw payload
 * shown only when debug mode is on.
 */
(function () {
	"use strict";
	const cfg = window.NIPS_AI_DS || {};
	const root = document.getElementById("nips-studio");
	if (!root) return;
	const uuid = root.dataset.draft;
	if (!uuid) return;
	const $ = (s, r = document) => r.querySelector(s);
	const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
	const money = (n, cur) => {
		try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(Number(n || 0)); }
		catch (e) { return (cur || "USD") + " " + Number(n || 0).toFixed(2); }
	};

	let draft = null;
	let edits = {};

	function load() {
		const form = new URLSearchParams({ action: "nips_get_draft", nonce: cfg.nonce, draft_uuid: uuid });
		fetch(cfg.ajaxUrl + "?" + form.toString(), { credentials: "same-origin" })
			.then((r) => r.json())
			.then((j) => {
				if (!j || !j.success) { showError(j); return; }
				draft = j.data.draft;
				edits = Object.assign({}, draft._draft && draft._draft.studio_edits);
				render();
			});
	}

	function showError(j) {
		$("#nips-studio-app").innerHTML = `<div class="nips-error">Failed to load draft (${(j && j.data && (j.data.error || j.data.message)) || "unknown"})</div>`;
	}

	function field(label, name, type, value) {
		const id = "f_" + name;
		const inputHtml = type === "textarea"
			? `<textarea id="${id}" rows="10">${esc(value)}</textarea>`
			: `<input type="${type}" id="${id}" value="${esc(value)}" />`;
		return `<div class="nips-field"><label for="${id}">${esc(label)}</label>${inputHtml}</div>`;
	}

	function render() {
		document.querySelector("#nips-studio-title").innerHTML =
			`Product Studio — <span class="nips-muted">${esc(draft.title)}</span>` +
			(draft._draft && draft._draft.publish_status === "published"
				? ` <span class="nips-score is-good">WC #${esc(draft._draft.wc_product_id)}</span>`
				: "");

		const variants = (draft.variants || []).map((v) => `
			<div class="nips-variant">
				${v.image ? `<img src="${esc(v.image)}" alt="">` : ""}
				<div>
					<strong>${esc(v.title || v.sku)}</strong>
					<div class="nips-muted">${esc(v.sku || "")}</div>
					<div>${money(v.price, draft.currency)} · stock ${esc(v.stock || 0)}</div>
				</div>
			</div>`).join("");

		const gallery = (draft.gallery_images || []).map((src) => `<img src="${esc(src)}" alt="">`).join("");
		const descImgs = (draft.description_images || []).map((src) => `<img src="${esc(src)}" alt="">`).join("");
		const specs = (draft.specifications || []).map((s) => `<tr><th>${esc(s.name)}</th><td>${esc(s.value)}</td></tr>`).join("");
		const attrs = (draft.attributes || []).map((a) => `
			<div class="nips-attr"><strong>${esc(a.name)}</strong>
				${(a.values || []).map((v) => `<span class="nips-tag">${esc(v)}</span>`).join("")}
			</div>`).join("");

		$("#nips-studio-app").innerHTML = `
		<div class="nips-grid nips-grid-2">
			<aside class="nips-card nips-studio-summary">
				${draft.main_image ? `<img class="nips-summary-img" src="${esc(draft.main_image)}" alt="">` : ""}
				<dl class="nips-kv">
					<dt>Product ID</dt><dd><code>${esc(draft.product_id)}</code></dd>
					<dt>SKU</dt><dd><code>${esc(draft.sku)}</code></dd>
					<dt>Supplier URL</dt><dd><a href="${esc(draft.supplier_url || draft.product_url || "#")}" target="_blank" rel="noopener">${esc(draft.supplier_url || draft.product_url || "—")}</a></dd>
					<dt>Currency</dt><dd>${esc(draft.currency)}</dd>
					<dt>Supplier</dt><dd>${esc(draft.supplier && draft.supplier.name) || "—"} · ★ ${Number(draft.rating || 0).toFixed(1)} (${Number((draft.supplier && draft.supplier.feedback_count) || 0).toLocaleString()})</dd>
					<dt>Orders</dt><dd>${Number(draft.orders || 0).toLocaleString()}</dd>
					<dt>Stock</dt><dd>${Number(draft.stock || 0).toLocaleString()}</dd>
					<dt>Shipping</dt><dd>${esc(draft.shipping_method) || "—"} · ${draft.free_shipping ? "Free" : money(draft.shipping_price, draft.currency)} · ${esc(draft.shipping_from)} → ${esc(draft.shipping_to)} · ${esc(draft.estimated_delivery) || "—"}</dd>
				</dl>
				<div class="nips-prices">
					<div><span class="nips-muted">Supplier price</span><div>${money(draft.price, draft.currency)}</div></div>
					<div><span class="nips-muted">Retail price</span><div id="ret-preview">${money(draft.retail_price, draft.currency)}</div></div>
					<div class="nips-profit-box"><span class="nips-muted">Profit</span><div id="profit-preview">${money(draft.profit_estimate, draft.currency)}</div></div>
				</div>
			</aside>

			<section class="nips-card">
				<h2>Editable fields</h2>
				${field("Title", "title", "text", edits.title ?? draft.title)}
				${field("Retail price", "retail_price", "number", edits.retail_price ?? draft.retail_price)}
				${field("Category", "category", "text", edits.category ?? draft.category)}
				${field("Tags (comma-separated)", "tags", "text", (edits.tags || draft.tags || []).join(", "))}
				${field("SEO title", "seo_title", "text", edits.seo_title ?? draft.title)}
				${field("Meta description", "seo_meta_description", "textarea", edits.seo_meta_description ?? "")}
				${field("Description", "description", "textarea", edits.description ?? draft.description)}
				<div class="nips-actions">
					<button type="button" class="button button-primary" id="save-btn">Save draft</button>
					<button type="button" class="button" id="raw-btn">Raw payload</button>
				</div>
			</section>
		</div>

		<section class="nips-card">
			<h2>Gallery (${(draft.gallery_images || []).length})</h2>
			<div class="nips-gallery">${gallery}</div>
			${descImgs ? `<h3>Description images</h3><div class="nips-gallery">${descImgs}</div>` : ""}
		</section>

		<section class="nips-card">
			<h2>Variants (${(draft.variants || []).length})</h2>
			<div class="nips-variants">${variants || `<p class="nips-muted">No variants.</p>`}</div>
		</section>

		<section class="nips-card">
			<h2>Specifications</h2>
			<table class="widefat striped"><tbody>${specs || `<tr><td colspan="2"><em>No specs.</em></td></tr>`}</tbody></table>
		</section>

		<section class="nips-card">
			<h2>Attributes</h2>
			${attrs || `<p class="nips-muted">No attributes.</p>`}
		</section>

		<pre id="raw-pane" class="nips-raw" hidden>${esc(JSON.stringify(draft, null, 2))}</pre>
		`;

		// Hook up live profit preview
		const retInput = document.getElementById("f_retail_price");
		retInput.addEventListener("input", () => {
			const v = parseFloat(retInput.value || 0);
			document.getElementById("ret-preview").textContent = money(v, draft.currency);
			document.getElementById("profit-preview").textContent = money(v - draft.price, draft.currency);
		});

		document.getElementById("save-btn").addEventListener("click", save);
		document.getElementById("raw-btn").addEventListener("click", () => {
			const pre = document.getElementById("raw-pane");
			pre.hidden = !pre.hidden;
		});
	}

	function save() {
		const payload = {
			title: document.getElementById("f_title").value,
			retail_price: parseFloat(document.getElementById("f_retail_price").value) || 0,
			category: document.getElementById("f_category").value,
			tags: document.getElementById("f_tags").value.split(",").map((s) => s.trim()).filter(Boolean),
			seo_title: document.getElementById("f_seo_title").value,
			seo_meta_description: document.getElementById("f_seo_meta_description").value,
			description: document.getElementById("f_description").value,
		};
		const form = new URLSearchParams();
		form.set("action", "nips_patch_draft");
		form.set("nonce", cfg.nonce);
		form.set("draft_uuid", uuid);
		form.set("edits", JSON.stringify(payload));

		const btn = document.getElementById("save-btn");
		btn.disabled = true; btn.textContent = "Saving…";
		fetch(cfg.ajaxUrl, { method: "POST", credentials: "same-origin", body: form })
			.then((r) => r.json())
			.then((j) => {
				if (j && j.success) {
					draft = j.data.draft;
					edits = draft._draft.studio_edits || {};
					btn.textContent = "Saved ✓";
				} else {
					btn.textContent = "Save failed";
				}
			})
			.finally(() => setTimeout(() => { btn.disabled = false; btn.textContent = "Save draft"; }, 1500));
	}

	document.addEventListener("DOMContentLoaded", load);
})();
