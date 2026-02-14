---
title: kata-cli Contract Specification
description: Auto-generated contract documentation
---

# kata-cli Contract Specification

> kata-cli domain logic contracts — self-documenting dogfooding example

## Scenarios

> Business workflows composed from multiple contract operations.

### doc.generate

> `doc.generate`

| # | Operation | Input |
|---|------|------|
| 1 | `doc.parse` | sourceFiles: input.sourceFiles |
| 2 | `doc.filter` | filterIds: input.filterIds,
    } as FilterInput |
| 3 | `doc.link` | } as Record<string, never> |
| 4 | `doc.analyze` | enabled: input.coverageEnabled |
| 5 | `doc.render` | } as Record<string, never> |

### render.markdown

> `render.markdown`

| # | Operation | Input |
|---|------|------|

## Table of Contents

- **doc.analyze** （Preconditions: 0, Tests: 2）
- **doc.filter** （Preconditions: 0, Tests: 3）
- **doc.link** （Preconditions: 0, Tests: 1）
- **doc.parse** （Preconditions: 1, Tests: 5）
- **doc.render** （Preconditions: 0, Tests: 2）
- **render.contractDetail** （Preconditions: 0, Tests: 3）
- **render.contractHeader** （Preconditions: 1, Tests: 2）
- **render.coverageSummary** （Preconditions: 0, Tests: 1）
- **render.errorCatalog** （Preconditions: 0, Tests: 2）
- **render.invariants** （Preconditions: 0, Tests: 1）
- **render.postconditions** （Preconditions: 0, Tests: 1）
- **render.preconditions** （Preconditions: 0, Tests: 2）
- **render.scenarioSection** （Preconditions: 1, Tests: 2）
- **render.testExamples** （Preconditions: 0, Tests: 2）
- **render.title** （Preconditions: 1, Tests: 4）
- **render.toc** （Preconditions: 1, Tests: 2）
- **report.replay** （Preconditions: 1, Tests: 3）
- **report.summary** （Preconditions: 1, Tests: 4）

---

## Contract Details

---

## doc.analyze

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `AnalyzeInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | generates coverage report when enabled | Succeeds |
| 2 | skips coverage when disabled | Succeeds |

---

## doc.filter

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `FilterInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | filters contracts by IDs | Succeeds |
| 2 | passes all contracts when no filter | Succeeds |
| 3 | returns empty when filter matches nothing | Succeeds |

---

## doc.link

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `Record<string, never>` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | links contracts to tests | Succeeds |

---

## doc.parse

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `ParseInput` |
| Error | `PipelineError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `NoSourceFiles` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoSourceFiles` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | parses contracts from source files | Succeeds |
| 2 | parses test suites from source files | Succeeds |
| 3 | rejects empty source files | Returns error |
| 4 | preserves title and messages | Succeeds |
| 5 | exposes contract metadata | - |

---

## doc.render

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `Record<string, never>` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders markdown from linked state | Succeeds |
| 2 | renders empty markdown for empty state | Succeeds |

---

## render.contractDetail

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `ContractDetailInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders all contract sections | Succeeds |
| 2 | adds contract detail header when scenarios exist | Succeeds |
| 3 | handles empty contracts | Succeeds |

---

## render.contractHeader

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `ContractHeaderInput` |
| Error | `RenderError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `TitleEmpty` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `TitleEmpty` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders contract header | Succeeds |
| 2 | rejects empty contract id | Returns error |

---

## render.coverageSummary

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `CoverageSectionInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders coverage summary | Succeeds |

---

## render.errorCatalog

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `ErrorCatalogInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders error catalog | Succeeds |
| 2 | renders empty error catalog | Succeeds |

---

## render.invariants

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `InvariantsInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders invariants | Succeeds |

---

## render.postconditions

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `PostconditionsInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders postconditions | Succeeds |

---

## render.preconditions

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `PreconditionsInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders preconditions | Succeeds |
| 2 | renders empty preconditions | Succeeds |

---

## render.scenarioSection

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `ScenarioSectionInput` |
| Error | `RenderError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `NoScenarios` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoScenarios` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders scenario section | Succeeds |
| 2 | rejects empty scenarios | Returns error |

---

## render.testExamples

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `TestExamplesInput` |
| Error | `never` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders test examples | Succeeds |
| 2 | renders no tests message | Succeeds |

---

## render.title

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `TitleInput` |
| Error | `RenderError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `TitleEmpty` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `TitleEmpty` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders title with description | Succeeds |
| 2 | renders title without description | Succeeds |
| 3 | rejects empty title | Returns error |
| 4 | preserves existing lines | Succeeds |

---

## render.toc

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `TocInput` |
| Error | `RenderError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `InsufficientContracts` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `InsufficientContracts` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders TOC for 2+ contracts | Succeeds |
| 2 | rejects fewer than 2 contracts | Returns error |

---

## report.replay

| Property | Type |
|------|-----|
| State | `string` |
| Input | `ReporterInput` |
| Error | `ReporterError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `NoFailures` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoFailures` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | formats failed result | Succeeds |
| 2 | rejects successful result | Returns error |
| 3 | exposes contract metadata | - |

---

## report.summary

| Property | Type |
|------|-----|
| State | `string` |
| Input | `ReporterInput` |
| Error | `ReporterError` |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | _No description (add a TSDoc comment)_ | `NoResults` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | _No description (add a TSDoc comment)_ |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoResults` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | formats passing result | Succeeds |
| 2 | formats result with multiple contracts | Succeeds |
| 3 | rejects empty results | Returns error |
| 4 | exposes contract metadata | - |

---

## Test Coverage

> Test coverage status for each contract.

| Contract | Tests | Error Tag Coverage | Status |
|----------|-------|---------------|--------|
| doc.parse | 5 | 0/1 | Tested |
| doc.filter | 3 | - | Tested |
| doc.link | 1 | - | Tested |
| doc.analyze | 2 | - | Tested |
| doc.render | 2 | - | Tested |
| render.title | 4 | 0/1 | Tested |
| render.toc | 2 | 0/1 | Tested |
| render.scenarioSection | 2 | 0/1 | Tested |
| render.contractHeader | 2 | 0/1 | Tested |
| render.preconditions | 2 | - | Tested |
| render.postconditions | 1 | - | Tested |
| render.invariants | 1 | - | Tested |
| render.errorCatalog | 2 | - | Tested |
| render.testExamples | 2 | - | Tested |
| render.coverageSummary | 1 | - | Tested |
| render.contractDetail | 3 | - | Tested |
| report.summary | 4 | 0/1 | Tested |
| report.replay | 3 | 0/1 | Tested |

Contract coverage: 18/18 (100.0%)
Error tag coverage: 0/7 (0.0%)
