<?php
defined( 'ABSPATH' ) || exit;
?>
<div class="wrap nips-page">
	<h1>NIPS-AI Dropshipping · Settings</h1>
	<form method="post" action="options.php">
		<?php settings_fields( 'nips_ai_ds_settings' ); ?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="<?php echo esc_attr( NIPS_AI_DS_OPT_LICENSE ); ?>">License key</label></th>
				<td><input type="text" id="<?php echo esc_attr( NIPS_AI_DS_OPT_LICENSE ); ?>" name="<?php echo esc_attr( NIPS_AI_DS_OPT_LICENSE ); ?>" value="<?php echo esc_attr( get_option( NIPS_AI_DS_OPT_LICENSE ) ); ?>" class="regular-text" />
				<p class="description">Sent in the <code>X-NIPS-License-Key</code> header to the cloud.</p></td>
			</tr>
			<tr>
				<th scope="row"><label for="<?php echo esc_attr( NIPS_AI_DS_OPT_API_URL ); ?>">Cloud API URL</label></th>
				<td><input type="url" id="<?php echo esc_attr( NIPS_AI_DS_OPT_API_URL ); ?>" name="<?php echo esc_attr( NIPS_AI_DS_OPT_API_URL ); ?>" value="<?php echo esc_attr( get_option( NIPS_AI_DS_OPT_API_URL ) ); ?>" class="regular-text" placeholder="https://api.nipsdownloads.com" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="<?php echo esc_attr( NIPS_AI_DS_OPT_UPDATES_URL ); ?>">Updates URL</label></th>
				<td><input type="url" id="<?php echo esc_attr( NIPS_AI_DS_OPT_UPDATES_URL ); ?>" name="<?php echo esc_attr( NIPS_AI_DS_OPT_UPDATES_URL ); ?>" value="<?php echo esc_attr( get_option( NIPS_AI_DS_OPT_UPDATES_URL ) ); ?>" class="regular-text" placeholder="https://updates.nipsdownloads.com" /></td>
			</tr>
			<tr>
				<th scope="row">Debug mode</th>
				<td><label><input type="checkbox" name="<?php echo esc_attr( NIPS_AI_DS_OPT_DEBUG ); ?>" value="1" <?php checked( '1', (string) get_option( NIPS_AI_DS_OPT_DEBUG ) ); ?> /> Show raw payloads in Discovery / Studio (developer view)</label></td>
			</tr>
		</table>
		<?php submit_button(); ?>
	</form>
</div>
