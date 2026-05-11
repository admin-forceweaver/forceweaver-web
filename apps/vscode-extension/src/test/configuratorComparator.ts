import { ConfigurationMessage } from '../services/configuratorService';
import { ConfiguratorSnapshot } from '../snapshot/configuratorSnapshotCreator';

/**
 * Message comparison result (for negative tests)
 */
export interface MessageComparison {
    messageType: 'info' | 'warning' | 'error';
    expected: string;
    found: boolean;
    actualMessage?: string;
    match: boolean;
}

/**
 * Configurator comparison result
 */
export interface ConfiguratorComparisonResult {
    testType: 'positiveConfiguration' | 'negativeConfiguration';
    success: boolean;
    configurationMessages: ConfigurationMessage[];
    messageComparisons?: MessageComparison[];  // Only for negative tests
    summary: {
        totalMessages: number;
        errorMessages: number;
        warningMessages: number;
        infoMessages: number;
        expectedMessagesMatched?: number;  // For negative tests
        expectedMessagesTotal?: number;    // For negative tests
    };
    errorDetails?: string[];  // Human-readable error messages
}

/**
 * Comparator for configurator test results
 * Handles message validation for both positive and negative tests
 */
export class ConfiguratorComparator {
    /**
     * Compare configurator test results
     * 
     * For Positive Tests:
     * - Success if NO error-level messages present
     * - Display all messages (info, warning, error) to user
     * - Compare expected vs actual messages to detect rule changes
     * 
     * For Negative Tests:
     * - Success if expected error messages are found
     * - Verify message type and content match expectations
     */
    compare(
        snapshot: ConfiguratorSnapshot,
        messages: ConfigurationMessage[]
    ): ConfiguratorComparisonResult {
        const testType = snapshot.snapshotMetadata.testType;
        const expectedMessages = snapshot.expectedQuoteState.messages || [];

        if (testType === 'positiveConfiguration') {
            return this.comparePositiveTest(expectedMessages, messages);
        } else {
            return this.compareNegativeTest(snapshot, messages);
        }
    }

    /**
     * Compare positive test results
     * Success = No error-level messages AND messages match expected
     */
    private comparePositiveTest(
        expectedMessages: ConfigurationMessage[],
        actualMessages: ConfigurationMessage[]
    ): ConfiguratorComparisonResult {
        const errorMessages = actualMessages.filter(m => m.messageType === 'error');
        const warningMessages = actualMessages.filter(m => m.messageType === 'warning');
        const infoMessages = actualMessages.filter(m => m.messageType === 'info');

        // Check for error messages (primary failure condition)
        const hasErrors = errorMessages.length > 0;

        // Check for message count mismatches (secondary - indicates rule changes)
        const expectedErrorCount = expectedMessages.filter(m => m.messageType === 'error').length;
        const expectedWarningCount = expectedMessages.filter(m => m.messageType === 'warning').length;
        const expectedInfoCount = expectedMessages.filter(m => m.messageType === 'info').length;

        const messageCountMismatch = 
            errorMessages.length !== expectedErrorCount ||
            warningMessages.length !== expectedWarningCount ||
            infoMessages.length !== expectedInfoCount;

        const success = !hasErrors && !messageCountMismatch;

        const errorDetails: string[] = [];
        if (hasErrors) {
            errorDetails.push(`❌ Positive test failed: ${errorMessages.length} error message(s) found`);
            errorDetails.push('');
            errorDetails.push('Configuration Rule Errors:');
            errorMessages.forEach(msg => {
                errorDetails.push(`  • ${msg.message} (${msg.category})`);
            });
        } else if (messageCountMismatch) {
            errorDetails.push(`⚠️ Message count mismatch detected - Configuration rules may have changed:`);
            errorDetails.push('');
            errorDetails.push(`Expected: ${expectedErrorCount} error(s), ${expectedWarningCount} warning(s), ${expectedInfoCount} info message(s)`);
            errorDetails.push(`Actual:   ${errorMessages.length} error(s), ${warningMessages.length} warning(s), ${infoMessages.length} info message(s)`);
            errorDetails.push('');
            errorDetails.push('This may indicate:');
            errorDetails.push('  • Configuration rules were added, removed, or modified');
            errorDetails.push('  • Rule severity levels were changed');
            errorDetails.push('  • Rule conditions were updated');
        }

        return {
            testType: 'positiveConfiguration',
            success: success,
            configurationMessages: actualMessages,
            summary: {
                totalMessages: actualMessages.length,
                errorMessages: errorMessages.length,
                warningMessages: warningMessages.length,
                infoMessages: infoMessages.length
            },
            errorDetails: errorDetails.length > 0 ? errorDetails : undefined
        };
    }

