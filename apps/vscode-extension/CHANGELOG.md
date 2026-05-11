# Changelog

All notable changes to the "Revenue Cloud Pricing Test Framework" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.3.4] - 2025-12-16

### Changed
- **Simplified Reports**: Removed the Variance column from both single test and batch test reports. Reports now display only Field, Expected, Actual, and Status columns for a cleaner, more focused view.

### Added
- **Advance Configurator Support**: `ConstraintEngineNodeStatus__c` field is now always included in snapshots and recreation payloads, providing full support for Salesforce Advance Configurator constraint engine scenarios.

---

## [1.3.3] - 2025-12-14

### Changed
- **Inline Pricing**: Quote creation now uses inline pricing (`pricingPref: 'force'`) during the Place Quote API call, eliminating the need for separate Apex pricing execution. This simplifies the pricing workflow and improves reliability.

---

## [1.3.2] - 2025-12-12

### Added
- **Welcome Page**: Added welcome page that highlights product features and a quick start guide

---

## [1.3.1] - 2025-10-29

### Updated
- **Documentation**: Updated README.md to reflect new features and guides

---

## [1.3.0] - 2025-10-24

### Added
- **Snapshot Refresh Icon**: Added refresh/update icon (🔄) to each snapshot in the tree view
- **Snapshot Viewer**: Added snapshot viewer icon to view a GUI of the snapshot created

---

## [1.2.10] - 2025-10-05

### Security
### Added
- **Documentation**: Added public beta notice.

---

## [1.2.9] - 2025-10-05

### Security
- **Command Injection Prevention**: Enhanced ValidationService with to prevent command injection attacks by validating org aliases and usernames against dangerous shell metacharacters
- **SOQL Injection Prevention**: Implemented measures to protect all SOQL queries from injection attacks
- **Token Exposure Prevention**: Added automatic sanitization of Bearer tokens in generated curl commands and error logs

---

## [1.2.8] - 2025-09-26

### Fixed
- **Duplicate Line Item Issue**: Fixed critical issue where duplicate products (same external ID) in parent-child relationships were being incorrectly grouped under the same parent in test results

---

## [1.2.7] - 2025-09-23

### Added
- **Dedicated Activity Bar Icon**: Rev Cloud Blueprint now has its own icon in the VS Code Activity Bar for easier access
- **User Status View**: New Profile view accessible via user icon (👤) in the title bar showing welcome message and Public Beta information

### Fixed
- **Bundle-Based Adjustmentss**: Fixed an issue where lines were incorrectly being calculated for bundle based adjustments.

---

## [1.2.6] - 2025-09-19

### Added
- **Compact Batch Report**: New table view for batch test results with expandable details and save/export functionality

---

## [1.2.5] - 2025-09-18

### Updated
- **Documentation**: Updated documentation to explain the use of configurable snapFields and reportFields in settings.json

---

## [1.2.4] - 2025-09-18

### Fixed
- **Critical Timing Issue**: Resolved false mismatches caused by capturing intermediate responses 

### Improved
- **Report Field Merging**: Enhanced logic to properly merge standard fields with configured reportFields
---

## [1.2.3] - 2025-09-18

### Updated
- **Documentation**: Updated Overview document (README.md) to reflect capabilities and limitations

---

## [1.2.2] - 2025-09-16

### Updated
- **License**: Updated EULA

---

## [1.2.1] - 2025-09-16

### Added
- **One-Click Configuration Setup**: Automated creation of required configuration files

---

## [1.2.0] - 2025-09-16

### Added
- **Snapshot Grouping System**: Comprehensive organization and management of pricing test snapshots
- **Enhanced Batch Testing**: Batch run all tests in a group with single play button click
- **Batch Reports**: Detailed test result analysis with actionable insights

### Fixed
- **Intermittent Pricing Issues**: Resolved race condition where pricing appeared complete but results weren't ready
- **Individual Snapshot Tests**: Fixed "Cannot read properties of undefined (reading 'metadata')" error
- **API Reliability**: Network timeouts, connection issues, and temporary service unavailability

---

## [1.1.1] - 2025-09-09

### Fixed
- Skipped target org selection and auto selected with source org
### Improved
- Updates to Documentation and License

---

## [1.1.0] - 2025-09-03

### Added
- **Hierarchical Line Items Structure**: Revolutionary new display for bundle-based quotes
  - **Bundle Grouping**: Child line items are now automatically grouped under their parent bundle items
  - **Smart Sorting**: Bundles appear first (alphabetically), followed by standalone items
  - **Enhanced Summary**: Reports now display bundle count and standalone item count
- **Improved Visual Design**: 
  - Bundle parents have distinctive styling with gradient backgrounds
  - Child items are visually indented with dashed left borders
  - Color-coded status indicators for different item types
  - Monospace fonts for tree characters ensure perfect alignment
- **Extended Test Statistics**: Bundle vs standalone item breakdowns in test summaries

---

## [1.0.2] - 2025-09-02

### Improved
- **Directory Structure**: Reorganized file locations for intuitive user navigation and streamlined workflow

---

## [1.0.1] - 2025-09-01

### Fixed
- **Critical**: Resolved "There is no data provider registered" error when extension is installed from marketplace or VSIX file
- **Critical**: Fixed "command not found" errors for extension commands in production installations
- Extension now properly activates and loads snapshot files in all installation scenarios

---

## [1.0.0] - 2025-08-23

### Added
- Initial release of Revenue Cloud Pricing Test Framework
- Pricing snapshot creation from Salesforce quotes
- Automated comparison engine with field-level variance analysis
- VS Code sidebar integration with snapshot management
- Comprehensive test reports with HTML webview
- Salesforce CLI integration for secure multi-org authentication