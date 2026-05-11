# Rev Cloud Blueprint: Brand and Design Guidelines

**Version:** 1.0
**Date:** 17 September 2025
**Theme:** Modern & Bright

---

### **1. Core Philosophy**

The brand identity for Rev Cloud Blueprint should be **clean, professional, and trustworthy**. The design should feel modern and approachable to a technical audience of Salesforce developers and consultants, conveying precision and reliability without being sterile.

---

### **2. Color Palette**

The official color palette is based on a modern, high-contrast theme that balances professionalism with a vibrant, energetic feel.

| Color Name        | HEX         | Primary Usage                                       | Tailwind CSS Class        |
| :---------------- | :---------- | :-------------------------------------------------- | :------------------------ |
| **Indigo Dye** | `#173e63`   | Body Text, Headlines, Dark UI Elements              | `text-indigo-dye`         |
| **Celestial Blue**| `#00a1e0`   | **Primary CTAs**, Links, Icons, Active States       | `bg-celestial-blue`       |
| **Lavender Blush**| `#f0e2e7`   | Main Background Color (Subtle off-white)            | `bg-lavender-blush`       |
| **Purpureus** | `#a14da0`   | Secondary Accents, Badges, Highlights               | `text-purpureus`          |
| **African Violet**| `#9d79bc`   | Tertiary Accents, Icons, Subtle borders             | `border-african-violet`   |
| **White** | `#ffffff`   | Card Backgrounds, Contrasting Elements              | `bg-white`                |
| **Gray (Neutral)**| `#e5e7eb`   | Borders, Dividers, Disabled States                  | `border-gray-200`         |

---

### **3. Typography**

To create a more formal and elegant visual hierarchy, we will use the **Inter** font with refined sizing.

* **Font Family:** `Inter`, sans-serif.

| Element                 | Font Weight | Font Size (Tailwind) | Color           | Usage Example                                            |
| :---------------------- | :---------- | :------------------- | :-------------- | :------------------------------------------------------- |
| **Headline 1 (h1)** | Extra Bold  | `text-4xl`           | `text-indigo-dye` | "Deploy Revenue Cloud Changes with Total Confidence"     |
| **Headline 2 (h2)** | Bold        | `text-3xl`           | `text-indigo-dye` | "Stop High-Stakes Deployments"                           |
| **Headline 3 (h3)** | Bold        | `text-xl`            | `text-indigo-dye` | "Impossible Manual Regression"                           |
| **Body Text (p)** | Regular     | `text-base` / `text-lg`| `text-indigo-dye/80` | Paragraphs and descriptive text. `text-lg` for intros. |
| **Links** | Medium      | `text-base`          | `text-celestial-blue` | Standard anchor links.                                   |
| **Button Text** | Semi-Bold   | `text-base`          | `text-white`      | Text inside primary call-to-action buttons.              |

---

### **4. UI Components**

#### **Buttons**

* **Primary Call-to-Action (CTA):**
    * **Background:** `bg-celestial-blue`
    * **Text Color:** `text-white`
    * **Hover State:** `hover:opacity-90` (A subtle fade effect)
    * **Padding:** `px-6 py-3`
    * **Border Radius:** `rounded-md` (Slightly rounded corners)
    * **Shadow:** `shadow-lg`

* **Secondary CTA:**
    * **Background:** `bg-white`
    * **Text Color:** `text-indigo-dye`
    * **Border:** `border border-gray-300`
    * **Hover State:** `hover:bg-gray-100`
    * **Padding & Radius:** Same as primary.

#### **Cards & Sections**

* **Page Background:** Use a very light tint of `Lavender Blush` to provide a soft, warm feel (`bg-lavender-blush/20`).
* **Card Background:** Use `bg-white` for content cards to make them "pop" against the page background.
* **Borders:** Use a light, neutral gray (`border-gray-200`) for card borders and section dividers.
* **Shadows:** Use subtle shadows (`shadow-sm` or `shadow-lg`) on cards to lift them off the page.

#### **Navigation**

* **Background:** A semi-transparent `Lavender Blush` with a backdrop blur (`bg-lavender-blush/30 backdrop-blur-md`) for a modern, floating effect.
* **Links:** Use `text-indigo-dye/70` for inactive links.
* **Active Link:** The current page link should be a bold `text-celestial-blue`.

This design system provides a consistent and professional visual language that can be applied across your entire web presence, from the homepage to the user dashboard.