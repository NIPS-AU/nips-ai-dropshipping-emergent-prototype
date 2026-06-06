<?php
/**
 * Canonical product object — single source of truth.
 *
 * The Cloud API returns a product object with a fixed set of fields. Every
 * piece of UI (Discovery cards, Import List, Product Studio) reads from this
 * normalised structure, so the contract stays identical end-to-end.
 *
 * @package NIPS_AI_Dropshipping
 */

defined( 'ABSPATH' ) || exit;

class NIPS_Product_Mapper {

	/**
	 * Canonical field list — the public contract.
	 *
	 * @return string[]
	 */
	public static function canonical_fields() {
		return array(
			'product_id', 'sku', 'title', 'product_url', 'supplier_url',
			'price', 'retail_price', 'profit_estimate', 'profit_pct', 'currency',
			'category', 'tags',
			'main_image', 'gallery_images', 'description_images',
			'description', 'specifications', 'attributes', 'variants',
			'shipping_method', 'shipping_price', 'shipping_from', 'shipping_to',
			'estimated_delivery', 'has_shipping', 'free_shipping',
			'rating', 'orders', 'stock',
			'supplier', 'meta',
		);
	}

	/**
	 * Normalise a raw cloud response item into the canonical shape.
	 * Always returns every canonical key (null/empty when missing) so the UI
	 * does not have to defend against undefined.
	 *
	 * @param array $raw Raw item from the cloud response.
	 * @return array
	 */
	public static function normalize( $raw ) {
		$raw      = is_array( $raw ) ? $raw : array();
		$supplier = isset( $raw['supplier'] ) && is_array( $raw['supplier'] ) ? $raw['supplier'] : array();
		$meta     = isset( $raw['meta'] ) && is_array( $raw['meta'] ) ? $raw['meta'] : array();

		$price        = isset( $raw['price'] ) ? floatval( $raw['price'] ) : 0.0;
		$retail_price = isset( $raw['retail_price'] ) ? floatval( $raw['retail_price'] ) : 0.0;
		$profit       = isset( $raw['profit_estimate'] )
			? floatval( $raw['profit_estimate'] )
			: round( $retail_price - $price, 2 );

		return array(
			'product_id'         => self::s( $raw, 'product_id' ),
			'sku'                => self::s( $raw, 'sku' ),
			'title'              => self::s( $raw, 'title' ),
			'product_url'        => self::s( $raw, 'product_url', self::s( $raw, 'supplier_url' ) ),
			'supplier_url'       => self::s( $raw, 'supplier_url', self::s( $raw, 'product_url' ) ),
			'price'              => $price,
			'retail_price'       => $retail_price,
			'profit_estimate'    => $profit,
			'profit_pct'         => isset( $meta['profit_pct'] ) ? floatval( $meta['profit_pct'] ) : null,
			'currency'           => self::s( $raw, 'currency', 'USD' ),
			'category'           => self::s( $raw, 'category' ),
			'tags'               => self::a( $raw, 'tags' ),
			'main_image'         => self::s( $raw, 'main_image' ),
			'gallery_images'     => self::a( $raw, 'gallery_images' ),
			'description_images' => self::a( $raw, 'description_images' ),
			'description'        => self::s( $raw, 'description' ),
			'specifications'     => self::a( $raw, 'specifications' ),
			'attributes'         => self::a( $raw, 'attributes' ),
			'variants'           => self::a( $raw, 'variants' ),
			'shipping_method'    => self::s( $raw, 'shipping_method' ),
			'shipping_price'     => isset( $raw['shipping_price'] ) ? floatval( $raw['shipping_price'] ) : 0.0,
			'shipping_from'      => self::s( $raw, 'shipping_from' ),
			'shipping_to'        => self::s( $raw, 'shipping_to' ),
			'estimated_delivery' => self::s( $raw, 'estimated_delivery' ),
			'has_shipping'       => ! empty( $raw['has_shipping'] ),
			'free_shipping'      => ! empty( $raw['free_shipping'] ) || ( ! empty( $raw['has_shipping'] ) && 0.0 === floatval( $raw['shipping_price'] ?? 0 ) ),
			'rating'             => isset( $raw['rating'] ) ? floatval( $raw['rating'] ) : ( isset( $supplier['rating'] ) ? floatval( $supplier['rating'] ) : 0.0 ),
			'orders'             => isset( $raw['orders'] ) ? intval( $raw['orders'] ) : ( isset( $meta['orders'] ) ? intval( $meta['orders'] ) : 0 ),
			'stock'              => isset( $raw['stock'] ) ? intval( $raw['stock'] ) : 0,
			'supplier'           => array(
				'name'           => self::s( $supplier, 'name' ),
				'store_url'      => self::s( $supplier, 'store_url' ),
				'rating'         => isset( $supplier['rating'] ) ? floatval( $supplier['rating'] ) : 0.0,
				'feedback_count' => isset( $supplier['feedback_count'] ) ? intval( $supplier['feedback_count'] ) : 0,
				'country'        => self::s( $supplier, 'country' ),
			),
			'meta'               => $meta,
		);
	}

