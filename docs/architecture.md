# Architecture

## 四層動態編排(Vibe-native 完整形)

| Layer | 角色 | 職責 |
|---|---|---|
| 0 | Misato(Orchestrator / Router) | 專案層級拆任務、判複雜度、路由、fan-out / 收集 / 合併。使用者面對的 Vibe agent。 |
| 1 | Blossom(Planner) | 單一任務的規劃:I/O contract + 驗證項目,精確到能直接寫測試。 |
| 2 | Bubbles(Executor) | 實作;看得到驗證 spec,交棒前先自測。 |
| 3 | Buttercup(Test / Review) | 從 spec 獨立實作測試 → 執行 → 回報/退回 + diff review + 越界檢查。 |

`across vs within` 是 Layer 0 與 Layer 1 的分界:Misato 決定**做什麼、邊界、順序**(跨任務);Blossom 決定**這個任務怎麼寫、怎麼證明正確**(任務內)。Misato 拆到「Blossom 能接手規劃」的粒度為止。

沒有 Vibe 時(Claude Code / OpenCode / pi),三人組以 slash command / skill 形式逐角色手動驅動,同樣的檔案協定;Misato 命令仍可作為平行介面,但子代理派遣只在 Vibe 內可用。

## 路由(動態的本質)

按複雜度路由,不把所有任務硬塞同一條管線:

- 機械性、低認知(批次改名、重複套用同一 pattern)→ 跳過 Blossom 細部規劃,直接派 Bubbles 帶薄 spec;或路由給輕量的 Lily 工作流
- 需要判斷、有歧義、跨檔耦合 → 完整管線 Blossom → Bubbles → Buttercup

## 狀態走檔案,不走對話

子代理回傳純文字給父代理;豐富狀態(diff、測試結果、blocker)必須落盤(`<role>-handoff.koto`),任何未來的角色或 session 都能重讀。派遣 prompt 只負責指路:run 目錄在哪、worktree 在哪。乾淨的子代理 context + 客觀的測試,才是角色獨立性的來源——不是給 reviewer 換一個模型。

## 並行 fan-out 的成立條件

1. 並行單位是**不相交的任務**:`allowed_paths` 不相交才可並行;相交或有依賴 → 序列化
2. 每組跑在自己的 **git worktree**(子代理共享檔案系統,context 隔離不等於檔案隔離)
3. 收斂與合併由 Misato 負責;合併衝突退回該任務的 Blossom 重規劃;Bubbles 永不自己推 trunk
4. **per-run namespace**:`powerpuff/runs/<task-id>/{scope.md,<role>-handoff.koto}`,避免並行寫壞單一檔案
5. human-todo id 加 `<task-id>` 前綴防碰撞,Misato 彙整後一次呈給人類
6. 並行上限 3-4 組,排隊消化,never unbounded

## 檔案佈局(attach 後的目標專案)

```
powerpuff/
  kotodute.md          # handoff 格式協定卡
  human-todo.md        # 人類執行面(deny 檔指令佇列)
  task/scope.md        # 當前任務契約(Blossom 寫,執行期凍結)
  scripts/             # koto-check.py、powerpuff-guard.sh(受保護)
  <role>/warm-up.md    # 角色定義
  <role>/handoff.koto  # 角色狀態(Kotodute)
  runs/<task-id>/      # 並行模式 per-run namespace
  archive/
lily/                  # 選裝:輕量工作流(task/work-log/handoff/human-todo)
.claude/commands/      # slash 入口(薄指標)
.vibe/agents|prompts/  # Vibe 角色定義(TOML 白名單 = enforcement)
.opencode/commands/    # → symlink 到 .claude/commands
.pi/skills/ppg-*/      # pi skill 入口
```

完整論述(含每一步驟的設計理由)保留在 `legacy/` 的三份原始文件。
