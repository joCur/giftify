// JSON-LD parser for extracting schema.org Product data

interface ProductData {
  name?: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
}

/**
 * Extracts image URL from various schema.org image formats
 */
function extractImage(
  image: unknown
): string | undefined {
  if (!image) return undefined;

  // String format
  if (typeof image === "string") {
    return image;
  }

  // Array format - take first element
  if (Array.isArray(image) && image.length > 0) {
    const first = image[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object" && "url" in first) {
      const url = (first as { url: unknown }).url;
      if (typeof url === "string" && url.length > 0) {
        return url;
      }
    }
  }

  // Object format with url property
  if (typeof image === "object" && image !== null && "url" in image) {
    const url = (image as { url: unknown }).url;
    if (typeof url === "string" && url.length > 0) {
      return url;
    }
  }

  return undefined;
}

/**
 * Extracts price and currency from schema.org Offer(s)
 */
function extractPriceFromOffers(
  offers: unknown
): { price?: string; currency?: string } {
  if (!offers) return {};

  const offerArray = Array.isArray(offers) ? offers : [offers];

  for (const offer of offerArray) {
    if (!offer || typeof offer !== "object") continue;

    const typedOffer = offer as Record<string, unknown>;

    // Handle AggregateOffer with lowPrice
    if (typedOffer["@type"] === "AggregateOffer") {
      const lowPrice = typedOffer.lowPrice;
      if (lowPrice !== undefined && lowPrice !== null) {
        return {
          price: String(lowPrice),
          currency: typeof typedOffer.priceCurrency === "string"
            ? typedOffer.priceCurrency
            : undefined,
        };
      }
    }

    // Handle regular Offer
    const price = typedOffer.price;
    if (price !== undefined && price !== null) {
      return {
        price: String(price),
        currency: typeof typedOffer.priceCurrency === "string"
          ? typedOffer.priceCurrency
          : undefined,
      };
    }
  }

  return {};
}

/**
 * Checks if an item has Product type (handles both string and array @type)
 */
function isProductType(item: Record<string, unknown>): boolean {
  const type = item["@type"];

  if (typeof type === "string") {
    return type === "Product";
  }

  if (Array.isArray(type)) {
    return type.includes("Product");
  }

  return false;
}

/**
 * Extracts product data from JSON-LD array
 * Searches for schema.org Product and extracts name, description, image, price, currency
 *
 * @param jsonLd - Array of JSON-LD objects from the API response
 * @returns Extracted product data or null if no Product found
 */
export function extractProductFromJsonLd(
  jsonLd: unknown[]
): ProductData | null {
  if (!Array.isArray(jsonLd)) return null;

  for (const item of jsonLd) {
    if (!item || typeof item !== "object") continue;

    const typedItem = item as Record<string, unknown>;

    if (!isProductType(typedItem)) continue;

    // Extract basic product fields
    const name = typeof typedItem.name === "string" ? typedItem.name : undefined;
    const description =
      typeof typedItem.description === "string"
        ? typedItem.description
        : undefined;
    const image = extractImage(typedItem.image);
    const { price, currency } = extractPriceFromOffers(typedItem.offers);

    return { name, description, image, price, currency };
  }

  return null;
}
