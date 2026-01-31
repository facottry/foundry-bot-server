/**
 * Founder Data Service - Retrieves authoritative founder/product records
 * for use by AIRA and REX personas
 */

const mongoose = require('mongoose');

// Use existing Product schema from mongo.js
// Use existing Product schema or define minimal loose schema with key query fields
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
    owner_user_id: mongoose.Schema.Types.Mixed, // Allow ObjectId or String
    name: String,
    status: String
}, { strict: false }));
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String
}, { strict: false }));

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
            console.log(`[FounderData] Looking up founder: ${founderId}`);
            const founder = await User.findById(founderId)
                .select('-password_hash -otp_hash -phone_otp_hash')
                .lean();

            if (founder) {
                console.log(`[FounderData] Found User: ${founder.name} (${founder.email})`);
                context.founder = {
                    _id: founder._id, // Required for actions
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
            // Hybrid query to handle both String and ObjectId storage
            const queryIds = mongoose.Types.ObjectId.isValid(founderId)
                ? [founderId, new mongoose.Types.ObjectId(founderId)]
                : [founderId];

            const products = await Product.find({
                owner_user_id: { $in: queryIds }
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

    /**
     * Search for similar products in the global database (Public)
     */
    async findSimilarProducts(targetName) {
        try {
            // Simple approach: Find products with similar names or in same category (mock for now)
            // Real impl would be vector search or at least category match
            // Here we just return 3 random approved products that aren't the target
            const Product = mongoose.model('Product');

            // If targetName provided, maybe match?
            // For now, return trending/top products as "similar" discovery
            const similar = await Product.find({
                status: 'approved',
                name: { $ne: targetName }
            }).limit(3).lean();

            return similar;
        } catch (err) {
            console.error('Error finding similar products:', err);
            return [];
        }
    }

    /**
     * Execute product update action
     */
    async updateProduct(founderId, productId, updateData) {
        // Hybrid query for owner_user_id
        const queryIds = mongoose.Types.ObjectId.isValid(founderId)
            ? [founderId, new mongoose.Types.ObjectId(founderId)]
            : [founderId];

        const product = await Product.findOne({
            _id: productId,
            owner_user_id: { $in: queryIds }
        });

        if (!product) {
            console.error(`[FounderData] Update failed: Product ${productId} not found for user ${founderId}`);
            throw new Error("Product not found or access denied");
        }

        console.log(`[FounderData] Updating Product ${product.name}:`, updateData);

        // Allow allowed fields
        const allowed = ['name', 'tagline', 'description', 'website_url', 'categories', 'tags'];
        allowed.forEach(field => {
            if (updateData[field] !== undefined) {
                product[field] = updateData[field];
            }
        });

        // Simple slug regeneration if name changed
        if (updateData.name) {
            product.slug = updateData.name
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')     // Replace spaces with -
                .replace(/[^\w\-]+/g, '') // Remove all non-word chars
                .replace(/\-\-+/g, '-');  // Replace multiple - with single -
        }

        await product.save();
        return product;
    }
}

module.exports = new FounderDataService();
