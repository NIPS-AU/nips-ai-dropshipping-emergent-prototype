<?php
/**
 * Import List drafts — custom table CRUD.
 *
 * @package NIPS_AI_Dropshipping
 */

defined( 'ABSPATH' ) || exit;

class NIPS_Drafts_Store {

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . NIPS_AI_DS_TABLE_DRAFTS;
	}

	public static function insert( $row ) {
		global $wpdb;
		$wpdb->insert( self::table(), $row );
		return $row['draft_uuid'];
	}

	public static function find_by_uuid( $uuid ) {
		global $wpdb;
		$sql = $wpdb->prepare( 'SELECT * FROM ' . self::table() . ' WHERE draft_uuid=%s', $uuid );
		$row = $wpdb->get_row( $sql, ARRAY_A );
		return $row ?: null;
	}

	public static function list_all( $limit = 500 ) {
		global $wpdb;
		$rows = $wpdb->get_results( 'SELECT * FROM ' . self::table() . ' ORDER BY created_at DESC LIMIT ' . intval( $limit ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public static function patch_uuid( $uuid, $studio_edits ) {
		global $wpdb;
		$wpdb->update(
			self::table(),
			array( 'studio_edits' => wp_json_encode( $studio_edits ) ),
			array( 'draft_uuid' => $uuid )
		);
	}

	public static function delete_uuid( $uuid ) {
		global $wpdb;
		$row = self::find_by_uuid( $uuid );
		$wpdb->delete( self::table(), array( 'draft_uuid' => $uuid ) );
		return array(
			'deleted'              => true,
			'wc_product_preserved' => $row && ! empty( $row['wc_product_id'] ),
		);
	}

	public static function clear_unpublished() {
		global $wpdb;
		return $wpdb->query(
			$wpdb->prepare(
				'DELETE FROM ' . self::table() . ' WHERE publish_status<>%s',
				'published'
			)
		);
	}

	public static function mark_published( $uuid, $wc_product_id, $publish_mode ) {
		global $wpdb;
		$wpdb->update(
			self::table(),
			array(
				'publish_status'  => 'published',
				'wc_product_id'   => intval( $wc_product_id ),
				'wc_publish_mode' => $publish_mode,
			),
			array( 'draft_uuid' => $uuid )
		);
	}
}
