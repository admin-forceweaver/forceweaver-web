# Data Processing Agreement (DPA)

**Between Customer and Forceweaver**  
**For Rev Cloud Blueprint Extension**

**Version:** 1.0  
**Effective Date:** October 5, 2025  
**Last Updated:** October 5, 2025

---

## Table of Contents

1. [Definitions](#1-definitions)
2. [Scope and Applicability](#2-scope-and-applicability)
3. [Data Processing Details](#3-data-processing-details)
4. [Processor Obligations](#4-processor-obligations)
5. [Security Measures](#5-security-measures)
6. [Sub-Processors](#6-sub-processors)
7. [Data Subject Rights](#7-data-subject-rights)
8. [Data Breach Notification](#8-data-breach-notification)
9. [Data Retention and Deletion](#9-data-retention-and-deletion)
10. [Audits and Compliance](#10-audits-and-compliance)
11. [International Data Transfers](#11-international-data-transfers)
12. [Liability and Indemnification](#12-liability-and-indemnification)
13. [Term and Termination](#13-term-and-termination)

---

## Preamble

This Data Processing Agreement ("**DPA**") forms part of the End-User License Agreement ("**EULA**") between:

- **Customer** (the "**Data Controller**"): The organization or individual using Rev Cloud Blueprint extension
- **Forceweaver** (the "**Data Processor**"): Rohit Radhakrishnan, trading as Forceweaver, publisher of Rev Cloud Blueprint

This DPA reflects the parties' agreement with regard to the Processing of Personal Data in accordance with the requirements of Data Protection Laws, including the EU General Data Protection Regulation 2016/679 ("**GDPR**").

---

## 1. Definitions

### 1.1 General Definitions

For the purposes of this DPA:

- **"Data Protection Laws"** means all applicable laws and regulations relating to the processing of Personal Data, including GDPR, UK GDPR, CCPA, and any successor legislation.

- **"Personal Data"** means any information relating to an identified or identifiable natural person that is processed by Forceweaver on behalf of Customer in connection with the Services.

- **"Processing"** has the meaning given in the GDPR and includes any operation performed on Personal Data, such as collection, recording, organization, structuring, storage, adaptation, retrieval, consultation, use, disclosure, or erasure.

- **"Services"** means the Rev Cloud Blueprint VS Code extension and associated license validation services.

- **"Data Subject"** means an identified or identifiable natural person whose Personal Data is processed.

- **"Controller"**, **"Processor"**, **"Sub-processor"** have the meanings given in the GDPR.

### 1.2 Data Categories

**"License Data"** means Personal Data collected and processed by Forceweaver for license management purposes, including:
- User email addresses
- Device tokens (pseudonymized identifiers)
- License purchase information
- Account credentials (hashed passwords)

**"Salesforce Data"** means data from Customer's Salesforce org(s) that is processed locally by the extension, including:
- Quote and pricing information
- Product configurations
- Custom field values
- Salesforce record IDs

---

## 2. Scope and Applicability

### 2.1 Scope of Processing

This DPA applies to the Processing of Personal Data by Forceweaver on behalf of Customer in connection with the Services, specifically:

1. **License Data Processing**: Forceweaver processes License Data as a Data Processor for the purpose of providing license validation services.

2. **Salesforce Data Processing**: Forceweaver does NOT process Salesforce Data. The extension processes Salesforce Data locally on Customer's workstation under Customer's direct control. Customer is the sole Data Controller for Salesforce Data.

### 2.2 Roles and Responsibilities

**Customer as Data Controller:**
- Customer is the Data Controller for all Salesforce Data processed by the extension
- Customer determines the purposes and means of processing Salesforce Data
- Customer is responsible for ensuring lawful processing of Salesforce Data
- Customer is responsible for obtaining necessary consents from Data Subjects

**Forceweaver as Data Processor:**
- Forceweaver acts as Data Processor only for License Data
- Forceweaver processes License Data solely on documented instructions from Customer
- Forceweaver does not access, collect, or process Salesforce Data

### 2.3 Exclusions

This DPA does NOT apply to:
- Salesforce Data stored locally on Customer's workstation
- Data processed by Salesforce (covered by Salesforce's DPA)
- Data processed by Customer's own systems
- Publicly available information

---

## 3. Data Processing Details

### 3.1 License Data Processing

**Categories of Personal Data:**
- Email addresses
- Device identifiers (UUIDs)
- License purchase records
- Account authentication data (hashed)
- Last usage timestamps

**Categories of Data Subjects:**
- Customer's employees
- Customer's contractors
- Individual customers (for individual licenses)

**Purpose of Processing:**
- License validation and activation
- Account management
- Billing and payment processing
- Customer support
- Service improvement (anonymized analytics)

**Duration of Processing:**
- For the duration of the license agreement
- Plus retention period as specified in Section 9

**Nature of Processing:**
- Collection via web portal and extension
- Storage in secure database (Supabase)
- Retrieval for license validation
- Deletion upon account termination

### 3.2 Salesforce Data Processing

**Important**: Forceweaver does NOT process Salesforce Data. All Salesforce Data processing occurs locally on Customer's workstation under Customer's control.

**Local Processing Only:**
- Snapshots stored in Customer's local file system
- Test reports generated locally
- No transmission of Salesforce Data to Forceweaver servers
- Customer retains full control and ownership

**Customer Responsibilities:**
- Ensure lawful processing of Salesforce Data
- Implement appropriate security measures
- Obtain necessary consents from Data Subjects
- Comply with Salesforce's terms of service

---

## 4. Processor Obligations

### 4.1 Processing Instructions

Forceweaver shall:
- Process License Data only on documented instructions from Customer
- Not process License Data for any purpose other than providing the Services
- Immediately inform Customer if instructions violate Data Protection Laws
- Not transfer License Data to third parties without Customer authorization

### 4.2 Confidentiality

Forceweaver shall:
- Ensure that personnel authorized to process License Data are bound by confidentiality obligations
- Limit access to License Data to personnel who need access to perform the Services
- Implement access controls and authentication mechanisms
- Conduct background checks on personnel with access to Personal Data (where legally permissible)

### 4.3 Security Measures

Forceweaver shall implement and maintain appropriate technical and organizational measures to protect License Data, as detailed in Section 5.

### 4.4 Assistance to Customer

Forceweaver shall, to the extent reasonably possible:
- Assist Customer in responding to Data Subject rights requests
- Assist Customer in ensuring compliance with security obligations
- Assist Customer with data protection impact assessments
- Assist Customer with consultations with supervisory authorities

### 4.5 Deletion or Return of Data

Upon termination of Services, Forceweaver shall:
- Delete all License Data within 30 days, unless required to retain by law
- Provide confirmation of deletion upon Customer request
- Return any License Data to Customer if requested before deletion

---

## 5. Security Measures

### 5.1 Technical Measures

Forceweaver implements the following technical security measures:

**Access Control:**
- Multi-factor authentication (MFA) for user accounts
- Role-based access control (RBAC)
- Device-based authorization (OAuth 2.0 Device Flow)
- Automatic session timeout

**Encryption:**
- TLS 1.2+ for data in transit
- AES-256 encryption for data at rest (database-level)
- OS-level encryption for device tokens (Keychain/Credential Manager)
- Encrypted database backups

**Application Security:**
- Input validation and sanitization
- SOQL injection prevention
- Command injection prevention
- Path traversal protection
- Automatic log sanitization

**Network Security:**
- Firewall protection
- DDoS mitigation (via Vercel)
- Rate limiting on APIs
- IP whitelisting (optional)

**Monitoring and Logging:**
- Security event logging
- Anomaly detection
- Regular security audits
- Vulnerability scanning (SonarCloud)

### 5.2 Organizational Measures

**Personnel Security:**
- Background checks for personnel with data access
- Security awareness training
- Confidentiality agreements
- Principle of least privilege

**Physical Security:**
- Secure data centers (Supabase/AWS)
- Physical access controls
- Environmental controls
- Redundant power and cooling

**Incident Response:**
- 24-hour response for critical security incidents
- Defined incident response procedures
- Regular incident response drills
- Post-incident reviews

**Business Continuity:**
- Regular database backups (daily)
- Disaster recovery plan
- Redundant infrastructure
- 99.9% uptime SLA (target)

### 5.3 Compliance Certifications

**Vendor Certifications:**
- Supabase: SOC 2 Type II (in progress)
- Vercel: SOC 2 Type II certified
- AWS: ISO 27001, SOC 2, PCI DSS

**Forceweaver Commitments:**
- Annual security audits
- Continuous vulnerability monitoring
- Regular penetration testing (planned)
- GDPR compliance

---

## 6. Sub-Processors

### 6.1 Authorized Sub-Processors

Customer authorizes Forceweaver to engage the following Sub-processors:

| Sub-processor | Service | Location | Purpose | Certification |
|---------------|---------|----------|---------|---------------|
| **Supabase Inc.** | Database hosting | EU West (London) | License data storage | SOC 2 (in progress) |
| **Vercel Inc.** | Web hosting | Global (Edge Network) | License API hosting | SOC 2 Type II |
| **Amazon Web Services (AWS)** | Cloud infrastructure | EU West (London) | Database infrastructure | ISO 27001, SOC 2 |

### 6.2 Sub-Processor Obligations

Forceweaver shall:
- Impose data protection obligations on Sub-processors equivalent to this DPA
- Conduct due diligence on Sub-processors' security practices
- Monitor Sub-processor compliance
- Remain fully liable for Sub-processor performance

### 6.3 Changes to Sub-Processors

**Notification:**
- Forceweaver will notify Customer of any intended changes to Sub-processors
- Notification will be provided at least 30 days in advance
- Notification will be sent via email to Customer's registered email address

**Objection:**
- Customer may object to new Sub-processors on reasonable grounds
- Objection must be raised within 14 days of notification
- If objection cannot be resolved, Customer may terminate the agreement

### 6.4 Sub-Processor List Updates

Current Sub-processor list is maintained at:
- https://sfapp.forceweaver.com/legal/sub-processors
- Updated quarterly or upon material changes

---

## 7. Data Subject Rights

### 7.1 Assistance with Rights Requests

Forceweaver shall assist Customer in fulfilling Data Subject rights requests, including:

**Right of Access:**
- Provide Customer with access to License Data upon request
- Respond within 5 business days

**Right to Rectification:**
- Enable Customer to correct inaccurate License Data
- Update records within 2 business days

**Right to Erasure ("Right to be Forgotten"):**
- Delete License Data upon Customer request
- Complete deletion within 7 business days
- Provide confirmation of deletion

**Right to Data Portability:**
- Export License Data in machine-readable format (JSON/CSV)
- Provide export within 5 business days

**Right to Restriction of Processing:**
- Temporarily suspend processing upon Customer request
- Maintain data security during suspension

**Right to Object:**
- Cease processing for specific purposes upon Customer request
- Implement within 2 business days

### 7.2 Request Handling Process

1. **Data Subject contacts Customer**: Data Subject submits request to Customer
2. **Customer verifies identity**: Customer authenticates Data Subject
3. **Customer contacts Forceweaver**: Customer forwards request to arohitu@gmail.com
4. **Forceweaver processes request**: Forceweaver fulfills request within SLA
5. **Confirmation to Customer**: Forceweaver confirms completion to Customer
6. **Customer responds to Data Subject**: Customer communicates outcome to Data Subject

### 7.3 Direct Requests

If Forceweaver receives a Data Subject request directly:
- Forceweaver will forward the request to Customer within 2 business days
- Forceweaver will not respond directly without Customer authorization
- Forceweaver will assist Customer in responding as needed

---

## 8. Data Breach Notification

### 8.1 Notification Obligation

In the event of a Personal Data breach affecting License Data, Forceweaver shall:

**Immediate Notification (within 24 hours):**
- Notify Customer via email to registered contact
- Provide initial assessment of breach scope
- Describe immediate containment measures taken

**Detailed Notification (within 72 hours):**
- Provide comprehensive breach report including:
  - Nature of the breach
  - Categories and approximate number of Data Subjects affected
  - Categories and approximate number of records affected
  - Likely consequences of the breach
  - Measures taken or proposed to address the breach
  - Measures to mitigate possible adverse effects

### 8.2 Breach Investigation

Forceweaver shall:
- Conduct immediate investigation to determine breach scope
- Preserve evidence for forensic analysis
- Implement containment measures to prevent further data loss
- Cooperate with Customer's incident response team
- Provide regular updates until breach is resolved

### 8.3 Customer Obligations

Customer shall:
- Assess whether notification to Data Subjects is required
- Notify supervisory authorities as required by law (within 72 hours of becoming aware)
- Coordinate with Forceweaver on public communications
- Document breach response for compliance purposes

### 8.4 No Breach Scenarios

The following do NOT constitute Personal Data breaches under this DPA:
- Salesforce Data breaches (Customer is Controller, not Forceweaver)
- Breaches of Customer's own systems
- Unauthorized access prevented by security controls
- Data loss due to Customer's actions

---

## 9. Data Retention and Deletion

### 9.1 Retention Periods

**License Data:**
- **Active Accounts**: Retained for duration of license agreement
- **Inactive Accounts**: Retained for 90 days after last activity
- **Deleted Accounts**: Deleted within 30 days of deletion request
- **Backup Retention**: 30-day backup retention for disaster recovery

**Salesforce Data:**
- Stored locally on Customer's workstation
- Retention controlled entirely by Customer
- Forceweaver has no access or retention obligations

### 9.2 Deletion Process

**Upon Account Deletion:**
1. Customer initiates account deletion via web portal
2. License Data marked for deletion immediately
3. Access to Services terminated within 24 hours
4. Data deleted from production database within 7 days
5. Data deleted from backups within 30 days
6. Deletion confirmation sent to Customer

**Upon Service Termination:**
1. All License Data deleted within 30 days of termination
2. Customer notified before deletion
3. Option to export data before deletion
4. Deletion confirmation provided upon completion

### 9.3 Legal Hold

If Forceweaver is required to retain License Data by law:
- Forceweaver will notify Customer of legal obligation
- Data will be retained only for minimum required period
- Data will be isolated and access restricted
- Data will be deleted immediately upon expiration of legal hold

### 9.4 Anonymization

As an alternative to deletion, Customer may request anonymization:
- Personal identifiers removed or pseudonymized
- Data rendered non-identifiable
- Anonymized data may be retained for analytics
- Anonymization is irreversible

---

## 10. Audits and Compliance

### 10.1 Audit Rights

Customer has the right to:
- Request information about Forceweaver's data processing practices
- Conduct audits of Forceweaver's compliance with this DPA
- Engage third-party auditors (at Customer's expense)
- Review Sub-processor compliance documentation

### 10.2 Audit Process

**Audit Request:**
- Customer must provide 30 days' advance notice
- Audit scope must be reasonable and specific
- Audits limited to once per year (unless breach occurs)
- Audits must not disrupt Forceweaver's operations

**Audit Conduct:**
- Auditor must sign confidentiality agreement
- Audit conducted during business hours
- Forceweaver may redact third-party confidential information
- Audit report shared with Forceweaver

**Audit Findings:**
- Customer will provide findings to Forceweaver
- Forceweaver will address findings within 30 days
- Follow-up audit may be conducted to verify remediation

### 10.3 Compliance Documentation

Forceweaver will provide upon request:
- Security policies and procedures
- Sub-processor agreements
- Security audit reports (summary)
- Compliance certifications
- Incident response procedures

### 10.4 Regulatory Inquiries

If Customer receives regulatory inquiry regarding License Data:
- Customer will notify Forceweaver immediately
- Forceweaver will cooperate with investigation
- Forceweaver will provide necessary documentation
- Forceweaver will not communicate directly with regulators without Customer authorization

---

## 11. International Data Transfers

### 11.1 Data Locations

**License Data Storage:**
- Primary: EU West (London) - Supabase/AWS
- Backups: EU West (London) - AWS
- No transfers outside EU/EEA without Customer consent

**Salesforce Data:**
- Stored locally on Customer's workstation
- Location determined by Customer
- No international transfers by Forceweaver

### 11.2 Transfer Mechanisms

For transfers outside EU/EEA (if required):

**Standard Contractual Clauses (SCCs):**
- Forceweaver will execute EU Standard Contractual Clauses
- Latest version approved by European Commission
- Available upon request

**Adequacy Decisions:**
- Transfers to countries with adequacy decision (e.g., UK)
- No additional safeguards required

**Derogations:**
- Explicit consent from Data Subjects
- Necessary for contract performance
- Important reasons of public interest

### 11.3 US Data Transfers

**Current Status:**
- Forceweaver does not transfer data to US
- Sub-processors (Vercel) have US presence but store EU data in EU
- EU-US Data Privacy Framework compliance (if applicable)

**If US Transfer Required:**
- Customer consent obtained in advance
- SCCs executed
- Supplementary measures implemented
- Transfer impact assessment conducted

### 11.4 Data Localization

**Customer Control:**
- Customer can request data localization to specific regions
- Additional fees may apply for dedicated regional infrastructure
- Forceweaver will use commercially reasonable efforts to accommodate

---

## 12. Liability and Indemnification

### 12.1 Limitation of Liability

**Forceweaver's Liability:**
- Limited to direct damages caused by Forceweaver's breach of this DPA
- Maximum liability: Total fees paid by Customer in preceding 12 months
- No liability for indirect, consequential, or punitive damages
- No liability for Salesforce Data (Customer is Controller)

**Exceptions:**
- Liability for gross negligence or willful misconduct
- Liability for data breaches caused by Forceweaver's security failures
- Liability required by applicable law

### 12.2 Indemnification

**Forceweaver Indemnifies Customer:**
- Against claims arising from Forceweaver's breach of this DPA
- Against claims arising from Forceweaver's violation of Data Protection Laws
- Against claims arising from Sub-processor breaches (to extent of Sub-processor liability)

**Customer Indemnifies Forceweaver:**
- Against claims arising from Customer's breach of this DPA
- Against claims arising from Customer's unlawful processing of Salesforce Data
- Against claims arising from Customer's violation of Data Protection Laws

### 12.3 Insurance

Forceweaver maintains:
- Professional liability insurance
- Cyber liability insurance
- Minimum coverage: $1,000,000 per occurrence
- Certificate of insurance available upon request

---

## 13. Term and Termination

### 13.1 Term

This DPA:
- Commences on the Effective Date
- Continues for the duration of the EULA
- Survives termination for data retention obligations

### 13.2 Termination

This DPA may be terminated:
- Upon termination of the EULA
- By Customer with 30 days' notice
- By Forceweaver if Customer breaches DPA (after 30-day cure period)
- Immediately if required by law

### 13.3 Effects of Termination

Upon termination:
- Forceweaver will cease processing License Data
- Customer will cease using the Services
- License Data will be deleted per Section 9
- Sections 5, 8, 9, 10, 12 survive termination

### 13.4 Transition Assistance

Upon termination, Forceweaver will:
- Provide Customer with export of License Data (upon request)
- Cooperate with transition to alternative service
- Maintain data security during transition period
- Provide reasonable assistance (fees may apply for extended assistance)

---

## 14. General Provisions

### 14.1 Amendments

This DPA may be amended:
- By mutual written agreement of the parties
- By Forceweaver to comply with changes in Data Protection Laws (with 30 days' notice)
- By Forceweaver to reflect changes in Sub-processors (per Section 6.3)

### 14.2 Severability

If any provision of this DPA is held invalid:
- Invalid provision will be modified to minimum extent necessary
- Remaining provisions remain in full force
- Parties will negotiate replacement provision in good faith

### 14.3 Governing Law

This DPA is governed by:
- Laws of England and Wales
- GDPR and UK GDPR
- Applicable Data Protection Laws

### 14.4 Dispute Resolution

**Escalation Process:**
1. Good faith negotiations (30 days)
2. Mediation (if negotiations fail)
3. Arbitration or litigation (as last resort)

**Supervisory Authority:**
- Data Subjects may lodge complaints with supervisory authority
- UK: Information Commissioner's Office (ICO)
- EU: Relevant national data protection authority

### 14.5 Notices

All notices under this DPA must be:
- In writing (email acceptable)
- Sent to registered contact addresses
- Deemed received upon email delivery confirmation

**Forceweaver Contact:**
- Email: arohitu@gmail.com
- Subject: [DPA] Rev Cloud Blueprint

**Customer Contact:**
- Email provided during account registration

### 14.6 Entire Agreement

This DPA, together with the EULA:
- Constitutes the entire agreement regarding data processing
- Supersedes all prior agreements and understandings
- May not be modified except as provided herein

---

## 15. Signatures

By using the Services, Customer agrees to be bound by this DPA.

**Forceweaver:**
- Name: Rohit Radhakrishnan
- Title: Publisher
- Date: October 5, 2025

**Customer:**
- Acceptance indicated by continued use of Services
- Date: Date of first use or license activation

---

## Appendix A: Technical and Organizational Measures

### A.1 Measures of Pseudonymization and Encryption

- Device tokens stored as UUIDs (pseudonymized)
- Passwords hashed using bcrypt (industry standard)
- TLS 1.2+ for all network communications
- AES-256 encryption for database at rest
- OS-level encryption for local token storage

### A.2 Measures to Ensure Ongoing Confidentiality

- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Automatic session timeout (30 minutes)
- Audit logging of all data access
- Regular access reviews

### A.3 Measures to Ensure Integrity

- Input validation on all user inputs
- SOQL injection prevention
- Command injection prevention
- Database transaction integrity
- Checksum verification for backups

### A.4 Measures to Ensure Availability

- 99.9% uptime target
- Redundant infrastructure (multi-AZ)
- Daily automated backups
- Disaster recovery plan
- DDoS protection

### A.5 Measures to Ensure Resilience

- Automatic failover
- Load balancing
- Rate limiting
- Circuit breakers
- Graceful degradation

### A.6 Measures for Regular Testing

- Quarterly security audits
- Continuous vulnerability scanning (SonarCloud)
- Dependency scanning (npm audit, Dependabot)
- Penetration testing (annual, planned)
- Incident response drills (bi-annual)

### A.7 Measures for Certification

- SOC 2 Type II (vendors)
- ISO 27001 alignment
- GDPR compliance
- Regular compliance reviews

---

## Appendix B: Sub-Processor Details

### B.1 Supabase Inc.

- **Service**: PostgreSQL database hosting
- **Location**: EU West (London, UK)
- **Data Processed**: License Data (email, device tokens, license records)
- **Security**: SOC 2 Type II (in progress), ISO 27001 (via AWS)
- **DPA**: Available at https://supabase.com/legal/dpa

### B.2 Vercel Inc.

- **Service**: Web application and API hosting
- **Location**: Global Edge Network (EU data stored in EU)
- **Data Processed**: License API requests (device tokens only)
- **Security**: SOC 2 Type II certified
- **DPA**: Available at https://vercel.com/legal/dpa

### B.3 Amazon Web Services (AWS)

- **Service**: Cloud infrastructure (via Supabase)
- **Location**: EU West (London, UK)
- **Data Processed**: License Data (infrastructure layer)
- **Security**: ISO 27001, SOC 2 Type II, PCI DSS
- **DPA**: Available at https://aws.amazon.com/compliance/gdpr-center/

---

## Document Control

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | October 5, 2025 | Initial release | Forceweaver Legal Team |

**Classification**: Public  
**Distribution**: Unrestricted  
**Next Review**: October 5, 2026 (annual review)

---

**© 2025 Forceweaver. All rights reserved.**

This DPA is provided as a template and should be reviewed by legal counsel before execution. Forceweaver reserves the right to update this DPA to reflect changes in Data Protection Laws or business practices.
