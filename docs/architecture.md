# Architecture

## 四層動態編排

| Layer | 角色 | 職責 |
|---|---|---|
| A | Holo / Motoko(Advisors) | Misato 路線中按需提供商業 / 研發決策 memo;不實作、不核准、不改 OpenSpec。 |
| 0 | Misato(Orchestrator / Router) | 專案層級拆任務、判複雜度、路由、fan-out / 收集 / 合併。使用者面對的 Vibe 或 Pi agent。 |
| 1 | Blossom(Planner) | 正式 Powerpuff 任務的規劃:I/O contract + 驗證項目,精確到能直接寫測試。輕量契約由 Lily 擁有。 |
| 2 | Bubbles(Executor) | 實作;看得到驗證 spec,交棒前先自測。 |
| 3 | Buttercup(Test / Review) | 從 spec 獨立實作測試 → 執行 → 回報/退回 + diff review + 越界檢查。 |

`across vs within` 是 Layer 0 與 Layer 1 的分界:Misato 決定**做什麼、邊界、順序**(跨任務);Blossom 決定**這個任務怎麼寫、怎麼證明正確**(任務內)。Misato 拆到「Blossom 能接手規劃」的粒度為止。

Vibe 以 `task` tool 派遣角色。Pi 以 project-local extension 的 `powerpuff_dispatch` tool 啟動獨立 child process,依 `.pi/powerpuff.json` 選擇每個角色的 model / thinking level,並以 Kotodute 交接。Claude Code / OpenCode 目前仍以 slash command 逐角色手動驅動。

## 路由(動態的本質)

按複雜度路由,不把所有任務硬塞同一條管線:

- 機械性、低認知(批次改名、重複套用同一 pattern)→ 路由給 Lily,由她擁有 `kotodute/lily/task.md` 輕量契約並完成 Plan / Execute / Check。只有已存在完整且凍結的正式 `scope.md` 時才可直接派 Bubbles;否則選擇 Powerpuff 管線就必須由 Blossom 建立完整正式契約
- 需要判斷、有歧義、跨檔耦合 → 完整管線 Blossom → Bubbles → Buttercup
- 重大商業問題(定價、包裝、價值捕獲、通路誘因、go/no-go)→ 實作前派 Holo
- 重大研發決策(架構、遷移、公開契約、安全、規模、不可逆技術選型)→ 實作前派 Motoko

Advisor 不是固定 stage。若建議會實質改變 OpenSpec,Misato 必須停下來取得人類確認;不能以「顧問說了」當成自動改需求的授權。

Buttercup 的退件依問題所有權分流,不一律丟回 Bubbles:`implementation` → Bubbles;`contract` → Blossom 重新凍結 scope;`requirement` → 使用者 / OpenSpec;`architecture-security` → Motoko advisory;`human-only` → 使用者。只有 implementation finding 算同一個實作 review cycle。

Lily 另有一條互斥的 escalation 路線。當小任務實際上需要廣泛系統偵察、深層 root-cause 或攻防分析,Lily 凍結問題與安全邊界、寫入 `AWAITING_MOTOKO_APPROVAL` 並停止。使用者親自執行 `/motoko-takeover` 後,Pi 先啟動 Motoko 的廣域唯讀 reconnaissance;她可讀非秘密的專案內容,但只能寫 `kotodute/lily/motoko-scope.md` 與工作紀錄。Motoko 自己根據證據提出精確的修改檔案、命令與檢查計畫,狀態轉為 `AWAITING_MOTOKO_EXECUTION_APPROVAL`。使用者檢視後親自執行 `/motoko-execute`,才會給第二枚一次性 token,讓 Motoko 在自己提出且人類確認的 scope 內直接完成實作與檢查。Lily 全程不與她並行。這不是 advisor stage,而是 owner 的 sequential replacement。

## 狀態走檔案,不走對話

子代理回傳純文字給父代理;豐富狀態(diff、測試結果、blocker)必須落盤(`<role>-handoff.koto`),任何未來的角色或 session 都能重讀。派遣 prompt 只負責指路:run 目錄在哪、worktree 在哪。乾淨的子代理 context + 客觀的測試,才是角色獨立性的來源——不是給 reviewer 換一個模型。

## 並行 fan-out 的成立條件

1. 並行單位是**不相交的任務**:`allowed_paths` 不相交才可並行;相交或有依賴 → 序列化
2. 每組跑在自己的 **git worktree**(子代理共享檔案系統,context 隔離不等於檔案隔離)
3. 收斂與合併由 Misato 負責;合併衝突退回該任務的 Blossom 重規劃;Bubbles 永不自己推 trunk
4. **per-run namespace**:`kotodute/runs/<task-id>/{scope.md,<role>-handoff.koto}`,避免並行寫壞單一檔案
5. human-todo id 加 `<task-id>` 前綴防碰撞,Misato 彙整後一次呈給人類
6. 並行上限 3-4 組,排隊消化,never unbounded

## 檔案佈局(attach 後的目標專案)

框架以 vendored clone 的形式住在專案的 `powerpuff/`,工作區是獨立的 `kotodute/`;指標全用相對路徑,升級 = `git -C powerpuff pull`(不碰工作區)。

```
powerpuff/               # 框架 clone:ppg、templates/(warm-up、協定卡、scripts、hook)
kotodute/                # 工作區(clean 模式下是巢狀 git repo)
  scope.md               # 當前任務契約(Blossom 寫,執行期凍結)
  human-todo.md          # 人類執行面(deny 檔指令佇列)
  handoff/<girl>.koto    # 角色狀態(Kotodute)
  advice/{holo,motoko}.md # 按需決策 memo
  runs/<task-id>/        # 並行模式 per-run namespace
  lily/                  # 選裝:輕量工作流狀態,含 Motoko reconnaissance 後的人類核准 scope
  archive/
.claude/commands/        # slash 入口(相對路徑薄指標)
.vibe/agents|prompts/    # Vibe 角色定義(TOML 白名單 = enforcement)
.opencode/commands/      # → symlink 到 .claude/commands
.pi/skills/ppg-*/        # Pi role skill 入口
.pi/extensions/          # powerpuff_dispatch + /ppg-run + /motoko-takeover
.pi/powerpuff.json       # Pi per-role model / thinking profiles
```

注意:scope.md 的凍結檢查在狀態目錄自身的 git 歷史上跑(`git -C kotodute log -- scope.md`),clean / tracked 兩種模式皆成立。

完整論述(含每一步驟的設計理由)保留在 `legacy/` 的三份原始文件。
