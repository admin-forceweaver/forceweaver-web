# Data Processing Statement

**For Rev Cloud Blueprint Extension - Public Beta**

**Version:** 1.0 (Public Beta)  
**Effective Date:** October 6, 2025  
**Last Updated:** October 6, 2025

---

## Executive Summary

This document clarifies the data processing practices of Rev Cloud Blueprint during the **public beta phase**. 

**Key Point: NO DATA PROCESSING AGREEMENT REQUIRED**

During the public beta phase, Rev Cloud Blueprint does **NOT** process any personal data or customer data on external servers. Therefore, a traditional Data Processing Agreement (DPA) is not applicable or required.

---

## Current Status: Public Beta

### No External Data Processing

Rev Cloud Blueprint operates as a **fully local application** with the following characteristics:

✅ **No Cloud Services** - No external servers or APIs  
✅ **No User Registration** - No collection of personal data  
✅ **No License Validation** - No device tokens or identifiers  
✅ **No Analytics** - No usage tracking or telemetry  
✅ **No Data Transmission** - No data sent to external servers  

### All Processing is Local

- **Salesforce Data**: Processed locally on user's workstation
- **Snapshots**: Stored in user's local file system
- **Test Reports**: Generated and stored locally
- **Access Tokens**: Managed by Salesforce CLI (user's workstation)

---

## Data Flow Overview

```
┌─────────────────────────────────────────┐
│         User's Workstation              │
│  ┌───────────────────────────────────┐  │
│  │   VS Code Extension (Local)       │  │
│  │   • All processing happens here   │  │
│  │   • No external data transmission │  │
│  └───────────────────────────────────┘  │
│                 ↓ ↑                      │
│  ┌───────────────────────────────────┐  │
│  │   Local File System               │  │
│  │   • Snapshots (JSON)              │  │
│  │   • Reports (HTML)                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                 ↓ ↑
                HTTPS
                 ↓ ↑
┌─────────────────────────────────────────┐
│   Customer's Salesforce Org             │
│   • Customer is Data Controller         │
│   • Extension is a local tool           │
└─────────────────────────────────────────┘

NO EXTERNAL SERVERS
(No Forceweaver servers involved)
```

---

## Roles and Responsibilities

### Customer

**Role:** Data Controller

The customer (user of the extension) is the **sole data controller** for all data processed by the extension:

- **Salesforce Data**: Customer owns and controls all Salesforce data
- **Local Snapshots**: Customer owns and controls snapshot files
- **Test Reports**: Customer owns and controls report files
- **Retention**: Customer decides retention policies
- **Deletion**: Customer can delete data at any time
- **Access Control**: Customer controls file system permissions

### Forceweaver

**Role:** Software Provider (NOT Data Processor)

Forceweaver provides the extension as a software tool but does **NOT** process any customer data:

- ❌ No access to customer's Salesforce data
- ❌ No access to snapshot files
- ❌ No access to test reports
- ❌ No collection of usage data
- ❌ No storage of customer information
- ❌ No external servers or databases

**Forceweaver's Responsibility:**
- ✅ Provide secure, well-tested software
- ✅ Fix security vulnerabilities promptly
- ✅ Maintain code quality and security
- ✅ Provide documentation and support

---

## GDPR Compliance

### No Personal Data Processing

**Status:** ✅ **Fully GDPR Compliant** (No personal data processed by Forceweaver)

The extension does NOT process any personal data as defined by GDPR:

- ❌ No names, email addresses, or contact information
- ❌ No IP addresses or device identifiers  
- ❌ No location data or tracking
- ❌ No cookies or persistent identifiers
- ❌ No user accounts or profiles

### Customer's GDPR Obligations

Customers must ensure their own GDPR compliance when using the extension:

**Customer Responsibilities:**
- Ensure lawful processing of Salesforce data (legal basis, consent, etc.)
- Implement appropriate security measures (encryption, access controls)
- Respond to data subject rights requests (access, erasure, portability)
- Maintain records of processing activities
- Report data breaches to authorities (if applicable)

**Extension Features Supporting GDPR:**
- ✅ Local storage (customer controls data)
- ✅ No external transmission (data minimization)
- ✅ User-controlled deletion (right to erasure)
- ✅ Transparent operation (no hidden data collection)

---

## Data Security

### Customer's Responsibility

Since all data remains on the customer's workstation, **data security is primarily the customer's responsibility:**

**Recommended Security Measures:**

1. **Workstation Security:**
   - Enable full-disk encryption (FileVault, BitLocker, LUKS)
   - Use strong passwords and/or biometric authentication
   - Install antivirus and endpoint protection
   - Keep OS and software updated
   - Enable OS firewall

2. **Salesforce Security:**
   - Enable multi-factor authentication (MFA)
   - Use strong passwords
   - Implement IP restrictions
   - Follow Salesforce security best practices
   - Regularly review access logs

3. **Snapshot File Security:**
   - Store in secure locations (not in public folders)
   - Use `.gitignore` to avoid committing to public repositories
   - Apply appropriate file permissions
   - Encrypt sensitive snapshots (if needed)
   - Regularly review and delete obsolete snapshots

4. **Network Security:**
   - Use corporate VPN (if required)
   - Connect only to trusted networks
   - Avoid public Wi-Fi for sensitive operations

### Extension Security Features

**What the Extension Provides:**

- ✅ Input validation (SOQL injection prevention, command injection prevention)
- ✅ Path traversal protection (secure file operations)
- ✅ Log sanitization (automatic redaction of sensitive data)
- ✅ Secure authentication via Salesforce CLI (OAuth 2.0)
- ✅ HTTPS-only communication with Salesforce
- ✅ No external data transmission

---

## Data Retention and Deletion

### Customer Controls Retention

**Retention Policy:** Customer-controlled

- Snapshot files persist until customer deletes them
- Test reports persist until customer deletes them  
- No external backups or archives (by Forceweaver)
- No minimum or maximum retention periods

**Deletion:**
- Standard file deletion (via OS or VS Code)
- Immediate effect (no recovery by Forceweaver)
- No data remains on external servers (none exist)

### Recommended Retention Policies

**Best Practices:**

1. **Active Testing:** Keep snapshots for current testing needs
2. **Historical Reference:** Archive old snapshots if needed for audit trails
3. **Compliance:** Follow organization's data retention policies
4. **Cleanup:** Regularly delete obsolete snapshots (quarterly review recommended)
5. **Sensitive Data:** Delete sensitive snapshots immediately after use (if applicable)

---

## Data Subject Rights

### Customer's Responsibility

Since customer is the data controller, customer must handle all data subject rights requests:

**Rights under GDPR:**
- **Right to Access**: Provide copy of data to data subject
- **Right to Rectification**: Correct inaccurate data
- **Right to Erasure**: Delete data upon request
- **Right to Restrict Processing**: Temporarily halt processing
- **Right to Data Portability**: Provide data in machine-readable format
- **Right to Object**: Stop certain types of processing

**How Extension Supports Rights:**
- ✅ Snapshots are in JSON format (machine-readable, portable)
- ✅ Customer can access snapshot files anytime
- ✅ Customer can delete snapshots instantly
- ✅ No external systems to coordinate with

---

## Data Breach Notification

### No Forceweaver Breach Possible

**Important:** Forceweaver **cannot** experience a data breach of customer data because:

- ❌ No customer data on Forceweaver servers
- ❌ No databases containing customer information
- ❌ No cloud storage of snapshots or reports
- ❌ No user accounts or credentials

### Customer Breach Response

If customer experiences a data breach (e.g., workstation compromise):

**Customer's Obligations:**
1. Assess scope of breach
2. Notify affected data subjects (if required by GDPR)
3. Report to supervisory authority (within 72 hours if required)
4. Document breach and response
5. Implement additional security measures

**Forceweaver Support:**
- Provide security documentation
- Answer security questions
- Provide updates if extension vulnerability contributed to breach

---

## International Data Transfers

### No International Transfers by Forceweaver

**Status:** ✅ **No international data transfers**

All data processing happens locally:
- **Snapshots**: Stored on user's workstation (location: user's choice)
- **Salesforce Data**: Stored in customer's Salesforce org (location: customer's choice)
- **No Cloud Storage**: No data transferred to external servers

