# @revcloud-blueprint/types

Shared TypeScript types for the Rev Cloud Blueprint monorepo.

## Overview

This package contains shared TypeScript interfaces and types used across the Rev Cloud Blueprint ecosystem, including the VS Code extension and future web applications.

## Types

### LicenseValidationResponse

Response interface for license validation API calls.

```typescript
interface LicenseValidationResponse {
  isValid: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  message?: string;
}
```

### LicenseState

Interface representing the current state of a user's license in the extension.

```typescript
interface LicenseState {
  isPro: boolean;
  statusMessage: string;
}
```

## Usage

```typescript
import { LicenseValidationResponse, LicenseState } from '@revcloud-blueprint/types';
```

## Development

```bash
# Build the package
npm run build

# Clean build artifacts
npm run clean
```
