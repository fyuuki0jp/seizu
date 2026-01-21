Reactive Immutable State Engine 設計仕様書

Version: 1.0.0
Target Runtime: Node.js v20+ (LTS), Deno, Bun, Cloudflare Workers, Browsers
Philosophy: Zero-Dependencies, Web Standards, Railway Oriented Programming

1. プロジェクト概要

本ライブラリは、ビジネスロジックを「コマンド」「イベント」「状態」「リアクション」の4要素で宣言的に記述するための軽量フレームワークです。
Event Sourcing パターンを基盤とし、全ての状態変更を「事実（イベント）」の積み重ねとして表現します。

コア・フィロソフィー

Zero Dependencies & Web Standards:

npm install による外部依存を排除し、標準API（EventTarget, CustomEvent, fetch, crypto）のみで構築します。これにより、高い移植性と長期間のメンテナンス性を確保します。

Railway Oriented Programming (ROP):

ビジネスロジックの失敗を例外（throw）ではなく、値（Result型） として扱います。成功ルート（Green Path）と失敗ルート（Red Path）を明確に分離し、型安全にエラーハンドリングを行います。

Functional Core, Imperative Shell:

ユーザー実装領域（Core）: ビジネスロジック（Decider, Reducer）は、副作用を持たない純粋関数として記述します。これにより、テスト容易性とAIへのコンテキスト注入のしやすさを最大化します。

ライブラリ領域（Shell）: DBアクセスや外部APIコールなどの副作用は、エンジンのクラス（Engine, EventStore）内に隠蔽・管理します。

AI-Ready Context:

イベント履歴から状態を再構築（Rehydrate）する仕組みは、LLM（大規模言語モデル）へのコンテキスト注入と極めて相性が良く、AIエージェントの記憶や思考プロセスの基盤として機能します。

2. アーキテクチャ

システムは、入力（Command）を受け取り、現在の状態（State）に基づいて判断（Decide）を下し、結果（Event）を保存・発行するサイクルで動作します。

graph TD
    User[Client / API / AI Agent] -->|1. Command| Engine
    
    subgraph Core [Reactive Engine (Pure TS)]
        direction TB
        
        Validator[Type Guard / Validator]
        Decider[Decider Function (Pure)]
        Reducer[Reducer Function (Pure)]
        EventStore[Event Store Interface]
        Bus[EventTarget (Pub/Sub)]
        
        %% Railway Flow
        User --> Validator
        Validator -->|Result.Ok| Decider
        Validator -->|Result.Err| Failure[Return Error Result]
        
        EventStore -->|2. Load History| Reducer
        Reducer -->|3. Rehydrated State| Decider
        
        Decider -->|Result.Ok (Events)| Commit[Commit Logic]
        Decider -->|Result.Err (DomainError)| Failure
        
        Commit -->|Success| EventStore
        Commit -->|Concurrency Error| Retry[Retry / Fail]
        
        EventStore -->|4. Dispatch| Bus
        Bus -->|5. Notify| Reactor[Reaction / Side Effects]
    end


3. 責務の境界 (Responsibility Boundaries)

本フレームワークは「制御の反転 (IoC)」を提供します。ライブラリは**「いつ、何を呼ぶか」を管理し、ユーザーは「呼ばれたときに何をするか」**を記述します。

カテゴリ

ライブラリの責務 (Framework - OOP)

ユーザーの責務 (Developer - FP)

データ定義

DomainEvent 基底クラス、Result 型定義の提供。

コマンド、イベント、状態（State）、エラーの具体的な型定義 (Schemas/Types)。

処理フロー

コマンド受信 → 履歴取得 → 状態復元 → ロジック実行 → 保存 → 発行 のオーケストレーション。

Decider (判断ロジック) と Reducer (状態遷移ロジック) の実装。



※これらは純粋関数である必要がある。

永続化

EventStore インターフェースの定義と、インメモリ実装の提供。楽観的ロックの制御。

本番用 EventStore の実装（Drizzle, Firestore等を利用したアダプタの作成）。

副作用

イベント発行 (dispatchEvent) の仕組みと、リスナー登録インターフェースの提供。

Reactor (副作用) の実装。外部APIコール、メール送信、AIエージェントの呼び出しなど。

安全性

例外 (throw) と失敗値 (Result.Err) の境界制御。システムエラーの伝播。

入力値のバリデーション（型ガード）、ビジネスルールのチェック。

AI統合

履歴からのコンテキスト（State）再構築の保証。

AIへのプロンプト構築、AI応答のイベント化、Tool Use結果のフィードバックループ。

4. エラーハンドリング戦略

堅牢性を高めるため、エラーの種類に応じて処理方針を厳密に区分します。

