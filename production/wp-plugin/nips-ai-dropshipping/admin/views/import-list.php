<?php
defined( 'ABSPATH' ) || exit;
?>
<div class="wrap nips-page" id="nips-imports">
	<h1>Import List
		<button type="button" class="page-title-action" id="nips-clear-drafts">Clear unpublished</button>
	</h1>
	<p class="nips-lead">Temporary supplier drafts waiting for review. Deleting a draft never touches your published WooCommerce products.</p>

	<div id="nips-import-empty" class="nips-card nips-empty" hidden>
		<p>No drafts yet. Open <a href="<?php echo esc_url( admin_url( 'admin.php?page=nips-ai-ds-discovery' ) ); ?>">Product Discovery</a> to find supplier products.</p>
	</div>

	<div id="nips-import-grid" class="nips-results"></div>
</div>
