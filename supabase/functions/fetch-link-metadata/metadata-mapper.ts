// Response mapper - transforms Linker API response to LinkMetadata

import type { LinkerAPIResponse, LinkMetadata } from "./types.ts";
import { extractProductFromJsonLd } from "./json-ld-parser.ts";

/**
 * Common HTML entity mappings
 */
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  // German umlauts
  "&auml;": "ä", "&Auml;": "Ä",
  "&ouml;": "ö", "&Ouml;": "Ö",
  "&uuml;": "ü", "&Uuml;": "Ü",
  "&szlig;": "ß",
  // French accents
  "&eacute;": "é", "&Eacute;": "É",
  "&egrave;": "è", "&Egrave;": "È",
  "&ecirc;": "ê", "&Ecirc;": "Ê",
  "&agrave;": "à", "&Agrave;": "À",
  "&acirc;": "â", "&Acirc;": "Â",
  "&ocirc;": "ô", "&Ocirc;": "Ô",
  "&ucirc;": "û", "&Ucirc;": "Û",
  "&ccedil;": "ç", "&Ccedil;": "Ç",
  // Other common entities
  "&ntilde;": "ñ", "&Ntilde;": "Ñ",
  "&iacute;": "í", "&Iacute;": "Í",
  "&oacute;": "ó", "&Oacute;": "Ó",
  "&uacute;": "ú", "&Uacute;": "Ú",
  "&euro;": "€",
  "&pound;": "£",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

/**
 * Decodes HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  // Replace named entities
  let decoded = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, char);
  }

  // Replace numeric entities (decimal): &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );

  // Replace numeric entities (hex): &#x1F; or &#X1F;
  decoded = decoded.replace(/&#[xX]([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return decoded;
}

/**
 * Extracts hostname from URL, returns the original URL if parsing fails
 */
function getHostnameOrUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Maps Linker API response to LinkMetadata format
 *
 * Priority for extraction:
 * 1. JSON-LD Product schema (best structured data)
 * 2. OpenGraph metadata
 * 3. Twitter Card metadata
 * 4. Standard HTML metadata
 * 5. URL hostname (final fallback for title)
 *
 * @param response - The Linker API response
 * @param originalUrl - The original URL that was fetched
 * @returns Normalized LinkMetadata object
 */
export function mapToLinkMetadata(
  response: LinkerAPIResponse,
  originalUrl: string
): LinkMetadata {
  // Initialize with nulls
  let title: string | null = null;
  let description: string | null = null;
  let image_url: string | null = null;
  let price: string | null = null;
  let currency: string | null = null;

  // 1. Try JSON-LD Product first (highest priority for products)
  if (response.json_ld && Array.isArray(response.json_ld)) {
    const product = extractProductFromJsonLd(response.json_ld);
    if (product) {
      title = product.name || null;
      description = product.description || null;
      image_url = product.image || null;
      price = product.price || null;
      currency = product.currency || null;
    }
  }

  // 2. Fallback to OpenGraph
  if (!title && response.opengraph?.title) {
    title = response.opengraph.title;
  }
  if (!description && response.opengraph?.description) {
    description = response.opengraph.description;
  }
  if (!image_url && response.opengraph?.image) {
    image_url = response.opengraph.image;
  }

  // 3. Fallback to Twitter Card
  if (!title && response.twitter?.title) {
    title = response.twitter.title;
  }
  if (!description && response.twitter?.description) {
    description = response.twitter.description;
  }
  if (!image_url && response.twitter?.image) {
    image_url = response.twitter.image;
  }

  // 4. Fallback to standard HTML metadata
  if (!title && response.standard?.title) {
    title = response.standard.title;
  }
  if (!description && response.standard?.description) {
    description = response.standard.description;
  }
  // Use favicon only as last resort for image
  if (!image_url && response.standard?.favicon) {
    image_url = response.standard.favicon;
  }

  // 5. Final fallback for title - use hostname
  if (!title) {
    title = getHostnameOrUrl(originalUrl);
  }

  return {
    title: decodeHtmlEntities(title),
    description: description ? decodeHtmlEntities(description.trim()) : null,
    image_url: image_url || null,
    price: price?.trim() || null,
    currency: currency?.trim() || null,
    url: response.url || originalUrl,
  };
}

/**
 * Creates fallback metadata when API call fails
 */
export function createFallbackMetadata(url: string): LinkMetadata {
  return {
    title: getHostnameOrUrl(url),
    description: null,
    image_url: null,
    price: null,
    currency: null,
    url,
  };
}
