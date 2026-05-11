# Rev Cloud Blueprint Security Whitepaper

**Version:** 1.0  
**Date:** October 5, 2025  
**Publisher:** Forceweaver  
**Product:** Rev Cloud Blueprint VS Code Extension v1.2.8  
**Classification:** Public

---

## Executive Summary

Rev Cloud Blueprint is an enterprise-grade Visual Studio Code extension designed for automated regression testing of Salesforce Revenue Cloud implementations. This whitepaper provides a comprehensive overview of the security architecture, data handling practices, and compliance posture of the Rev Cloud Blueprint extension.

**Key Security Highlights:**
- ✅ **Zero Salesforce Data Transmission** to external servers
- ✅ **Local-First Architecture** - all customer data remains in customer's environment
- ✅ **OS-Level Credential Encryption** using platform-native secure storage
- ✅ **Production-Ready Security** - all critical vulnerabilities resolved
- ✅ **Continuous Security Monitoring** via SonarCloud
- ✅ **Open Source Transparency** - code available for security review

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Security Architecture](#2-security-architecture)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Data Classification & Handling](#4-data-classification--handling)
5. [Network Security](#5-network-security)
6. [Encryption & Cryptography](#6-encryption--cryptography)
7. [Application Security](#7-application-security)
8. [Vulnerability Management](#8-vulnerability-management)
9. [Logging & Monitoring](#9-logging--monitoring)
10. [Incident Response](#10-incident-response)
11. [Compliance & Certifications](#11-compliance--certifications)
12. [Third-Party Dependencies](#12-third-party-dependencies)
13. [Security Best Practices for Deployment](#13-security-best-practices-for-deployment)

---

## 1. Product Overview

### 1.1 Purpose

Rev Cloud Blueprint enables Salesforce Revenue Cloud teams to perform automated regression testing of pricing, configuration, and billing scenarios. The extension creates "snapshots" of pricing configurations and validates them across different Salesforce environments.

### 1.2 Target Audience

- Enterprise Salesforce Revenue Cloud customers
- Salesforce consultants and system integrators
- DevOps teams managing Salesforce deployments
- Quality assurance teams

### 1.3 Deployment Model

- **Client-Side Application**: VS Code extension running on user's workstation
- **Local Data Storage**: Snapshot files stored in user's workspace directory
- **Direct Salesforce Integration**: Communicates directly with customer's Salesforce org(s)
- **Optional Cloud Services**: License validation API (does not process Salesforce data)

---

## 2. Security Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Environment                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           VS Code Extension (Local)                     │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  • Snapshot Creator                               │  │ │
│  │  │  • Test Runner                                    │  │ │
│  │  │  • Report Generator                               │  │ │
│  │  │  • License Service                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                        ↓                                │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Local File System                                │  │ │
│  │  │  • Snapshots (JSON)                               │  │ │
│  │  │  • Test Reports (HTML)                            │  │ │
│  │  │  • Configuration Files                            │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                        ↓                                │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  OS Secure Storage                                │  │ │
│  │  │  • Device Tokens (encrypted)                      │  │ │
│  │  │  • Keychain/Credential Manager                    │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│                        ↓ HTTPS                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Salesforce CLI (sf org)                        │ │
│  │  • OAuth 2.0 Authentication                            │ │
│  │  • Access Token Management                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
        ┌──────────────────────────────────────────┐
        │   Customer's Salesforce Org(s)           │
        │   • Production                           │
        │   • UAT                                  │
        │   • Development                          │
        └──────────────────────────────────────────┘

                           ↓ HTTPS (License Validation Only)
        ┌──────────────────────────────────────────┐
        │   Forceweaver License API                │
        │   (sfapp.forceweaver.com)                │
        │   • Device Token Validation              │
        │   • NO Salesforce Data Processed         │
        └──────────────────────────────────────────┘
```

### 2.2 Security Zones

| Zone | Components | Security Level | Data Sensitivity |
|------|-----------|----------------|------------------|
| **User Workstation** | VS Code Extension, Local Files | High (User-Controlled) | High (Salesforce Data) |
| **Salesforce Org** | Customer's Salesforce Instance | Very High (Salesforce-Managed) | Very High (Production Data) |
| **License API** | Forceweaver Cloud Service | High (Cloud-Managed) | Low (Device Tokens Only) |

### 2.3 Trust Boundaries

1. **Extension ↔ Salesforce CLI**: Trusted (same user context)
2. **Extension ↔ Salesforce Org**: Authenticated via OAuth 2.0
3. **Extension ↔ License API**: Authenticated via device tokens (optional)
4. **Extension ↔ File System**: OS-level permissions

---

## 3. Authentication & Authorization

### 3.1 Salesforce Authentication

**Method:** OAuth 2.0 via Salesforce CLI

The extension does NOT implement its own Salesforce authentication. Instead, it delegates to the official Salesforce CLI (`sf org`), which:

- Uses industry-standard OAuth 2.0 Web Server Flow
- Stores refresh tokens securely in OS-specific secure storage
- Provides access tokens on-demand via CLI commands
- Supports multi-factor authentication (MFA)
- Complies with Salesforce security policies

**Implementation:**
```typescript
// Extension retrieves access tokens via CLI (never stores credentials)
const { stdout } = await execAsync(`sf org display --target-org ${sanitizedOrg} --json`);
const result = JSON.parse(stdout);
const accessToken = result.accessToken;
```

**Security Controls:**
- ✅ Org alias sanitization prevents command injection
- ✅ Access tokens retrieved on-demand (not cached long-term)
- ✅ No credential storage in extension code
- ✅ Supports Salesforce session policies (timeout, IP restrictions)

### 3.2 License Authentication

**Method:** OAuth 2.0 Device Authorization Grant (RFC 8628)

For Pro/Enterprise tier features, the extension implements device-based licensing:

1. **Device Code Request**: Extension requests a device code from license API
2. **User Authorization**: User visits web portal and enters device code
3. **Token Exchange**: Extension polls for device token after authorization
4. **Token Storage**: Device token stored in VS Code SecretStorage API

**Security Controls:**
- ✅ Device tokens are UUIDs (not personally identifiable)
- ✅ Tokens stored in OS-level secure storage (Keychain/Credential Manager)
- ✅ Token validation cached for 24 hours (reduces API calls)
- ✅ Graceful degradation if license API unavailable

### 3.3 Authorization Model

**Salesforce Permissions:**
- Extension inherits user's Salesforce permissions
- Requires READ access to: Quote, QuoteLineItem, Opportunity, Product2, Pricebook2
- Requires CREATE access to: Quote, QuoteLineItem (for test execution)
- No admin or elevated privileges required

**File System Permissions:**
- Standard user-level file access
- Writes to workspace directory only
- No system-wide or privileged file operations

---

## 4. Data Classification & Handling

### 4.1 Data Classification

| Data Type | Classification | Storage Location | Encryption | Retention |
|-----------|---------------|------------------|------------|-----------|
| **Salesforce Pricing Data** | Confidential | Local File System | At-Rest (OS) | User-Controlled |
| **Quote IDs, Product IDs** | Internal | Local File System | At-Rest (OS) | User-Controlled |
| **Access Tokens** | Secret | Salesforce CLI Storage | Encrypted | Session-Based |
| **Device Tokens** | Secret | VS Code SecretStorage | Encrypted | Until Revoked |
| **User Email** | PII | License API Database | Encrypted | Account Lifetime |
| **Application Logs** | Internal | VS Code Output Channel | None | Session-Based |

### 4.2 Salesforce Data Handling

**What Data is Captured:**

Snapshots contain the following Salesforce data:
- Quote metadata (ID, Name, Grand Total, Opportunity ID)
- Quote line items (Product ID, Quantity, Pricing fields)
- Custom fields (user-configurable via `.revcloud/settings.json`)
- Product identifiers (ProductCode or Product2Id)
- Pricing calculations (Net Price, Total Price, Discounts)

**Example Snapshot Structure:**
```json
{
  "metadata": {
    "sourceOrgId": "00D...",
    "sourceQuoteId": "0Q0...",
    "sourceOpportunityId": "006...",
    "description": "Enterprise Bundle Pricing Test"
  },
  "expectedResults": {
    "quoteFields": {
      "GrandTotal": 50000,
      "TotalPrice": 45000
    },
    "lineItems": [...]
  },
  "recreationPayload": {
    "accountId": "001...",
    "quoteName": "Test Quote",
    "lineItems": [...]
  }
}
```

**Data Storage:**
- **Location**: `revcloud_blueprint/pricing/snapshots/` (configurable)
- **Format**: JSON files with pretty-printing
- **Permissions**: Standard user file permissions
- **Backup**: User's responsibility (can commit to Git)

**Data Lifecycle:**
1. **Creation**: User initiates snapshot creation from Salesforce quote
2. **Storage**: JSON file written to local workspace directory
3. **Usage**: Extension reads snapshot for test execution
4. **Retention**: Files persist until user deletes them
5. **Disposal**: Standard file deletion (user-controlled)

### 4.3 Data Transmission

**To Salesforce Org (Customer's Infrastructure):**
- ✅ Quote queries (SOQL)
- ✅ Product queries (SOQL)
- ✅ Quote creation (REST API)
- ✅ Pricing calculation (Apex execution)
- ✅ Test result queries (SOQL)

**To License API (Forceweaver Infrastructure):**
- ✅ Device token validation requests
- ❌ NO Salesforce data
- ❌ NO customer business data
- ❌ NO quote or pricing information

**Data NOT Transmitted:**
- ❌ Salesforce credentials or passwords
- ❌ Access tokens (except to Salesforce APIs)
- ❌ Snapshot contents
- ❌ Test results
- ❌ Custom field values
- ❌ Usage telemetry or analytics

### 4.4 Data Residency

| Data Type | Location | Region | Compliance |
|-----------|----------|--------|------------|
| **Salesforce Data** | Customer's Salesforce Org | Customer-Selected | Customer's Salesforce Agreement |
| **Snapshot Files** | User's Workstation | User-Selected | User-Controlled |
| **License Data** | Supabase (PostgreSQL) | EU West (London) | GDPR-Compliant |
| **Web Application** | Vercel Edge Network | Global CDN | SOC 2 Type II |

---

## 5. Network Security

### 5.1 Network Communications

**Outbound Connections:**

1. **Salesforce API Calls**
   - **Destination**: Customer's Salesforce org (e.g., `https://yourcompany.my.salesforce.com`)
   - **Protocol**: HTTPS (TLS 1.2+)
   - **Authentication**: OAuth 2.0 Bearer tokens
   - **Purpose**: Query data, create test quotes, execute pricing
   - **Frequency**: On-demand (user-initiated)

2. **License Validation**
   - **Destination**: `https://sfapp.forceweaver.com/api/license/validate`
   - **Protocol**: HTTPS (TLS 1.2+)
   - **Authentication**: Device token
   - **Purpose**: Validate Pro/Enterprise license
   - **Frequency**: Once per 24 hours (cached)

**Inbound Connections:**
- ❌ None - Extension does not listen on any ports

### 5.2 TLS/SSL Configuration

- **Minimum TLS Version**: TLS 1.2
- **Cipher Suites**: Modern ciphers only (inherited from Node.js/Axios)
- **Certificate Validation**: Enforced (no self-signed certificates)
- **Certificate Pinning**: Not implemented (relies on OS trust store)

### 5.3 Proxy Support

The extension inherits VS Code's proxy configuration:
- HTTP_PROXY environment variable
- HTTPS_PROXY environment variable
- NO_PROXY for exclusions
- Corporate proxy authentication supported

### 5.4 Firewall Requirements

**Required Outbound Access:**
```
# Salesforce API (required)
*.salesforce.com:443
*.force.com:443
*.my.salesforce.com:443

# License API (optional - falls back to free tier)
sfapp.forceweaver.com:443
```

**No Inbound Access Required**

---

## 6. Encryption & Cryptography

### 6.1 Data at Rest

**Salesforce Access Tokens:**
- Stored by Salesforce CLI in OS-specific secure storage
- **macOS**: Keychain (AES-256 encryption)
- **Windows**: Credential Manager (DPAPI encryption)
- **Linux**: Secret Service API/libsecret (encryption varies)

**Device Tokens:**
- Stored via VS Code SecretStorage API
- **macOS**: Keychain (AES-256 encryption)
- **Windows**: Credential Manager (DPAPI encryption)
- **Linux**: Secret Service API/libsecret (encryption varies)

**Snapshot Files:**
- Plain JSON files (not encrypted by extension)
- Encryption available via OS-level features:
  - FileVault (macOS)
  - BitLocker (Windows)
  - LUKS (Linux)

**Recommendation**: Enable full-disk encryption on developer workstations.

### 6.2 Data in Transit

**All network communications use HTTPS (TLS 1.2+):**
- Salesforce API calls: TLS 1.2+ with Salesforce-managed certificates
- License API calls: TLS 1.3 with Let's Encrypt certificates
- No unencrypted HTTP connections

### 6.3 Cryptographic Standards

- **Hashing**: Not used (no password storage)
- **Symmetric Encryption**: OS-managed (Keychain/Credential Manager)
- **Asymmetric Encryption**: TLS certificates (RSA 2048+ or ECC)
- **Random Number Generation**: Node.js crypto module (CSPRNG)

---

## 7. Application Security

### 7.1 Input Validation

**Salesforce ID Validation:**
```typescript
// Validates 15 or 18 character Salesforce ID format
public static validateSalesforceId(id: string): boolean {
    const regex15 = /^[a-zA-Z0-9]{15}$/;
    const regex18 = /^[a-zA-Z0-9]{18}$/;
    return regex15.test(id) || regex18.test(id);
}
```

**Org Alias Sanitization:**
```typescript
// Prevents command injection in CLI calls
public static sanitizeOrgAlias(orgAlias: string): string {
    const safePattern = /^[a-zA-Z0-9_.\-@]+$/;
    if (!safePattern.test(orgAlias)) {
        throw new Error('Invalid org alias format');
    }
    return orgAlias;
}
```

**SOQL Injection Prevention:**
```typescript
// Escapes special characters in SOQL queries
public static escapeSoql(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
```

**Path Traversal Protection:**
```typescript
// Sanitizes filenames to prevent directory traversal
private sanitizeFilename(filename: string): string {
    return filename
        .replace(/[/\\:*?"<>|]/g, '')  // Remove path separators
        .replace(/\.\./g, '')            // Remove parent directory refs
        .replace(/^\.+/, '')             // Remove leading dots
        .substring(0, 100) || 'untitled';
}
```

### 7.2 Output Encoding

**Log Sanitization:**
All logs automatically redact sensitive data:
- Bearer tokens → `Bearer [REDACTED]`
- Access tokens → `accessToken: [REDACTED]`
- API keys → `api_key: [REDACTED]`
- Passwords → `password: [REDACTED]`

**HTML Report Generation:**
- No user-supplied HTML rendering (reports use template strings)
- No JavaScript execution in reports
- No external resource loading

### 7.3 Secure Coding Practices

✅ **Implemented:**
- TypeScript for type safety
- No `eval()` or dynamic code execution
- No shell command injection vulnerabilities
- Parameterized SOQL queries
- Automatic log sanitization
- Error handling without sensitive data exposure

❌ **Not Applicable:**
- SQL injection (no direct database access)
- XSS (no web interface in extension)
- CSRF (no session-based authentication)

### 7.4 Code Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Test Coverage** | 74.3% | ✅ Good |
| **Unit Tests** | 832 passing | ✅ Excellent |
| **Test Suites** | 26 passing | ✅ Excellent |
| **SonarCloud Security Rating** | A | ✅ Excellent |
| **Known Vulnerabilities** | 0 | ✅ Excellent |
| **Code Smells** | 32 (low priority) | ✅ Acceptable |

---

## 8. Vulnerability Management

### 8.1 Security Audit History

**October 3, 2025 - Comprehensive Security Audit:**
- **Critical Vulnerabilities Fixed**: 3
  - Command injection (VULN-001) ✅
  - SOQL injection (VULN-002) ✅
  - Path traversal (VULN-003) ✅
  - Bearer token exposure (VULN-006) ✅
- **High-Priority Issues Fixed**: 8
- **Test Coverage**: Maintained at 74.3%
- **Status**: Production-ready

**Full Report**: `docs/CODE_QUALITY_SECURITY_AUDIT.md`

### 8.2 Continuous Security Monitoring

**SonarCloud Integration:**
- Automatic code analysis on every commit
- Security hotspot detection
- Vulnerability scanning
- Code quality metrics
- Public dashboard: https://sonarcloud.io/project/overview?id=arohitu_revcloud-blueprint-extension

**Dependency Scanning:**
- `npm audit` run on every build
- Dependabot alerts enabled (GitHub)
- Regular dependency updates

### 8.3 Vulnerability Disclosure Policy

**Reporting Security Issues:**
- **Email**: arohitu@gmail.com
- **Subject**: [SECURITY] Rev Cloud Blueprint
- **Response SLA**: 24 hours for critical issues
- **Coordinated Disclosure**: 90 days before public disclosure

**Severity Classification:**
- **Critical**: Remote code execution, authentication bypass
- **High**: Data exposure, privilege escalation
- **Medium**: Information disclosure, denial of service
- **Low**: Minor issues with minimal impact

### 8.4 Patch Management

**Update Distribution:**
- Security patches released via VS Code Marketplace
- Users notified via extension update mechanism
- Critical patches released within 48 hours of discovery
- Regular updates every 2-4 weeks

---

## 9. Logging & Monitoring

### 9.1 Application Logging

**Log Destinations:**
- VS Code Output Channel (visible to user)
- No external log aggregation
- No persistent log files (cleared on VS Code restart)

**Log Levels:**
- DEBUG: Detailed execution flow (opt-in via `verboseLogging` setting)
- INFO: Normal operations
- ERROR: Failures and exceptions

**Logged Information:**
- API request/response status codes
- Test execution progress
- Configuration changes
- Error messages (sanitized)

**NOT Logged:**
- Access tokens or credentials
- Salesforce data contents
- User personal information
- Sensitive field values

### 9.2 Automatic Log Sanitization

**Sensitive Patterns Redacted:**
```typescript
private static readonly SENSITIVE_PATTERNS = [
    { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, replacement: 'Bearer [REDACTED]' },
    { pattern: /accessToken["']?\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'accessToken: [REDACTED]' },
    { pattern: /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, replacement: 'password: [REDACTED]' },
    { pattern: /api[_-]?key["']?\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'api_key: [REDACTED]' },
];
```

### 9.3 Audit Trail

**User Actions Logged:**
- Snapshot creation (Quote ID, Org, Timestamp)
- Test execution (Snapshot ID, Target Org, Result)
- License activation (Device Token, Timestamp)
- Configuration changes

**Audit Log Location:**
- VS Code Output Channel (session-based)
- No persistent audit log (user can save output manually)

### 9.4 Monitoring & Alerting

**Extension-Level:**
- No built-in monitoring or alerting
- Users can monitor via VS Code output channel

**License API-Level:**
- Vercel Analytics for API performance
- Supabase monitoring for database health
- Error tracking via Vercel logs

---

## 10. Incident Response

### 10.1 Incident Classification

| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| **P0 - Critical** | Data breach, RCE vulnerability | 1 hour | Salesforce credentials exposed |
| **P1 - High** | Authentication bypass, data loss | 4 hours | License validation bypass |
| **P2 - Medium** | Service degradation, minor data exposure | 24 hours | API rate limiting issues |
| **P3 - Low** | Cosmetic issues, minor bugs | 1 week | UI rendering glitch |

### 10.2 Incident Response Process

1. **Detection**: Security issue reported or discovered
2. **Assessment**: Severity classification and impact analysis
3. **Containment**: Immediate mitigation (e.g., API shutdown)
4. **Investigation**: Root cause analysis
5. **Remediation**: Patch development and testing
6. **Communication**: User notification (if applicable)
7. **Recovery**: Patch deployment via VS Code Marketplace
8. **Post-Mortem**: Lessons learned and process improvements

### 10.3 Communication Plan

**For Critical Incidents:**
- Email notification to all Pro/Enterprise customers
- Marketplace listing update with security advisory
- GitHub security advisory
- Social media announcement (if widespread impact)

**For Non-Critical Issues:**
- Changelog entry in next release
- GitHub issue tracker update

### 10.4 Data Breach Response

**In the event of a data breach:**

1. **Immediate Actions** (within 1 hour):
   - Identify scope of breach
   - Isolate affected systems
   - Preserve evidence for forensics

2. **Notification** (within 72 hours):
   - Affected customers (if PII exposed)
   - Regulatory authorities (if required by GDPR/CCPA)
   - Public disclosure (if widespread impact)

3. **Remediation**:
   - Patch vulnerability
   - Revoke compromised credentials
   - Implement additional controls

4. **Recovery**:
   - Restore services
   - Monitor for further incidents
   - Conduct post-mortem

**Note**: Given the local-first architecture, Salesforce data breaches are unlikely as data never leaves customer's environment.

---

## 11. Compliance & Certifications

### 11.1 GDPR Compliance

**Data Controller**: Forceweaver (for license data only)

**Personal Data Processed:**
- User email address (for account creation)
- Device tokens (pseudonymized identifiers)
- License purchase information

**Legal Basis**: Legitimate interest (service delivery)

**User Rights:**
- Right to access: Via user dashboard
- Right to erasure: Via account deletion
- Right to portability: Data export available
- Right to rectification: Via account settings

**Data Processing Agreement**: See `docs/DATA_PROCESSING_AGREEMENT.md`

**Salesforce Data**: Customer is the data controller; extension acts as data processor operating under customer's instructions.

### 11.2 SOC 2 Considerations

**Trust Services Criteria:**

| Criterion | Status | Notes |
|-----------|--------|-------|
| **Security** | ✅ Compliant | Comprehensive security controls implemented |
| **Availability** | ✅ Compliant | Local-first architecture ensures high availability |
| **Processing Integrity** | ✅ Compliant | Input validation and error handling |
| **Confidentiality** | ✅ Compliant | Encryption at rest and in transit |
| **Privacy** | ✅ Compliant | Minimal PII collection, GDPR-compliant |

**Vendor SOC 2 Reports:**
- **Salesforce**: SOC 2 Type II certified
- **Vercel**: SOC 2 Type II certified
- **Supabase**: SOC 2 Type II in progress

### 11.3 ISO 27001 Alignment

**Information Security Controls:**

| Control Domain | Implementation | Status |
|----------------|----------------|--------|
| **Access Control** | OAuth 2.0, device authorization | ✅ Implemented |
| **Cryptography** | TLS 1.2+, OS-level encryption | ✅ Implemented |
| **Operations Security** | Secure coding, input validation | ✅ Implemented |
| **Communications Security** | HTTPS only, no unencrypted channels | ✅ Implemented |
| **System Acquisition** | Dependency scanning, code review | ✅ Implemented |
| **Supplier Relationships** | Vetted vendors (Salesforce, Vercel, Supabase) | ✅ Implemented |
| **Incident Management** | Defined process, 24hr response SLA | ✅ Implemented |
| **Business Continuity** | Local-first architecture, no single point of failure | ✅ Implemented |
| **Compliance** | GDPR, EULA, security audits | ✅ Implemented |

### 11.4 Industry-Specific Compliance

**HIPAA**: Not applicable (no healthcare data processing)

**PCI DSS**: Not applicable (no payment card processing in extension)

**FedRAMP**: Not currently certified (roadmap item for government customers)

---

## 12. Third-Party Dependencies

### 12.1 Runtime Dependencies

| Dependency | Version | Purpose | Security Posture |
|------------|---------|---------|------------------|
| **axios** | 1.12.2 | HTTP client for API calls | ✅ Actively maintained, no known vulnerabilities |
| **diff** | 5.1.0 | Test result comparison | ✅ Stable, minimal attack surface |
| **vscode** | 1.74.0+ | VS Code extension API | ✅ Microsoft-maintained |

### 12.2 Development Dependencies

- TypeScript, Jest, Webpack (build tools only, not in production bundle)
- All dependencies scanned via `npm audit` and Dependabot

### 12.3 External Services

| Service | Purpose | Data Shared | Security Certification |
|---------|---------|-------------|------------------------|
| **Salesforce** | Customer's Salesforce org | Quote/pricing data (customer-owned) | SOC 2 Type II, ISO 27001 |
| **Vercel** | License API hosting | Device tokens only | SOC 2 Type II |
| **Supabase** | License database | User email, device tokens | SOC 2 Type II (in progress) |
| **SonarCloud** | Code quality analysis | Source code (public repo) | N/A (analysis service) |

### 12.4 Supply Chain Security

**Code Provenance:**
- Source code: https://github.com/arohitu/revcloud-blueprint-extension
- Published to: VS Code Marketplace (Microsoft-operated)
- Build process: GitHub Actions (automated, reproducible)

**Integrity Verification:**
- Extension signed by VS Code Marketplace
- npm packages verified via package-lock.json
- Git commit signatures (recommended)

---

## 13. Security Best Practices for Deployment

### 13.1 For End Users

**Workstation Security:**
- ✅ Enable full-disk encryption (FileVault, BitLocker, LUKS)
- ✅ Use strong passwords for OS login
- ✅ Keep VS Code and extensions updated
- ✅ Enable OS firewall
- ✅ Use antivirus/endpoint protection

**Salesforce Security:**
- ✅ Enable multi-factor authentication (MFA) for Salesforce
- ✅ Use named credentials for API access
- ✅ Follow principle of least privilege (minimal Salesforce permissions)
- ✅ Regularly review Salesforce login history
- ✅ Use IP restrictions for Salesforce access (if applicable)

**Snapshot Management:**
- ✅ Store snapshots in version-controlled repositories
- ✅ Avoid committing sensitive data to public repositories
- ✅ Use `.gitignore` for sensitive snapshots
- ✅ Regularly review and delete obsolete snapshots
- ✅ Encrypt Git repositories if they contain sensitive data

### 13.2 For Enterprise Administrators

**Deployment:**
- ✅ Deploy via enterprise VS Code extension management
- ✅ Configure corporate proxy settings
- ✅ Whitelist required domains in firewall
- ✅ Monitor extension usage via endpoint management tools

**Access Control:**
- ✅ Restrict Salesforce org access to authorized users
- ✅ Use Salesforce permission sets for granular access control
- ✅ Implement IP restrictions for Salesforce access
- ✅ Regularly audit Salesforce user permissions

**Data Governance:**
- ✅ Define snapshot retention policies
- ✅ Classify snapshots based on data sensitivity
- ✅ Implement data loss prevention (DLP) policies
- ✅ Train users on secure snapshot handling

### 13.3 Network Configuration

**Firewall Rules:**
```
# Allow outbound HTTPS to Salesforce
ALLOW tcp/443 to *.salesforce.com
ALLOW tcp/443 to *.force.com

# Allow outbound HTTPS to License API (optional)
ALLOW tcp/443 to sfapp.forceweaver.com

# Block all other outbound connections from extension
DENY all other traffic
```

**Proxy Configuration:**
```bash
# Set proxy environment variables (if required)
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1
```

### 13.4 Monitoring & Auditing

**Recommended Monitoring:**
- VS Code extension usage logs
- Salesforce API usage reports
- Endpoint security alerts
- Network traffic analysis (for anomaly detection)

**Audit Checklist:**
- [ ] Review Salesforce login history monthly
- [ ] Audit snapshot file access quarterly
- [ ] Review extension permissions annually
- [ ] Conduct security awareness training annually
- [ ] Test incident response procedures annually

---

## 14. Conclusion

Rev Cloud Blueprint is designed with security as a foundational principle. The local-first architecture ensures that customer Salesforce data never leaves the customer's environment, minimizing data exposure risks. The extension implements industry-standard security controls including:

- OAuth 2.0 authentication
- Input validation and sanitization
- Encryption at rest and in transit
- Automatic log sanitization
- Continuous security monitoring
- Rapid vulnerability response

The extension is suitable for enterprise deployment in regulated industries and complies with GDPR, SOC 2, and ISO 27001 requirements.

---

## 15. Contact Information

**Security Inquiries:**
- Email: arohitu@gmail.com
- Subject: [SECURITY] Rev Cloud Blueprint

**General Support:**
- Bug Reports: https://form.jotform.com/252443148591055
- GitHub Issues: https://github.com/arohitu/revcloud-blueprint-extension/issues

**Product Information:**
- Website: https://sfapp.forceweaver.com
- Marketplace: https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint

---

## 16. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 5, 2025 | Forceweaver Security Team | Initial release |

**Classification**: Public  
**Distribution**: Unrestricted  
**Next Review**: April 5, 2026 (6 months)

---

**© 2025 Forceweaver. All rights reserved.**

This document is provided for informational purposes and does not constitute a legally binding commitment. Security controls and practices are subject to change without notice.
