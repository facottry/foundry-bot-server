const mongoose = require('mongoose');
const founderData = require('../src/personas/founderData');
require('dotenv').config();

// Get models AFTER they are initialized in founderData
const Product = mongoose.model('Product');
const User = mongoose.model('User');

const debugParams = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find Product "OpenClaw"
        const product = await Product.findOne({ name: 'OpenClaw' });
        if (!product) {
            console.log('❌ Product "OpenClaw" NOT FOUND');
            return;
        }
        console.log(`✅ Product Found: ${product.name} (ID: ${product._id})`);
        console.log(`   Owner ID: ${product.owner_user_id}`);
        console.log(`   Owner ID Type: ${typeof product.owner_user_id}`);
        console.log(`   Owner ID Constructor: ${product.owner_user_id.constructor.name}`);

        // 2. Find Owner
        const user = await User.findById(product.owner_user_id);
        if (!user) {
            console.log('❌ Owner User NOT FOUND');
        } else {
            console.log(`✅ Owner Found: ${user.name} (ID: ${user._id})`);
        }

        // 3. Test founderData.getFounderContext
        console.log('\n--- Testing getFounderContext ---');
        const context = await founderData.getFounderContext(product.owner_user_id.toString());

        console.log('Context Keys:', Object.keys(context));
        if (context.products) {
            console.log(`Context Products Found: ${context.products.length}`);
            context.products.forEach(p => console.log(` - ${p.name} (${p.status})`));
        } else {
            console.log('❌ No products in context');
        }

        if (context.product) {
            console.log(`Primary Product: ${context.product.name}`);
        } else {
            console.log('❌ No primary product in context');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

debugParams();
