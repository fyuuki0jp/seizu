import { describe, expect, test } from 'vitest';
import type { FlowArtifact } from '../src/doc/flow';
import { getMessages } from '../src/doc/i18n/index';
import { renderMarkdown } from '../src/doc/renderer/markdown';
import type { DocumentModel } from '../src/doc/types';

const en = getMessages('en');
const ja = getMessages('ja');

describe('renderMarkdown', () => {
  const model: DocumentModel = {
    title: 'Cart Specification',
    description: 'Shopping cart domain contracts',
    contracts: [
      {
        contract: {
          name: 'cart.addItem',
          accepts: [],
          description:
            'Add an item to the cart\n\nOnly possible when the cart exists and item is not duplicate.',
          typeInfo: {
            stateTypeName: 'CartState',
            inputTypeName: '{ itemId: string; qty: number; price: number }',
            errorTypeName: 'CartNotFound | DuplicateItem',
          },
          guards: [
            {
              index: 0,
              description: 'Cart must exist',
              errorTags: ['CartNotFound'],
              kind: 'inline',
              referenceName: undefined,
            },
            {
              index: 1,
              description: 'Item must not already exist in cart',
              errorTags: ['DuplicateItem'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [
            {
              index: 0,
              description: 'Item count increases by one',
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          invariants: [
            {
              index: 0,
              description: 'All item quantities are positive',
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          variableName: 'addItem',
          sourceFile: 'cart.ts',
          line: 10,
        },
        testSuite: {
          contractName: 'cart.addItem',
          tests: [
            {
              name: 'adds item to existing cart',
              classification: 'success',
              sourceFile: 'cart.test.ts',
              line: 1,
            },
            {
              name: 'returns CartNotFound when cart does not exist',
              classification: 'failure',
              sourceFile: 'cart.test.ts',
              line: 5,
            },
          ],
          sourceFile: 'cart.test.ts',
        },
      },
    ],
    scenarios: [],
    sourceFiles: ['cart.ts', 'cart.test.ts'],
  };

  test('renders a complete document with English locale', () => {
    const markdown = renderMarkdown(model, { messages: en });

    expect(markdown).toContain('# Cart Specification');
    expect(markdown).toContain('Shopping cart domain contracts');
    expect(markdown).toContain('## cart.addItem - Add an item to the cart');
    expect(markdown).toContain(
      'Only possible when the cart exists and item is not duplicate.'
    );

    expect(markdown).toContain('`CartState`');
    expect(markdown).toContain(
      '`{ itemId: string; qty: number; price: number }`'
    );
    expect(markdown).toContain('`CartNotFound | DuplicateItem`');

    expect(markdown).toContain('### Preconditions');
    expect(markdown).toContain('Cart must exist');
    expect(markdown).toContain('`CartNotFound`');

    expect(markdown).toContain('### Postconditions');
    expect(markdown).toContain('Item count increases by one');

    expect(markdown).toContain('### Invariants');
    expect(markdown).toContain('All item quantities are positive');

    expect(markdown).toContain('### Error Catalog');
    expect(markdown).toContain('Precondition #1');

    expect(markdown).toContain('### Test Cases');
    expect(markdown).toContain('adds item to existing cart');
    expect(markdown).toContain('Succeeds');
  });

  test('renders with Japanese locale', () => {
    const markdown = renderMarkdown(model, { messages: ja });

    expect(markdown).toContain('### 事前条件');
    expect(markdown).toContain('### 事後条件');
    expect(markdown).toContain('### 不変条件');
    expect(markdown).toContain('### エラー一覧');
    expect(markdown).toContain('### テストケース');
    expect(markdown).toContain('正常に処理される');
    expect(markdown).toContain('事前条件 #1');
  });

  test('renders empty postconditions as placeholder', () => {
    const minimalModel: DocumentModel = {
      title: 'Test',
      description: undefined,
      contracts: [
        {
          contract: {
            name: 'test.minimal',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            variableName: 'minimal',
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: undefined,
        },
      ],
      scenarios: [],
      sourceFiles: ['test.ts'],
    };

    const markdown = renderMarkdown(minimalModel, { messages: en });
    expect(markdown).toContain('_Not defined_');
    expect(markdown).toContain('_No tests found');
  });

  test('renders failure test result without matching pattern as generic error', () => {
    const failureModel: DocumentModel = {
      title: 'Test',
      description: undefined,
      contracts: [
        {
          contract: {
            name: 'test.failure',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            variableName: 'x',
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: {
            contractName: 'test.failure',
            tests: [
              {
                name: 'should fail on invalid input',
                classification: 'failure',
                sourceFile: 'test.ts',
                line: 1,
              },
            ],
            sourceFile: 'test.ts',
          },
        },
      ],
      scenarios: [],
      sourceFiles: ['test.ts'],
    };

    const markdown = renderMarkdown(failureModel, { messages: en });
    expect(markdown).toContain('should fail on invalid input');
    expect(markdown).toContain(en.testResult.errorGeneric);
  });

  test('renders failure test result with matching pattern as error tag', () => {
    const failureModel: DocumentModel = {
      title: 'Test',
      description: undefined,
      contracts: [
        {
          contract: {
            name: 'test.failure2',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            variableName: 'x',
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: {
            contractName: 'test.failure2',
            tests: [
              {
                name: 'returns NotFound when missing',
                classification: 'failure',
                sourceFile: 'test.ts',
                line: 1,
              },
            ],
            sourceFile: 'test.ts',
          },
        },
      ],
      scenarios: [],
      sourceFiles: ['test.ts'],
    };

    const markdown = renderMarkdown(failureModel, { messages: en });
    expect(markdown).toContain('NotFound');
  });

  test('renders with scenarios and contracts (2-tier structure)', () => {
    const tieredModel: DocumentModel = {
      title: 'Tiered',
      description: undefined,
      contracts: [
        {
          contract: {
            name: 'cart.create',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            variableName: 'createCart',
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: undefined,
        },
      ],
      scenarios: [
        {
          scenario: {
            name: 'flow.purchase',
            accepts: [],
            description: undefined,
            variableName: undefined,
            steps: [],
            sourceFile: 'test.ts',
            line: 1,
          },
          resolvedSteps: [],
        },
      ],
      sourceFiles: ['test.ts'],
    };

    const markdown = renderMarkdown(tieredModel, { messages: en });
    expect(markdown).toContain('## Scenarios');
    expect(markdown).toContain(`## ${en.contractDetail.sectionTitle}`);
  });

  test('sorts contracts by ID for deterministic output', () => {
    const sortModel: DocumentModel = {
      title: 'Test',
      description: undefined,
      contracts: [
        {
          contract: {
            name: 'z.last',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            variableName: undefined,
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: undefined,
        },
        {
          contract: {
            name: 'a.first',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            variableName: undefined,
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: undefined,
        },
      ],
      scenarios: [],
      sourceFiles: ['test.ts'],
    };

    const markdown = renderMarkdown(sortModel, { messages: en });
    const aPos = markdown.indexOf('## a.first');
    const zPos = markdown.indexOf('## z.last');
    expect(aPos).toBeLessThan(zPos);
  });

  test('renders flow hash, mermaid and summary when flow exists', () => {
    const flow: FlowArtifact = {
      ownerKind: 'contract',
      ownerName: 'flow.contract',
      hash: 'abc123',
      mermaid: ['```mermaid', 'flowchart TD', '  n1["start"]', '```'].join(
        '\n'
      ),
      summary: {
        stepCount: 3,
        branchCount: 1,
        errorPathCount: 1,
        unsupportedCount: 0,
      },
      graph: {
        nodes: [],
        edges: [],
      },
    };

    const flowModel: DocumentModel = {
      title: 'Flow Test',
      description: undefined,
      contracts: [
        {
          contract: {
            name: 'flow.contract',
            accepts: [],
            description: undefined,
            typeInfo: {
              stateTypeName: 'S',
              inputTypeName: 'I',
              errorTypeName: 'E',
            },
            guards: [],
            conditions: [],
            invariants: [],
            flow,
            variableName: undefined,
            sourceFile: 'test.ts',
            line: 1,
          },
          testSuite: undefined,
        },
      ],
      scenarios: [],
      sourceFiles: ['test.ts'],
    };

    const markdown = renderMarkdown(flowModel, { messages: en });
    expect(markdown).toContain('<!-- flow-hash: abc123 -->');
    expect(markdown).toContain('<details>');
    expect(markdown).toContain('Flow Summary');
    expect(markdown).toContain('Processing steps');
  });
});
