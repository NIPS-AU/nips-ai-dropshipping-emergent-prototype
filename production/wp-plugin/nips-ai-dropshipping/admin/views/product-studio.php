<?php
defined( 'ABSPATH' ) || exit;
$draft_uuid = isset( $_GET['draft'] ) ? sanitize_text_field( wp_unslash( $_GET['draft'] ) ) : '';
?>
<div class="wrap nips-page" id="nips-studio" data-draft="<?php echo esc_attr( $draft_uuid ); ?>">
	<h1 id="nips-studio-title">Product Studio</h1>

	<?php if ( empty( $draft_uuid ) ) : ?>
		<div class="nips-card">
			<p>Open a draft from the <a href="<?php echo esc_url( admin_url( 'admin.php?page=nips-ai-ds-imports' ) ); ?>">Import List</a> to load it here.</p>
		</div>
	<?php else : ?>
		<div id="nips-studio-app"></div>
	<?php endif; ?>
</div>
