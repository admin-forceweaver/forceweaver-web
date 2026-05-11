import * as vscode from 'vscode';
import { ExpectedResults, PricingSnapshot, RecreationLineItem } from '../snapshot/creator';
import { QuoteData, QuoteLineData } from '../salesforce/api';

export interface FieldComparison {
    fieldName: string;
    expected: any;
    actual: any;
    match: boolean;
    variance?: number;
    percentageVariance?: number;
}

export interface LineItemComparison {
    externalId: string;
    productName?: string;
    found: boolean;
    fieldComparisons: FieldComparison[];
    overallMatch: boolean;
    // Optional parent information for hierarchical display
    parentExternalId?: string;
    isParent?: boolean;
    children?: LineItemComparison[];
}

// New interface for grouped hierarchical display
export interface HierarchicalLineItemGroup {
    type: 'bundle' | 'standalone';
    parentItem?: LineItemComparison; // Present for bundle groups
    childItems: LineItemComparison[]; // Child items for bundles, or the single item for standalone
    overallMatch: boolean; // Aggregate status for the group
    bundleName?: string; // Display name for the bundle
}

export interface QuoteComparison {
    fieldComparisons: FieldComparison[];
    overallMatch: boolean;
}

export interface ComparisonResult {
    quote: QuoteComparison;
    lineItems: LineItemComparison[];
    hierarchicalGroups: HierarchicalLineItemGroup[]; // New hierarchical structure for display
    overallMatch: boolean;
    summary: {
        totalFields: number;
        matchingFields: number;
        totalLineItems: number;
        matchingLineItems: number;
        successRate: number;
        totalBundles?: number; // Number of bundle groups
        totalStandalone?: number; // Number of standalone items
    };
}

export class Comparator {
    private readonly TOLERANCE = 0.01; // Tolerance for floating-point comparisons

    /**
     * Compare expected results with actual quote data
     */
    compare(expectedSnapshot: PricingSnapshot, actual: QuoteData): ComparisonResult {
        console.log(`[DEBUG] 🔍 COMPARATOR: Starting comparison...`);
        console.log(`[DEBUG]   Expected Quote Fields: ${Object.keys(expectedSnapshot.expectedResults.quoteFields).join(', ')}`);
        console.log(`[DEBUG]   Expected Line Items: ${expectedSnapshot.recreationPayload.lineItems.length}`);
        console.log(`[DEBUG]   Actual Quote ID: ${actual.Id}`);
        console.log(`[DEBUG]   Actual Line Items: ${actual.QuoteLines.length}`);
        
        // Compare quote-level fields
        const quoteComparison = this.compareQuoteFields(expectedSnapshot.expectedResults.quoteFields, actual);
        console.log(`[DEBUG]   Quote comparison result: ${quoteComparison.overallMatch ? '✅ Match' : '❌ Mismatch'} (${quoteComparison.fieldComparisons.filter(fc => fc.match).length}/${quoteComparison.fieldComparisons.length} fields)`);

        // Compare line items (now unified in recreationPayload.lineItems)
        const lineItemComparisons = this.compareLineItems(expectedSnapshot.recreationPayload.lineItems, actual.QuoteLines);
        console.log(`[DEBUG]   Line items comparison result: ${lineItemComparisons.every(li => li.overallMatch) ? '✅ All Match' : '❌ Some Mismatch'} (${lineItemComparisons.filter(li => li.overallMatch).length}/${lineItemComparisons.length} items)`);

        // Build hierarchical groups for display
        const hierarchicalGroups = this.buildHierarchicalGroups(lineItemComparisons, expectedSnapshot.recreationPayload.lineItems);
        console.log(`[DEBUG]   Hierarchical groups: ${hierarchicalGroups.length} groups (${hierarchicalGroups.filter(g => g.type === 'bundle').length} bundles, ${hierarchicalGroups.filter(g => g.type === 'standalone').length} standalone)`);

        // Calculate overall match
        const quoteMatches = quoteComparison.overallMatch;
        const allLineItemsMatch = lineItemComparisons.every(li => li.overallMatch);
        const overallMatch = quoteMatches && allLineItemsMatch;
        console.log(`[DEBUG]   Overall match: ${overallMatch ? '✅ PASS' : '❌ FAIL'} (Quote: ${quoteMatches ? '✅' : '❌'}, Line Items: ${allLineItemsMatch ? '✅' : '❌'})`);

        // Generate summary statistics
        const totalQuoteFields = quoteComparison.fieldComparisons.length;
        const matchingQuoteFields = quoteComparison.fieldComparisons.filter(fc => fc.match).length;
        
        const totalLineItemFields = lineItemComparisons.reduce((sum, li) => sum + li.fieldComparisons.length, 0);
        const matchingLineItemFields = lineItemComparisons.reduce((sum, li) => sum + li.fieldComparisons.filter(fc => fc.match).length, 0);

        const totalFields = totalQuoteFields + totalLineItemFields;
        const matchingFields = matchingQuoteFields + matchingLineItemFields;

        const totalLineItems = expectedSnapshot.recreationPayload.lineItems.length;
        const matchingLineItems = lineItemComparisons.filter(li => li.overallMatch).length;

        return {
            quote: quoteComparison,
            lineItems: lineItemComparisons,
            hierarchicalGroups,
            overallMatch,
            summary: {
                totalFields,
                matchingFields,
                totalLineItems,
                matchingLineItems,
                successRate: totalFields > 0 ? (matchingFields / totalFields) * 100 : 0,
                totalBundles: hierarchicalGroups.filter(g => g.type === 'bundle').length,
                totalStandalone: hierarchicalGroups.filter(g => g.type === 'standalone').length
            }
        };
    }

    /**
     * Compare quote-level fields
     */
    private compareQuoteFields(expectedFields: any, actualQuote: QuoteData): QuoteComparison {
        const fieldComparisons: FieldComparison[] = [];

        for (const [fieldName, expectedValue] of Object.entries(expectedFields)) {
            const actualValue = this.getActualFieldValue(actualQuote, fieldName);
            const comparison = this.compareFieldValues(fieldName, expectedValue, actualValue);
            fieldComparisons.push(comparison);
        }

        const overallMatch = fieldComparisons.every(fc => fc.match);

        return {
            fieldComparisons,
            overallMatch
        };
    }

