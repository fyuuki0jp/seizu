# Clean Architecture Example

RISE を使ったクリーンアーキテクチャの実装例です。

## ディレクトリ構成

| ディレクトリ | 責務 |
|-------------|------|
| `domain/` | ビジネスロジック（純粋関数、型定義）|
| `use-cases/` | アプリケーションサービス（オーケストレーション）|
| `infrastructure/` | 技術的な詳細（Engine, EventStore の組み立て）|

## 実行方法

```bash
pnpm tsx examples/clean-arch/main.ts
```

## ポイント

- Domain 層は RISE への依存を最小限に（型のみ）
- Use Case 層が Engine を操作、ビジネスフローを制御
- Infrastructure 層が具体的な実装を提供
