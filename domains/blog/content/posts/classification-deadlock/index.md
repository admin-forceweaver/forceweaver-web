---
title: "Stop Trapping Your Users: Avoid UI Deadlocks in ARM Product Configurator"
date: "2026-05-11"
author: "Rohit"
excerpt: "How a shared Classification group in CML can lock users in a validation error they cannot resolve, and how to fix it."
category: "Revenue Cloud"
tags: ["Salesforce", "Revenue Cloud", "CML", "Configurator"]
published: false
---

### Stop Trapping Your Users: Avoid UI Deadlocks in ARM Product Configurator

If you’ve spent any time building in Agentforce Revenue Management’s Advanced Configurator, you know that Configuration Modeling Language (CML) is incredibly powerful. But if you aren't careful with your catalog architecture, that power can accidentally trap your users in a "UI Deadlock."

A UI Deadlock happens when a user triggers a validation error they literally cannot fix because the UI is frozen. 

Here is how it usually happens—and how to prevent it.

**The "Shared Classification" Trap**
Let’s say you are configuring a custom laptop order. You have a Product Classification group called **"System Add-ons"** containing:
* **Standard Warranty** (Auto-added by the system)
* **Wireless Mouse** (Optional)
* **Server Rack Mount** (Incompatible with laptops)

To stop users from removing the mandatory warranty, you write a CML `disable` rule. It works perfectly! The warranty checkbox is locked.

But then, a user accidentally adds the **Server Rack Mount**. 

The system throws an error: *"Server Rack Mounts cannot be sold with Laptops."* The user tries to uncheck the rack mount, but they can't. The checkbox is grayed out. They are deadlocked and have to abandon the quote.

**What is happening under the hood?**
To understand why this happens, we have to look at the CML API. 

All products within a specific classification share the exact same Product Classification ID (`prcId`). When your CML `disable` rule fires for the warranty, the API applies a UI treatment that targets that entire shared component:

```json
{
  "details": {
    "prcId": "0dSVc0000001u8uMAA",
  },
  "uiTreatmentScope": "bundle",
  "uiTreatmentTarget": "component",
  "uiTreatmentType": "disable"
}
```
Because the target is the shared component, the engine locks the checkbox for *every* product in that group—not just the warranty. 

**The Key Takeaway for Revenue Cloud Architects**
This trap highlights why grouping products into classifications is a **critical design decision**, not just a visual UI grouping exercise. 

Product Classifications dictate the boundaries of your CML rules. You must architect your catalog so that system-enforced products (like our locked warranty) live in their own separate classification, completely apart from user-selectable products (like the mouse). 

Mixing locked and optional products in the same group is a guaranteed recipe for solver conflicts and trapped users. Separate your classifications by logic, not just by category!

Have you run into CML solver conflicts in Revenue Cloud? Let me know how you handled them in the comments below! 👇

#Salesforce #RevenueCloud #CPQ #SalesforceDeveloper #SalesforceArchitecture #CML #TechTips
