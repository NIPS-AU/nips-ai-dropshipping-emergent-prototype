<?php
/**
 * Thin HTTP client for the NIPS-AI Cloud API.
 *
 * @package NIPS_AI_Dropshipping
 */

defined( 'ABSPATH' ) || exit;

class NIPS_Cloud_Client {

	public static function api_url() {
		return untrailingslashit( get_option( NIPS_AI_DS_OPT_API_URL, 'https://api.nipsdownloads.com' ) );
	}

	public static function license_key() {
		return (string) get_option( NIPS_AI_DS_OPT_LICENSE, '' );
	}

	private static function headers() {
		return array(
			'Content-Type'        => 'application/json',
			'Accept'              => 'application/json',
			'X-NIPS-License-Key'  => self::license_key(),
			'User-Agent'          => 'NIPS-AI-Dropshipping/' . NIPS_AI_DS_VERSION . '; ' . home_url(),
		);
	}

	/**
	 * Verbatim supplier search.
	 *
	 * @param array $params { query, platform, shipping_from, shipping_to, sort, limit }
	 * @return array|WP_Error  Decoded response body, or WP_Error.
	 */
	public static function supplier_search( $params ) {
		$body = array(
			'query'         => isset( $params['query'] ) ? (string) $params['query'] : '',
			'platform'      => 'aliexpress',
			'shipping_from' => isset( $params['shipping_from'] ) ? (string) $params['shipping_from'] : 'ALL',
			'shipping_to'   => isset( $params['shipping_to'] ) ? (string) $params['shipping_to'] : 'any',
			'sort'          => isset( $params['sort'] ) ? (string) $params['sort'] : 'best_score',
			'limit'         => isset( $params['limit'] ) ? max( 1, min( 60, intval( $params['limit'] ) ) ) : 18,
		);

		$url = self::api_url() . '/v1/suppliers/aliexpress/search';

		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 30,
				'headers' => self::headers(),
				// IMPORTANT: never re-encode user query — wp_json_encode preserves bytes.
				'body'    => wp_json_encode( $body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$raw  = wp_remote_retrieve_body( $response );
		$json = json_decode( $raw, true );

		if ( $code >= 400 ) {
			return new WP_Error(
				'nips_cloud_http_' . $code,
				is_array( $json ) && isset( $json['error'] ) ? (string) $json['error'] : 'Cloud API error',
				array(
					'status'  => $code,
					'body'    => $json,
					'raw'     => $raw,
					'request' => $body,
					'url'     => $url,
				)
			);
		}

		return array(
			'status'   => $code,
			'request'  => $body,
			'url'      => $url,
			'response' => is_array( $json ) ? $json : array(),
			'raw'      => $raw,
		);
	}
}