    /**
     * Compare line items (now unified in RecreationLineItem with expectedPricingFields)
     */
    private compareLineItems(expectedLineItems: RecreationLineItem[], actualLineItems: QuoteLineData[]): LineItemComparison[] {
        const comparisons: LineItemComparison[] = [];
        const usedActualItems = new Set<string>(); // Track which actual items have been matched

        console.log(`[DEBUG] 🔄 COMPARATOR: Starting line item comparison...`);
        console.log(`[DEBUG]   Expected items: ${expectedLineItems.length}`);
        console.log(`[DEBUG]   Actual items: ${actualLineItems.length}`);

        for (const expectedLineItem of expectedLineItems) {
            // Find matching actual line item by external ID or Product ID
            const externalId = expectedLineItem.productIdentifier.value;
            const hasParent = !!expectedLineItem.parentLineItemReference;
            const parentId = expectedLineItem.parentLineItemReference?.parentProductIdentifier.value;
            
            console.log(`[DEBUG] 🔍 Looking for match: ${externalId} (isChild: ${hasParent}, parent: ${parentId || 'N/A'})`);
            
            const actualLineItem = this.findMatchingLineItem(expectedLineItem, actualLineItems, usedActualItems);
            
            if (actualLineItem) {
                usedActualItems.add(actualLineItem.Id);
                console.log(`[DEBUG] ✅ Found match: ${externalId} → Actual ID: ${actualLineItem.Id}`);
            } else {
                console.log(`[DEBUG] ❌ No match found for: ${externalId}`);
            }
            
            if (!actualLineItem) {
                comparisons.push({
                    externalId: externalId,
                    productName: undefined,
                    found: false,
                    fieldComparisons: [],
                    overallMatch: false
                });
                continue;
            }

            // Compare pricing fields for this line item (now in expectedPricingFields)
            const fieldComparisons: FieldComparison[] = [];
            
            for (const [fieldName, expectedValue] of Object.entries(expectedLineItem.expectedPricingFields)) {
                const actualValue = this.getActualLineFieldValue(actualLineItem, fieldName);
                const comparison = this.compareFieldValues(fieldName, expectedValue, actualValue);
                fieldComparisons.push(comparison);
            }

            const overallMatch = fieldComparisons.every(fc => fc.match);

            comparisons.push({
                externalId: externalId,
                productName: actualLineItem.Product2?.Name || actualLineItem.Product2Id || undefined,
                found: true,
                fieldComparisons,
                overallMatch
            });
        }

        // Sort comparisons to show parent line items first, then child line items
        comparisons.sort((a, b) => {
            // If one item has no parent (parent line item) and other has parent, parent comes first
            const aIsParent = !a.externalId?.includes('_');
            const bIsParent = !b.externalId?.includes('_');
            
            if (aIsParent && !bIsParent) return -1;
            if (!aIsParent && bIsParent) return 1;
            
            // Otherwise maintain original order
            return 0;
        });

        return comparisons;
    }

    /**
     * Build hierarchical groups for display from flat line item comparisons
     */
    private buildHierarchicalGroups(lineItemComparisons: LineItemComparison[], expectedLineItems: RecreationLineItem[]): HierarchicalLineItemGroup[] {
        console.log(`[DEBUG] 🏗️ Building hierarchical groups from ${lineItemComparisons.length} line items...`);
        
        // Create a map for lookup of expected line items by comparison
        // Since we can have duplicate external IDs, we need to match comparisons to expected items properly
        const expectedItemMap = new Map<LineItemComparison, RecreationLineItem>();
        const usedExpectedItems = new Set<RecreationLineItem>();
        
        // Match each comparison to its corresponding expected item
        lineItemComparisons.forEach(comparison => {
            const externalId = comparison.externalId;
            
            // Find the expected item that matches this comparison and hasn't been used yet
            const matchingExpectedItem = expectedLineItems.find(expectedItem => 
                expectedItem.productIdentifier.value === externalId && 
                !usedExpectedItems.has(expectedItem)
            );
            
            if (matchingExpectedItem) {
                expectedItemMap.set(comparison, matchingExpectedItem);
                usedExpectedItems.add(matchingExpectedItem);
                console.log(`[DEBUG] 🔗 Matched comparison "${externalId}" to expected item with parent: ${matchingExpectedItem.parentLineItemReference?.parentProductIdentifier.value || 'none'}`);
            } else {
                console.log(`[DEBUG] ⚠️ No matching expected item found for comparison: ${externalId}`);
            }
        });

        // Group items by parent relationship
        const parentGroups = new Map<string, LineItemComparison[]>(); // parentExternalId -> children
        const standaloneItems: LineItemComparison[] = [];
        const parentItems = new Map<string, LineItemComparison>(); // parentExternalId -> parent comparison

        // First pass: identify parent-child relationships and standalone items
        lineItemComparisons.forEach(comparison => {
            const expectedItem = expectedItemMap.get(comparison);
            
            if (expectedItem?.parentLineItemReference) {
                // This is a child item
                const parentRef = expectedItem.parentLineItemReference;
                const parentExternalId = parentRef.parentProductIdentifier.value;
                
                console.log(`[DEBUG]   📦 Child item found: ${comparison.externalId} -> parent: ${parentExternalId}`);
                
                // Add parent information to the comparison
                comparison.parentExternalId = parentExternalId;
                comparison.isParent = false;
                
                // Group under parent
                if (!parentGroups.has(parentExternalId)) {
                    parentGroups.set(parentExternalId, []);
                }
                parentGroups.get(parentExternalId)!.push(comparison);
                
                // Find parent comparison by external ID (since parents should be unique)
                const parentComparison = lineItemComparisons.find(comp => comp.externalId === parentExternalId);
                if (parentComparison) {
                    parentComparison.isParent = true;
                    parentComparison.children = parentComparison.children || [];
                    parentItems.set(parentExternalId, parentComparison);
                }
            } else {
                // Check if this item is a parent (has children)
                const hasChildren = lineItemComparisons.some(otherComparison => {
                    const otherExpectedItem = expectedItemMap.get(otherComparison);
                    return otherExpectedItem?.parentLineItemReference?.parentProductIdentifier.value === comparison.externalId;
                });
                
                if (hasChildren) {
                    console.log(`[DEBUG]   🌟 Parent item found: ${comparison.externalId}`);
                    comparison.isParent = true;
                    comparison.children = [];
                    parentItems.set(comparison.externalId, comparison);
                } else {
                    console.log(`[DEBUG]   📄 Standalone item found: ${comparison.externalId}`);
                    comparison.isParent = false;
                    standaloneItems.push(comparison);
                }
            }
        });

        // Build hierarchical groups
        const hierarchicalGroups: HierarchicalLineItemGroup[] = [];

        // Create bundle groups
        parentItems.forEach((parentComparison, parentExternalId) => {
            const childItems = parentGroups.get(parentExternalId) || [];
            
            // Sort child items by external ID for consistent ordering
            childItems.sort((a, b) => a.externalId.localeCompare(b.externalId));
            
            // Update parent's children array
            parentComparison.children = childItems;
            
            // Calculate bundle overall match (parent match AND all children match)
            const allChildrenMatch = childItems.length === 0 || childItems.every(child => child.overallMatch);
            const bundleOverallMatch = parentComparison.overallMatch && allChildrenMatch;
            
            console.log(`[DEBUG]   📦 Bundle: ${parentExternalId} - Parent: ${parentComparison.overallMatch ? '✅' : '❌'}, Children: ${childItems.length} (${childItems.filter(c => c.overallMatch).length} passed) -> Overall: ${bundleOverallMatch ? '✅' : '❌'}`);
            
            hierarchicalGroups.push({
                type: 'bundle',
                parentItem: parentComparison,
                childItems: childItems,
                overallMatch: bundleOverallMatch,
                bundleName: parentComparison.productName || parentComparison.externalId
            });
        });

        // Create standalone groups
        standaloneItems.forEach(standaloneItem => {
            console.log(`[DEBUG]   📄 Standalone: ${standaloneItem.externalId} - ${standaloneItem.overallMatch ? '✅' : '❌'}`);
            
            hierarchicalGroups.push({
                type: 'standalone',
                childItems: [standaloneItem],
                overallMatch: standaloneItem.overallMatch
            });
        });

        // Sort groups: bundles first (by bundle name), then standalone items (by external ID)
        hierarchicalGroups.sort((a, b) => {
            if (a.type === 'bundle' && b.type === 'standalone') return -1;
            if (a.type === 'standalone' && b.type === 'bundle') return 1;
            
            if (a.type === 'bundle' && b.type === 'bundle') {
                return (a.bundleName || '').localeCompare(b.bundleName || '');
            }
            
            // Both standalone
            return a.childItems[0].externalId.localeCompare(b.childItems[0].externalId);
        });

        console.log(`[DEBUG] 🏁 Built ${hierarchicalGroups.length} hierarchical groups: ${hierarchicalGroups.filter(g => g.type === 'bundle').length} bundles, ${hierarchicalGroups.filter(g => g.type === 'standalone').length} standalone`);
        
        return hierarchicalGroups;
    }

