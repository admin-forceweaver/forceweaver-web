---
title: I Built an Open-Source Agent Skill Kit for Salesforce Revenue Cloud (Here's Why)
date: '2026-05-16'
author: Rohit
excerpt: >-
  An open-source Cursor agent skill kit that teaches AI agents to trace Revenue
  Cloud pricing lineage—from object fields through context mappings, expression
  sets, decision tables, and procedure plans.
category: Revenue Cloud
tags:
  - Salesforce
  - Revenue Cloud
  - Agent Skills
  - Pricing
  - Diagnostics
  - Open Source
featuredImage: feature-Image.png
status: published
---
If you work on Salesforce Revenue Cloud, you already know the hardest part is rarely "How does this field get set with a price?"  
The hardest part is proving where that number came from.

You're often tracing a single field across:

- object metadata
- context definitions and mappings
- expression set versions
- pricing elements
- decision tables
- procedure plans
- Apex hooks

To make that easier (and repeatable), I created an open-source skill kit called **Salesforce Revenue Cloud Skills**.

👉 GitHub: [salesforce-revenue-cloud-skills](https://github.com/arohitu/salesforce-revenue-cloud-skills)

## What We Created

We created a multi-skill repository:

- **Repo:** [salesforce-revenue-cloud-skills](https://github.com/arohitu/salesforce-revenue-cloud-skills)
- **First skill:** `revenue-cloud-pricing-diagnostics`

This first skill teaches an AI coding agent how to dissect Revenue Cloud pricing logic in a structured way.

It is designed for Revenue Cloud architects, developers, and consultants who need to answer questions like:

- "How is this Quote field populated?"
- "Which expression set step is setting this value?"
- "Which decision table row is being matched at runtime?"
- "Why does UI pricing work but API pricing fail?"

## Why This Skill Is Useful

Revenue Cloud pricing logic is distributed across metadata and runtime APIs.  
Without a guided method, troubleshooting becomes ad-hoc and slow.

This skill provides a default workflow so agents can consistently trace pricing lineage from end to end, instead of guessing.

It also explicitly separates Revenue Cloud from CPQ assumptions:

- ✅ Revenue Cloud core model (context-driven)
- ❌ Steelbrick CPQ (`SBQQ__*`) model

## When You Should Use This Skill

Use `revenue-cloud-pricing-diagnostics` when you need to:

- trace how a field is populated
- understand pricing impact on Quote/Order/Line fields
- debug expression set behavior
- analyze context mapping hydration/persistence issues
- inspect decision table lookup mismatches
- investigate procedure plan sequence and Apex pre-hook dependencies
- compare UI vs API pricing outcomes

## How It Works

The skill uses a practical metadata-first and runtime-verified approach:

1. Find the object field metadata in SFDX source.
2. Map that field to context attributes and tags.
3. Follow context mappings for hydration/persistence.
4. Trace expression set variables and steps.
5. Inspect pricing elements and decision tables.
6. Validate runtime decision-table behavior using the Business Rules Engine Connect API.
7. Correlate with procedure-plan sequence and Apex hooks.
8. Produce a structured lineage report with evidence and failure points.

## What's Included in the Skill

Inside the skill folder you'll find:

- `SKILL.md` (core instructions and default workflow)
- references for:
  - architecture
  - field-lineage workflow
  - procedure plans
  - pricing elements and decision tables
  - troubleshooting
- eval scenarios for testing skill quality

This keeps it maintainable and allows more skills to be added over time.

## How To Use It

After installing the skill in your project skill directory, ask natural-language prompts like:

- "Help me understand how `Quote.RCA_TotalMRRAmount__c` is populated."
- "Trace this pricing field from object metadata through context mapping and expression sets."
- "Why does Place Sales Transaction return `DUPLICATE_VALUE_FOUND_IN_LOOKUP` while UI pricing succeeds?"
- "Which procedure plan section writes this final total?"

The agent is guided to return a concise lineage report with technical evidence.

## Decision Table Debugging (Big Win)

A major addition is practical guidance for real decision-table runtime checks:

- query `DecisionTable` records (Id, DeveloperName, Status, SourceObject, etc.)
- locate dataset links
- invoke lookup via Connect API:

  `/services/data/vXX.X/connect/business-rules/decision-table/lookup/{decisionTableId}`

- compare runtime condition inputs against expression-set expectations

This helps bridge the gap between "metadata says this should work" and "runtime did something else."

## Who This Is For

- Salesforce Revenue Cloud architects
- Revenue Cloud implementation consultants
- Salesforce developers and technical leads
- Teams standardizing pricing diagnostics across orgs

## Open Source and Contributions

This project is open source (MIT licensed), and the goal is to grow it into a broader Revenue Cloud skills library.

If you've built repeatable diagnostics for renewals, assetization, subscription pricing, or lifecycle issues, contributions are welcome.

👉 Repo: [salesforce-revenue-cloud-skills](https://github.com/arohitu/salesforce-revenue-cloud-skills)
