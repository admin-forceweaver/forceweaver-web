# SEO Manual Tasks Checklist

## ✅ Automated (Already Done)

The following SEO optimizations have been **automatically implemented** in your codebase:

- ✅ **Metadata**: Titles, descriptions, keywords on all pages
- ✅ **Open Graph**: Facebook/LinkedIn social sharing cards
- ✅ **Twitter Cards**: Rich previews for Twitter
- ✅ **JSON-LD Structured Data**: Organization, Software, Article schemas
- ✅ **Sitemap.xml**: Dynamic generation at `/sitemap.xml`
- ✅ **Robots.txt**: Search engine directives
- ✅ **Canonical URLs**: Prevent duplicate content
- ✅ **Image Alt Text**: Accessibility and SEO
- ✅ **Semantic HTML**: Proper heading hierarchy

---

## 📋 Manual Tasks Required

### **Priority 1: Search Console Setup** (Critical)

#### 1.1 Google Search Console
**Time**: 15 minutes  
**When**: Within 24 hours of deployment

1. Visit [Google Search Console](https://search.google.com/search-console/)
2. Click "Add Property" → "URL prefix"
3. Add both domains:
   - `https://forceweaver.com`
   - `https://blueprint.forceweaver.com`
4. Verify ownership (DNS verification recommended):
   - Go to your domain registrar (e.g., GoDaddy, Cloudflare)
   - Add the TXT record Google provides
   - Click "Verify"
5. Submit sitemaps:
   - `https://forceweaver.com/sitemap.xml`
   - `https://blueprint.forceweaver.com/sitemap.xml`
6. Request indexing for key pages:
   - Homepage
   - Blog
   - Pricing
   - Documentation

**Expected Result**: Pages start appearing in Google search within 1-7 days

#### 1.2 Bing Webmaster Tools
**Time**: 10 minutes

1. Visit [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Add sites (same as Google Search Console)
3. Import settings from Google Search Console (quick option)
4. Submit sitemaps

---

### **Priority 2: Analytics & Monitoring** (High)

#### 2.1 Google Analytics 4
**Time**: 20 minutes  
**Purpose**: Track visitors, behavior, conversions

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property for each domain
3. Get Measurement IDs (e.g., `G-XXXXXXXXXX`)
4. **Add to your site**:
   ```typescript
   // File: apps/web/app/layout.tsx
   // Add after <head> tag:
   
   <Script
     src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
     strategy="afterInteractive"
   />
   <Script id="google-analytics" strategy="afterInteractive">
     {`
       window.dataLayer = window.dataLayer || [];
       function gtag(){dataLayer.push(arguments);}
       gtag('js', new Date());
       gtag('config', 'G-XXXXXXXXXX');
     `}
   </Script>
   ```
5. Set up conversion goals:
   - Extension install clicks
   - Signup conversions
   - Blog engagement

#### 2.2 Microsoft Clarity (Recommended)
**Time**: 10 minutes  
**Purpose**: Session recordings, heatmaps (free)

1. Visit [Microsoft Clarity](https://clarity.microsoft.com/)
2. Create project
3. Get tracking code
4. Add to `apps/web/app/layout.tsx`

---

### **Priority 3: Domain Configuration** (High)

#### 3.1 Verify Domain Settings in Vercel
**Time**: 5 minutes

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Confirm both domains are properly connected:
   - `forceweaver.com` (with www redirect)
   - `blueprint.forceweaver.com`
3. Ensure SSL/HTTPS is enabled
4. Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net/)

#### 3.2 Configure Domain Redirects
Ensure these redirects work:
- `http://` → `https://` (auto by Vercel)
- `www.forceweaver.com` → `forceweaver.com` (configure in Vercel)

---

### **Priority 4: Social Media Presence** (Medium)

#### 4.1 Create Social Profiles
Create profiles on these platforms (if not done):
- [ ] Twitter/X: @forceweaver
- [ ] LinkedIn: company/forceweaver
- [ ] GitHub: github.com/forceweaver (organization)

#### 4.2 Update Social Profile Links
Add website links to all social profiles pointing to:
- Main site: `https://forceweaver.com`
- Product: `https://blueprint.forceweaver.com`

#### 4.3 Test Social Cards
Before launching, test how your pages look when shared:

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
   - Enter: `https://forceweaver.com`
   - Click "Scrape Again" if issues
   - Verify image, title, description appear

2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
   - Enter: `https://forceweaver.com`
   - Verify card displays correctly

3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
   - Enter: `https://forceweaver.com`
   - Verify preview looks good

---

### **Priority 5: Content Optimization** (Ongoing)

#### 5.1 Blog Publishing Schedule
- [ ] Publish 1-2 blog posts per week
- [ ] Focus on longtail keywords: "how to test Salesforce Revenue Cloud"
- [ ] Share on social media after publishing
- [ ] Engage with comments

#### 5.2 Internal Linking
As you add more blog posts:
- [ ] Link related articles to each other
- [ ] Link from blog posts to product pages
- [ ] Use descriptive anchor text (not "click here")

#### 5.3 Update Old Content
Every 6 months:
- [ ] Review and update older blog posts
- [ ] Add new information
- [ ] Update publish dates in frontmatter

---

### **Priority 6: External SEO** (Ongoing)

#### 6.1 VS Code Marketplace Listing
**Critical for product SEO**

1. Go to your extension listing
2. Optimize these fields:
   - **Title**: Include "Salesforce Revenue Cloud" (done)
   - **Description**: Keyword-rich, compelling
   - **Tags**: Add relevant tags
   - **Repository URL**: Link to GitHub
   - **Website**: `https://blueprint.forceweaver.com`
3. Add **Quality Documentation**:
   - Link to your `/setup-instructions` page
   - Include screenshots/GIFs
4. Encourage **Reviews**: Good ratings boost discoverability

#### 6.2 Backlinks Strategy
Build high-quality backlinks:

**Easy Wins (Week 1):**
- [ ] List on Product Hunt (when ready for launch)
- [ ] Add to AlternativeTo.net
- [ ] Submit to relevant directories:
  - Salesforce AppExchange (if applicable)
  - Salesforce community forums (signature link)
  - Stack Exchange (answer questions, include link)

**Content Marketing (Ongoing):**
- [ ] Guest post on Salesforce blogs
- [ ] Participate in Salesforce Trailblazer community
- [ ] Comment on relevant Reddit threads (r/salesforce)
- [ ] Create YouTube tutorials (embed on your site)

**Partnerships:**
- [ ] Reach out to Salesforce consultancies for partnerships
- [ ] Offer free licenses to influencers for reviews

---

### **Priority 7: Technical Monitoring** (Ongoing)

#### 7.1 Setup Monitoring Tools
1. **Google PageSpeed Insights**: https://pagespeed.web.dev/
   - Test both domains monthly
   - Target: 90+ score

2. **Lighthouse** (Built into Chrome DevTools)
   - Run audits quarterly
   - Check: Performance, SEO, Accessibility, Best Practices

3. **Uptime Monitoring** (Optional)
   - Use UptimeRobot (free) or Better Uptime
   - Get alerts if site goes down

#### 7.2 Regular SEO Checks
**Monthly Tasks:**
- [ ] Check Google Search Console for:
  - Crawl errors
  - Manual penalties
  - Security issues
  - Mobile usability issues
- [ ] Review top performing pages
- [ ] Check for broken links (use [Ahrefs Free Tools](https://ahrefs.com/broken-link-checker))

**Quarterly Tasks:**
- [ ] Audit keyword rankings (use Google Search Console)
- [ ] Review competitor websites
- [ ] Update meta descriptions if click-through rate is low

---

### **Priority 8: Local & Schema Enhancements** (Optional)

#### 8.1 Add More Structured Data (When Applicable)
As you grow, consider adding:
- **FAQ Schema**: For documentation pages
- **HowTo Schema**: For tutorial blog posts
- **Video Schema**: If you add product videos
- **Review Schema**: When you get customer testimonials

#### 8.2 Rich Snippets Testing
Test your structured data:
- Use [Google Rich Results Test](https://search.google.com/test/rich-results)
- Verify Organization, SoftwareApplication, Article schemas appear correctly

---

## 📊 Success Metrics

### Week 1-2 (Post-Launch)
- [ ] Google Search Console shows pages being indexed
- [ ] Sitemap submitted and processed
- [ ] No crawl errors
- [ ] Social cards display correctly when shared

### Month 1
- [ ] 10+ pages indexed by Google
- [ ] Appearing in search results for brand name ("Forceweaver")
- [ ] 100+ organic visitors/month (baseline)

### Month 3
- [ ] Ranking for long-tail keywords
- [ ] 500+ organic visitors/month
- [ ] 3-5 high-quality backlinks
- [ ] 80+ Lighthouse SEO score

### Month 6
- [ ] 1,000+ organic visitors/month
- [ ] Top 10 rankings for some keywords
- [ ] Growing blog traffic
- [ ] Positive user reviews on VS Code Marketplace

---

## 🚨 Common Issues & Fixes

### Issue: "Pages not indexed after 2 weeks"
**Fix:**
1. Check robots.txt isn't blocking pages
2. Verify sitemap is accessible
3. Request indexing in Google Search Console
4. Check for manual penalties

### Issue: "Social cards not showing correct image"
**Fix:**
1. Clear Facebook cache: https://developers.facebook.com/tools/debug/
2. Verify image is at least 1200x630px
3. Check image URL is absolute (not relative)

### Issue: "Duplicate content warnings"
**Fix:**
1. Verify canonical URLs are set correctly
2. Check for www/non-www redirect issues
3. Ensure blog posts only appear once

---

## 🎯 Quick Start Checklist

**Do These First (Today):**
1. [ ] Set up Google Search Console (both domains)
2. [ ] Submit sitemaps
3. [ ] Test social cards with Facebook Debugger
4. [ ] Set up Google Analytics 4
5. [ ] Verify Vercel domain configuration

**Do This Week:**
1. [ ] Set up Bing Webmaster Tools
2. [ ] Optimize VS Code Marketplace listing
3. [ ] Create/update social media profiles
4. [ ] Request indexing for key pages

**Do This Month:**
1. [ ] Publish 4-6 blog posts
2. [ ] Start building backlinks
3. [ ] Monitor search console for issues
4. [ ] Set up conversion tracking

---

## 📞 Need Help?

If you encounter issues:
- **Google Search Console Help**: https://support.google.com/webmasters
- **Schema Validator**: https://validator.schema.org/
- **SEO Tools**: Ahrefs, SEMrush, Moz (paid, but have free trials)

---

**Last Updated**: December 5, 2025  
**Status**: ✅ Automated SEO Complete | 📋 Manual Tasks Pending

