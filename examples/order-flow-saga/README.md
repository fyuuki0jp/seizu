# Order Flow Saga Example

Saga パターンと補償トランザクションを実装したサンプルです。

## 概要

注文 → 在庫予約 → 決済 のフローを実装し、各ステップでの失敗時に補償処理を行います。

## 実行方法

```bash
pnpm tsx examples/order-flow-saga/main.ts
```

## 学べること

- Saga パターンによる分散トランザクション
- 補償トランザクション（失敗時のロールバック）
- EventBus を使った Aggregate 間連携

## ファイル構成

- `main.ts` - エントリポイント、Reactor 定義
- `order/` - 注文 Aggregate
- `inventory/` - 在庫 Aggregate
- `payment/` - 決済 Aggregate

## シナリオ

1. **成功パス**: 注文 → 在庫予約成功 → 決済成功 → 注文完了
2. **在庫不足**: 注文 → 在庫予約失敗 → 注文キャンセル
3. **決済失敗**: 注文 → 在庫予約成功 → 決済失敗 → 在庫解放 → 注文キャンセル
