/**
 * Founder Data Service - Retrieves authoritative founder/product records
 * for use by AIRA and REX personas
 */

const mongoose = require('mongoose');

// Use existing Product schema from mongo.js
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

class FounderDataService {
    /**
     * Get complete founder context for persona queries
     * @param {string} founderId - Founder user ID
     * @returns {object} Complete context object
     */
    async getFounderContext(founderId) {
        try {
            const context = {};

            // Get founder profile
            const founder = await User.findById(founderId)
                .select('-password_hash -otp_hash -phone_otp_hash')
                .lean();

            if (founder) {
                context.founder = {
                    name: founder.name,
                    email: founder.email,
                    company_name: founder.company_name,
                    bio: founder.bio,
                    location: founder.location,
                    created_at: founder.created_at,
                    verified: founder.verified || false
                };
            }

            // Get founder's products
            const products = await Product.find({
                owner_user_id: founderId,
                status: 'approved'
            }).lean();

            if (products.length > 0) {
                context.products = products.map(p => ({
                    id: p._id,
                    name: p.name,
                    tagline: p.tagline,
                    description: p.description,
                    categories: p.categories,
                    website_url: p.website_url,
                    status: p.status,
                    created_at: p.created_at,
                    avg_rating: p.avg_rating,
                    ratings_count: p.ratings_count
                }));

                // Primary product for detailed context
                context.product = context.products[0];
            }

            // Simulated changelog (would come from EditHistory collection)
            context.changelog = await this._getChangelog(founderId);

            // Verification status
            context.verification = {
                email_verified: founder?.verified || false,
                product_verified: products.some(p => p.verified_status === 'verified'),
                last_check: new Date().toISOString()
            };

            return context;

        } catch (error) {
            console.error('[FounderDataService] Error:', error.message);
            return {};
        }
    }

    /**
     * Get context for a specific product
     */
    async getProductContext(productId) {
        try {
            const context = {};

            const product = await Product.findById(productId).lean();
            if (!product) return {};

            context.product = {
                id: product._id,
                name: product.name,
                tagline: product.tagline,
                description: product.description,
                categories: product.categories,
                tags: product.tags,
                website_url: product.website_url,
                status: product.status,
                created_at: product.created_at,
                avg_rating: product.avg_rating,
                ratings_count: product.ratings_count,
                team_members: product.team_members,
                features: product.features
            };

            // Get founder
            if (product.owner_user_id) {
                const founder = await User.findById(product.owner_user_id)
                    .select('-password_hash -otp_hash -phone_otp_hash')
                    .lean();

                if (founder) {
                    context.founder = {
                        name: founder.name,
                        company_name: founder.company_name
                    };
                }
            }

            // Changelog
            context.changelog = await this._getChangelog(null, productId);

            return context;

        } catch (error) {
            console.error('[FounderDataService] Error:', error.message);
            return {};
        }
    }

    /**
     * Get edit changelog (placeholder - implement with EditHistory collection)
     */
    async _getChangelog(founderId = null, productId = null) {
        // This would query an EditHistory collection
        // For now, return empty to indicate no data
        return [];
    }
}

module.exports = new FounderDataService();