    /**
     * Compare negative test results
     * Success = Expected error messages are found
     */
    private compareNegativeTest(
        snapshot: ConfiguratorSnapshot,
        messages: ConfigurationMessage[]
    ): ConfiguratorComparisonResult {
        const expectedErrors = snapshot.expectedQuoteState.expectedErrors || [];
        
        if (expectedErrors.length === 0) {
            // No expected errors defined - test fails
            return {
                testType: 'negativeConfiguration',
                success: false,
                configurationMessages: messages,
                messageComparisons: [],
                summary: {
                    totalMessages: messages.length,
                    errorMessages: messages.filter(m => m.messageType === 'error').length,
                    warningMessages: messages.filter(m => m.messageType === 'warning').length,
                    infoMessages: messages.filter(m => m.messageType === 'info').length,
                    expectedMessagesMatched: 0,
                    expectedMessagesTotal: 0
                },
                errorDetails: ['❌ Negative test has no expected errors defined']
            };
        }
        
        // Match each expected error against actual messages
        const messageComparisons: MessageComparison[] = [];
        let matchedCount = 0;
        
        for (const expectedError of expectedErrors) {
            const matchingMessages = messages.filter(msg => {
                // Check message type
                if (msg.messageType !== expectedError.messageType) {
                    return false;
                }
                
                // Check category if specified
                if (expectedError.category && msg.category !== expectedError.category) {
                    return false;
                }
                
                // Check message pattern if specified
                if (expectedError.messagePattern) {
                    const regex = new RegExp(expectedError.messagePattern, 'i');
                    if (!regex.test(msg.message)) {
                        return false;
                    }
                }
                
                return true;
            });
            
            const found = matchingMessages.length > 0;
            if (found) {
                matchedCount++;
            }
            
            messageComparisons.push({
                messageType: expectedError.messageType,
                expected: expectedError.description || expectedError.messagePattern || `${expectedError.messageType} message`,
                found: found,
                actualMessage: found ? matchingMessages[0].message : undefined,
                match: found
            });
        }
        
        // Success if all expected errors were found
        const success = matchedCount === expectedErrors.length;
        
        // Build error details
        const errorDetails: string[] = [];
        if (!success) {
            errorDetails.push(`❌ Negative test failed: ${matchedCount}/${expectedErrors.length} expected errors found`);
            errorDetails.push('');
            
            const missingErrors = messageComparisons.filter(mc => !mc.found);
            if (missingErrors.length > 0) {
                errorDetails.push('Missing expected errors:');
                missingErrors.forEach(me => {
                    errorDetails.push(`  • ${me.expected}`);
                });
            }
        }
        
        const errorMessages = messages.filter(m => m.messageType === 'error');
        const warningMessages = messages.filter(m => m.messageType === 'warning');
        const infoMessages = messages.filter(m => m.messageType === 'info');

        return {
            testType: 'negativeConfiguration',
            success: success,
            configurationMessages: messages,
            messageComparisons: messageComparisons,
            summary: {
                totalMessages: messages.length,
                errorMessages: errorMessages.length,
                warningMessages: warningMessages.length,
                infoMessages: infoMessages.length,
                expectedMessagesMatched: matchedCount,
                expectedMessagesTotal: expectedErrors.length
            },
            errorDetails: errorDetails.length > 0 ? errorDetails : undefined
        };
    }

    /**
     * Format messages for display in report
     */
    formatMessagesForReport(messages: ConfigurationMessage[]): string[] {
        const formatted: string[] = [];

        const errorMessages = messages.filter(m => m.messageType === 'error');
        const warningMessages = messages.filter(m => m.messageType === 'warning');
        const infoMessages = messages.filter(m => m.messageType === 'info');

        if (errorMessages.length > 0) {
            formatted.push('❌ Errors:');
            errorMessages.forEach(msg => {
                formatted.push(`  • ${msg.message}`);
                formatted.push(`    Category: ${msg.category}`);
                formatted.push(`    Record ID: ${msg.relatedRecordId}`);
            });
            formatted.push('');
        }

        if (warningMessages.length > 0) {
            formatted.push('⚠️ Warnings:');
            warningMessages.forEach(msg => {
                formatted.push(`  • ${msg.message}`);
                formatted.push(`    Category: ${msg.category}`);
                formatted.push(`    Record ID: ${msg.relatedRecordId}`);
            });
            formatted.push('');
        }

        if (infoMessages.length > 0) {
            formatted.push('ℹ️ Information:');
            infoMessages.forEach(msg => {
                formatted.push(`  • ${msg.message}`);
                formatted.push(`    Category: ${msg.category}`);
                formatted.push(`    Record ID: ${msg.relatedRecordId}`);
            });
            formatted.push('');
        }

        if (messages.length === 0) {
            formatted.push('✅ No configuration messages - All rules passed');
        }

        return formatted;
    }

    /**
     * Generate summary text for notification
     */
    generateSummaryText(result: ConfiguratorComparisonResult): string {
        if (result.testType === 'positiveConfiguration') {
            if (result.success) {
                if (result.summary.totalMessages === 0) {
                    return '✅ Configuration test PASSED - No issues found';
                } else {
                    const parts: string[] = [];
                    if (result.summary.warningMessages > 0) {
                        parts.push(`${result.summary.warningMessages} warning(s)`);
                    }
                    if (result.summary.infoMessages > 0) {
                        parts.push(`${result.summary.infoMessages} info message(s)`);
                    }
                    return `✅ Configuration test PASSED with ${parts.join(', ')}`;
                }
            } else {
                return `❌ Configuration test FAILED - ${result.summary.errorMessages} error(s) found`;
            }
        } else {
            // Negative test
            if (result.success) {
                const matched = result.summary.expectedMessagesMatched || 0;
                const total = result.summary.expectedMessagesTotal || 0;
                return `✅ Negative test PASSED - All ${total} expected error(s) found`;
            } else {
                const matched = result.summary.expectedMessagesMatched || 0;
                const total = result.summary.expectedMessagesTotal || 0;
                return `❌ Negative test FAILED - Only ${matched}/${total} expected error(s) found`;
            }
        }
    }
}