	/**
	 * Build a draft row (DB shape) from a canonical product, optionally
	 * isolating one variant as its own draft.
	 *
	 * @param array      $product           Canonical product.
	 * @param array|null $isolated_variant  Optional variant to isolate.
	 * @return array
	 */
	public static function to_draft( $product, $isolated_variant = null ) {
		$payload = $product;

		if ( $isolated_variant && is_array( $isolated_variant ) ) {
			$title  = $product['title'] . ' — ' . ( $isolated_variant['title'] ?? '' );
			$price  = isset( $isolated_variant['price'] ) ? floatval( $isolated_variant['price'] ) : $product['price'];
			$retail = isset( $isolated_variant['retail_price'] ) ? floatval( $isolated_variant['retail_price'] ) : $product['retail_price'];
			return array(
				'draft_uuid'        => self::uuid(),
				'product_id'        => $product['product_id'],
				'parent_product_id' => $product['product_id'],
				'variant_id'        => $isolated_variant['variant_id'] ?? null,
				'is_variant_draft'  => 1,
				'sku'               => $isolated_variant['sku'] ?? $product['sku'],
				'title'             => $title,
				'supplier_url'      => $product['supplier_url'],
				'product_url'       => $product['product_url'],
				'price'             => $price,
				'retail_price'      => $retail,
				'profit_estimate'   => round( $retail - $price, 2 ),
				'currency'          => $product['currency'],
				'category'          => $product['category'],
				'main_image'        => $isolated_variant['image'] ?? $product['main_image'],
				'payload'           => wp_json_encode( $payload ),
				'publish_status'    => 'draft',
			);
		}

		return array(
			'draft_uuid'        => self::uuid(),
			'product_id'        => $product['product_id'],
			'parent_product_id' => null,
			'variant_id'        => null,
			'is_variant_draft'  => 0,
			'sku'               => $product['sku'],
			'title'             => $product['title'],
			'supplier_url'      => $product['supplier_url'],
			'product_url'       => $product['product_url'],
			'price'             => $product['price'],
			'retail_price'      => $product['retail_price'],
			'profit_estimate'   => $product['profit_estimate'],
			'currency'          => $product['currency'],
			'category'          => $product['category'],
			'main_image'        => $product['main_image'],
			'payload'           => wp_json_encode( $payload ),
			'publish_status'    => 'draft',
		);
	}

	/**
	 * Inflate a draft row back into the canonical product (for Product Studio).
	 *
	 * @param object|array $row DB row.
	 * @return array
	 */
	public static function inflate_draft( $row ) {
		$row = (array) $row;
		$payload = isset( $row['payload'] ) ? json_decode( $row['payload'], true ) : array();
		$studio  = isset( $row['studio_edits'] ) && $row['studio_edits'] ? json_decode( $row['studio_edits'], true ) : array();
		$ai      = isset( $row['ai_history'] ) && $row['ai_history'] ? json_decode( $row['ai_history'], true ) : array();

		$product = is_array( $payload ) ? self::normalize( $payload ) : array();
		// Studio edits override payload fields on top.
		if ( is_array( $studio ) ) {
			foreach ( $studio as $k => $v ) {
				$product[ $k ] = $v;
			}
			if ( isset( $studio['retail_price'] ) ) {
				$product['profit_estimate'] = round( floatval( $studio['retail_price'] ) - $product['price'], 2 );
			}
		}

		$product['_draft'] = array(
			'draft_uuid'     => $row['draft_uuid'] ?? null,
			'draft_id'       => isset( $row['draft_id'] ) ? intval( $row['draft_id'] ) : null,
			'is_variant'     => ! empty( $row['is_variant_draft'] ),
			'publish_status' => $row['publish_status'] ?? 'draft',
			'wc_product_id'  => isset( $row['wc_product_id'] ) ? intval( $row['wc_product_id'] ) : null,
			'studio_edits'   => is_array( $studio ) ? $studio : array(),
			'ai_history'     => is_array( $ai ) ? $ai : array(),
			'created_at'     => $row['created_at'] ?? null,
			'updated_at'     => $row['updated_at'] ?? null,
		);
		return $product;
	}

	private static function s( $arr, $key, $default = '' ) {
		return isset( $arr[ $key ] ) && is_scalar( $arr[ $key ] ) ? (string) $arr[ $key ] : $default;
	}

	private static function a( $arr, $key ) {
		return isset( $arr[ $key ] ) && is_array( $arr[ $key ] ) ? $arr[ $key ] : array();
	}

	public static function uuid() {
		return wp_generate_uuid4();
	}
}