    /**
     * Find matching line item by external ID or Product ID, excluding already used items
     */
    private findMatchingLineItem(expectedItem: RecreationLineItem, actualLineItems: QuoteLineData[], usedActualItems?: Set<string>): QuoteLineData | undefined {
        const externalIdValue = expectedItem.productIdentifier.value;
        const identifierType = expectedItem.productIdentifier.type;
        const configuredField = expectedItem.productIdentifier.externalIdField || 'ProductCode';
        
        console.log(`[DEBUG] 🔍 findMatchingLineItem: Looking for ${externalIdValue} (type: ${identifierType}, field: ${configuredField})`);
        console.log(`[DEBUG]   Available actual items: ${actualLineItems.length}`);
        console.log(`[DEBUG]   Used items: ${usedActualItems ? Array.from(usedActualItems).join(', ') : 'none'}`);
        
        // Filter out already used items if tracking is enabled
        const availableItems = usedActualItems 
            ? actualLineItems.filter(item => !usedActualItems.has(item.Id))
            : actualLineItems;
            
        console.log(`[DEBUG]   Available (unused) items: ${availableItems.length}`);
        
        const matchedItem = availableItems.find(lineItem => {
            if (identifierType === 'productId') {
                // Match by Product2.Id directly
                return lineItem.Product2.Id === externalIdValue;
            } else {
                // Match by configured external ID field
                const productExternalId = lineItem.Product2[configuredField] || 
                                        lineItem.Product2.ProductCode || 
                                        lineItem.Product2.Id;
                const matches = productExternalId === externalIdValue;
                console.log(`[DEBUG]     Checking item ${lineItem.Id}: ${productExternalId} === ${externalIdValue} ? ${matches}`);
                return matches;
            }
        });
        
        if (matchedItem) {
            console.log(`[DEBUG] ✅ Match found: ${externalIdValue} → Item ID: ${matchedItem.Id}, Product: ${matchedItem.Product2?.Name}`);
        } else {
            console.log(`[DEBUG] ❌ No match found for: ${externalIdValue}`);
        }
        
        return matchedItem;
    }

    /**
     * Get actual field value from quote object
     */
    private getActualFieldValue(quote: QuoteData, fieldName: string): any {
        console.log(`[DEBUG] 🔍 getActualFieldValue(${fieldName}): Retrieving field value...`);
        
        let actualValue: any;
        
        switch (fieldName) {
            case 'GrandTotal':
                actualValue = quote.GrandTotal;
                console.log(`[DEBUG]   📊 Standard field ${fieldName}: ${actualValue}`);
                break;
            case 'Discount':
                actualValue = quote.Discount || 0;
                console.log(`[DEBUG]   📊 Standard field ${fieldName}: ${actualValue} (null converted to 0)`);
                break;
            default:
                actualValue = (quote as any)[fieldName];
                console.log(`[DEBUG]   📊 Custom field ${fieldName}: ${actualValue} (type: ${typeof actualValue})`);
                
                // Enhanced debugging for custom fields
                const fieldExists = fieldName in quote;
                console.log(`[DEBUG]   📊 Field ${fieldName} exists in quote object: ${fieldExists ? '✅' : '❌'}`);
                
                if (!fieldExists) {
                    console.warn(`[WARN] 📊 Field ${fieldName} not found in quote object! Available fields:`);
                    const availableFields = Object.keys(quote).filter(key => key !== 'QuoteLines');
                    console.log(`[DEBUG]   📊 Available quote fields: [${availableFields.join(', ')}]`);
                }
                break;
        }
        
        console.log(`[DEBUG]   📊 Final value for ${fieldName}: ${JSON.stringify(actualValue)} (type: ${typeof actualValue})`);
        return actualValue;
    }

    /**
     * Get actual field value from line item object
     * Preserves null values - does NOT convert null to 0
     */
    private getActualLineFieldValue(lineItem: QuoteLineData, fieldName: string): any {
        switch (fieldName) {
            case 'TotalPrice':
                // Only default to 0 if undefined, preserve null
                return lineItem.TotalPrice !== undefined ? lineItem.TotalPrice : 0;
            case 'UnitPrice':
                return lineItem.UnitPrice !== undefined ? lineItem.UnitPrice : 0;
            case 'ListPrice':
                return lineItem.ListPrice !== undefined ? lineItem.ListPrice : 0;
            case 'Discount':
                // Preserve null values for Discount - don't convert to 0
                return lineItem.Discount !== undefined ? lineItem.Discount : null;
            default:
                return (lineItem as any)[fieldName];
        }
    }

