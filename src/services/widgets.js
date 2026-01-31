/**
 * Server-Side Widget Templates
 * Generates pre-styled HTML for different data types
 */

class WidgetService {

    // ============================================
    // PRODUCT CARD
    // ============================================
    productCard(product) {
        if (!product) return '';
        const logo = product.logo_url || product.externalLogoUrl || 'https://via.placeholder.com/48';
        const rating = product.avg_rating ? product.avg_rating.toFixed(1) : 'N/A';
        const categories = (product.categories || []).slice(0, 3).join(', ');

        return `
        <div class="clicky-product-card">
            <img src="${logo}" alt="${product.name}" class="clicky-card-logo" />
            <div class="clicky-card-content">
                <h4 class="clicky-card-title">${product.name}</h4>
                <p class="clicky-card-tagline">${product.tagline || ''}</p>
                <div class="clicky-card-meta">
                    <span class="clicky-rating">★ ${rating}</span>
                    <span class="clicky-categories">${categories}</span>
                </div>
            </div>
            <a href="/products/${product.slug || product._id}" class="clicky-card-action">View</a>
        </div>`;
    }

    // ============================================
    // PRODUCT GRID
    // ============================================
    productGrid(products) {
        if (!products || !products.length) return '<p class="clicky-empty">No products found.</p>';
        return `
        <div class="clicky-product-grid">
            ${products.map(p => this.productCard(p)).join('')}
        </div>`;
    }

    // ============================================
    // FOUNDER CARD
    // ============================================
    founderCard(founder) {
        if (!founder) return '<p class="clicky-empty">Founder not found.</p>';
        const avatar = founder.avatar_url || 'https://via.placeholder.com/64';
        const socials = [];
        if (founder.twitter) socials.push(`<a href="${founder.twitter}" target="_blank">Twitter</a>`);
        if (founder.linkedin) socials.push(`<a href="${founder.linkedin}" target="_blank">LinkedIn</a>`);
        if (founder.website) socials.push(`<a href="${founder.website}" target="_blank">Website</a>`);

        return `
        <div class="clicky-founder-card">
            <img src="${avatar}" alt="${founder.name}" class="clicky-founder-avatar" />
            <div class="clicky-founder-info">
                <h4 class="clicky-founder-name">${founder.name}</h4>
                ${founder.role_title ? `<p class="clicky-founder-title">${founder.role_title}</p>` : ''}
                ${founder.company_name ? `<p class="clicky-founder-company">${founder.company_name}</p>` : ''}
                ${founder.bio ? `<p class="clicky-founder-bio">${founder.bio}</p>` : ''}
                ${founder.location ? `<p class="clicky-founder-location">📍 ${founder.location}</p>` : ''}
                <div class="clicky-founder-socials">${socials.join(' · ')}</div>
            </div>
        </div>`;
    }

    // ============================================
    // REVIEW CARD
    // ============================================
    reviewCard(review) {
        if (!review) return '';
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const userName = review.user_id?.name || 'Anonymous';
        const sentiment = review.sentiment === 'positive' ? '👍' : review.sentiment === 'negative' ? '👎' : '';

        return `
        <div class="clicky-review-card ${review.sentiment || ''}">
            <div class="clicky-review-header">
                <span class="clicky-review-stars">${stars}</span>
                <span class="clicky-review-user">${userName}</span>
                ${sentiment ? `<span class="clicky-review-sentiment">${sentiment}</span>` : ''}
            </div>
            ${review.title ? `<h5 class="clicky-review-title">${review.title}</h5>` : ''}
            <p class="clicky-review-text">${review.text}</p>
        </div>`;
    }

    // ============================================
    // REVIEW LIST
    // ============================================
    reviewList(reviews) {
        if (!reviews || !reviews.length) return '<p class="clicky-empty">No reviews found.</p>';
        return `
        <div class="clicky-review-list">
            ${reviews.map(r => this.reviewCard(r)).join('')}
        </div>`;
    }

