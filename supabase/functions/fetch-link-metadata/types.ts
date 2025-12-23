// Linker API request/response types
export interface LinkerAPIRequest {
  url: string;
  include_json_ld?: boolean;
  skip_cache?: boolean;
}

export interface LinkerAPIResponse {
  url: string;
  standard: {
    title?: string;
    description?: string;
    keywords?: string;
    author?: string;
    canonical_url?: string;
    favicon?: string;
  };
  opengraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    site_name?: string;
    type?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };
  json_ld?: unknown[];
  custom?: Record<string, string>;
  cached?: boolean;
  error?: string;
}

// Schema.org Product types (subset of what we need)
export interface SchemaOffer {
  "@type"?: "Offer" | "AggregateOffer";
  price?: string | number;
  priceCurrency?: string;
  lowPrice?: string | number;
  highPrice?: string | number;
  availability?: string;
}

export interface SchemaProduct {
  "@type"?: "Product" | string[];
  name?: string;
  description?: string;
  image?: string | string[] | { url: string } | { url: string }[];
  offers?: SchemaOffer | SchemaOffer[];
  brand?: { name?: string } | string;
  sku?: string;
}

// Domain model - matches existing LinkMetadata interface
export interface LinkMetadata {
  title: string;
  description: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  url: string;
}