    /**
     * Check if a value is null or zero (for equivalence comparison)
     */
    private isNullOrZero(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === 'number' && value === 0) {
            return true;
        }
        if (typeof value === 'string') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Compare two field values with appropriate tolerance for numbers
     */
    private compareFieldValues(fieldName: string, expected: any, actual: any): FieldComparison {
        console.log(`[DEBUG] 🔍 compareFieldValues(${fieldName}): Expected=${JSON.stringify(expected)} (${typeof expected}) | Actual=${JSON.stringify(actual)} (${typeof actual})`);
        
        // Check if we should treat null and zero as equivalent
        const config = vscode.workspace.getConfiguration('revCloudBlueprint.comparison');
        const treatNullAsZero = config.get<boolean>('treatNullAsZero', true);
        
        // If enabled, check if both values are null or zero
        if (treatNullAsZero && this.isNullOrZero(expected) && this.isNullOrZero(actual)) {
            console.log(`[DEBUG] ✅ NULL/ZERO EQUIVALENCE - ${fieldName}: Treating null and 0 as equivalent`);
            return {
                fieldName,
                expected,
                actual,
                match: true,
                variance: 0,
                percentageVariance: 0
            };
        }
        
        let match = false;
        let variance: number | undefined;
        let percentageVariance: number | undefined;

        if (typeof expected === 'number' && typeof actual === 'number') {
            // Numeric comparison with tolerance
            variance = Math.abs(expected - actual);
            match = variance <= this.TOLERANCE;
            
            if (expected !== 0) {
                percentageVariance = (variance / Math.abs(expected)) * 100;
            }
            
            console.log(`[DEBUG] 🔢 NUMERIC COMPARISON - ${fieldName}: Variance=${variance} | Tolerance=${this.TOLERANCE} | Match=${match ? '✅' : '❌'}`);
            
            // Debug numeric mismatches
            if (!match) {
                console.log(`[DEBUG] 🔢 NUMERIC MISMATCH - ${fieldName}: Expected=${expected} | Actual=${actual} | Variance=${variance} | PercentageVariance=${percentageVariance?.toFixed(2)}%`);
                
                // Special check for potential data type conversion issues
                if (Math.abs(expected) > 10 && Math.abs(actual) > 10) {
                    console.log(`[DEBUG] 🔢 LARGE VALUE MISMATCH - This could indicate a data retrieval issue rather than calculation difference`);
                }
            }
        } else if (expected === null && actual === null) {
            match = true;
            console.log(`[DEBUG] 🔤 NULL COMPARISON - ${fieldName}: Both values are null ✅`);
        } else if (expected === undefined && actual === undefined) {
            match = true;
            console.log(`[DEBUG] 🔤 UNDEFINED COMPARISON - ${fieldName}: Both values are undefined ✅`);
        } else if ((expected === null || expected === undefined) && (actual === null || actual === undefined)) {
            match = true;
            console.log(`[DEBUG] 🔤 NULL/UNDEFINED COMPARISON - ${fieldName}: Both values are null-ish ✅`);
        } else {
            // String/other type comparison
            match = expected === actual;
            
            console.log(`[DEBUG] 🔤 STRING/OTHER COMPARISON - ${fieldName}: Match=${match ? '✅' : '❌'}`);
            
            // Debug non-numeric comparisons  
            if (!match) {
                console.log(`[DEBUG] 🔤 VALUE MISMATCH - ${fieldName}: Expected=${JSON.stringify(expected)} (${typeof expected}) | Actual=${JSON.stringify(actual)} (${typeof actual})`);
                
                // Check for potential string/number conversion issues
                if (typeof expected === 'number' && typeof actual === 'string') {
                    const numericActual = parseFloat(actual);
                    console.log(`[DEBUG] 🔄 TYPE CONVERSION CHECK - Trying to convert actual string '${actual}' to number: ${numericActual}`);
                    if (!isNaN(numericActual)) {
                        const convertedMatch = Math.abs(expected - numericActual) <= this.TOLERANCE;
                        console.log(`[DEBUG] 🔄 AFTER CONVERSION - Would match: ${convertedMatch ? '✅' : '❌'}`);
                    }
                } else if (typeof expected === 'string' && typeof actual === 'number') {
                    const numericExpected = parseFloat(expected);
                    console.log(`[DEBUG] 🔄 TYPE CONVERSION CHECK - Trying to convert expected string '${expected}' to number: ${numericExpected}`);
                    if (!isNaN(numericExpected)) {
                        const convertedMatch = Math.abs(numericExpected - actual) <= this.TOLERANCE;
                        console.log(`[DEBUG] 🔄 AFTER CONVERSION - Would match: ${convertedMatch ? '✅' : '❌'}`);
                    }
                }
            }
        }

        const result = {
            fieldName,
            expected,
            actual,
            match,
            variance,
            percentageVariance
        };
        
        console.log(`[DEBUG] 🎯 compareFieldValues(${fieldName}) RESULT: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
        return result;
    }

    /**
     * Generate enhanced comparison report with accordion layout, save functionality, and PDF export
     */
    generateEnhancedReport(comparison: ComparisonResult, snapshot: any, actualQuote: QuoteData | undefined, testResult: any): string {
        // CRITICAL DEBUG: Log inputs to catch null values
        console.log(`[DEBUG] 🎯 generateEnhancedReport inputs:`);
        console.log(`[DEBUG]   comparison: ${comparison ? 'Present' : 'NULL'}`);
        console.log(`[DEBUG]   snapshot: ${snapshot ? 'Present' : 'NULL'}`);
        console.log(`[DEBUG]   actualQuote: ${actualQuote ? 'Present' : 'NULL'}`);
        console.log(`[DEBUG]   testResult: ${testResult ? 'Present' : 'NULL'}`);
        
        // Add null safety checks
        if (!comparison) {
            throw new Error('comparison parameter cannot be null');
        }
        if (!snapshot) {
            throw new Error('snapshot parameter cannot be null');
        }
        if (!testResult) {
            throw new Error('testResult parameter cannot be null');
        }
        
        // Additional debug logging for comparison structure
        console.log(`[DEBUG] 🔍 Comparison structure deep validation:`);
        console.log(`[DEBUG]   comparison.overallMatch: ${comparison.overallMatch}`);
        console.log(`[DEBUG]   comparison.quote: ${comparison.quote ? 'Present' : 'NULL'}`);
        console.log(`[DEBUG]   comparison.lineItems: ${comparison.lineItems ? 'Present' : 'NULL'}`);
        console.log(`[DEBUG]   comparison.summary: ${comparison.summary ? 'Present' : 'NULL'}`);
        
        if (comparison.quote) {
            console.log(`[DEBUG]   comparison.quote.overallMatch: ${comparison.quote.overallMatch}`);
            console.log(`[DEBUG]   comparison.quote.fieldComparisons: ${comparison.quote.fieldComparisons ? comparison.quote.fieldComparisons.length + ' items' : 'NULL'}`);
        }
        
        if (comparison.lineItems) {
            console.log(`[DEBUG]   comparison.lineItems.length: ${comparison.lineItems.length}`);
            comparison.lineItems.forEach((li: any, index: number) => {
                console.log(`[DEBUG]     lineItem[${index}]: ${li ? 'Present' : 'NULL'} - externalId: ${li?.externalId || 'N/A'}`);
                if (li && li.fieldComparisons) {
                    console.log(`[DEBUG]       fieldComparisons: ${li.fieldComparisons.length} items`);
                }
            });
        }
        
        if (comparison.summary) {
            console.log(`[DEBUG]   comparison.summary.totalFields: ${comparison.summary.totalFields}`);
            console.log(`[DEBUG]   comparison.summary.matchingFields: ${comparison.summary.matchingFields}`);
            console.log(`[DEBUG]   comparison.summary.successRate: ${comparison.summary.successRate}`);
        }
        
        const status = comparison.overallMatch ? '✅ PASSED' : '❌ FAILED';
        const statusClass = comparison.overallMatch ? 'passed' : 'failed';
        
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pricing Test Results</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
        .header { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header-left { flex: 1; }
        .header-right { flex-shrink: 0; }
        .snapshot-title { font-size: 28px; font-weight: bold; margin-bottom: 15px; color: var(--vscode-textLink-foreground); }
        .status-badge { display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 5px; font-size: 16px; font-weight: bold; margin-bottom: 15px; }
        .status-badge.passed { background-color: #4CAF50; color: white; }
        .status-badge.failed { background-color: #F44336; color: white; }
        .status-icon { margin-right: 8px; font-size: 18px; }
        .summary { background-color: var(--vscode-editor-inlayHint-background); padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
        .summary-item { margin-bottom: 8px; }
        .summary-label { font-weight: bold; color: var(--vscode-textLink-foreground); }
        .section { margin-bottom: 30px; }
        .section h2 { color: var(--vscode-textLink-foreground); border-bottom: 2px solid var(--vscode-textLink-foreground); padding-bottom: 8px; font-size: 22px; margin-bottom: 15px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .section-header h2 { margin-bottom: 0; flex: 1; }
        .comparison-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
        .comparison-table th, .comparison-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); }
        .comparison-table th { background-color: var(--vscode-editor-inlayHint-background); font-weight: bold; font-size: 12px; }
        .match { color: #4CAF50; font-size: 12px; }
        .mismatch { color: #F44336; font-weight: bold; font-size: 12px; }
        .variance { font-size: 11px; color: var(--vscode-descriptionForeground); }
        .metadata { font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-bottom: 20px; }
        
        /* Accordion Styles - Compact */
        .accordion { border: 1px solid var(--vscode-panel-border); border-radius: 6px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .accordion-header { 
            padding: 12px 16px; 
            background-color: var(--vscode-editor-inlayHint-background); 
            cursor: pointer; 
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 6px 6px 0 0;
        }
        .accordion-header:hover { background-color: var(--vscode-list-hoverBackground); }
        .accordion-header.failed { border-left: 4px solid #F44336; }
        .accordion-header.passed { border-left: 4px solid #4CAF50; }
        .accordion-title { font-size: 16px; font-weight: bold; color: var(--vscode-editor-foreground); }
        .accordion-status { margin-left: 12px; font-size: 13px; font-weight: normal; }
        .accordion-toggle { font-size: 18px; transition: transform 0.3s ease; color: var(--vscode-textLink-foreground); }
        .accordion-toggle.expanded { transform: rotate(90deg); }
        .accordion-content { 
            padding: 16px; 
            border-top: 1px solid var(--vscode-panel-border);
            display: none;
            background-color: var(--vscode-editor-background);
        }
        .accordion-content.expanded { display: block; }
        
        /* Hierarchical Bundle Styles */
        .bundle-group { margin-bottom: 12px; }
        .bundle-parent .accordion-header { 
            background: linear-gradient(135deg, var(--vscode-editor-inlayHint-background), var(--vscode-list-hoverBackground));
            font-weight: bold;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .bundle-parent .accordion-title { font-size: 16px; font-weight: bold; }
        
        .bundle-parent-details { 
            margin-bottom: 20px; 
            padding: 12px; 
            background: var(--vscode-editor-inlayHint-background);
            border-radius: 6px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .bundle-parent-details h4 { 
            margin: 0 0 12px 0; 
            color: var(--vscode-textLink-foreground);
            font-size: 14px;
        }
        
        .bundle-children { margin-top: 15px; }
        .bundle-children h4 { 
            margin: 0 0 10px 0; 
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            font-weight: 600;
        }
        
        .bundle-child { 
            margin-bottom: 6px; 
            margin-left: 20px;
            border-left: 2px dashed var(--vscode-panel-border);
            position: relative;
        }
        .bundle-child .accordion-header { 
            background-color: var(--vscode-list-inactiveSelectionBackground);
            font-size: 14px;
            padding: 12px 16px;
        }
        .bundle-child .accordion-header:hover { 
            background-color: var(--vscode-list-hoverBackground);
        }
        .bundle-child .accordion-title { 
            font-weight: 500;
            font-size: 14px;
            font-family: 'Courier New', monospace; /* Monospace for tree characters */
        }
        .bundle-child .accordion-content {
            background-color: var(--vscode-list-inactiveSelectionBackground);
            margin-left: 16px;
        }
        
        .standalone-item {
            border-left: 3px solid var(--vscode-descriptionForeground);
        }
        .standalone-item .accordion-title {
            font-weight: 500;
        }
        
        /* Table styling for different contexts */
        .parent-table { border: 2px solid var(--vscode-textLink-foreground); }
        .parent-table th { background-color: var(--vscode-textLink-foreground); color: var(--vscode-editor-background); }
        
        .child-table { border: 1px solid var(--vscode-panel-border); }
        .child-table th { background-color: var(--vscode-list-inactiveSelectionBackground); }
        
        /* Action Buttons */
        .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .action-button { 
            background-color: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 13px;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .action-button:hover { background-color: var(--vscode-button-hoverBackground); }
        .action-button.secondary { 
            background-color: var(--vscode-button-secondaryBackground); 
            color: var(--vscode-button-secondaryForeground); 
        }
        .action-button.secondary:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
        
        @media print {
            .action-buttons { display: none; }
            .accordion-content { display: block !important; }
            .accordion-toggle { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="snapshot-title">${(snapshot && snapshot.metadata) ? (snapshot.metadata.description || snapshot.metadata.sourceQuoteId || 'Pricing Test') : 'Pricing Test'}</div>
        </div>
        <div class="header-right">
            <div class="action-buttons">
                <button class="action-button" onclick="saveReport()">💾 Save Report</button>
                <button class="action-button secondary" onclick="exportToPDF()">📄 Export to PDF</button>
            </div>
        </div>
    </div>

    <div class="summary">
        <h3>Test Summary</h3>
        <div class="summary-grid">
            <div>
                <div class="summary-item">
                    <span class="summary-label">Source Quote ID:</span> ${(snapshot && snapshot.metadata) ? (snapshot.metadata.sourceQuoteId || 'Unknown') : 'Unknown'}
                </div>
                <div class="summary-item">
                    <span class="summary-label">Source Org:</span> ${(snapshot && snapshot.metadata) ? (snapshot.metadata.sourceOrgAlias || snapshot.metadata.sourceOrgUsername || 'Unknown') : 'Unknown'}
                </div>
                <div class="summary-item">
                    <span class="summary-label">Target Org:</span> ${testResult.targetOrg ? (testResult.targetOrg.alias || testResult.targetOrg.username || 'Unknown') : 'Unknown'}
                </div>
            </div>
            <div>
                <div class="summary-item">
                    <span class="summary-label">Created Quote:</span> ${actualQuote ? `${this.escapeHtml(actualQuote.Name) || 'Unnamed'} (${actualQuote.Id || 'No ID'})` : 'N/A - Quote creation failed'}
                </div>
                <div class="summary-item">
                    <span class="summary-label">Test Date:</span> ${new Date().toLocaleString()}
                </div>
                <div class="summary-item">
                    <span class="summary-label">Overall Status:</span> 
                    <span class="status-badge ${statusClass}" style="display: inline-flex; padding: 4px 8px; font-size: 12px;">
                        ${comparison.overallMatch ? 'Passed' : 'Failed'}
                    </span>
                </div>
            </div>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid var(--vscode-panel-border);">
        <div class="summary-grid">
            <div>
                <div class="summary-item">
                    <span class="summary-label">Success Rate:</span> ${comparison.summary.successRate.toFixed(1)}% (${comparison.summary.matchingFields}/${comparison.summary.totalFields} fields)
                </div>
                <div class="summary-item">
                    <span class="summary-label">Line Items:</span> ${comparison.summary.matchingLineItems}/${comparison.summary.totalLineItems} matching
                </div>
            </div>
            <div>
                <div class="summary-item">
                    <span class="summary-label">Execution Time:</span> ${(testResult && testResult.executionTime) ? (testResult.executionTime / 1000).toFixed(2) + 's' : 'N/A'}
                </div>
            </div>
        </div>
    </div>
`;

        // Quote-level comparison
        if (comparison.quote.fieldComparisons.length > 0) {
            html += `
    <div class="section">
        <div class="section-header">
            <h2>Quote-Level Comparison</h2>
        </div>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Field</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Status</th>
                    <th>Variance</th>
                </tr>
            </thead>
            <tbody>
`;

            comparison.quote.fieldComparisons.forEach(fc => {
                const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                const statusClass = fc.match ? 'match' : 'mismatch';
                const varianceText = fc.variance !== undefined ? 
                    `${fc.variance.toFixed(2)}${fc.percentageVariance !== undefined ? ` (${fc.percentageVariance.toFixed(2)}%)` : ''}` : '-';

                html += `
                <tr>
                    <td><strong>${fc.fieldName}</strong></td>
                    <td>${this.formatValue(fc.expected)}</td>
                    <td>${this.formatValue(fc.actual)}</td>
                    <td class="${statusClass}">${statusText}</td>
                    <td class="variance">${varianceText}</td>
                </tr>
`;
            });

            html += `
            </tbody>
        </table>
    </div>
`;
        }

        // Hierarchical line items comparison with nested accordion layout
        if (comparison.hierarchicalGroups && comparison.hierarchicalGroups.length > 0) {
            html += `
    <div class="section">
        <div class="section-header">
            <h2>Line Items Comparison</h2>
            <button class="action-button secondary" onclick="toggleAllAccordions()">📋 Expand/Collapse All</button>
        </div>
`;

            let accordionIndex = 0;

            comparison.hierarchicalGroups.forEach((group, groupIndex) => {
                if (group.type === 'bundle' && group.parentItem) {
                    // Render bundle group with parent and children
                    html += this.renderBundleGroup(group, accordionIndex);
                    accordionIndex += 1 + group.childItems.length; // Parent + children
                } else if (group.type === 'standalone') {
                    // Render standalone item
                    html += this.renderStandaloneItem(group.childItems[0], accordionIndex);
                    accordionIndex++;
                }
            });

            // TODO: Remove this legacy code block - keeping for now to prevent breaking
            const legacyRenderingEnabled = false; // Set to false to use new hierarchical rendering
            if (legacyRenderingEnabled) {
                comparison.lineItems.forEach((lineItem, index) => {
                try {
                    console.log(`[DEBUG] 🔍 Processing line item ${index + 1}:`);
                    console.log(`[DEBUG]   lineItem: ${lineItem ? 'Present' : 'NULL'}`);
                    console.log(`[DEBUG]   lineItem.productName: ${lineItem?.productName || 'N/A'}`);
                    console.log(`[DEBUG]   lineItem.externalId: ${lineItem?.externalId || 'N/A'}`);
                    console.log(`[DEBUG]   lineItem.found: ${lineItem?.found}`);
                    console.log(`[DEBUG]   lineItem.overallMatch: ${lineItem?.overallMatch}`);
                    console.log(`[DEBUG]   lineItem.fieldComparisons: ${lineItem?.fieldComparisons ? lineItem.fieldComparisons.length + ' items' : 'N/A'}`);
                    
                    const lineItemClass = lineItem.overallMatch ? 'passed' : 'failed';
                    const statusText = lineItem.found ? (lineItem.overallMatch ? '✅ Passed' : '❌ Failed') : '❌ Not Found';
                    
                    console.log(`[DEBUG]   Generated lineItemClass: ${lineItemClass}`);
                    console.log(`[DEBUG]   Generated statusText: ${statusText}`);
                    // Generate product name with extra safety
                    let productDisplayName = 'Unknown Product';
                    try {
                        if (lineItem.productName && typeof lineItem.productName === 'string') {
                            productDisplayName = this.escapeHtml(lineItem.productName.trim());
                        } else if (lineItem.externalId) {
                            productDisplayName = this.escapeHtml(lineItem.externalId);
                        }
                        console.log(`[DEBUG]   Generated productDisplayName: ${productDisplayName}`);
                    } catch (nameError: any) {
                        console.error(`[ERROR] ❌ Error generating product display name:`, nameError);
                        productDisplayName = `Unknown Product (Error: ${nameError.message})`;
                    }

                    html += `
        <div class="accordion">
            <div class="accordion-header ${lineItemClass}" onclick="toggleAccordion(${index})">
                <div>
                    <span class="accordion-title">Line Item ${index + 1}: ${productDisplayName}</span>
                    <span class="accordion-status">${statusText}</span>
                </div>
                <div class="accordion-toggle" id="toggle-${index}">▶</div>
            </div>
            <div class="accordion-content" id="content-${index}">
`;

                if (lineItem.found && lineItem.fieldComparisons.length > 0) {
                    html += `
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Expected</th>
                            <th>Actual</th>
                            <th>Status</th>
                            <th>Variance</th>
                        </tr>
                    </thead>
                    <tbody>
`;

                    lineItem.fieldComparisons.forEach(fc => {
                        const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                        const statusClass = fc.match ? 'match' : 'mismatch';
                        const varianceText = fc.variance !== undefined ? 
                            `${fc.variance.toFixed(2)}${fc.percentageVariance !== undefined ? ` (${fc.percentageVariance.toFixed(2)}%)` : ''}` : '-';

                        html += `
                        <tr>
                            <td><strong>${fc.fieldName}</strong></td>
                            <td>${this.formatValue(fc.expected)}</td>
                            <td>${this.formatValue(fc.actual)}</td>
                            <td class="${statusClass}">${statusText}</td>
                            <td class="variance">${varianceText}</td>
                        </tr>
`;
                    });

                    html += `
                    </tbody>
                </table>
`;
                } else if (!lineItem.found) {
                    html += `<p class="mismatch">Product with external ID "${lineItem.externalId}" was not found in the created quote.</p>`;
                }

                    html += `
            </div>
        </div>
`;
                } catch (lineItemError: any) {
                    console.error(`[ERROR] ❌ Error in line item HTML generation ${index + 1}:`, lineItemError);
                    console.error(`[ERROR] 📋 Line item HTML error details: ${lineItemError.message}`);
                    // Add error fallback HTML instead of crashing
                    html += `
        <div class="accordion">
            <div class="accordion-header failed">
                <div>
                    <span class="accordion-title">Line Item ${index + 1}: Error Processing (${lineItemError.message})</span>
                    <span class="accordion-status">❌ Error</span>
                </div>
            </div>
        </div>
`;
                }
            });
            }
            
            // Close the hierarchical line items section
            html += `    </div>`; // Close section div
        }

        html += `
    <script>
        // VS Code API for communication with the extension
        const vscode = acquireVsCodeApi();
        
        // Accordion functionality
        function toggleAccordion(index) {
            const content = document.getElementById('content-' + index);
            const toggle = document.getElementById('toggle-' + index);
            
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                toggle.classList.remove('expanded');
            } else {
                content.classList.add('expanded');
                toggle.classList.add('expanded');
            }
        }
        
        // Toggle all accordions
        function toggleAllAccordions() {
            const contents = document.querySelectorAll('.accordion-content');
            const toggles = document.querySelectorAll('.accordion-toggle');
            const firstExpanded = document.querySelector('.accordion-content.expanded');
            
            if (firstExpanded) {
                // If any are expanded, collapse all
                contents.forEach(content => content.classList.remove('expanded'));
                toggles.forEach(toggle => toggle.classList.remove('expanded'));
            } else {
                // If none are expanded, expand all
                contents.forEach(content => content.classList.add('expanded'));
                toggles.forEach(toggle => toggle.classList.add('expanded'));
            }
        }
        
        // Save report functionality
        function saveReport() {
            const htmlContent = document.documentElement.outerHTML;
            vscode.postMessage({
                command: 'saveReport',
                htmlContent: htmlContent
            });
        }
        
        // Export to PDF functionality
        function exportToPDF() {
            // Create a copy with all accordions expanded
            const htmlContent = document.documentElement.outerHTML;
            if (!htmlContent) {
                console.error('ERROR: htmlContent is null in exportToPDF');
                return;
            }
            const expandedHtml = htmlContent.replace(/class="accordion-content"/g, 'class="accordion-content expanded"');
            
            vscode.postMessage({
                command: 'exportPDF',
                htmlContent: expandedHtml
            });
        }
        
        // Auto-expand failed line items for quick review
        document.addEventListener('DOMContentLoaded', function() {
            const failedHeaders = document.querySelectorAll('.accordion-header.failed');
            failedHeaders.forEach((header, index) => {
                // Find the actual index from the onclick attribute
                const onClickAttr = header.getAttribute('onclick');
                const match = onClickAttr.match(/toggleAccordion\\((\\d+)\\)/);
                if (match) {
                    const actualIndex = parseInt(match[1]);
                    const content = document.getElementById('content-' + actualIndex);
                    const toggle = document.getElementById('toggle-' + actualIndex);
                    if (content && toggle) {
                        content.classList.add('expanded');
                        toggle.classList.add('expanded');
                    }
                }
            });
        });
    </script>
</body>
</html>
`;

        return html;
    }

    /**
     * Generate detailed comparison report as HTML (legacy method for backward compatibility)
     */
    generateDetailedReport(comparison: ComparisonResult, snapshot: any, actualQuote: QuoteData | undefined): string {
        // Use the enhanced report as default, passing a minimal testResult object
        const testResult = {
            targetOrg: { alias: 'unknown', username: 'unknown' },
            createdQuoteId: actualQuote?.Id || 'N/A',
            executionTime: null
        };
        return this.generateEnhancedReport(comparison, snapshot, actualQuote, testResult);
    }

    /**
     * Render bundle group with parent and child items in hierarchical accordion
     */
    private renderBundleGroup(group: HierarchicalLineItemGroup, startIndex: number): string {
        if (!group.parentItem) {
            console.error(`[ERROR] Bundle group missing parent item`);
            return '';
        }

        const parentItem = group.parentItem;
        const childItems = group.childItems;
        const bundleName = group.bundleName || parentItem.productName || parentItem.externalId;
        
        // Bundle status: show overall status with child count
        const bundleStatusClass = group.overallMatch ? 'passed' : 'failed';
        const bundleStatusText = group.overallMatch ? '✅ Passed' : '❌ Failed';
        const childCount = childItems.length;
        const passedChildCount = childItems.filter(child => child.overallMatch).length;
        
        console.log(`[DEBUG] 🎨 Rendering bundle: ${bundleName} (${childCount} children, ${passedChildCount} passed)`);
        
        let html = `
        <div class="bundle-group">
            <div class="accordion bundle-parent">
                <div class="accordion-header ${bundleStatusClass}" onclick="toggleAccordion(${startIndex})">
                    <div>
                        <span class="accordion-title">🔽 Bundle: ${this.escapeHtml(bundleName)}</span>
                        <span class="accordion-status">${bundleStatusText} (${passedChildCount}/${childCount} children passed)</span>
                    </div>
                    <div class="accordion-toggle" id="toggle-${startIndex}">▶</div>
                </div>
                <div class="accordion-content" id="content-${startIndex}">
`;

        // Render parent item details
        html += `
                    <div class="bundle-parent-details">
                        <h4>📦 Bundle Parent: ${this.escapeHtml(parentItem.productName || parentItem.externalId)}</h4>
`;

        if (parentItem.found && parentItem.fieldComparisons.length > 0) {
            html += `
                        <table class="comparison-table parent-table">
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    <th>Expected</th>
                                    <th>Actual</th>
                                    <th>Status</th>
                                    <th>Variance</th>
                                </tr>
                            </thead>
                            <tbody>
`;

            parentItem.fieldComparisons.forEach(fc => {
                const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                const statusClass = fc.match ? 'match' : 'mismatch';
                const varianceText = fc.variance !== undefined ? 
                    `${fc.variance.toFixed(2)}${fc.percentageVariance !== undefined ? ` (${fc.percentageVariance.toFixed(2)}%)` : ''}` : '-';

                html += `
                                <tr>
                                    <td><strong>${fc.fieldName}</strong></td>
                                    <td>${this.formatValue(fc.expected)}</td>
                                    <td>${this.formatValue(fc.actual)}</td>
                                    <td class="${statusClass}">${statusText}</td>
                                    <td class="variance">${varianceText}</td>
                                </tr>
`;
            });

            html += `
                            </tbody>
                        </table>
`;
        } else if (!parentItem.found) {
            html += `<p class="mismatch">Bundle parent with external ID "${parentItem.externalId}" was not found in the created quote.</p>`;
        }

        html += `
                    </div>
`;

        // Render child items with indentation
        if (childItems.length > 0) {
            html += `
                    <div class="bundle-children">
                        <h4>📋 Child Products (${childItems.length}):</h4>
`;

            childItems.forEach((childItem, childIndex) => {
                const childAccordionIndex = startIndex + 1 + childIndex;
                const childStatusClass = childItem.overallMatch ? 'passed' : 'failed';
                const childStatusText = childItem.found ? (childItem.overallMatch ? '✅ Passed' : '❌ Failed') : '❌ Not Found';
                const childProductName = childItem.productName || childItem.externalId || 'Unknown Product';

                html += `
                        <div class="accordion bundle-child">
                            <div class="accordion-header ${childStatusClass}" onclick="toggleAccordion(${childAccordionIndex})">
                                <div>
                                    <span class="accordion-title">    ├─ ${this.escapeHtml(childProductName)}</span>
                                    <span class="accordion-status">${childStatusText}</span>
                                </div>
                                <div class="accordion-toggle" id="toggle-${childAccordionIndex}">▶</div>
                            </div>
                            <div class="accordion-content" id="content-${childAccordionIndex}">
`;

                if (childItem.found && childItem.fieldComparisons.length > 0) {
                    html += `
                                <table class="comparison-table child-table">
                                    <thead>
                                        <tr>
                                            <th>Field</th>
                                            <th>Expected</th>
                                            <th>Actual</th>
                                            <th>Status</th>
                                            <th>Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
`;

                    childItem.fieldComparisons.forEach(fc => {
                        const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                        const statusClass = fc.match ? 'match' : 'mismatch';
                        const varianceText = fc.variance !== undefined ? 
                            `${fc.variance.toFixed(2)}${fc.percentageVariance !== undefined ? ` (${fc.percentageVariance.toFixed(2)}%)` : ''}` : '-';

                        html += `
                                        <tr>
                                            <td><strong>${fc.fieldName}</strong></td>
                                            <td>${this.formatValue(fc.expected)}</td>
                                            <td>${this.formatValue(fc.actual)}</td>
                                            <td class="${statusClass}">${statusText}</td>
                                            <td class="variance">${varianceText}</td>
                                        </tr>
`;
                    });

                    html += `
                                    </tbody>
                                </table>
`;
                } else if (!childItem.found) {
                    html += `<p class="mismatch">Bundle child with external ID "${childItem.externalId}" was not found in the created quote.</p>`;
                }

                html += `
                            </div>
                        </div>
`;
            });

            html += `
                    </div>
`;
        }

        html += `
                </div>
            </div>
        </div>
`;

        return html;
    }

    /**
     * Render standalone item in regular accordion
     */
    private renderStandaloneItem(item: LineItemComparison, index: number): string {
        const itemClass = item.overallMatch ? 'passed' : 'failed';
        const statusText = item.found ? (item.overallMatch ? '✅ Passed' : '❌ Failed') : '❌ Not Found';
        const productDisplayName = item.productName || item.externalId || 'Unknown Product';
        
        console.log(`[DEBUG] 🎨 Rendering standalone: ${productDisplayName}`);

        let html = `
        <div class="accordion standalone-item">
            <div class="accordion-header ${itemClass}" onclick="toggleAccordion(${index})">
                <div>
                    <span class="accordion-title">📄 ${this.escapeHtml(productDisplayName)}</span>
                    <span class="accordion-status">${statusText}</span>
                </div>
                <div class="accordion-toggle" id="toggle-${index}">▶</div>
            </div>
            <div class="accordion-content" id="content-${index}">
`;

        if (item.found && item.fieldComparisons.length > 0) {
            html += `
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Expected</th>
                            <th>Actual</th>
                            <th>Status</th>
                            <th>Variance</th>
                        </tr>
                    </thead>
                    <tbody>
`;

            item.fieldComparisons.forEach(fc => {
                const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                const statusClass = fc.match ? 'match' : 'mismatch';
                const varianceText = fc.variance !== undefined ? 
                    `${fc.variance.toFixed(2)}${fc.percentageVariance !== undefined ? ` (${fc.percentageVariance.toFixed(2)}%)` : ''}` : '-';

                html += `
                        <tr>
                            <td><strong>${fc.fieldName}</strong></td>
                            <td>${this.formatValue(fc.expected)}</td>
                            <td>${this.formatValue(fc.actual)}</td>
                            <td class="${statusClass}">${statusText}</td>
                            <td class="variance">${varianceText}</td>
                        </tr>
`;
            });

            html += `
                    </tbody>
                </table>
`;
        } else if (!item.found) {
            html += `<p class="mismatch">Product with external ID "${item.externalId}" was not found in the created quote.</p>`;
        }

        html += `
            </div>
        </div>
`;

        return html;
    }

    /**
     * Format value for display
     */
    private formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'number') {
            return value.toFixed(2);
        }
        return String(value);
    }

    /**
     * Safely escape HTML special characters and handle null/undefined values
     */
    private escapeHtml(value: any): string {
        if (value === null || value === undefined || value === '') {
            return 'Unknown';
        }
        
        try {
            const str = String(value);
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        } catch (error) {
            console.warn(`[WARN] Failed to escape HTML for value: ${value}`, error);
            return 'Unknown';
        }
    }
}
