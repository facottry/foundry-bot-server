/**
 * DATABASE SCHEMA KNOWLEDGE for REX
 * This file contains text descriptions of the database schemas to inform the AI about valid fields and structures.
 */

const PRODUCT_SCHEMA_DEF = `
COLLECTION: products
FIELDS:
- owner_user_id: ObjectId (User)
- name: String (Required)
- slug: String (Unique)
- tagline: String (Required)
- description: String (Required)
- website_url: String (Required)
- logo_url: String
- logoKey: String (R2 Key)
- externalLogoUrl: String
- screenshots: [String]
- screenshotKeys: [String] (R2 Keys)
- categories: [String]
- tags: [String]
- status: String ('pending', 'approved', 'rejected')
- verified_status: String ('unverified', 'verified')
- verified_domain: String
- verified_at: Date
- verification_method: String
- traffic_enabled: Boolean
- team_members: [{ user_id, name, title, role_type, avatar_url }]
- avg_rating: Number
- ratings_count: Number
`;

const USER_SCHEMA_DEF = `
COLLECTION: users
FIELDS:
- name: String
- email: String
- role: String ('CUSTOMER', 'FOUNDER', 'ADMIN')
- company_name: String
- bio: String
- location: String
- website: String
- verified: Boolean
- created_at: Date
`;

const getDatabaseSchemaSummary = () => {
    return `
DATABASE SCHEMAS:
-----------------
${PRODUCT_SCHEMA_DEF}

${USER_SCHEMA_DEF}
-----------------
`;
};

module.exports = { getDatabaseSchemaSummary };
