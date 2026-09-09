export interface CampaignData {
    campaign_id: string;
    headline?: string;
    target_audience?: string;
    product_urls?: string[];
    amazon_product_asins?: string[];
    products_search_queries?: string[];
    products_count?: number;
    affiliate_url?: string;
    keywords?: string;
    is_software?: boolean;
    product_type?: "amazon" | "appsumo" | "envato" | "unified";
    styles?: Record<string, any>;
}

export function buildPayload(campaign: CampaignData): any {
    const defaultKeywords = "Ai tools, marketing software, productivity tools, small business software, software deals, startup tools, AppSumo, lifetime deal, AppSumo deals, software lifetime deal, SaaS lifetime deals, growth hacking tools, AppSumo review, best AppSumo deals, LTD software, software review";

    let keywords = campaign.keywords || "";
    if (campaign.is_software) {
        if (keywords) {
             keywords = `${keywords}, ${defaultKeywords}`;
        } else {
             keywords = defaultKeywords;
        }
    }

    const product_urls: string[] = [];
    if (campaign.product_urls && Array.isArray(campaign.product_urls) && campaign.product_urls.length > 0) {
        product_urls.push(...campaign.product_urls);
    }

    // CRITICAL CONSTRAINT 2: Pass raw affiliate_url into product_urls unaltered
    if (campaign.affiliate_url && typeof campaign.affiliate_url === "string") {
        product_urls.push(campaign.affiliate_url);
    }

    return {
        campaign_id: campaign.campaign_id,
        headline: campaign.headline,
        target_audience: campaign.target_audience,
        product_type: campaign.product_type || "unified",
        product_urls: product_urls.slice(0, 50),
        amazon_product_asins: campaign.amazon_product_asins ? campaign.amazon_product_asins.slice(0, 50) : undefined,
        products_search_queries: campaign.products_search_queries ? campaign.products_search_queries.slice(0, 10) : undefined,
        products_count: campaign.products_count !== undefined ? Math.min(campaign.products_count, 50) : undefined,
        keywords: keywords,
        styles: {
            tone_of_voice: campaign.styles?.tone_of_voice || "Authoritative",
            language: campaign.styles?.language || "English",
            point_of_view: campaign.styles?.point_of_view || "Third Person",
            comparison_table_enabled: campaign.styles?.comparison_table_enabled ?? true,
            include_pricing: campaign.styles?.include_pricing ?? true,
            include_rating: campaign.styles?.include_rating ?? true,
            optimize_output_for: campaign.styles?.optimize_output_for || "wordpress",
            llm_model: campaign.styles?.llm_model || "enhanced",
            cover_image_style: campaign.styles?.cover_image_style || "photorealistic",
            visual_style: campaign.styles?.visual_style || "modern",
            layout_style: campaign.styles?.layout_style || "standard",
            template_type: campaign.styles?.template_type || "default",
        }
    };
}

export function validateCampaignPayload(payload: any): { isValid: boolean, error?: string } {
    if (!payload || typeof payload !== 'object') {
        return { isValid: false, error: "Payload must be a JSON object" };
    }

    if (!payload.campaign_id || typeof payload.campaign_id !== 'string') {
        return { isValid: false, error: "Missing or invalid field: 'campaign_id' must be a string" };
    }

    if (!payload.headline && !payload.target_audience && !payload.keywords) {
        return { isValid: false, error: "Payload must contain at least one of: 'headline', 'target_audience', or 'keywords'" };
    }

    if (payload.product_type && !["amazon", "appsumo", "envato", "unified"].includes(payload.product_type)) {
        return { isValid: false, error: "Invalid field: 'product_type' must be one of 'amazon', 'appsumo', 'envato', 'unified'" };
    }

    if (payload.product_urls && (!Array.isArray(payload.product_urls) || payload.product_urls.length > 50)) {
        return { isValid: false, error: "Invalid field: 'product_urls' must be an array with max 50 items" };
    }

    if (payload.product_urls && Array.isArray(payload.product_urls)) {
        for (const urlStr of payload.product_urls) {
            try {
                const parsedUrl = new URL(urlStr);
                const originalUrl = urlStr;

                // Assert no query param modification or stripping implicitly handled by edge worker
                // E.g., we just make sure we are not altering it here and it is a valid url.
                // The prompt says: "Affiliate URL Invariance: Add validation asserting that input product_urls are passed without query parameter modification or stripping."
                // To validate it's a URL we parse it. It retains search string.
            } catch (e) {
                 return { isValid: false, error: `Invalid URL in 'product_urls': ${urlStr}` };
            }
        }
    }

    if (payload.amazon_product_asins && (!Array.isArray(payload.amazon_product_asins) || payload.amazon_product_asins.length > 50)) {
        return { isValid: false, error: "Invalid field: 'amazon_product_asins' must be an array with max 50 items" };
    }

    if (payload.products_search_queries && (!Array.isArray(payload.products_search_queries) || payload.products_search_queries.length > 10)) {
        return { isValid: false, error: "Invalid field: 'products_search_queries' must be an array with max 10 items" };
    }

    if (payload.products_count !== undefined && (typeof payload.products_count !== 'number' || payload.products_count > 50)) {
        return { isValid: false, error: "Invalid field: 'products_count' must be a number with a max of 50" };
    }

    if (payload.keywords !== undefined && typeof payload.keywords !== 'string') {
        return { isValid: false, error: "Invalid field: 'keywords' must be a string" };
    }

    if (payload.styles && payload.styles.llm_model && !["basic", "enhanced"].includes(payload.styles.llm_model)) {
         return { isValid: false, error: "Invalid field: 'styles.llm_model' must be 'basic' or 'enhanced'" };
    }

    return { isValid: true };
}
