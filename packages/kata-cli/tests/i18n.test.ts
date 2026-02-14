import { describe, expect, test } from 'vitest';
import { getMessages } from '../src/doc/i18n/index';
import type { Messages } from '../src/doc/i18n/types';

describe('i18n', () => {
  function assertAllKeysPresent(messages: Messages) {
    // Top-level keys
    expect(messages.noDefined).toBeTruthy();
    expect(messages.noDescription).toBeTruthy();

    // toc
    expect(messages.toc.title).toBeTruthy();
    expect(typeof messages.toc.meta).toBe('function');

    // typeTable
    expect(messages.typeTable.headerItem).toBeTruthy();
    expect(messages.typeTable.headerType).toBeTruthy();
    expect(messages.typeTable.state).toBeTruthy();
    expect(messages.typeTable.input).toBeTruthy();
    expect(messages.typeTable.error).toBeTruthy();

    // preconditions
    expect(messages.preconditions.title).toBeTruthy();
    expect(messages.preconditions.description).toBeTruthy();
    expect(messages.preconditions.columnCondition).toBeTruthy();
    expect(messages.preconditions.columnError).toBeTruthy();

    // postconditions
    expect(messages.postconditions.title).toBeTruthy();
    expect(messages.postconditions.description).toBeTruthy();
    expect(messages.postconditions.columnCondition).toBeTruthy();

    // invariants
    expect(messages.invariants.title).toBeTruthy();
    expect(messages.invariants.description).toBeTruthy();
    expect(messages.invariants.columnCondition).toBeTruthy();

    // errorCatalog
    expect(messages.errorCatalog.title).toBeTruthy();
    expect(messages.errorCatalog.noErrors).toBeTruthy();
    expect(messages.errorCatalog.columnTag).toBeTruthy();
    expect(messages.errorCatalog.columnSource).toBeTruthy();
    expect(typeof messages.errorCatalog.sourceRef).toBe('function');

    // testExamples
    expect(messages.testExamples.title).toBeTruthy();
    expect(messages.testExamples.description).toBeTruthy();
    expect(messages.testExamples.noTests).toBeTruthy();
    expect(messages.testExamples.columnScenario).toBeTruthy();
    expect(messages.testExamples.columnExpected).toBeTruthy();

    // testResult
    expect(messages.testResult.success).toBeTruthy();
    expect(typeof messages.testResult.errorTag).toBe('function');
    expect(messages.testResult.errorGeneric).toBeTruthy();

    // coverage
    expect(messages.coverage.title).toBeTruthy();
    expect(messages.coverage.description).toBeTruthy();
    expect(messages.coverage.columnContract).toBeTruthy();
    expect(messages.coverage.columnTests).toBeTruthy();
    expect(messages.coverage.columnErrorCoverage).toBeTruthy();
    expect(messages.coverage.columnStatus).toBeTruthy();
    expect(messages.coverage.tested).toBeTruthy();
    expect(messages.coverage.untested).toBeTruthy();
    expect(typeof messages.coverage.summaryContract).toBe('function');
    expect(typeof messages.coverage.summaryErrorTag).toBe('function');

    // flow
    expect(messages.flow.detailsSummary).toBeTruthy();
    expect(messages.flow.summaryTitle).toBeTruthy();
    expect(messages.flow.summaryMetric).toBeTruthy();
    expect(messages.flow.summaryValue).toBeTruthy();
    expect(messages.flow.stepCount).toBeTruthy();
    expect(messages.flow.branchCount).toBeTruthy();
    expect(messages.flow.errorPathCount).toBeTruthy();
    expect(messages.flow.unsupportedCount).toBeTruthy();
    expect(typeof messages.flow.unsupportedWarning).toBe('function');
  }

  test('English locale has all keys', () => {
    assertAllKeysPresent(getMessages('en'));
  });

  test('Japanese locale has all keys', () => {
    assertAllKeysPresent(getMessages('ja'));
  });

  test('defaults to English', () => {
    const messages = getMessages();
    expect(messages.preconditions.title).toBe('Preconditions');
  });

  test('parameterized functions return correct format', () => {
    const en = getMessages('en');
    const ja = getMessages('ja');

    expect(en.toc.meta(2, 3)).toContain('2');
    expect(en.toc.meta(2, 3)).toContain('3');
    expect(ja.toc.meta(2, 3)).toContain('2');

    expect(en.errorCatalog.sourceRef(1)).toContain('1');
    expect(ja.errorCatalog.sourceRef(1)).toContain('1');

    expect(en.testResult.errorTag('NotFound')).toContain('NotFound');
    expect(ja.testResult.errorTag('NotFound')).toContain('NotFound');

    expect(en.coverage.summaryContract(5, 10, 50)).toContain('50');
    expect(ja.coverage.summaryContract(5, 10, 50)).toContain('50');
  });
});
