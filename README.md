# **Revcloud Blueprint - Comprehensive Testing Framework for Salesforce Revenue Cloud**

[![Version](https://img.shields.io/badge/version-1.3.3-blue.svg)](https://marketplace.visualstudio.com/items/forceweaver.revcloud-blueprint/changelog)
[![License](https://img.shields.io/badge/license-EULA-green.svg)](https://marketplace.visualstudio.com/items/forceweaver.revcloud-blueprint/license)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=arohitu_revcloud-blueprint-extension&metric=security_rating&token=2322b9886e5d5d7c886c4f124c4184c6616a4441)](https://sonarcloud.io/summary/new_code?id=arohitu_revcloud-blueprint-extension)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=arohitu_revcloud-blueprint-extension&metric=vulnerabilities&token=2322b9886e5d5d7c886c4f124c4184c6616a4441)](https://sonarcloud.io/summary/new_code?id=arohitu_revcloud-blueprint-extension)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-orange)](https://code.visualstudio.com/)
[![Salesforce](https://img.shields.io/badge/Salesforce-Revenue%20Cloud-00a1e0)](https://www.salesforce.com/products/revenue-lifecycle-management/)

> **A comprehensive Visual Studio Code extension for automating regression testing across the entire Salesforce Revenue Cloud ecosystem - Pricing, Configurator, Order Decomposition, and Billing.**

# Rev Cloud Blueprint Documentation

**Version**: 2.0  
**Last Updated**: October 14, 2025  
**Status**: ✅ Production Ready

---

## **🎯 Project Overview**

Rev Cloud Blueprint is a suite of tools designed to bring powerful, automated testing capabilities to Salesforce Revenue Cloud developers and administrators. The primary product is a **Visual Studio Code extension** that enables snapshot-based regression testing for complex pricing, configuration, and billing scenarios.

This repository contains the source code for the entire ecosystem, including the VS Code extension and the supporting web application for user management and licensing.

## 📚 Documentation Overview

This documentation provides comprehensive coverage of the Rev Cloud Blueprint VS Code extension monetization platform. All documentation has been consolidated into two primary architecture documents plus supporting references.

---

## 🏗️ Core Architecture Documents

### 1. [BACKEND_ARCHITECTURE.md](docs/VSCODE_EXTENSION_ARCHITECTURE.md)

**Complete backend documentation covering**:

- **Core Infrastructure**
  - Database design (14 tables)
  - Technology stack (Supabase, Vercel, Next.js)
  - API endpoints (6 endpoints)
  - Authentication system

- **Admin Console & Feature Management**
  - Entitlements system for customer protection
  - Database tables (features, plan_features, plan_limits, license_entitlements, enterprise_plan_config, feature_change_audit, app_config)
  - Admin UI (8 pages)
  - Customer protection strategy
  - Admin roles and RLS policies

- **Cookie Consent & Compliance**
  - GDPR, CCPA, PIPEDA, LGPD compliance
  - Cookie classification and management
  - Consent logging and audit trail
  - Implementation details

- **User Journey & Authentication**
  - Automatic browser callback flow
  - User status view states
  - Technical authentication sequence

- **User Deletion & Data Management**
  - CASCADE DELETE configuration
  - Deletion functions and procedures
  - Verification steps

- **Deployment & Configuration**
  - Vercel deployment
  - Environment variables
  - Domain configuration

- **Monitoring & Security**
  - Security measures
  - Monitoring tools
  - Troubleshooting guide

### 2. [VSCODE_EXTENSION_ARCHITECTURE.md](docs/VSCODE_EXTENSION_ARCHITECTURE.md)

**Complete VS Code extension documentation covering**:

- **Core Functionality**
  - Snapshot creation
  - Test execution
  - Report generation
  - Multi-org authentication

- **Monetization & Licensing**
  - Tier structure (Free, Pro, Enterprise)
  - Feature comparison
  - License service architecture
  - Device flow & authentication

- **Feature Gating**
  - Server-side validation
  - Feature gate patterns
  - Usage limit enforcement
  - Caching strategy

- **Usage Tracking**
  - Operation tracking
  - Monthly resets
  - Offline sync

- **User Interface**
  - Hierarchical tree view
  - User status view
  - Report view (webview)
  - Context menus

- **End-to-End Testing Guide**
  - Backend setup testing
  - License system testing
  - Feature gating testing
  - Admin console testing
  - Integration testing
  - Pre-release checklist

- **Configuration & Development**
  - Installation & setup
  - Development workflow
  - Testing procedures

---

## 📖 Supporting Documentation

### Technical References

- **[Field_GUIDE.md](./Field_GUIDE.md)** - Comprehensive field guide for Salesforce Revenue Cloud
- **[FEATURE_MATRIX.md](./FEATURE_MATRIX.md)** - Complete feature comparison across Free, Pro, and Enterprise tiers
- **[SUPABASE_CLI_REFERENCE.md](./SUPABASE_CLI_REFERENCE.md)** - Supabase CLI commands and workflows
- **[monetization_roadmap.md](./monetization_roadmap.md)** - Product roadmap and future features

### Brand & Marketing

- **[BRANDING.md](./BRANDING.md)** - Brand guidelines, colors, logos, and design system

### Compliance & Security

- **[Compliance_Security/](./Compliance_Security/)** - Security documentation
  - COMPLIANCE_CHECKLIST.md
  - DATA_PROCESSING_AGREEMENT.md
  - NETWORK_ARCHITECTURE_DIAGRAM.md
  - README.md
  - SECURITY_WHITEPAPER.md

- **[Final Compliance State/](./Final%20Compliance%20State/)** - Final compliance documentation
  - COMPLIANCE_CHECKLIST.md
  - DATA_PROCESSING_AGREEMENT.md
  - NETWORK_ARCHITECTURE_DIAGRAM.md
  - SECURITY_DOCUMENTATION_INDEX.md
  - SECURITY_WHITEPAPER.md

---

## 🎯 Quick Start Guide

### For Developers

1. **Understand the backend**: Read [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
   - Focus on Database Design section
   - Review API Endpoints section
   - Understand Authentication System

2. **Understand the extension**: Read [VSCODE_EXTENSION_ARCHITECTURE.md](./VSCODE_EXTENSION_ARCHITECTURE.md)
   - Focus on Core Functionality section
   - Review Monetization & Licensing section
   - Understand Feature Gating

3. **Reference features**: Check [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) for tier comparison

4. **Setup environment**: Follow setup guides in architecture documents

### For Administrators

1. **Admin Console**: See Admin Console section in [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
   - Setting admin roles
   - Managing features and limits
   - Customer protection strategy

2. **User Management**: See User Deletion section in [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
   - Deleting users safely
   - CASCADE DELETE configuration

### For Compliance & Legal

1. **Cookie Consent**: See Cookie Consent section in [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
   - GDPR, CCPA, PIPEDA, LGPD compliance
   - Consent management

2. **Security Documentation**: Review [Compliance_Security/](./Compliance_Security/) folder
   - Security whitepaper
   - Data processing agreement
   - Compliance checklist

---

## 📊 Documentation Statistics

| Metric | Value |
|--------|-------|
| **Core Architecture Docs** | 2 |
| **Supporting Docs** | 5 |
| **Compliance Docs** | 10 |
| **Total Documentation Lines** | ~15,000+ |
| **Database Tables Documented** | 14 |
| **API Endpoints Documented** | 6 |
| **Admin Pages Documented** | 8 |

---

## 🔄 Documentation Updates

### v2.0 (October 14, 2025)

**Major Consolidation**:
- ✅ Merged 20+ separate documents into 2 comprehensive architecture documents
- ✅ Added Admin Console documentation
- ✅ Added Cookie Consent & Compliance section
- ✅ Added User Journey & Authentication Flow
- ✅ Added User Deletion & Data Management
- ✅ Added End-to-End Testing Guide
- ✅ Removed redundant/outdated files
- ✅ Created clear documentation structure

**Deleted Redundant Files** (20 files):
- Historical analysis reports (CODE_ANALYSIS_REPORT, CODE_QUALITY_SECURITY_AUDIT, COVERAGE_REPORT)
- Implementation summaries (IMPLEMENTATION_SUMMARY, FIXES_SUMMARY, INTEGRATION_COMPLETE)
- Status documents (ADMIN_CONSOLE_IMPLEMENTATION_STATUS, VSCODE_INTEGRATION_STATUS)
- Guides merged into architecture docs (USER_DELETION_GUIDE, END_TO_END_TESTING_GUIDE)
- Deployment guides (DEPLOYMENT_GUIDE, DEPLOYMENT_FIXES, DATABASE_SETUP_COMPLETE)
- Other redundant files (DIAGNOSTIC_STEPS, PROCESS_DIAGRAM, User Journey & Authentication Flow)

### v1.0 (October 2025)
- Initial comprehensive documentation
- Separate documents for each feature

---

## 🆘 Getting Help

### Documentation Issues

If you find documentation gaps or errors:
1. Check both architecture documents first
2. Review supporting documentation
3. Search for specific topics using your editor's search

### Technical Issues

Refer to Troubleshooting sections in:
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#troubleshooting)
- [VSCODE_EXTENSION_ARCHITECTURE.md](./VSCODE_EXTENSION_ARCHITECTURE.md)

---

## 📝 Documentation Philosophy

This documentation follows these principles:

1. **Comprehensive**: Everything needed to understand and work on the project
2. **Consolidated**: Reduce duplication, single source of truth
3. **Practical**: Real examples, code snippets, SQL queries
4. **Organized**: Clear structure, table of contents, cross-references
5. **Maintainable**: Two main documents easier to keep updated

---

**Maintained by**: Rev Cloud Blueprint Team  
**Questions**: Refer to architecture documents  
**Last Review**: October 14, 2025  
**Next Review**: January 2026