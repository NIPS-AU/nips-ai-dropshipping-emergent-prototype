<?php
/**
 * Plugin Name:       NIPS-AI Dropshipping
 * Plugin URI:        https://dropshipping.nips.live
 * Description:       NIPS-AI Cloud-powered dropshipping for WooCommerce — Product Discovery, Import List drafts and Product Studio editor.
 * Version:           2.9.8
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            NIPS-AI
 * Author URI:        https://nipsdownloads.com
 * Text Domain:       nips-ai-dropshipping
 * Domain Path:       /languages
 * License:           Proprietary
 * Update URI:        https://updates.nipsdownloads.com
 *
 * @package NIPS_AI_Dropshipping
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NIPS_AI_DS_VERSION', '2.9.8' );
define( 'NIPS_AI_DS_FILE', __FILE__ );
define( 'NIPS_AI_DS_DIR', plugin_dir_path( __FILE__ ) );
define( 'NIPS_AI_DS_URL', plugin_dir_url( __FILE__ ) );
define( 'NIPS_AI_DS_TABLE_DRAFTS', 'nips_import_drafts' );
define( 'NIPS_AI_DS_OPT_LICENSE', 'nips_ai_ds_license_key' );
define( 'NIPS_AI_DS_OPT_API_URL', 'nips_ai_ds_api_url' );
define( 'NIPS_AI_DS_OPT_UPDATES_URL', 'nips_ai_ds_updates_url' );
define( 'NIPS_AI_DS_OPT_DEBUG', 'nips_ai_ds_debug_mode' );

require_once NIPS_AI_DS_DIR . 'includes/class-nips-product-mapper.php';
require_once NIPS_AI_DS_DIR . 'includes/class-nips-cloud-client.php';
require_once NIPS_AI_DS_DIR . 'includes/class-nips-drafts-store.php';
require_once NIPS_AI_DS_DIR . 'includes/class-nips-admin.php';
require_once NIPS_AI_DS_DIR . 'includes/class-nips-plugin.php';

register_activation_hook( __FILE__, array( 'NIPS_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'NIPS_Plugin', 'deactivate' ) );

add_action( 'plugins_loaded', array( 'NIPS_Plugin', 'boot' ) );