    // ============================================
    // COMPARISON TABLE
    // ============================================
    comparisonTable(products) {
        if (!products || products.length < 2) return '<p class="clicky-empty">Not enough products to compare.</p>';
        const [a, b] = products;

        return `
        <table class="clicky-comparison-table">
            <thead>
                <tr>
                    <th>Feature</th>
                    <th>${a.name}</th>
                    <th>${b.name}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Tagline</td>
                    <td>${a.tagline || '-'}</td>
                    <td>${b.tagline || '-'}</td>
                </tr>
                <tr>
                    <td>Rating</td>
                    <td>★ ${a.avg_rating?.toFixed(1) || 'N/A'} (${a.ratings_count || 0})</td>
                    <td>★ ${b.avg_rating?.toFixed(1) || 'N/A'} (${b.ratings_count || 0})</td>
                </tr>
                <tr>
                    <td>Categories</td>
                    <td>${(a.categories || []).join(', ') || '-'}</td>
                    <td>${(b.categories || []).join(', ') || '-'}</td>
                </tr>
                <tr>
                    <td>Website</td>
                    <td><a href="${a.website_url}" target="_blank">Visit</a></td>
                    <td><a href="${b.website_url}" target="_blank">Visit</a></td>
                </tr>
            </tbody>
        </table>`;
    }

    // ============================================
    // STATS WIDGET
    // ============================================
    statsWidget(title, items) {
        if (!items || !items.length) return '';
        return `
        <div class="clicky-stats-widget">
            <h4 class="clicky-stats-title">${title}</h4>
            <ul class="clicky-stats-list">
                ${items.slice(0, 5).map((item, i) => `
                    <li class="clicky-stats-item">
                        <span class="clicky-stats-rank">${i + 1}</span>
                        <span class="clicky-stats-name">${item.name || item}</span>
                        ${item.avg_rating ? `<span class="clicky-stats-rating">★ ${item.avg_rating.toFixed(1)}</span>` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>`;
    }

    // ============================================
    // CATEGORY PILLS
    // ============================================
    categoryPills(categories) {
        if (!categories || !categories.length) return '<p class="clicky-empty">No categories found.</p>';
        return `
        <div class="clicky-category-pills">
            ${categories.map(c => `<span class="clicky-category-pill">${c}</span>`).join('')}
        </div>`;
    }

    // ============================================
    // PLATFORM STATS (counts)
    // ============================================
    platformStats(stats) {
        if (!stats) return '<p class="clicky-empty">No statistics available.</p>';
        return `
        <div class="clicky-platform-stats">
            <div class="clicky-stat-card">
                <span class="clicky-stat-value">${stats.founders}</span>
                <span class="clicky-stat-label">Founders</span>
            </div>
            <div class="clicky-stat-card">
                <span class="clicky-stat-value">${stats.products}</span>
                <span class="clicky-stat-label">Products</span>
            </div>
            <div class="clicky-stat-card">
                <span class="clicky-stat-value">${stats.reviews}</span>
                <span class="clicky-stat-label">Reviews</span>
            </div>
            <div class="clicky-stat-card">
                <span class="clicky-stat-value">${stats.categories}</span>
                <span class="clicky-stat-label">Categories</span>
            </div>
        </div>`;
    }

    // ============================================
    // FOUNDER GRID
    // ============================================
    founderGrid(founders) {
        if (!founders || !founders.length) return '<p class="clicky-empty">No founders found.</p>';
        return `
        <div class="clicky-founder-grid">
            ${founders.map(f => this.founderCard(f)).join('')}
        </div>`;
    }

    // ============================================
    // SINGLE PRODUCT DETAIL
    // ============================================
    productDetail(product) {
        if (!product) return '<p class="clicky-empty">Product not found.</p>';
        const logo = product.logo_url || product.externalLogoUrl || 'https://via.placeholder.com/80';
        const categories = (product.categories || []).join(', ');
        const tags = (product.tags || []).map(t => `<span class="clicky-tag">${t}</span>`).join('');

        let teamHtml = '';
        if (product.team_members && product.team_members.length) {
            teamHtml = `
            <div class="clicky-team">
                <h5>Team</h5>
                ${product.team_members.map(m => `<span class="clicky-team-member">${m.name} (${m.title || m.role_type})</span>`).join(', ')}
            </div>`;
        }

        return `
        <div class="clicky-product-detail">
            <div class="clicky-detail-header">
                <img src="${logo}" alt="${product.name}" class="clicky-detail-logo" />
                <div>
                    <h3 class="clicky-detail-name">${product.name}</h3>
                    <p class="clicky-detail-tagline">${product.tagline}</p>
                    <span class="clicky-rating">★ ${product.avg_rating?.toFixed(1) || 'N/A'} (${product.ratings_count || 0} reviews)</span>
                </div>
            </div>
            <p class="clicky-detail-description">${product.description}</p>
            <div class="clicky-detail-meta">
                <span>Categories: ${categories || 'N/A'}</span>
                <div class="clicky-tags">${tags}</div>
            </div>
            ${teamHtml}
            <a href="${product.website_url}" target="_blank" class="clicky-detail-cta">Visit Website</a>
        </div>`;
    }
}

module.exports = new WidgetService();
