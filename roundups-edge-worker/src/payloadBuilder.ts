export interface CampaignData {
    campaign_id: string;
    product_urls?: string[];
    affiliate_url?: string;
    keywords?: string;
    is_software?: boolean;
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
        // CRITICAL CONSTRAINT 2: Force product_type to "unified"
        product_type: "unified",
        product_urls: product_urls,
        keywords: keywords,
        // CRITICAL CONSTRAINT 3: Hardcode styles
        styles: {
            optimize_output_for: "wordpress",
            tone_of_voice: "Authoritative",
            comparison_table_enabled: true
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

    if (payload.keywords !== undefined && typeof payload.keywords !== 'string') {
        return { isValid: false, error: "Invalid field: 'keywords' must be a string" };
    }

    return { isValid: true };
}
