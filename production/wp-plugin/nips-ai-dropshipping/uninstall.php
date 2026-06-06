<?php
/**
 * Uninstall — runs ONLY when the plugin is deleted via Plugins screen.
 * We deliberately do NOT drop import_drafts here — they belong to the customer.
 * Uncomment the DROP TABLE block if you want clean uninstall.
 */
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) { exit; }

delete_option( 'nips_ai_ds_license_key' );
delete_option( 'nips_ai_ds_api_url' );
delete_option( 'nips_ai_ds_updates_url' );
delete_option( 'nips_ai_ds_debug_mode' );

// global $wpdb;
// $wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}nips_import_drafts" );
