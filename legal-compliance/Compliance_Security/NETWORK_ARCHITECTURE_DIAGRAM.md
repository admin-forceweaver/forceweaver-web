# Network Architecture & Data Flow Diagram

**Rev Cloud Blueprint Extension - Public Beta**

**Version:** 1.0 (Public Beta)  
**Date:** October 6, 2025  
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

Rev Cloud Blueprint follows a **fully local, offline-first, privacy-by-design** architecture:

- ✅ **Fully Local Processing**: All Salesforce data processed on user's workstation
- ✅ **Direct Connections**: Extension communicates only with customer's Salesforce org
- ✅ **No Cloud Dependencies**: No external servers, APIs, or cloud services
- ✅ **Zero Data Exfiltration**: Salesforce data never transmitted to external servers
- ✅ **Complete User Control**: Customer maintains absolute control over their data

### 1.2 Public Beta Status

**Current Phase:** Public Beta (All Features Free)

- ✅ No user registration or authentication
- ✅ No license validation or device tokens
- ✅ No external API calls (except to customer's Salesforce org)
- ✅ No analytics or telemetry  
- ✅ **100% Offline Capable** (after Salesforce authentication)

### 1.3 Key Components

| Component | Location | Purpose | Data Handled |
|-----------|----------|---------|--------------|
| **VS Code Extension** | User's Workstation | Core testing functionality | Salesforce Data (local) |
| **Salesforce CLI** | User's Workstation | Authentication provider | Access Tokens |
| **Local File System** | User's Workstation | Snapshot storage | Salesforce Data (local) |
| **OS Secure Storage** | User's Workstation | Token storage | Access Tokens (encrypted) |
| **Salesforce Org** | Customer's Cloud | Data source/target | Salesforce Data |

**No External Components** - No license servers, analytics servers, or cloud storage

---

## 2. High-Level Architecture

### 2.1 System Context Diagram

```mermaid
graph TB
    subgraph CustomerEnv["CUSTOMER'S ENVIRONMENT"]
        subgraph Workstation["Developer Workstation"]
            subgraph VSCode["VS Code IDE"]
                Extension["Rev Cloud Blueprint Extension<br/>• Snapshot Creator<br/>• Test Runner<br/>• Report Generator<br/>• Group Manager<br/><br/>✅ All processing locally<br/>❌ No external transmission"]
                CLI["Salesforce CLI - sf org<br/>• OAuth 2.0 Authentication<br/>• Token Management"]
            end
            FileSystem["Local File System<br/>• snapshots - JSON files<br/>• results - HTML files<br/>• settings.json<br/>• groups.json"]
            SecureStorage["OS Secure Storage<br/>Keychain or Credential Mgr<br/>• Access Tokens AES-256"]
        end
    end
    
    Salesforce["Customer's Salesforce Orgs<br/>• Production<br/>• UAT<br/>• Development<br/>• Sandbox<br/><br/>OAuth 2.0 Protected<br/>Customer-Managed"]
    
    Extension -->|Uses| CLI
    Extension -->|Reads and Writes| FileSystem
    CLI -->|Stores Tokens| SecureStorage
    Extension -->|"HTTPS TLS 1.2+<br/>OAuth 2.0 Bearer Token"| Salesforce
    
    style CustomerEnv fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style Extension fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style CLI fill:#ffcc80,stroke:#e65100,stroke-width:2px
    style FileSystem fill:#fff59d,stroke:#f57f17,stroke-width:2px
    style SecureStorage fill:#ce93d8,stroke:#4a148c,stroke-width:2px
    style Salesforce fill:#90caf9,stroke:#0d47a1,stroke-width:2px
```

**Key Points:**
- ✅ **NO EXTERNAL SERVERS OR APIs** (Fully Local, Offline-First)
- ✅ All customer data remains within customer's environment
- ✅ Only connection is to customer's own Salesforce org

### 2.2 Trust Boundaries

```mermaid
graph TB
    subgraph Zone1["Trust Zone 1: Customer's Complete Control"]
        Z1Components["Components:<br/>• Developer Workstation<br/>• VS Code Extension<br/>• Local File System<br/>• Salesforce CLI<br/>• OS Secure Storage"]
        Z1Data["Data:<br/>ALL Salesforce Data<br/>(quotes, pricing, products)"]
        Z1Security["Security:<br/>Customer's responsibility"]
        Z1Control["Control:<br/>100% Customer-controlled"]
    end
    
    subgraph Zone2["Trust Zone 2: Customer's Salesforce Org"]
        Z2Components["Components:<br/>• Salesforce Production/UAT/Dev<br/>• Salesforce APIs (REST, SOQL, Apex)<br/>• OAuth 2.0 Authentication"]
        Z2Data["Data:<br/>Customer's Salesforce Data"]
        Z2Security["Security:<br/>Salesforce-managed +<br/>Customer policies"]
        Z2Control["Control:<br/>Customer-controlled"]
    end
    
    Zone1 -->|"Authenticated HTTPS<br/>OAuth 2.0"| Zone2
    
    style Zone1 fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px
    style Zone2 fill:#bbdefb,stroke:#1565c0,stroke-width:3px
    style Z1Components fill:#e8f5e9,stroke:#2e7d32
    style Z2Components fill:#e3f2fd,stroke:#1565c0
```

**Key Points:**
- ✅ **NO EXTERNAL TRUST ZONES** (No third-party services)
- ✅ Both zones are 100% customer-controlled
- ✅ Single authenticated connection between zones

---

## 3. Detailed Component Diagram

### 3.1 Extension Internal Architecture

```mermaid
graph TD
    subgraph ExtensionLayers["VS Code Extension Components"]
        UI["User Interface Layer<br/>• Hierarchical Tree Provider<br/>• Report View<br/>• Sidebar Provider<br/>• Progress Reporter"]
        
        Business["Business Logic Layer<br/>• Snapshot Creator<br/>• Test Runner<br/>• Test Comparator<br/>• Report Generator<br/>• Grouping Manager"]
        
        Integration["Integration Layer<br/>• Salesforce Auth<br/>• Salesforce API<br/>• HTTP Client Factory<br/>• Place Quote Service<br/>• Apex Executor<br/>• Field Discovery<br/>• Org Feature Service"]
        
        Utility["Utility Layer<br/>• Logger (sanitized)<br/>• Validation Service<br/>• File System Service<br/>• Async JSON Parser<br/>• Configuration Service<br/>• API Utility Service"]
        
        NotIncluded["❌ NOT INCLUDED (Public Beta)<br/>❌ NO License Validation<br/>❌ NO External API Client<br/>❌ NO Telemetry/Analytics"]
    end
    
    UI --> Business
    Business --> Integration
    Integration --> Utility
    
    style UI fill:#e1bee7,stroke:#4a148c,stroke-width:2px
    style Business fill:#c5cae9,stroke:#1a237e,stroke-width:2px
    style Integration fill:#b2dfdb,stroke:#004d40,stroke-width:2px
    style Utility fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style NotIncluded fill:#ffcdd2,stroke:#b71c1c,stroke-width:2px
```

### 3.2 Data Storage Architecture

```mermaid
graph TD
    subgraph LocalStorage["Local Data Storage"]
        subgraph Workspace["Workspace Directory"]
            RCB["revcloud_blueprint/"]
            
            subgraph Pricing["pricing/"]
                Snapshots["📁 snapshots/<br/>• snapshot_ProdOrg_0Q0xxx_test1.json<br/>• snapshot_ProdOrg_0Q0yyy_test2.json<br/>• ..."]
                Results["📁 results/<br/>• test_results_2025-10-06.html<br/>• batch_results_2025-10-06.html<br/>• ..."]
            end
            
            subgraph RevCloud["📁 .revcloud/"]
                Settings["⚙️ settings.json<br/>(field configuration)"]
                Groups["📋 groups.json<br/>(snapshot organization)"]
            end
        end
        
        subgraph OSStorage["OS Secure Storage"]
            Keychain["🔐 macOS Keychain /<br/>Windows Credential Manager /<br/>Linux libsecret"]
            Tokens["Salesforce CLI tokens<br/>(managed by sf CLI, AES-256)"]
            NotStored["❌ NO DEVICE TOKENS<br/>❌ NO USER CREDENTIALS<br/>(not used in public beta)"]
        end
    end
    
    RCB --> Pricing
    Pricing --> Snapshots
    Pricing --> Results
    RCB --> RevCloud
    RevCloud --> Settings
    RevCloud --> Groups
    Keychain --> Tokens
    
    style LocalStorage fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style Workspace fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Pricing fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style RevCloud fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style Snapshots fill:#e8f5e9,stroke:#2e7d32
    style Results fill:#e8f5e9,stroke:#2e7d32
    style Settings fill:#e8f5e9,stroke:#2e7d32
    style Groups fill:#e8f5e9,stroke:#2e7d32
    style OSStorage fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style Keychain fill:#e1bee7,stroke:#4a148c
    style Tokens fill:#e1bee7,stroke:#4a148c
    style NotStored fill:#ffcdd2,stroke:#b71c1c
```

**Storage Locations:**
- **Local Files**: All snapshots, reports, and configuration stored in user's workspace directory
- **Secure Storage**: Salesforce access tokens stored in OS-level encrypted storage (Keychain/Credential Manager)
- **NOT Stored**: No device tokens, user credentials, or license data (public beta)

---

## 4. Data Flow Diagrams

### 4.1 Snapshot Creation Flow

```mermaid
sequenceDiagram
    actor User
    participant Extension as VS Code Extension
    participant CLI as Salesforce CLI
    participant FS as Local File System
    participant SF as Salesforce Org

    User->>Extension: 1. Click "Create Snapshot"
    Extension->>User: Prompt for Source Org, Quote ID, Description
    User->>Extension: Provide inputs
    
    Extension->>CLI: 2. Get access token
    CLI-->>Extension: Return OAuth token
    
    Extension->>SF: 3. Query Salesforce (HTTPS/SOQL)
    Note over Extension,SF: Fetch Quote, QuoteLineItems,<br/>Product, Opportunity data
    SF-->>Extension: Return JSON data
    
    Note over Extension: 4. Build Snapshot<br/>(LOCAL PROCESSING)<br/>• Extract metadata<br/>• Build expectedResults<br/>• Build recreationPayload
    
    Extension->>FS: 5. Save to local file system
    Note over Extension,FS: • Sanitize filename<br/>• Write JSON file<br/>• Update groups.json<br/>✅ NO EXTERNAL TRANSMISSION
    FS-->>Extension: Saved successfully
    
    Extension->>User: 6. Display success message
    
    Note over User,SF: Data Transmitted to Salesforce:<br/>✅ SOQL queries only<br/>❌ No data written<br/><br/>Data Stored Locally:<br/>✅ Complete snapshot JSON<br/><br/>Data Transmitted Externally:<br/>❌ NONE - All data stays local
```

### 4.2 Test Execution Flow

```mermaid
sequenceDiagram
    actor User
    participant Extension as VS Code Extension
    participant FS as Local File System
    participant CLI as Salesforce CLI
    participant SF as Salesforce Org

    User->>Extension: 1. Click "Run Test" on snapshot
    Extension->>FS: Load snapshot from local file
    FS-->>Extension: Return JSON snapshot data
    Note over Extension: Parse recreationPayload
    
    Extension->>User: 2. Prompt for Target Org & Opportunity
    User->>Extension: Select target org
    
    Extension->>CLI: Get access token for target org
    CLI-->>Extension: Return OAuth token
    
    Extension->>SF: 3. Create Test Quote (HTTPS/POST)
    Note over Extension,SF: Place Sales Transaction API
    SF-->>Extension: Return new Quote ID
    
    Extension->>SF: 4. Execute Pricing (Apex)
    Note over Extension,SF: Wait for pricing completion<br/>Poll for field stability
    SF-->>Extension: Pricing complete
    
    Extension->>SF: 5. Query Results (HTTPS/SOQL)
    Note over Extension,SF: Fetch Quote & QuoteLineItems<br/>Extract pricing fields
    SF-->>Extension: Return pricing data (JSON)
    
    Note over Extension: 6. Compare Results<br/>(LOCAL PROCESSING)<br/>• Compare expected vs actual<br/>• Calculate variances<br/>• Determine pass/fail<br/>✅ NO EXTERNAL TRANSMISSION
    
    Note over Extension: 7. Generate Report<br/>(LOCAL PROCESSING)<br/>• Create HTML report<br/>✅ NO EXTERNAL TRANSMISSION
    
    Extension->>FS: Save report to local results/ directory
    FS-->>Extension: Saved successfully
    
    Extension->>User: 8. Display test results & open report
    
    Note over User,SF: Data to Salesforce:<br/>✅ Quote creation, Apex exec, SOQL<br/><br/>Data Stored Locally:<br/>✅ Test report (HTML)<br/>✅ Test results<br/><br/>Data Transmitted Externally:<br/>❌ NONE - All stays local
```

---

## 5. Network Communication Matrix

### 5.1 Outbound Connections

| Source | Destination | Protocol | Port | Purpose | Data Transmitted | Frequency |
|--------|-------------|----------|------|---------|------------------|-----------|
| **Extension** | Customer's Salesforce Org | HTTPS | 443 | Query data, create quotes | SOQL queries, API requests | On-demand |

### 5.2 Inbound Connections

| Destination | Source | Protocol | Port | Purpose |
|-------------|--------|----------|------|---------|
| **Extension** | None | N/A | N/A | No inbound connections |

### 5.3 NO External Communications

**What's NOT in use (Public Beta):**

| Service | Status | Notes |
|---------|--------|-------|
| **License API** | ❌ Not Used | No license validation in public beta |
| **Analytics API** | ❌ Not Used | No telemetry or usage tracking |
| **Update Server** | ❌ Not Used | VS Code Marketplace handles updates |
| **CDN** | ❌ Not Used | No external resources |
| **Cloud Storage** | ❌ Not Used | All data stored locally |

---

## 6. Security Zones

### 6.1 Zone Classification

```mermaid
graph TB
    subgraph Zone1["🔒 ZONE 1: CUSTOMER WORKSTATION - Complete Control"]
        Z1_Components["<b>Components:</b><br/>• VS Code Extension<br/>• Local File System<br/>• OS Secure Storage<br/>• Salesforce CLI"]
        
        Z1_Data["<b>Data Classification: CONFIDENTIAL</b><br/>• Salesforce pricing data<br/>• Quote configurations<br/>• Custom field values<br/>• Test results"]
        
        Z1_Security["<b>Security Controls:</b><br/>✅ OS-level file permissions<br/>✅ Full-disk encryption (recommended)<br/>✅ Antivirus/endpoint protection<br/>✅ User authentication (OS login)"]
        
        Z1_Threats["<b>Threats:</b><br/>⚠️ Malware on workstation<br/>⚠️ Unauthorized physical access<br/>⚠️ Insider threats"]
        
        Z1_Owner["<b>Ownership:</b><br/>100% Customer-Controlled"]
    end
    
    subgraph Zone2["🔐 ZONE 2: CUSTOMER SALESFORCE ORG - Customer-Managed"]
        Z2_Components["<b>Components:</b><br/>• Salesforce Production/UAT/Dev<br/>• Salesforce APIs<br/>• Salesforce Data Storage"]
        
        Z2_Data["<b>Data Classification: CONFIDENTIAL</b><br/>• Production Salesforce data<br/>• Customer records<br/>• Pricing configurations"]
        
        Z2_Security["<b>Security Controls:</b><br/>✅ OAuth 2.0 authentication<br/>✅ Salesforce Shield (optional)<br/>✅ IP restrictions<br/>✅ MFA enforcement<br/>✅ Salesforce audit logs"]
        
        Z2_Threats["<b>Threats:</b><br/>⚠️ Compromised user credentials<br/>⚠️ Excessive permissions<br/>⚠️ API abuse"]
        
        Z2_Owner["<b>Ownership:</b><br/>100% Customer-Controlled"]
    end
    
    Zone1 -->|"Authenticated HTTPS<br/>OAuth 2.0"| Zone2
    
    style Zone1 fill:#c8e6c9,stroke:#2e7d32,stroke-width:4px
    style Zone2 fill:#bbdefb,stroke:#1565c0,stroke-width:4px
    style Z1_Components fill:#e8f5e9,stroke:#2e7d32
    style Z1_Data fill:#fff9c4,stroke:#f57f17
    style Z1_Security fill:#c8e6c9,stroke:#2e7d32
    style Z1_Threats fill:#ffccbc,stroke:#d84315
    style Z1_Owner fill:#e1bee7,stroke:#4a148c
    style Z2_Components fill:#e3f2fd,stroke:#1565c0
    style Z2_Data fill:#fff9c4,stroke:#f57f17
    style Z2_Security fill:#bbdefb,stroke:#1565c0
    style Z2_Threats fill:#ffccbc,stroke:#d84315
    style Z2_Owner fill:#e1bee7,stroke:#4a148c
```

**Key Security Points:**
- ✅ **NO EXTERNAL SECURITY ZONES** (No third-party services or vendors)
- ✅ Both zones are 100% customer-controlled
- ✅ All data remains within customer's infrastructure
- ✅ Single authenticated connection between zones (HTTPS/OAuth 2.0)

---

## 7. Deployment Scenarios

### 7.1 Standard Enterprise Deployment

```mermaid
graph TB
    subgraph Enterprise["Enterprise Network"]
        Proxy["Corporate Proxy (Optional)<br/>• HTTP_PROXY<br/>• HTTPS_PROXY"]
        
        Firewall["Corporate Firewall<br/>• Whitelist: *.salesforce.com:443<br/>• Whitelist: *.force.com:443<br/>❌ NO OTHER WHITELISTING"]
        
        Workstations["Developer Workstations (100+ users)<br/>• Managed by IT (MDM/Intune)<br/>• Full-disk encryption enforced<br/>• Antivirus/EDR installed<br/>• VS Code enterprise deployed<br/>• Extension from marketplace<br/>✅ FULLY OFFLINE CAPABLE"]
    end
    
    Salesforce["Customer's Salesforce Org"]
    
    Workstations --> Proxy
    Proxy --> Firewall
    Firewall -->|HTTPS:443| Salesforce
    
    style Enterprise fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style Proxy fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Firewall fill:#ffccbc,stroke:#d84315,stroke-width:2px
    style Workstations fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style Salesforce fill:#90caf9,stroke:#0d47a1,stroke-width:2px
```

### 7.2 Air-Gapped Environment

```mermaid
graph TB
    subgraph AirGapped["Isolated Network (Air-Gapped)"]
        OnPremSF["On-Premise Salesforce<br/>(Hyperforce Private)<br/>• Private instance<br/>• No internet<br/>• Internal DNS only"]
        
        Workstations["Developer Workstations<br/>• No internet access<br/>• Extension via internal repo<br/>• All features functional<br/>✅ PERFECT FOR AIR-GAPPED"]
    end
    
    Workstations -->|Internal Network Only| OnPremSF
    
    style AirGapped fill:#fff3e0,stroke:#e65100,stroke-width:3px
    style OnPremSF fill:#90caf9,stroke:#0d47a1,stroke-width:2px
    style Workstations fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
```

**Public Beta Advantage for Air-Gapped:**
- ✅ No license validation required (no internet needed)
- ✅ No external dependencies
- ✅ All features available offline
- ✅ Perfect for high-security environments

---

## 8. Firewall Configuration

### 8.1 Required Firewall Rules

**Outbound Rules:**
```
# Salesforce API access (required)
ALLOW tcp/443 to *.salesforce.com
ALLOW tcp/443 to *.force.com

# NO OTHER RULES NEEDED
# (No license servers, analytics, or external services)
```

**Inbound Rules:**
```
# No inbound connections required
DENY all inbound connections
```

### 8.2 Comparison: Public Beta vs Future Licensed

| Firewall Rule | Public Beta | Future Licensed |
|---------------|-------------|-----------------|
| **Salesforce (*.salesforce.com:443)** | ✅ Required | ✅ Required |
| **License API (sfapp.forceweaver.com:443)** | ❌ Not Needed | ✅ Optional (for Pro/Enterprise) |
| **Total Outbound Rules** | 1 | 2 (1 optional) |

---

## 9. Monitoring & Logging

### 9.1 Local Logging Only

**Log Destinations:**
- VS Code Output Channel (local only)
- No external log aggregation
- No persistent log files

**What's Logged:**
- API request/response status codes
- Test execution progress
- Error messages (sanitized)

**What's NOT Logged:**
- Access tokens
- Salesforce data
- User information

### 9.2 No External Monitoring

**NOT in Use (Public Beta):**
- ❌ External log aggregation
- ❌ Application performance monitoring (APM)
- ❌ Error tracking services
- ❌ Analytics platforms
- ❌ Telemetry services

---

## 10. Summary: Maximum Security Through Simplicity

### 10.1 Security Benefits of Public Beta Architecture

**Advantages:**

1. **Zero External Attack Surface**
   - No servers to hack
   - No databases to breach
   - No APIs to exploit
   - No cloud infrastructure to compromise

2. **Complete Data Control**
   - Customer owns 100% of data
   - No third-party data sharing
   - No data exfiltration possible
   - No regulatory complexity

3. **Simplified Compliance**
   - No GDPR obligations (no personal data)
   - No SOC 2 requirements (no cloud services)
   - No vendor risk assessments
   - No sub-processor agreements

4. **Perfect for Regulated Industries**
   - Banking/Finance (PCI DSS compatible)
   - Healthcare (HIPAA compatible)
   - Government (air-gapped capable)
   - Defense (no external dependencies)

### 10.2 Network Footprint Comparison

| Aspect | Public Beta | Typical SaaS Tool |
|--------|-------------|-------------------|
| **External Servers** | 0 | 5-10+ |
| **Third-Party Services** | 0 | 3-7 |
| **Outbound Connections** | 1 (Salesforce only) | 10-20+ |
| **Data Exfiltration Risk** | ❌ Zero | ⚠️  High |
| **Vendor Dependencies** | 0 | 5-10 |
| **Firewall Rules** | 1 | 10-20+ |

---

## 11. Contact Information

**Security Inquiries:**
- Email: arohitu@gmail.com
- Subject: [SECURITY] Rev Cloud Blueprint

**Architecture Questions:**
- Email: arohitu@gmail.com
- Subject: [ARCHITECTURE] Rev Cloud Blueprint

**General Support:**
- Bug Reports: https://form.jotform.com/252443148591055
- GitHub: https://github.com/arohitu/revcloud-blueprint-extension

---

## 12. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 6, 2025 | Forceweaver Architecture Team | Initial release (Public Beta version) |

**Classification**: Public  
**Distribution**: Unrestricted  
**Next Review**: When monetization is implemented (estimated Q1 2026)

---

**© 2025 Forceweaver. All rights reserved.**

This document reflects the public beta architecture with zero external dependencies. When monetization is implemented, an updated version will be provided showing optional license validation API (Salesforce data will continue to remain local).
