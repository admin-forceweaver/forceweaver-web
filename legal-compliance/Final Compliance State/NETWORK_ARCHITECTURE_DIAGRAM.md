# Network Architecture & Data Flow Diagram

**Rev Cloud Blueprint Extension**

**Version:** 1.0  
**Date:** October 5, 2025  
**Purpose:** Security review and enterprise deployment planning

---

## Table of Contents

1. [Overview](#1-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Detailed Component Diagram](#3-detailed-component-diagram)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Network Communication Matrix](#5-network-communication-matrix)
6. [Security Zones](#6-security-zones)
7. [Deployment Scenarios](#7-deployment-scenarios)

---

## 1. Overview

### 1.1 Architecture Principles

Rev Cloud Blueprint follows a **local-first, privacy-by-design** architecture:

- ✅ **Local Processing**: All Salesforce data processed on user's workstation
- ✅ **Direct Connections**: Extension communicates directly with customer's Salesforce org
- ✅ **Minimal Cloud Dependency**: License validation is optional (graceful degradation to free tier)
- ✅ **No Data Exfiltration**: Salesforce data never transmitted to Forceweaver servers
- ✅ **User Control**: Customer maintains complete control over their data

### 1.2 Key Components

| Component | Location | Purpose | Data Handled |
|-----------|----------|---------|--------------|
| **VS Code Extension** | User's Workstation | Core testing functionality | Salesforce Data (local) |
| **Salesforce CLI** | User's Workstation | Authentication provider | Access Tokens |
| **Local File System** | User's Workstation | Snapshot storage | Salesforce Data (local) |
| **OS Secure Storage** | User's Workstation | Token storage | Device Tokens (encrypted) |
| **Salesforce Org** | Customer's Cloud | Data source/target | Salesforce Data |
| **License API** | Forceweaver Cloud | License validation | Device Tokens only |

---

## 2. High-Level Architecture

### 2.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER'S ENVIRONMENT                          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Developer Workstation                         │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │                    VS Code IDE                              │ │  │
│  │  │                                                             │ │  │
│  │  │  ┌──────────────────────────────────────────────────────┐ │ │  │
│  │  │  │      Rev Cloud Blueprint Extension                   │ │ │  │
│  │  │  │                                                       │ │ │  │
│  │  │  │  • Snapshot Creator                                  │ │ │  │
│  │  │  │  • Test Runner                                       │ │ │  │
│  │  │  │  • Report Generator                                  │ │ │  │
│  │  │  │  • License Service                                   │ │ │  │
│  │  │  └──────────────────────────────────────────────────────┘ │ │  │
│  │  │                           │                                 │ │  │
│  │  │                           │ Uses                            │ │  │
│  │  │                           ▼                                 │ │  │
│  │  │  ┌──────────────────────────────────────────────────────┐ │ │  │
│  │  │  │           Salesforce CLI (sf org)                    │ │ │  │
│  │  │  │  • OAuth 2.0 Authentication                          │ │ │  │
│  │  │  │  • Token Management                                  │ │ │  │
│  │  │  └──────────────────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                           │                                       │  │
│  │                           │ Reads/Writes                          │  │
│  │                           ▼                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │              Local File System                               │ │  │
│  │  │  • revcloud_blueprint/pricing/snapshots/*.json               │ │  │
│  │  │  • revcloud_blueprint/pricing/results/*.html                 │ │  │
│  │  │  • .revcloud/settings.json                                   │ │  │
│  │  │  • .revcloud/groups.json                                     │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                           │                                       │  │
│  │                           │ Stores                                │  │
│  │                           ▼                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │         OS Secure Storage (Keychain/Credential Mgr)          │ │  │
│  │  │  • Device Tokens (AES-256 encrypted)                         │ │  │
│  │  │  • Salesforce Access Tokens (via CLI)                        │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (TLS 1.2+)
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────┐   ┌──────────────────────────────┐
    │  Customer's Salesforce    │   │   Forceweaver License API    │
    │         Org(s)            │   │   (sfapp.forceweaver.com)    │
    │                           │   │                              │
    │  • Production             │   │  • Device Token Validation   │
    │  • UAT                    │   │  • NO Salesforce Data        │
    │  • Development            │   │  • Optional (falls back)     │
    │  • Sandbox                │   │                              │
    │                           │   │  Hosted on:                  │
    │  OAuth 2.0 Protected      │   │  • Vercel (Edge Network)     │
    │  Customer-Managed         │   │  • Supabase (EU West)        │
    └───────────────────────────┘   └──────────────────────────────┘
```

### 2.2 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Trust Zone 1: Customer's Complete Control                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • Developer Workstation                                     │
│  • VS Code Extension                                         │
│  • Local File System                                         │
│  • Salesforce CLI                                            │
│  • OS Secure Storage                                         │
│                                                              │
│  Data: ALL Salesforce Data (quotes, pricing, products)      │
│  Security: Customer's responsibility                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Authenticated HTTPS
                          │
┌─────────────────────────────────────────────────────────────┐
│  Trust Zone 2: Customer's Salesforce Org                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • Salesforce Production/UAT/Dev Orgs                       │
│  • Salesforce APIs (REST, SOQL, Apex)                       │
│  • OAuth 2.0 Authentication                                  │
│                                                              │
│  Data: Customer's Salesforce Data                           │
│  Security: Salesforce-managed + Customer policies           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Trust Zone 3: Forceweaver License API (Optional)           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • License Validation API                                    │
│  • Device Authorization                                      │
│  • User Account Management                                   │
│                                                              │
│  Data: Device Tokens ONLY (no Salesforce data)              │
│  Security: Forceweaver-managed (SOC 2 vendors)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Diagram

### 3.1 Extension Internal Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                    VS Code Extension Components                        │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                      User Interface Layer                     │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │  • Hierarchical Tree Provider (sidebar)                      │    │
│  │  • User Status View Provider (license status)                │    │
│  │  • Report View (HTML reports)                                │    │
│  │  • Sidebar Provider (legacy)                                 │    │
│  │  • Progress Reporter (notifications)                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                         │
│                              ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                      Business Logic Layer                     │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │  • Snapshot Creator (captures pricing scenarios)             │    │
│  │  • Test Runner (executes pricing tests)                      │    │
│  │  • Test Comparator (compares expected vs actual)             │    │
│  │  • Report Generator (creates HTML/PDF reports)               │    │
│  │  • Grouping Manager (organizes snapshots)                    │    │
│  │  • License Service (validates Pro features)                  │    │
│  │  • Device Flow Service (OAuth device authorization)          │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                         │
│                              ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                      Integration Layer                        │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │  • Salesforce Auth (CLI integration)                         │    │
│  │  • Salesforce API (REST/SOQL/Apex)                           │    │
│  │  • HTTP Client Factory (connection pooling)                  │    │
│  │  • Place Quote Service (Revenue Cloud API)                   │    │
│  │  • Apex Executor (pricing calculation)                       │    │
│  │  • Field Discovery Service (schema introspection)            │    │
│  │  • Org Feature Service (capability detection)                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                         │
│                              ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                      Utility Layer                            │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │  • Logger (sanitized logging)                                │    │
│  │  • Validation Service (input sanitization)                   │    │
│  │  • File System Service (async file operations)               │    │
│  │  • Async JSON Parser (large file handling)                   │    │
│  │  • Configuration Service (settings management)               │    │
│  │  • API Utility Service (version management)                  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Local Data Storage                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workspace Directory                                             │
│  └── revcloud_blueprint/                                         │
│      ├── pricing/                                                │
│      │   ├── snapshots/                                          │
│      │   │   ├── snapshot_ProdOrg_0Q0xxx_test1.json             │
│      │   │   ├── snapshot_ProdOrg_0Q0yyy_test2.json             │
│      │   │   └── ...                                             │
│      │   │                                                        │
│      │   └── results/                                            │
│      │       ├── test_results_2025-10-05.html                    │
│      │       ├── batch_results_2025-10-05.html                   │
│      │       └── ...                                             │
│      │                                                            │
│      └── .revcloud/                                              │
│          ├── settings.json    (field configuration)              │
│          └── groups.json      (snapshot organization)            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    OS Secure Storage                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  macOS Keychain / Windows Credential Manager / Linux libsecret  │
│  ├── revCloudBlueprint.deviceToken (AES-256 encrypted)          │
│  └── Salesforce CLI tokens (managed by sf CLI)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow Diagrams

### 4.1 Snapshot Creation Flow

```
┌──────────┐                                                    ┌──────────────┐
│   User   │                                                    │  Salesforce  │
│          │                                                    │     Org      │
└────┬─────┘                                                    └──────┬───────┘
     │                                                                 │
     │ 1. Click "Create Snapshot"                                     │
     │                                                                 │
     ▼                                                                 │
┌─────────────────────────────────────────────────────────────┐      │
│              VS Code Extension                               │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  1. Prompt for:                                         │ │      │
│  │     - Source Org                                        │ │      │
│  │     - Quote ID                                          │ │      │
│  │     - Description                                       │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  2. Salesforce Auth                                     │ │      │
│  │     - Get access token from CLI                         │ │      │
│  │     - Sanitize org alias                                │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  3. Query Salesforce                                    │ │──────┼─────▶
│  │     - Fetch Quote data (SOQL)                           │ │      │ HTTPS
│  │     - Fetch QuoteLineItems (SOQL)                       │ │      │ GET
│  │     - Fetch Product data (SOQL)                         │ │      │
│  │     - Fetch Opportunity data (SOQL)                     │ │◀─────┼─────
│  └────────────────────────────────────────────────────────┘ │      │ JSON
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  4. Build Snapshot                                      │ │      │
│  │     - Extract metadata                                  │ │      │
│  │     - Build expectedResults                             │ │      │
│  │     - Build recreationPayload                           │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  5. Save to File System                                 │ │      │
│  │     - Sanitize filename                                 │ │      │
│  │     - Write JSON file                                   │ │      │
│  │     - Update groups.json                                │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
└─────────────────────────────────────────────────────────────┘      │
     │                                                                 │
     │ 6. Display success message                                     │
     │                                                                 │
     ▼                                                                 │
┌──────────┐                                                          │
│   User   │                                                          │
│          │                                                          │
└──────────┘                                                          │

Data Transmitted to Salesforce:
  ✅ SOQL queries (Quote IDs, Product IDs)
  ❌ No data written to Salesforce

Data Stored Locally:
  ✅ Complete snapshot JSON file
  ✅ Includes: metadata, expectedResults, recreationPayload
```

### 4.2 Test Execution Flow

```
┌──────────┐                                                    ┌──────────────┐
│   User   │                                                    │  Salesforce  │
│          │                                                    │     Org      │
└────┬─────┘                                                    └──────┬───────┘
     │                                                                 │
     │ 1. Click "Run Test" on snapshot                                │
     │                                                                 │
     ▼                                                                 │
┌─────────────────────────────────────────────────────────────┐      │
│              VS Code Extension                               │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  1. Load Snapshot                                       │ │      │
│  │     - Read JSON file                                    │ │      │
│  │     - Parse recreationPayload                           │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  2. Prompt for Target Org                               │ │      │
│  │     - Select target org                                 │ │      │
│  │     - Select opportunity (same or different)            │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  3. Create Test Quote                                   │ │──────┼─────▶
│  │     - Build Place Quote request                         │ │      │ HTTPS
│  │     - Send to Revenue Cloud API                         │ │      │ POST
│  │     - Receive new Quote ID                              │ │◀─────┼─────
│  └────────────────────────────────────────────────────────┘ │      │ JSON
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  4. Execute Pricing                                     │ │──────┼─────▶
│  │     - Execute Apex pricing code                         │ │      │ HTTPS
│  │     - Wait for pricing completion                       │ │      │ GET
│  │     - Poll for field stability                          │ │◀─────┼─────
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  5. Query Results                                       │ │──────┼─────▶
│  │     - Fetch Quote data (SOQL)                           │ │      │ HTTPS
│  │     - Fetch QuoteLineItems (SOQL)                       │ │      │ GET
│  │     - Extract pricing fields                            │ │◀─────┼─────
│  └────────────────────────────────────────────────────────┘ │      │ JSON
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  6. Compare Results                                     │ │      │
│  │     - Compare expected vs actual                        │ │      │
│  │     - Calculate variances                               │ │      │
│  │     - Determine pass/fail                               │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
│                          │                                   │      │
│                          ▼                                   │      │
│  ┌────────────────────────────────────────────────────────┐ │      │
│  │  7. Generate Report                                     │ │      │
│  │     - Create HTML report                                │ │      │
│  │     - Save to results/ directory                        │ │      │
│  │     - Open in browser                                   │ │      │
│  └────────────────────────────────────────────────────────┘ │      │
└─────────────────────────────────────────────────────────────┘      │
     │                                                                 │
     │ 8. Display test results                                        │
     │                                                                 │
     ▼                                                                 │
┌──────────┐                                                          │
│   User   │                                                          │
│          │                                                          │
└──────────┘                                                          │

Data Transmitted to Salesforce:
  ✅ Quote creation request (Place Sales Transaction API)
  ✅ Apex execution request
  ✅ SOQL queries for results
  ❌ No sensitive data in logs

Data Stored Locally:
  ✅ Test report (HTML)
  ✅ Test results (pass/fail, variances)
```

### 4.3 License Validation Flow

```
┌──────────┐                                              ┌──────────────────┐
│   User   │                                              │  License API     │
│          │                                              │  (Forceweaver)   │
└────┬─────┘                                              └────────┬─────────┘
     │                                                             │
     │ 1. Use Pro feature (e.g., Batch Test)                      │
     │                                                             │
     ▼                                                             │
┌─────────────────────────────────────────────────────────┐      │
│              VS Code Extension                           │      │
│  ┌────────────────────────────────────────────────────┐ │      │
│  │  1. Check License State                             │ │      │
│  │     - Check cache (24hr TTL)                        │ │      │
│  │     - If cached, use cached state                   │ │      │
│  └────────────────────────────────────────────────────┘ │      │
│                          │                               │      │
│                          ▼                               │      │
│  ┌────────────────────────────────────────────────────┐ │      │
│  │  2. Get Device Token                                │ │      │
│  │     - Read from VS Code SecretStorage               │ │      │
│  │     - Token stored in OS Keychain                   │ │      │
│  └────────────────────────────────────────────────────┘ │      │
│                          │                               │      │
│                          ▼                               │      │
│  ┌────────────────────────────────────────────────────┐ │      │
│  │  3. Validate License                                │ │──────┼─────▶
│  │     - POST /api/license/validate                    │ │      │ HTTPS
│  │     - Send device_token (UUID only)                 │ │      │ POST
│  │     - NO Salesforce data sent                       │ │◀─────┼─────
│  └────────────────────────────────────────────────────┘ │      │ JSON
│                          │                               │      │
│                          ▼                               │      │
│  ┌────────────────────────────────────────────────────┐ │      │
│  │  4. Process Response                                │ │      │
│  │     - isValid: true/false                           │ │      │
│  │     - tier: 'free'/'pro'/'enterprise'               │ │      │
│  │     - expires_at: timestamp                         │ │      │
│  │     - features: array                               │ │      │
│  └────────────────────────────────────────────────────┘ │      │
│                          │                               │      │
│                          ▼                               │      │
│  ┌────────────────────────────────────────────────────┐ │      │
│  │  5. Cache License State                             │ │      │
│  │     - Store in extension context                    │ │      │
│  │     - TTL: 24 hours                                 │ │      │
│  └────────────────────────────────────────────────────┘ │      │
│                          │                               │      │
│                          ▼                               │      │
│  ┌────────────────────────────────────────────────────┐ │      │
│  │  6. Allow/Deny Feature                              │ │      │
│  │     - If Pro: Execute feature                       │ │      │
│  │     - If Free: Show upgrade message                 │ │      │
│  └────────────────────────────────────────────────────┘ │      │
└─────────────────────────────────────────────────────────┘      │
     │                                                             │
     │ 7. Feature executed or upgrade prompt shown                │
     │                                                             │
     ▼                                                             │
┌──────────┐                                                      │
│   User   │                                                      │
│          │                                                      │
└──────────┘                                                      │

Data Transmitted to License API:
  ✅ Device token (UUID, pseudonymized)
  ❌ NO Salesforce data
  ❌ NO customer business data
  ❌ NO usage telemetry

Graceful Degradation:
  ⚠️  If API unavailable: Falls back to free tier
  ⚠️  If network error: Uses stale cache (if available)
  ⚠️  If token invalid: Prompts for reactivation
```

---

## 5. Network Communication Matrix

### 5.1 Outbound Connections

| Source | Destination | Protocol | Port | Purpose | Data Transmitted | Frequency |
|--------|-------------|----------|------|---------|------------------|-----------|
| **Extension** | Customer's Salesforce Org | HTTPS | 443 | Query data, create quotes | SOQL queries, API requests | On-demand |
| **Extension** | License API (sfapp.forceweaver.com) | HTTPS | 443 | Validate license | Device token (UUID) | Once per 24hrs |
| **Salesforce CLI** | Salesforce Auth Server | HTTPS | 443 | OAuth authentication | User credentials | User-initiated |

### 5.2 Inbound Connections

| Destination | Source | Protocol | Port | Purpose |
|-------------|--------|----------|------|---------|
| **Extension** | None | N/A | N/A | No inbound connections |

### 5.3 Data Transmission Details

#### To Salesforce Org

**Request Types:**
- SOQL Queries (GET)
- REST API calls (GET/POST)
- Apex execution (GET)
- Place Sales Transaction API (POST)

**Data Sent:**
- Quote IDs, Opportunity IDs, Product IDs
- Quote creation payloads
- Apex code for pricing calculation
- SOQL query strings

**Data Received:**
- Quote data (JSON)
- QuoteLineItem data (JSON)
- Product data (JSON)
- Opportunity data (JSON)
- Apex execution results (JSON)

**Authentication:**
- OAuth 2.0 Bearer tokens (from Salesforce CLI)
- Tokens refreshed automatically by CLI

#### To License API

**Request Types:**
- POST /api/license/activate (device code request)
- POST /api/license/token (token exchange)
- POST /api/license/validate (license validation)

**Data Sent:**
- Device codes (temporary UUIDs)
- Device tokens (persistent UUIDs)
- NO Salesforce data
- NO customer business data

**Data Received:**
- License validation response (isValid, tier, expires_at)
- Device authorization response (user_code, device_code)
- Token exchange response (device_token)

**Authentication:**
- Device tokens (OAuth 2.0 Device Flow)
- No user credentials transmitted

---

## 6. Security Zones

### 6.1 Zone Classification

```
┌─────────────────────────────────────────────────────────────────────┐
│  ZONE 1: CUSTOMER WORKSTATION (Highest Trust)                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                      │
│  Components:                                                         │
│  • VS Code Extension                                                 │
│  • Local File System                                                 │
│  • OS Secure Storage                                                 │
│  • Salesforce CLI                                                    │
│                                                                      │
│  Data Classification: CONFIDENTIAL                                   │
│  • Salesforce pricing data                                           │
│  • Quote configurations                                              │
│  • Custom field values                                               │
│  • Test results                                                      │
│                                                                      │
│  Security Controls:                                                  │
│  ✅ OS-level file permissions                                        │
│  ✅ Full-disk encryption (recommended)                               │
│  ✅ Antivirus/endpoint protection                                    │
│  ✅ User authentication (OS login)                                   │
│                                                                      │
│  Threats:                                                            │
│  ⚠️  Malware on workstation                                          │
│  ⚠️  Unauthorized physical access                                    │
│  ⚠️  Insider threats                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ZONE 2: CUSTOMER SALESFORCE ORG (Very High Trust)                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                      │
│  Components:                                                         │
│  • Salesforce Production/UAT/Dev Orgs                                │
│  • Salesforce APIs                                                   │
│  • Salesforce Data Storage                                           │
│                                                                      │
│  Data Classification: CONFIDENTIAL                                   │
│  • Production Salesforce data                                        │
│  • Customer records                                                  │
│  • Pricing configurations                                            │
│                                                                      │
│  Security Controls:                                                  │
│  ✅ OAuth 2.0 authentication                                         │
│  ✅ Salesforce Shield (optional)                                     │
│  ✅ IP restrictions                                                  │
│  ✅ MFA enforcement                                                  │
│  ✅ Salesforce audit logs                                            │
│                                                                      │
│  Threats:                                                            │
│  ⚠️  Compromised user credentials                                    │
│  ⚠️  Excessive permissions                                           │
│  ⚠️  API abuse                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ZONE 3: FORCEWEAVER LICENSE API (Medium Trust - Optional)          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                      │
│  Components:                                                         │
│  • License validation API (Vercel)                                   │
│  • License database (Supabase)                                       │
│  • Web portal (Next.js)                                              │
│                                                                      │
│  Data Classification: INTERNAL                                       │
│  • Device tokens (UUIDs)                                             │
│  • User email addresses                                              │
│  • License purchase records                                          │
│  • NO Salesforce data                                                │
│                                                                      │
│  Security Controls:                                                  │
│  ✅ TLS 1.2+ encryption                                              │
│  ✅ Database encryption at rest                                      │
│  ✅ Rate limiting                                                    │
│  ✅ DDoS protection                                                  │
│  ✅ SOC 2 certified vendors                                          │
│                                                                      │
│  Threats:                                                            │
│  ⚠️  API abuse                                                       │
│  ⚠️  License token theft                                             │
│  ⚠️  Account takeover                                                │
│                                                                      │
│  Mitigation:                                                         │
│  ✅ Graceful degradation (falls back to free tier)                   │
│  ✅ No impact on Salesforce data security                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Network Segmentation

```
                    Internet
                       │
                       │
        ┌──────────────┴──────────────┐
        │                             │
        │                             │
        ▼                             ▼
┌───────────────┐           ┌──────────────────┐
│  Salesforce   │           │  Forceweaver     │
│  Firewall     │           │  CDN/WAF         │
│               │           │  (Vercel)        │
└───────┬───────┘           └────────┬─────────┘
        │                            │
        │                            │
        ▼                            ▼
┌───────────────┐           ┌──────────────────┐
│  Salesforce   │           │  License API     │
│  Org(s)       │           │  (Vercel Edge)   │
│               │           │                  │
│  • Production │           │  • /api/license/ │
│  • UAT        │           │    validate      │
│  • Dev        │           │  • /api/license/ │
│               │           │    activate      │
└───────────────┘           └────────┬─────────┘
        ▲                            │
        │                            │
        │                            ▼
        │                   ┌──────────────────┐
        │                   │  Supabase DB     │
        │                   │  (EU West)       │
        │                   │                  │
        │                   │  • License data  │
        │                   │  • User accounts │
        │                   └──────────────────┘
        │
        │ HTTPS (TLS 1.2+)
        │ OAuth 2.0
        │
┌───────┴────────────────────────────────────────┐
│         Customer's Network                     │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Corporate Firewall                       │ │
│  │  • Whitelist: *.salesforce.com:443        │ │
│  │  • Whitelist: sfapp.forceweaver.com:443   │ │
│  └──────────────────────────────────────────┘ │
│                     │                          │
│                     ▼                          │
│  ┌──────────────────────────────────────────┐ │
│  │  Developer Workstation                    │ │
│  │  • VS Code Extension                      │ │
│  │  • Local File System                      │ │
│  │  • OS Secure Storage                      │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 7. Deployment Scenarios

### 7.1 Standard Enterprise Deployment

**Scenario**: Large enterprise with corporate firewall and proxy

```
┌─────────────────────────────────────────────────────────────┐
│                  Enterprise Network                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Corporate Proxy                                        │ │
│  │  • HTTP_PROXY=http://proxy.company.com:8080            │ │
│  │  • HTTPS_PROXY=http://proxy.company.com:8080           │ │
│  │  • NO_PROXY=localhost,127.0.0.1                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Corporate Firewall                                     │ │
│  │  • Whitelist: *.salesforce.com:443                      │ │
│  │  • Whitelist: *.force.com:443                           │ │
│  │  • Whitelist: sfapp.forceweaver.com:443 (optional)      │ │
│  │  • Deep packet inspection (DPI)                         │ │
│  │  • TLS inspection (optional)                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Developer Workstations (100+ users)                    │ │
│  │  • Managed by IT (MDM/Intune)                           │ │
│  │  • Full-disk encryption enforced                        │ │
│  │  • Antivirus/EDR installed                              │ │
│  │  • VS Code deployed via enterprise catalog              │ │
│  │  • Extension deployed via extension management          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
- Proxy settings inherited from VS Code
- Firewall rules for Salesforce and License API
- Extension deployed via enterprise extension management
- License tokens stored in OS Keychain (encrypted)

### 7.2 Air-Gapped/Restricted Environment

**Scenario**: High-security environment with no internet access

```
┌─────────────────────────────────────────────────────────────┐
│              Isolated Network (Air-Gapped)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  On-Premise Salesforce (Hyperforce Private)            │ │
│  │  • Private Salesforce instance                          │ │
│  │  • No internet connectivity                             │ │
│  │  • Internal DNS only                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ▲                               │
│                              │                               │
│                              │ Internal Network              │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Developer Workstations                                 │ │
│  │  • No internet access                                   │ │
│  │  • Extension installed via internal repository          │ │
│  │  • License validation disabled (free tier only)         │ │
│  │  • All data remains on-premise                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
- Extension operates in free tier mode (no license validation)
- All communication stays within internal network
- No external dependencies
- Graceful degradation to free tier features

### 7.3 Cloud-First Deployment

**Scenario**: Modern cloud-native organization

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Environment                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Salesforce Production Org (Cloud)                      │ │
│  │  • my.salesforce.com                                    │ │
│  │  • Public internet access                               │ │
│  │  • IP restrictions (optional)                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ▲                               │
│                              │ HTTPS                         │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Developer Workstations (Remote/Distributed)            │ │
│  │  • BYOD or corporate laptops                            │ │
│  │  • VPN connection (optional)                            │ │
│  │  • Cloud-based file storage (Google Drive, OneDrive)    │ │
│  │  • Extension auto-updates enabled                       │ │
│  │  • License validation via internet                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              │ HTTPS                         │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Forceweaver License API (Cloud)                        │ │
│  │  • sfapp.forceweaver.com                                │ │
│  │  • Vercel Edge Network                                  │ │
│  │  • Global CDN                                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
- Direct internet access to Salesforce and License API
- No proxy or firewall restrictions
- Extension auto-updates enabled
- Full Pro/Enterprise feature access

---

## 8. Security Considerations

### 8.1 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **Malware on workstation** | Medium | High | Antivirus, EDR, OS updates |
| **Compromised Salesforce credentials** | Low | Critical | MFA, OAuth 2.0, session timeout |
| **Man-in-the-middle attack** | Very Low | High | TLS 1.2+, certificate validation |
| **License token theft** | Low | Low | OS-level encryption, graceful degradation |
| **Insider threat** | Low | High | Principle of least privilege, audit logs |
| **Data exfiltration** | Very Low | Critical | Local-first architecture, no external data transmission |

### 8.2 Defense in Depth

**Layer 1: Network Security**
- TLS 1.2+ for all communications
- Certificate validation enforced
- No unencrypted HTTP connections

**Layer 2: Authentication**
- OAuth 2.0 for Salesforce
- Device-based authorization for licenses
- MFA support

**Layer 3: Authorization**
- Salesforce permission sets
- Extension inherits user permissions
- No privilege escalation

**Layer 4: Application Security**
- Input validation and sanitization
- SOQL injection prevention
- Command injection prevention
- Path traversal protection

**Layer 5: Data Security**
- Local-first architecture
- OS-level encryption for tokens
- Automatic log sanitization

**Layer 6: Monitoring**
- Security event logging
- Vulnerability scanning (SonarCloud)
- Dependency scanning (npm audit)

---

## 9. Firewall Configuration

### 9.1 Required Firewall Rules

**Outbound Rules (Required):**
```
# Salesforce API access (required for core functionality)
ALLOW tcp/443 to *.salesforce.com
ALLOW tcp/443 to *.force.com
ALLOW tcp/443 to *.my.salesforce.com

# License API access (optional - falls back to free tier if blocked)
ALLOW tcp/443 to sfapp.forceweaver.com

# Block all other outbound connections from extension
DENY all other traffic from VS Code Extension
```

**Inbound Rules:**
```
# No inbound connections required
DENY all inbound connections to VS Code Extension
```

### 9.2 Proxy Configuration

**Environment Variables:**
```bash
# Set proxy for HTTPS connections
export HTTPS_PROXY=http://proxy.company.com:8080

# Set proxy authentication (if required)
export HTTPS_PROXY=http://username:password@proxy.company.com:8080

# Exclude localhost and internal domains
export NO_PROXY=localhost,127.0.0.1,.internal.company.com
```

**VS Code Settings:**
```json
{
  "http.proxy": "http://proxy.company.com:8080",
  "http.proxyStrictSSL": true,
  "http.proxyAuthorization": "Basic base64encodedcredentials"
}
```

---

## 10. Monitoring & Logging

### 10.1 Extension Logging

**Log Destinations:**
- VS Code Output Channel (local only)
- No external log aggregation
- No persistent log files

**Logged Events:**
- Snapshot creation (Quote ID, Org, Timestamp)
- Test execution (Snapshot ID, Target Org, Result)
- License validation (Success/Failure, Timestamp)
- API calls (URL, Status Code, Duration)
- Errors (Sanitized error messages)

**NOT Logged:**
- Access tokens or credentials
- Salesforce data contents
- User personal information
- Sensitive field values

### 10.2 Network Monitoring

**Recommended Monitoring:**
- Firewall logs for blocked connections
- Proxy logs for HTTP/HTTPS traffic
- Endpoint security alerts
- Salesforce login history
- API usage reports

**Anomaly Detection:**
- Unusual API call patterns
- Failed authentication attempts
- Excessive data queries
- Unauthorized org access

---

## 11. Compliance Mapping

### 11.1 GDPR Compliance

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| **Data Minimization** | Only device tokens sent to License API | Network logs |
| **Purpose Limitation** | License validation only | DPA Section 3 |
| **Storage Limitation** | 24-hour cache, 30-day retention | DPA Section 9 |
| **Integrity & Confidentiality** | TLS 1.2+, encryption at rest | Security Whitepaper Section 6 |
| **Accountability** | DPA, audit logs, security documentation | This document |

### 11.2 SOC 2 Compliance

| Trust Service Criterion | Implementation | Evidence |
|------------------------|----------------|----------|
| **Security** | Comprehensive security controls | Security Whitepaper Section 7 |
| **Availability** | 99.9% uptime target, redundancy | Architecture diagram |
| **Processing Integrity** | Input validation, error handling | Code audit report |
| **Confidentiality** | Encryption, access controls | Security Whitepaper Section 6 |
| **Privacy** | Minimal PII collection, DPA | DPA document |

---

## 12. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 5, 2025 | Forceweaver Architecture Team | Initial release |

**Classification**: Public  
**Distribution**: Unrestricted  
**Next Review**: April 5, 2026 (6 months)

---

**© 2025 Forceweaver. All rights reserved.**

This document is provided for informational purposes and reflects the current architecture as of the publication date. Architecture may change without notice to improve security, performance, or functionality.
