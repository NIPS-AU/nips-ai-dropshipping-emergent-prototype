<?php
defined( 'ABSPATH' ) || exit;
$license = NIPS_Cloud_Client::license_key();
$api     = NIPS_Cloud_Client::api_url();
?>
<div class="wrap nips-page">
	<h1>NIPS-AI Dropshipping</h1>
	<p class="nips-lead">Cloud-connected dropshipping for WooCommerce.</p>

	<div class="nips-grid nips-grid-4">
		<div class="nips-card"><span class="nips-kpi-label">Cloud</span><span class="nips-kpi-value"><?php echo esc_html( wp_parse_url( $api, PHP_URL_HOST ) ); ?></span></div>
		<div class="nips-card"><span class="nips-kpi-label">License</span><span class="nips-kpi-value"><?php echo esc_html( $license ?: '—' ); ?></span></div>
		<div class="nips-card"><span class="nips-kpi-label">Plugin version</span><span class="nips-kpi-value"><?php echo esc_html( NIPS_AI_DS_VERSION ); ?></span></div>
		<div class="nips-card"><span class="nips-kpi-label">Test store</span><span class="nips-kpi-value"><?php echo esc_html( wp_parse_url( home_url(), PHP_URL_HOST ) ); ?></span></div>
	</div>

	<div class="nips-card nips-quickstart">
		<h2>Quick start</h2>
		<ol>
			<li>Open <a href="<?php echo esc_url( admin_url( 'admin.php?page=nips-ai-ds-settings' ) ); ?>">Settings</a> and enter your license key &amp; cloud URL.</li>
			<li>Go to <a href="<?php echo esc_url( admin_url( 'admin.php?page=nips-ai-ds-discovery' ) ); ?>"><strong>Product Discovery</strong></a>, type a query verbatim (e.g. <em>"Makita Cordless Charger &amp; Battery"</em>) and press Search.</li>
			<li>Click <strong>Import to List</strong> on any card to save it as a draft.</li>
			<li>Open the draft in <a href="<?php echo esc_url( admin_url( 'admin.php?page=nips-ai-ds-studio' ) ); ?>">Product Studio</a>, run AI cleanup if needed, and publish to WooCommerce.</li>
		</ol>
	</div>
</div>
