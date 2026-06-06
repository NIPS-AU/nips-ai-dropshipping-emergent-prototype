<?php
defined( 'ABSPATH' ) || exit;
?>
<div class="wrap nips-page" id="nips-discovery">
	<h1>Product Discovery</h1>
	<p class="nips-lead">
		Search supplier products by name, URL, SKU, category or supplier store.
		Your typed query is sent <strong>verbatim</strong> to
		<code>POST /v1/suppliers/aliexpress/search</code>.
	</p>

	<div class="nips-card">
		<div class="nips-search-row">
			<input type="text" id="nips-query" class="regular-text" placeholder='Search verbatim, e.g. "Makita Cordless Charger &amp; Battery" or paste an AliExpress URL' />
			<button type="button" class="button button-primary" id="nips-search-btn">Search</button>
		</div>

		<div class="nips-filter-row">
			<label>Ship from
				<select id="nips-shipping-from"></select>
			</label>
			<label>Ship to
				<select id="nips-shipping-to"></select>
			</label>
			<label>Sort
				<select id="nips-sort"></select>
			</label>
			<label>Limit
				<input type="number" id="nips-limit" min="1" max="60" value="18" class="small-text" />
			</label>
			<label class="nips-toggle">
				<input type="checkbox" id="nips-debug" /> Developer / debug
			</label>
		</div>

		<p class="nips-hint">
			Endpoint: <code id="nips-endpoint"></code>
		</p>
	</div>

	<div id="nips-error" class="nips-error" hidden></div>

	<div id="nips-meta" class="nips-meta" hidden>
		<span><strong>Query echoed by cloud:</strong> <code id="nips-meta-query"></code></span>
		<span id="nips-meta-mode"></span>
		<span id="nips-meta-count"></span>
		<span id="nips-meta-sort"></span>
	</div>

	<div id="nips-results" class="nips-results"></div>

	<div id="nips-debug-panel" class="nips-debug" hidden>
		<div class="nips-debug-head">
			<strong>Developer / debug — full canonical response</strong>
			<span class="nips-debug-actions">
				<button type="button" class="button" id="nips-copy-request">Copy request</button>
				<button type="button" class="button" id="nips-copy-response">Copy response</button>
			</span>
		</div>
		<div class="nips-debug-body">
			<details open>
				<summary>Request</summary>
				<pre id="nips-debug-request"></pre>
			</details>
			<details open>
				<summary>Response</summary>
				<pre id="nips-debug-response"></pre>
			</details>
		</div>
	</div>
</div>
