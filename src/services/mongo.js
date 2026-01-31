const mongoose = require('mongoose');

// ============================================
// READ-ONLY SCHEMAS (Mirrors appserver models)
// ============================================

const ProductSchema = new mongoose.Schema({
    owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    slug: String,
    tagline: String,
    description: String,
    website_url: String,
    logo_url: String,
    logoKey: String,
    externalLogoUrl: String,
    screenshots: [String],
    screenshotKeys: [String],
    categories: [String],
    tags: [String],
    status: String,
    traffic_enabled: Boolean,
    team_members: [{
        user_id: mongoose.Schema.Types.ObjectId,
        name: String,
        title: String,
        role_type: String,
        avatar_url: String,
        twitter_url: String,
        linkedin_url: String
    }],
    awards: [{
        title: String,
        year: Number,
        source: String
    }],
    avg_rating: Number,
    ratings_count: Number,
    deleted_at: Date,
    created_at: Date,
    updated_at: Date
}, { strict: false });

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    slug: String,
    role: String,
    avatar_url: String,
    bio: String,
    company_name: String,
    role_title: String,
    location: String,
    website: String,
    twitter: String,
    linkedin: String,
    created_at: Date
}, { strict: false });

const ReviewSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    title: String,
    text: String,
    ai_tags: [String],
    sentiment: String,
    status: String,
    created_at: Date
}, { strict: false });

const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);
const Review = mongoose.model('Review', ReviewSchema);

// ============================================
// MONGO SERVICE
// ============================================

class MongoService {
    async connect() {
        const uri = (process.env.MONGO_URI || '').replace('localhost', '127.0.0.1');
        try {
            await mongoose.connect(uri);
            console.log('[Clicky] Connected to MongoDB');
        } catch (err) {
            console.error('[Clicky] MongoDB Connection Error:', err);
        }
    }

    // Extract searchable tokens from query
    _extractTokens(queryText) {
        const extractionRegex = /"([^"]+)"|'([^']+)'|(\b[A-Za-z0-9]+\b)/g;
        const stopWords = ['the', 'a', 'an', 'is', 'are', 'what', 'show', 'me', 'find', 'get', 'list', 'tell', 'about', 'for', 'in', 'by', 'of', 'to', 'and', 'or'];
        const tokens = (queryText.match(extractionRegex) || [])
            .map(t => t.replace(/['"]/g, '').toLowerCase())
            .filter(t => t.length > 2 && !stopWords.includes(t));
        return tokens;
    }

    async executeQuery(intent, queryText) {
        const tokens = this._extractTokens(queryText);
        const searchRegex = tokens.length ? { $regex: tokens.join('|'), $options: 'i' } : null;

        switch (intent) {
            // --- Product Queries ---
            case 'search_products':
            case 'list_alternatives':
                if (!searchRegex) return [];
                return await Product.find({
                    status: 'approved',
                    $or: [
                        { name: searchRegex },
                        { tagline: searchRegex },
                        { description: searchRegex },
                        { categories: searchRegex },
                        { tags: searchRegex }
                    ]
                }).limit(10).lean();

            case 'explain_product':
                if (!searchRegex) return null;
                return await Product.findOne({
                    status: 'approved',
                    $or: [{ name: searchRegex }, { slug: searchRegex }]
                }).lean();

            case 'compare_products':
                if (!searchRegex) return [];
                return await Product.find({
                    status: 'approved',
                    $or: [{ name: searchRegex }]
                }).limit(2).lean();

            case 'category_overview':
                if (!searchRegex) return [];
                return await Product.find({
                    status: 'approved',
                    categories: searchRegex
                }).limit(15).lean();

            case 'trending_products':
                return await Product.find({ status: 'approved' })
                    .sort({ created_at: -1 })
                    .limit(10)
                    .lean();

            case 'top_rated':
                return await Product.find({ status: 'approved', ratings_count: { $gte: 1 } })
                    .sort({ avg_rating: -1, ratings_count: -1 })
                    .limit(10)
                    .lean();

            // --- Category Queries ---
            case 'category_list':
                const categories = await Product.distinct('categories', { status: 'approved' });
                return categories.filter(c => c && c.trim());

            // --- Stats Overview (counts) ---
            case 'stats_overview':
                const founderCount = await User.countDocuments({ role: 'FOUNDER' });
                const productCount = await Product.countDocuments({ status: 'approved' });
                const reviewCount = await Review.countDocuments({ status: 'published' });
                const categoryCount = (await Product.distinct('categories', { status: 'approved' })).filter(c => c).length;
                return {
                    founders: founderCount,
                    products: productCount,
                    reviews: reviewCount,
                    categories: categoryCount
                };

            // --- List All Founders ---
            case 'founder_list':
                return await User.find({ role: 'FOUNDER' })
                    .select('-password_hash -otp_hash -phone_otp_hash')
                    .sort({ created_at: -1 })
                    .limit(20)
                    .lean();

            // --- Founder Queries ---
            case 'founder_lookup':
            case 'founder_profile':
                if (!searchRegex) return null;
                const prod = await Product.findOne({ status: 'approved', name: searchRegex }).lean();
                if (prod && prod.owner_user_id) {
                    return await User.findById(prod.owner_user_id)
                        .select('-password_hash -otp_hash -phone_otp_hash')
                        .lean();
                }
                return await User.findOne({
                    role: 'FOUNDER',
                    $or: [{ name: searchRegex }, { company_name: searchRegex }]
                }).select('-password_hash -otp_hash -phone_otp_hash').lean();

            case 'founder_products':
                if (!searchRegex) return [];
                const founder = await User.findOne({
                    role: 'FOUNDER',
                    $or: [{ name: searchRegex }, { company_name: searchRegex }]
                }).lean();
                if (!founder) return [];
                return await Product.find({
                    status: 'approved',
                    owner_user_id: founder._id
                }).lean();

            // --- Review Queries ---
            case 'product_reviews':
                if (!searchRegex) return [];
                const product = await Product.findOne({
                    status: 'approved',
                    $or: [{ name: searchRegex }, { slug: searchRegex }]
                }).lean();
                if (!product) return [];
                return await Review.find({
                    product_id: product._id,
                    status: 'published'
                }).sort({ created_at: -1 }).limit(10).populate('user_id', 'name avatar_url').lean();

            default:
                return [];
        }
    }
}

module.exports = new MongoService();