エラー種別

内容

扱い方

表現方法

エンジンの挙動

復帰可能なエラー



(Recoverable)

バリデーション違反、在庫切れ、権限不足など、ビジネス上の拒否。

値として扱う

Result.Err<DomainError>

DB更新をスキップし、呼び出し元へエラー値を返す。

復帰不可能なエラー



(Unrecoverable)

DB接続断、メモリ不足、コードのバグ、スキーマ定義ミスなどのシステム異常。

例外として扱う

throw Error

エンジン内でキャッチせず、アプリケーション層へ伝播させる（500 Error）。

5. コア・ユーティリティ (Zero-Deps)

外部ライブラリを使わず、以下のユーティリティをライブラリ内部で提供します。

5.1 Result型 (Railway Oriented基盤)

// lib/result.ts

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// コンストラクタ関数
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// パイプライン合成用ヘルパー
export const map = <T, U, E>(
  res: Result<T, E>, 
  fn: (v: T) => U
): Result<U, E> => res.ok ? ok(fn(res.value)) : res;

export const flatMap = <T, U, E>(
  res: Result<T, E>, 
  fn: (v: T) => Result<U, E>
): Result<U, E> => res.ok ? fn(res.value) : res;

// エラー判定ガード
export const isErr = <T, E>(res: Result<T, E>): res is { ok: false; error: E } => !res.ok;
export const isOk = <T, E>(res: Result<T, E>): res is { ok: true; value: T } => res.ok;


5.2 ドメインイベント (Web Standards)

Node.js v20+ では CustomEvent がグローバルで利用可能です。これを型安全にラップします。

// lib/events.ts

export interface EventMeta {
  id?: string;
  timestamp?: Date;
  [key: string]: any;
}

// 型引数でペイロードの型を強制するラッパークラス
export class DomainEvent<Type extends string, Data> extends CustomEvent<Data> {
  public readonly meta: EventMeta;

  constructor(type: Type, data: Data, meta: EventMeta = {}) {
    super(type, { detail: data });
    this.meta = { ...meta, timestamp: meta.timestamp || new Date() };
  }

  // 型推論ヘルパー（ランタイムでは使用しない）
  readonly _type!: Type;
  
  get data(): Data {
    return this.detail;
  }
}


6. アプリケーション層の実装仕様 (User Code)

ユーザー（開発者）は以下の要素を実装します。ここではOOPではなく、型定義と純粋関数を使用します。

6.1 イベントとコマンドの定義

// domain/cart/types.ts
import { DomainEvent } from '../../lib/events';

// --- イベント定義 ---
export class CartCreated extends DomainEvent<'CartCreated', { cartId: string, userId: string }> {}
export class ItemAdded extends DomainEvent<'ItemAdded', { cartId: string, itemId: string, quantity: number }> {}

// Union型でまとめる
export type CartEvent = CartCreated | ItemAdded;

// --- コマンド定義（POJO） ---
export type CreateCartCommand = { type: 'CreateCart', data: { cartId: string, userId: string } };
export type AddItemCommand = { type: 'AddItem', data: { cartId: string, itemId: string, quantity: number } };

// --- バリデーション（型ガード） ---
export const isAddItemCommand = (cmd: any): cmd is AddItemCommand => {
  return cmd?.type === 'AddItem' && typeof cmd.data?.quantity === 'number' && cmd.data.quantity > 0;
};


6.2 状態 (State) と Reducer (Pure Function)

Reducer は過去のイベントから現在の状態を計算する純粋関数です。失敗することはありません。状態はプレーンなオブジェクト(POJO)として定義します。

// domain/cart/state.ts
export type CartState = {
  exists: boolean;
  items: Record<string, number>;
};

export const initialState: CartState = { exists: false, items: {} };

export const reducer = (state: CartState, event: CartEvent): CartState => {
  switch (event.type) {
    case 'CartCreated':
      return { ...state, exists: true };
    case 'ItemAdded':
      const { itemId, quantity } = event.data;
      return {
        ...state,
        items: { ...state.items, [itemId]: (state.items[itemId] || 0) + quantity }
      };
    default:
      return state;
  }
};


6.3 ビジネスロジック (Decider - Pure Function)

Decider はコマンドと状態を受け取り、結果（成功時のイベント配列 または 失敗時のエラー） を返す純粋関数です。

// domain/cart/decider.ts
import { Result, ok, err } from '../../lib/result';
import { CartState, CartEvent, AddItemCommand, ItemAdded } from './types';

// ドメインエラー定義
export class CartNotFoundError extends Error { readonly _tag = 'CartNotFoundError'; }

