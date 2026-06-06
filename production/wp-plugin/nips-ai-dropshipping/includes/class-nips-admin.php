<?php
/**
 * Admin UI — menu, pages and AJAX handlers.
 *
 * @package NIPS_AI_Dropshipping
 */

defined( 'ABSPATH' ) || exit;

class NIPS_Admin {

	const CAP    = 'manage_woocommerce';
	const NONCE  = 'nips_ai_ds_nonce';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );

		// AJAX endpoints — all are admin_action_callbacks.
		add_action( 'wp_ajax_nips_supplier_search', array( __CLASS__, 'ajax_supplier_search' ) );
		add_action( 'wp_ajax_nips_import_draft',   array( __CLASS__, 'ajax_import_draft' ) );
		add_action( 'wp_ajax_nips_list_drafts',    array( __CLASS__, 'ajax_list_drafts' ) );
		add_action( 'wp_ajax_nips_get_draft',      array( __CLASS__, 'ajax_get_draft' ) );
		add_action( 'wp_ajax_nips_patch_draft',    array( __CLASS__, 'ajax_patch_draft' ) );
		add_action( 'wp_ajax_nips_delete_draft',   array( __CLASS__, 'ajax_delete_draft' ) );
		add_action( 'wp_ajax_nips_clear_drafts',   array( __CLASS__, 'ajax_clear_drafts' ) );

		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
	}

	public static function register_menu() {
		$cap = self::CAP;
		add_menu_page( 'NIPS-AI Dropshipping', 'NIPS-AI', $cap, 'nips-ai-ds', array( __CLASS__, 'page_dashboard' ), 'dashicons-cart', 56 );
		add_submenu_page( 'nips-ai-ds', 'Dashboard',         'Dashboard',         $cap, 'nips-ai-ds', array( __CLASS__, 'page_dashboard' ) );
		add_submenu_page( 'nips-ai-ds', 'Product Discovery', 'Product Discovery', $cap, 'nips-ai-ds-discovery',  array( __CLASS__, 'page_discovery' ) );
		add_submenu_page( 'nips-ai-ds', 'Import List',       'Import List',       $cap, 'nips-ai-ds-imports',    array( __CLASS__, 'page_import_list' ) );
		add_submenu_page( 'nips-ai-ds', 'Product Studio',    'Product Studio',    $cap, 'nips-ai-ds-studio',     array( __CLASS__, 'page_product_studio' ) );
		add_submenu_page( 'nips-ai-ds', 'Settings',          'Settings',          $cap, 'nips-ai-ds-settings',   array( __CLASS__, 'page_settings' ) );
	}

	public static function register_settings() {
		register_setting( 'nips_ai_ds_settings', NIPS_AI_DS_OPT_LICENSE,    array( 'sanitize_callback' => 'sanitize_text_field' ) );
		register_setting( 'nips_ai_ds_settings', NIPS_AI_DS_OPT_API_URL,    array( 'sanitize_callback' => 'esc_url_raw' ) );
		register_setting( 'nips_ai_ds_settings', NIPS_AI_DS_OPT_UPDATES_URL,array( 'sanitize_callback' => 'esc_url_raw' ) );
		register_setting( 'nips_ai_ds_settings', NIPS_AI_DS_OPT_DEBUG,      array( 'sanitize_callback' => 'sanitize_text_field' ) );
	}

	public static function enqueue_assets( $hook ) {
		// Only load on our admin pages.
		if ( strpos( (string) $hook, 'nips-ai-ds' ) === false ) {
			return;
		}
		wp_enqueue_style( 'nips-ai-ds-admin', NIPS_AI_DS_URL . 'admin/assets/css/admin.css', array(), NIPS_AI_DS_VERSION );

		$base = array(
			'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
			'nonce'    => wp_create_nonce( self::NONCE ),
			'apiUrl'   => NIPS_Cloud_Client::api_url(),
			'debug'    => '1' === (string) get_option( NIPS_AI_DS_OPT_DEBUG, '0' ),
			'license'  => NIPS_Cloud_Client::license_key(),
			'sortOptions' => array(
				array( 'value' => 'best_score',       'label' => 'Best dropshipping score' ),
				array( 'value' => 'cheapest',         'label' => 'Cheapest supplier price' ),
				array( 'value' => 'profit_top',       'label' => 'Highest estimated profit' ),
				array( 'value' => 'profit_pct_top',   'label' => 'Highest profit %' ),
				array( 'value' => 'best_rating',      'label' => 'Best rating' ),
				array( 'value' => 'most_orders',      'label' => 'Most orders' ),
				array( 'value' => 'fastest_shipping', 'label' => 'Fastest shipping' ),
				array( 'value' => 'free_shipping',    'label' => 'Free shipping only' ),
				array( 'value' => 'min_reviews_100',  'label' => '100+ reviews only' ),
			),
			'shipFrom' => array( 'ALL','CN','US','UK','DE','ES','AU','TR' ),
			'shipTo'   => array( 'any','US','UK','AU','DE','FR','CA','NL','ES' ),
		);

		if ( false !== strpos( (string) $hook, 'discovery' ) ) {
			wp_enqueue_script( 'nips-ai-ds-discovery', NIPS_AI_DS_URL . 'admin/assets/js/discovery.js', array(), NIPS_AI_DS_VERSION, true );
			wp_localize_script( 'nips-ai-ds-discovery', 'NIPS_AI_DS', $base );
		} elseif ( false !== strpos( (string) $hook, 'imports' ) ) {
			wp_enqueue_script( 'nips-ai-ds-imports', NIPS_AI_DS_URL . 'admin/assets/js/import-list.js', array(), NIPS_AI_DS_VERSION, true );
			wp_localize_script( 'nips-ai-ds-imports', 'NIPS_AI_DS', $base );
		} elseif ( false !== strpos( (string) $hook, 'studio' ) ) {
			wp_enqueue_script( 'nips-ai-ds-studio', NIPS_AI_DS_URL . 'admin/assets/js/product-studio.js', array(), NIPS_AI_DS_VERSION, true );
			wp_localize_script( 'nips-ai-ds-studio', 'NIPS_AI_DS', $base );
		}
	}

	// ── Page renderers ────────────────────────────────────────────────────
	public static function page_dashboard()      { include NIPS_AI_DS_DIR . 'admin/views/dashboard.php'; }
	public static function page_discovery()      { include NIPS_AI_DS_DIR . 'admin/views/discovery.php'; }
	public static function page_import_list()    { include NIPS_AI_DS_DIR . 'admin/views/import-list.php'; }
	public static function page_product_studio() { include NIPS_AI_DS_DIR . 'admin/views/product-studio.php'; }
	public static function page_settings()       { include NIPS_AI_DS_DIR . 'admin/views/settings.php'; }

	// ── AJAX handlers ─────────────────────────────────────────────────────
	private static function authorise() {
		if ( ! current_user_can( self::CAP ) ) {
			wp_send_json_error( array( 'error' => 'forbidden' ), 403 );
		}
		check_ajax_referer( self::NONCE, 'nonce' );
	}

	public static function ajax_supplier_search() {
		self::authorise();
		$params = array(
			// IMPORTANT: query is taken verbatim — no sanitize_text_field which would
			// collapse whitespace / strip characters. We escape on output, not input.
			'query'         => isset( $_POST['query'] ) ? wp_unslash( (string) $_POST['query'] ) : '',
			'shipping_from' => isset( $_POST['shipping_from'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['shipping_from'] ) ) : 'ALL',
			'shipping_to'   => isset( $_POST['shipping_to'] )   ? sanitize_text_field( wp_unslash( (string) $_POST['shipping_to'] ) )   : 'any',
			'sort'          => isset( $_POST['sort'] )          ? sanitize_text_field( wp_unslash( (string) $_POST['sort'] ) )          : 'best_score',
			'limit'         => isset( $_POST['limit'] )         ? intval( $_POST['limit'] )                                              : 18,
		);
		if ( '' === $params['query'] ) {
			wp_send_json_error( array( 'error' => 'query_required' ), 400 );
		}

		$result = NIPS_Cloud_Client::supplier_search( $params );
		if ( is_wp_error( $result ) ) {
			wp_send_json_error( array(
				'error'   => $result->get_error_code(),
				'message' => $result->get_error_message(),
				'data'    => $result->get_error_data(),
			), 502 );
		}

		$resp  = isset( $result['response'] ) && is_array( $result['response'] ) ? $result['response'] : array();
		$items = isset( $resp['results'] ) && is_array( $resp['results'] ) ? $resp['results'] : array();

		// Normalise each item into the canonical product object.
		$products = array_map( array( 'NIPS_Product_Mapper', 'normalize' ), $items );

		wp_send_json_success( array(
			'request'             => $result['request'],
			'request_url'         => $result['url'],
			'status'              => $result['status'],
			'exact_query_received'=> isset( $resp['query'] ) ? (string) $resp['query'] : '',
			'mode'                => isset( $resp['mode'] ) ? (string) $resp['mode'] : '',
			'sort'                => isset( $resp['sort'] ) ? (string) $resp['sort'] : '',
			'shipping_from'       => isset( $resp['shipping_from'] ) ? (string) $resp['shipping_from'] : '',
			'shipping_to'         => isset( $resp['shipping_to'] ) ? (string) $resp['shipping_to'] : '',
			'exact_match'         => ! empty( $resp['exact_match'] ),
			'count'               => isset( $resp['count'] ) ? intval( $resp['count'] ) : count( $products ),
			'results'             => $products,
			'raw_response'        => $resp,
		) );
	}

	public static function ajax_import_draft() {
		self::authorise();
		$product_id       = isset( $_POST['product_id'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['product_id'] ) ) : '';
		$isolate_variants = ! empty( $_POST['isolate_variants'] );
		// The frontend passes the full canonical product object as JSON so we
		// don't need to re-fetch it (it has already been verified by Discovery).
		$raw = isset( $_POST['product'] ) ? wp_unslash( (string) $_POST['product'] ) : '';
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			wp_send_json_error( array( 'error' => 'product_payload_required' ), 400 );
		}
		$product = NIPS_Product_Mapper::normalize( $decoded );
		if ( $product['product_id'] !== $product_id ) {
			wp_send_json_error( array( 'error' => 'product_id_mismatch' ), 400 );
		}

		$inserted = array();
		if ( $isolate_variants && ! empty( $product['variants'] ) ) {
			foreach ( $product['variants'] as $variant ) {
				$row  = NIPS_Product_Mapper::to_draft( $product, $variant );
				$uuid = NIPS_Drafts_Store::insert( $row );
				$inserted[] = $uuid;
			}
		} else {
			$row  = NIPS_Product_Mapper::to_draft( $product );
			$uuid = NIPS_Drafts_Store::insert( $row );
			$inserted[] = $uuid;
		}
		wp_send_json_success( array( 'inserted' => $inserted ) );
	}

	public static function ajax_list_drafts() {
		self::authorise();
		$rows     = NIPS_Drafts_Store::list_all();
		$products = array_map( array( 'NIPS_Product_Mapper', 'inflate_draft' ), $rows );
		wp_send_json_success( array( 'drafts' => $products ) );
	}

	public static function ajax_get_draft() {
		self::authorise();
		$uuid = isset( $_GET['draft_uuid'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['draft_uuid'] ) ) : '';
		$row  = NIPS_Drafts_Store::find_by_uuid( $uuid );
		if ( ! $row ) {
			wp_send_json_error( array( 'error' => 'draft_not_found' ), 404 );
		}
		wp_send_json_success( array( 'draft' => NIPS_Product_Mapper::inflate_draft( $row ) ) );
	}

	public static function ajax_patch_draft() {
		self::authorise();
		$uuid = isset( $_POST['draft_uuid'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['draft_uuid'] ) ) : '';
		$raw  = isset( $_POST['edits'] ) ? wp_unslash( (string) $_POST['edits'] ) : '';
		$edits = json_decode( $raw, true );
		if ( ! is_array( $edits ) ) {
			wp_send_json_error( array( 'error' => 'edits_required' ), 400 );
		}
		NIPS_Drafts_Store::patch_uuid( $uuid, $edits );
		$row = NIPS_Drafts_Store::find_by_uuid( $uuid );
		wp_send_json_success( array( 'draft' => NIPS_Product_Mapper::inflate_draft( $row ) ) );
	}

	public static function ajax_delete_draft() {
		self::authorise();
		$uuid = isset( $_POST['draft_uuid'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['draft_uuid'] ) ) : '';
		wp_send_json_success( NIPS_Drafts_Store::delete_uuid( $uuid ) );
	}

	public static function ajax_clear_drafts() {
		self::authorise();
		$count = NIPS_Drafts_Store::clear_unpublished();
		wp_send_json_success( array( 'deleted' => intval( $count ) ) );
	}
}