### Customer's Data Transfers

Customers may transfer data internationally via:
- Committing snapshots to Git repositories (customer's choice)
- Sharing snapshot files via email/file sharing (customer's choice)
- Accessing Salesforce from different countries (Salesforce's responsibility)

**Customer's Responsibility:** Ensure compliance with applicable data transfer regulations (GDPR, etc.)

---

## Third-Party Sub-Processors

### No Sub-Processors

**Status:** ✅ **No sub-processors involved**

During the public beta phase:
- ❌ No cloud hosting providers (no cloud services)
- ❌ No database providers (no databases)
- ❌ No analytics providers (no analytics)
- ❌ No CDN providers (no web services)

**Only Direct Connections:**
- ✅ Customer's Salesforce org (customer-controlled)
- ✅ Salesforce CLI (runs on customer's workstation)

---

## Audits and Compliance

### Customer Audit Rights

**Source Code Transparency:**
- ✅ Extension source code available on GitHub
- ✅ Customers can review code for security assessment
- ✅ Open source transparency (inspect what the extension does)

**No External Systems to Audit:**
- ❌ No servers or databases to audit
- ❌ No cloud infrastructure to inspect
- ❌ No third-party processors to assess

### Forceweaver's Compliance

**Security Practices:**
- ✅ Code security audits (October 2025 - all critical issues resolved)
- ✅ Continuous security monitoring (SonarCloud)
- ✅ Dependency scanning (npm audit, Dependabot)
- ✅ Vulnerability disclosure program
- ✅ 24-hour response SLA for critical security issues

**Documentation:**
- ✅ Security Whitepaper available
- ✅ Network Architecture documentation available
- ✅ Compliance Checklist available

---

## Changes to Data Processing

### Future Monetization Phase

When monetization/licensing is implemented in the future:

**Planned Changes:**
- Optional license validation API (opt-in)
- Device token collection (UUIDs only, pseudonymized)
- User account system (email addresses)
- At that time, a full Data Processing Agreement will be provided

**What Will NOT Change:**
- ❌ Salesforce data will still NOT be transmitted externally
- ❌ Snapshots will still be stored locally
- ❌ Core functionality will remain local-first

**Customer Notification:**
- 60+ days advance notice before monetization
- Updated documentation provided
- Full Data Processing Agreement executed
- Users can continue using free tier (no forced changes)

### Current Commitment

**Public Beta Promise:**
- ✅ All features remain free
- ✅ No data collection
- ✅ No external dependencies  
- ✅ Full transparency on any changes
- ✅ 60-day notice before any data processing changes

---

## Summary: Why No DPA is Needed

### Traditional DPA Requirements

A Data Processing Agreement is required when:
- ✅ Processor processes personal data on behalf of controller
- ✅ Processing happens on processor's systems/servers
- ✅ Processor has access to personal data

### Rev Cloud Blueprint Public Beta

None of the above apply:
- ❌ No processing on Forceweaver servers (no servers exist)
- ❌ No access to customer data (all data stays local)
- ❌ No personal data collected (no user registration)

**Therefore: No DPA required during public beta phase.**

---

## Legal Framework

### Applicable Laws

**GDPR (EU):**
- ✅ Compliant (no personal data processing)
- ✅ No registration required with supervisory authorities
- ✅ No Data Protection Impact Assessment (DPIA) required

**CCPA (California):**
- ✅ Compliant (no personal information collection)
- ✅ No sale of personal information
- ✅ No consumer rights requests to handle

**Other Regulations:**
- ✅ HIPAA: Not applicable (no healthcare data)
- ✅ PCI DSS: Not applicable (no payment data)
- ✅ SOX: Not applicable (no financial reporting)

### Governing Law

**Extension License:**
- Governed by EULA (End-User License Agreement)
- Published on VS Code Marketplace
- Jurisdiction: England and Wales

**Customer's Data:**
- Governed by customer's own policies
- Customer chooses jurisdiction for their data
- Extension operates under customer's control

---

## Contact Information

### Security Questions

**Email:** arohitu@gmail.com  
**Subject:** [SECURITY] Rev Cloud Blueprint  
**Response Time:** 24 hours for critical issues

### Data Protection Questions

**Email:** arohitu@gmail.com  
**Subject:** [DATA PROTECTION] Rev Cloud Blueprint  
**Response Time:** 48 hours for compliance questions

### General Support

**Bug Reports:** https://form.jotform.com/252443148591055  
**GitHub Issues:** https://github.com/arohitu/revcloud-blueprint-extension/issues  
**Website:** https://sfapp.forceweaver.com

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 6, 2025 | Forceweaver Legal Team | Initial release (Public Beta version) |

**Classification:** Public  
**Distribution:** Unrestricted  
**Next Review:** When monetization is implemented (estimated Q1 2026)

---

## Appendix: Comparison with Future DPA

### What's Different in Public Beta vs Future Licensed Version

| Aspect | Public Beta (Current) | Future Licensed Version |
|--------|----------------------|------------------------|
| **User Registration** | ❌ None | ✅ Optional (for Pro/Enterprise) |
| **Data Collection** | ❌ None | ✅ Email, device tokens only |
| **External Servers** | ❌ None | ✅ License validation API only |
| **Salesforce Data** | ✅ Local only | ✅ Local only (no change) |
| **DPA Required** | ❌ No | ✅ Yes (for license data) |
| **GDPR Obligations** | ❌ Minimal | ✅ Full compliance (for license data) |
| **Sub-Processors** | ❌ None | ✅ Supabase, Vercel, AWS |
| **Data Transfers** | ❌ None | ✅ EU-only (license data) |

### Continuity Promise

**What will NEVER change:**
- ❌ Salesforce data will NEVER be transmitted to external servers
- ❌ Snapshots will ALWAYS be stored locally
- ❌ Free tier will ALWAYS be available
- ❌ Core testing functionality will ALWAYS work offline

---

**© 2025 Forceweaver. All rights reserved.**

This document clarifies that no Data Processing Agreement is required during the public beta phase because no external data processing occurs. When monetization is implemented, a comprehensive DPA will be provided for license data processing only (Salesforce data will continue to remain local).
