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

Lily 或 Misato 是使用者在任務開始前選擇的入口;Misato 無權啟用、切換或把任務轉派給 Lily。以下動態路由只發生在使用者已選擇的 Misato / Powerpuff 管線內:

- **direct**:機械性、低認知(批次改名、重複套用同一 pattern)→ 只有已存在完整且凍結的正式 `scope.md` 時才可直接派 Bubbles;否則此 lane 不存在
- **fast**:低風險、有界、可逆(約 ≤3 檔、單一模組、不碰公開契約 / 遷移 / 安全面 / 依賴、有明確 repro 或驗收敘述)→ Blossom 寫精簡契約,Bubbles 實作自測,Buttercup 只做 diff review(跑既有 Reviewer Commands、驗 Bubbles 自測證據,不獨立實作測試);她若發現任務被錯分,以 `contract` finding 退回升級 full
- **full**:需要判斷、有歧義、跨檔耦合、碰公開契約 / 遷移 / 安全 → 完整管線 Blossom → Bubbles → Buttercup 獨立驗證

Lane 由 Misato 判定並記在 `scope.md` 的 `## Lane`,隨契約一起凍結。誤判成本不對稱:direct / fast 之間猶豫選 fast,fast / full 之間猶豫選 full。路由判例與運行紀錄集中在 `kotodute/run-log.md`:Misato 路由前讀 Lessons 判例,任務結束後追加一列(入口、lane、review cycle 數、finding 類型、事後檢討);誤判時可提議新判例,由人類修剪。這份 log 是給人類「頻繁與否」的感覺一個對照紀錄,不是自動決策機制。
- 重大商業問題(定價、包裝、價值捕獲、通路誘因、go/no-go)→ 實作前派 Holo
- 重大研發決策(架構、遷移、公開契約、安全、規模、不可逆技術選型)→ 實作前派 Motoko

Advisor 不是固定 stage。若建議會實質改變 OpenSpec,Misato 必須停下來取得人類確認;不能以「顧問說了」當成自動改需求的授權。

Buttercup 的退件依問題所有權分流,不一律丟回 Bubbles:`implementation` → Bubbles;`contract` → Blossom 重新凍結 scope;`requirement` → 使用者 / OpenSpec;`architecture-security` → Motoko advisory;`human-only` → 使用者。只有 implementation finding 算同一個實作 review cycle。

Lily 另有一條互斥的 escalation 路線。當小任務需要廣泛偵察或深層 root-cause,Lily 凍結問題並把 machine-only `kotodute/lily/state.md` 設為 `AWAITING_MOTOKO_APPROVAL`。使用者親自執行 `/motoko-takeover` 後,Motoko 只做廣域唯讀 reconnaissance,提出精確 scope,再把 state 設為 `AWAITING_MOTOKO_EXECUTION_APPROVAL`;第二次 `/motoko-execute` 才允許 scope 內實作。兩者是 sequential owner,因此可依序更新 shared project records,但 authorization 永遠只讀 `lily/state.md`,不讀 human handoff。

使用者在 `AWAITING_MOTOKO_APPROVAL` 時另有第三個選項:不核准接管,改把 Lily 凍結的問題(`kotodute/lily/task.md`)轉交 Misato 管線重跑——升級所做的凍結工作不會白費。當任務需要的是三人組的獨立驗證而非 Motoko 的單人接管時,這往往是更好的選擇;Lily 記下 `rerouted-to-misato` 後停止,自己永不派遣 Misato。

## 狀態走檔案,不走對話

Project-facing continuation集中在 shared `issues.md`、monthly journal、六欄位 `handoff.md` 與 `human-todo.md`;Misato 與 Lily 可跨入口接手。重要決定在 journal 標成 `DECISION`,舊決定不改寫。

內部 agent state仍以 `<role>-handoff.koto` 落盤。平行 child 不能直接 append shared records,而是在 disjoint run namespace寫Koto;serialized entry owner於fan-in後彙整。乾淨 child context + 客觀測試才是角色獨立性的來源。

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
  issues.md              # 唯一 durable issue register
  journals/YYYY-MM.md    # shared append-only journal;重要決定標 DECISION
  handoff.md             # 六欄位 project continuation(Misato ↔ Lily)
  human-todo.md          # shared 人類決策/命令佇列
  run-log.md             # 路由記憶,不取代 journal
  scope.md               # Blossom 正式契約
  handoff/<girl>.koto    # internal role state(Kotodute)
  advice/{holo,motoko}.md # 按需決策 memo
  runs/<task-id>/        # per-run scope + *-handoff.koto
  lily/
    task.md              # Lily bounded contract
    state.md             # Motoko approval machine state only
    motoko-scope.md      # 人類檢閱後的 takeover scope
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