export const decideAddItem = (
  command: AddItemCommand,
  state: CartState
): Result<CartEvent[], CartNotFoundError> => {
  // バリデーション: カートが存在しなければエラー（復帰可能）
  if (!state.exists) {
    return err(new CartNotFoundError(`Cart ${command.data.cartId} not found`));
  }

  // 成功: イベント生成
  return ok([
    new ItemAdded('ItemAdded', {
      cartId: command.data.cartId,
      itemId: command.data.itemId,
      quantity: command.data.quantity
    })
  ]);
};


7. エンジン内部の実装仕様

7.1 EventStore インターフェース

永続化層の抽象化です。インメモリ、PostgreSQL (Drizzle)、DynamoDBなどで実装可能です。

// core/event-store.ts
import { DomainEvent } from '../lib/events';

export interface EventStore {
  // 特定ストリームのイベント読み込み
  readStream(streamId: string): Promise<DomainEvent<any, any>[]>;
  
  // イベント追記（楽観的ロックのチェックを含む）
  appendToStream(
    streamId: string, 
    events: DomainEvent<any, any>[], 
    expectedVersion: number
  ): Promise<void>;
}


7.2 Engine クラス (OOP Shell)

全体のオーケストレーターです。EventTarget を継承し、イベントバスとしても機能します。

// core/engine.ts
import { Result, ok, err } from '../lib/result';
import { EventStore } from './event-store';

export class Engine extends EventTarget {
  constructor(
    private eventStore: EventStore,
    // コマンドTypeから各ハンドラを解決するマップ
    private registry: {
      getReducer: (type: string) => (state: any, event: any) => any;
      getDecider: (type: string) => (cmd: any, state: any) => Result<any[], any>;
      getInitialState: (type: string) => any;
    }
  ) {
    super();
  }

  /**
   * コマンドを実行するメインフロー
   */
  async execute(command: { type: string; streamId: string; [key: string]: any }): Promise<Result<any[], Error>> {
    try {
      // 1. Load History
      // システムエラー（DBダウン等）はここで throw され、呼び出し元へ伝播する
      const events = await this.eventStore.readStream(command.streamId);
      
      // 2. Rehydrate State
      const reducer = this.registry.getReducer(command.type);
      const initialState = this.registry.getInitialState(command.type);
      const state = events.reduce(reducer, initialState);

      // 3. Decide (Business Logic)
      // 純粋関数による判定。エラーなら Result.Err が返る
      const decider = this.registry.getDecider(command.type);
      const decision = decider(command, state);

      // [ROP] 失敗ルート：DBへの書き込みを行わずエラーを返す
      if (!decision.ok) {
        return decision; 
      }

      const newEvents = decision.value;

      // 4. Commit to Storage
      // 楽観的ロックエラー等はここで発生する可能性がある
      await this.eventStore.appendToStream(command.streamId, newEvents, events.length);

      // 5. Reactive Dispatch (Side Effects)
      // 購読者（Reactions / AI Agents）へ通知
      for (const event of newEvents) {
        this.dispatchEvent(event);
      }

      // [ROP] 成功ルート
      return ok(newEvents);

    } catch (e: any) {
      // 想定外のエラー（Unrecoverable）は再スロー
      throw e; 
    }
  }
}


8. AIエージェント統合のユースケース

本エンジンは、AIエージェントの動作基盤としても機能します。

Context Injection:

readStream -> Reducer で得られた State（会話履歴や現在の状況）をプロンプトに埋め込むことで、ステートレスなLLMに一貫性を持たせます。

Chain of Thought Archiving:

AIの「思考」や「ツール使用要求」をイベント（AgentThought, ToolRequested）として EventStore に保存することで、透明性の高いAI動作ログを実現します。

Reactive Loop:

Engine.dispatchEvent をトリガーに、次のAIアクション（Reactor）を起動し、自律的なエージェントループを構築します。

9. ディレクトリ構成案

/
├── src/
│   ├── core/              # フレームワークの中核
│   │   ├── engine.ts      # Engineクラス
│   │   ├── event-store.ts # インターフェース
│   │   └── in-memory-store.ts # 開発用ストア
│   ├── lib/               # Zero-deps ユーティリティ
│   │   ├── result.ts      # Result型
│   │   └── events.ts      # DomainEventラッパー
│   ├── domain/            # ユーザーコード（ビジネスロジック）
│   │   ├── cart/
│   │   │   ├── types.ts   # イベント・コマンド定義
│   │   │   ├── state.ts   # Reducer (FP)
│   │   │   └── decider.ts # Decider (FP)
│   │   └── agent/         # AIエージェント関連
│   └── main.ts            # エントリーポイント（Hono/Fastifyとの結合）
├── test/
└── package.json
