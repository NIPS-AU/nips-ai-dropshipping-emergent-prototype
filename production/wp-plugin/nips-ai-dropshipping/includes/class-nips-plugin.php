<?php
/**
 * Bootstrap and activation lifecycle.
 *
 * @package NIPS_AI_Dropshipping
 */

defined( 'ABSPATH' ) || exit;

class NIPS_Plugin {

	/**
	 * Plugin boot — wires hooks once WordPress finishes loading plugins.
	 */
	public static function boot() {
		// Sensible defaults the first time the plugin runs.
		if ( ! get_option( NIPS_AI_DS_OPT_API_URL ) ) {
			update_option( NIPS_AI_DS_OPT_API_URL, 'https://api.nipsdownloads.com' );
		}
		if ( ! get_option( NIPS_AI_DS_OPT_UPDATES_URL ) ) {
			update_option( NIPS_AI_DS_OPT_UPDATES_URL, 'https://updates.nipsdownloads.com' );
		}
		if ( false === get_option( NIPS_AI_DS_OPT_DEBUG ) ) {
			update_option( NIPS_AI_DS_OPT_DEBUG, '0' );
		}
		if ( ! get_option( NIPS_AI_DS_OPT_LICENSE ) ) {
			update_option( NIPS_AI_DS_OPT_LICENSE, 'NIPS-ADMIN-LICENSE-0001' );
		}

		if ( is_admin() ) {
			NIPS_Admin::init();
		}
	}

	/**
	 * Create the import_drafts table.
	 */
	public static function activate() {
		global $wpdb;
		$table   = $wpdb->prefix . NIPS_AI_DS_TABLE_DRAFTS;
		$charset = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$sql = "CREATE TABLE {$table} (
			draft_id        BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			draft_uuid      VARCHAR(64) NOT NULL,
			product_id      VARCHAR(64) NOT NULL,
			parent_product_id VARCHAR(64) NULL,
			variant_id      VARCHAR(64) NULL,
			is_variant_draft TINYINT(1) NOT NULL DEFAULT 0,
			sku             VARCHAR(128) NOT NULL,
			title           TEXT NOT NULL,
			supplier_url    TEXT NULL,
			product_url     TEXT NULL,
			price           DECIMAL(12,2) NOT NULL DEFAULT 0,
			retail_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
			profit_estimate DECIMAL(12,2) NOT NULL DEFAULT 0,
			currency        VARCHAR(8) NOT NULL DEFAULT 'USD',
			category        TEXT NULL,
			main_image      TEXT NULL,
			payload         LONGTEXT NOT NULL,
			studio_edits    LONGTEXT NULL,
			ai_history      LONGTEXT NULL,
			publish_status  VARCHAR(32) NOT NULL DEFAULT 'draft',
			wc_product_id   BIGINT(20) UNSIGNED NULL,
			wc_publish_mode VARCHAR(32) NULL,
			created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (draft_id),
			UNIQUE KEY draft_uuid (draft_uuid),
			KEY product_id (product_id),
			KEY publish_status (publish_status)
		) {$charset};";

		dbDelta( $sql );
	}

	public static function deactivate() {
		// Keep drafts on deactivation — they belong to the customer.
	}
}
