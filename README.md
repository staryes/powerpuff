# Powerpuff

Multi-agent coding workflow,vendor 到任何開發 repo。角色分工 + 檔案為媒介的狀態傳遞(Kotodute)+ 三檔位權限模型,支援 Claude Code / Vibe / OpenCode / pi。

## Quick Start

```bash
cd /path/to/your/project
git clone <this-repo> powerpuff      # 框架 vendor 進專案(名稱必須是 powerpuff)
./powerpuff/ppg attach               # 互動式 TUI:選 harness、選 girls、選模式
```

attach 後的專案佈局:

```
your-project/
├── powerpuff/      # 框架 clone(更新:git -C powerpuff pull,不碰工作區)
├── kotodute/       # 工作區:scope.md、human-todo.md、handoff/*.koto、advice/、runs/、lily/
└── .claude/ 等     # attach 生成的入口指標(相對路徑指向 powerpuff/)
```

非互動:

```bash
./powerpuff/ppg attach --harness claude,vibe --girls blossom,bubbles,buttercup --mode clean --yes
./powerpuff/ppg doctor    # 檢查安裝狀態、驗證 handoff
./powerpuff/ppg detach    # 移除工作區與指標(框架 clone 保留)
```

## The Girls

| Girl | 角色 | 職責 |
|---|---|---|
| Misato | Orchestrator | 拆任務、判複雜度、路由、fan-out/合併(Vibe 經 `task`;Pi 經獨立 child process) |
| Blossom | Planner | 定義 scope:I/O contract + 驗證項目,精確到能直接寫測試 |
| Bubbles | Executor | 在 scope 邊界內實作,對驗證項目自測後交棒 |
| Buttercup | Reviewer | 從 spec 獨立實作測試、執行、回報;只揭發不修補 |
| Lily | Lightweight | 小修小補的輕量三階段;問題過大時停下並請使用者核准 Motoko 接管 |
| Holo | Business Advisor | 只在重大商業問題被 Misato 叫用;分析價值捕獲、誘因、單位經濟與下檔風險 |
| Motoko | R&D / Tactical Specialist | 對 Misato 提供研發決策;經使用者核准後可從 Lily 手上接管複雜實戰任務 |

選 Misato 會自動帶入三人組。Pi 安裝會另外帶入 Holo / Motoko;選 Lily 也會安裝 Motoko 接管入口。Lily 或 Misato 由使用者選擇啟用,兩條工作流不互相路由。Vibe 經 `task` tool 派遣;Pi 經 project-local extension 啟動隔離的 Pi child process。

## Pi-native 執行

```bash
./powerpuff/ppg attach --harness pi --girls misato --mode tracked --yes
pi --approve
```

在 Pi 內執行:

```text
/ppg-run <openspec-change-id>
```

Lily 流程可獨立安裝:

```bash
./powerpuff/ppg attach --harness pi --girls lily --mode tracked --yes
pi --approve
```

在 Pi 以 `/skill:ppg-lily` 啟用 Lily 後交代任務。如果她判定工作已超出輕量範圍,會凍結問題與安全邊界,把 handoff 狀態設為 `AWAITING_MOTOKO_APPROVAL`,然後停止。只有使用者親自輸入以下命令才會啟動 Motoko 的廣域唯讀偵察:

```text
/motoko-takeover
```

這個核准只供一次偵察派遣使用,十分鐘後失效。Motoko 可廣泛讀取非秘密的專案內容以找出 root cause 與真正控制點,但不能改產品檔案或執行 bash;她把證據與精確執行邊界寫入 `kotodute/lily/motoko-scope.md`,並停在 `AWAITING_MOTOKO_EXECUTION_APPROVAL`。使用者檢視後再親自核准:

```text
/motoko-execute
```

第二個核准同樣單次、限時。Motoko 之後才能修改 `motoko-scope.md` 列出的 `Allowed Files / Areas`,bash 也只能逐字執行其中的 `Allowed Commands`。Lily 在兩階段都不會同時運作。

`.pi/extensions/powerpuff.ts` 提供 `powerpuff_dispatch` tool。`/ppg-run` 先把父 session 切到 `.pi/powerpuff.json` 指定的 Misato profile;child 再依各自 profile 啟動。預設是 Misato / Holo / Motoko 使用 GPT-5.6-sol,Holo / Motoko 以 xhigh 做決策、廣域偵察或複雜接管;Blossom / Bubbles / Buttercup 使用 Mistral Medium 3.5 high。每個 child 都是新的 `pi --no-session` process,context 隔離,以 Kotodute handoff、`kotodute/advice/*.md` 或 Motoko scope 交接。

```text
Misato    openai-codex/gpt-5.6-sol       high
Holo      openai-codex/gpt-5.6-sol       xhigh
Motoko    openai-codex/gpt-5.6-sol       xhigh
Blossom   mistral/mistral-medium-3.5     high
Bubbles   mistral/mistral-medium-3.5     high
Buttercup mistral/mistral-medium-3.5     high
```

要改模型只需編輯 `.pi/powerpuff.json`;若指定模型不存在或沒有認證,派遣會明確失敗,不會偷偷 fallback。extension 同時在 child 的 `tool_call` 層封鎖 human-only git、依賴變更與 protected paths。Misato 路線中的 Holo / Motoko 仍是唯讀顧問;Lily 路線必須先以 `/motoko-takeover` 讓 Motoko 唯讀偵察,再由使用者以 `/motoko-execute` 核准她自己提出的精確檔案與命令白名單。

## 安裝模式

- **clean(預設)**:目標專案零 tracked file。工作區 `kotodute/` 是巢狀 git repo(信任檢查所需的歷史在裡面),框架 `powerpuff/` 與指標檔全部列入 `.git/info/exclude`(per-clone、不進版控),permissions 走 `.claude/settings.local.json`(Claude Code 原生自動忽略)。
- **tracked**:工作區與指標進專案版控,適合要讓團隊共享 workflow 的 repo(框架 clone 仍建議 exclude,團隊成員各自 clone)。

## 信任模型(摘要)

- **操作三檔位**:`allow` 正常工作;`ask` 中風險(harness 跳提示,人類按鍵即核可,不可偽造);`deny` 高風險不可逆(agent 永遠不能執行,寫入 `human-todo.md` 由人類親自跑)。
- **enforcement 不靠 prompt**:Claude Code 走 settings permissions + PreToolUse guard hook;Vibe 走 per-role TOML 白名單;Pi child 走 tool allowlist + extension guard。憑證隔離(push key / 簽章 key 不進 agent 環境)是 deny 檔的真正錨點。
- **handoff 用 [Kotodute](templates/common/kotodute.md)**(專案內的工作區因此命名為 `kotodute/`):機器優先的 S-expression 格式,強制區分 facts/assumptions/open/blockers,事實附 evidence,可用 `koto-check.py` 機械驗證。
- 詳見 [docs/trust-model.md](docs/trust-model.md)。

## Repo 結構

```
ppg                  # TUI / CLI 安裝器(純 bash,零依賴;attach/detach/doctor)
templates/
  common/            # kotodute 協定卡、ponytail 反過度設計準則、koto-check.py、scope.md、human-todo.md
  enforcement/       # settings.json(三檔位)、powerpuff-guard.sh(bash 側門封鎖)
  base/              # Blossom / Bubbles / Buttercup warm-up + handoff.koto
  vibe/              # Misato + .vibe agents/prompts(TOML 白名單)
  pi/                # Pi per-role model config、orchestration extension + Misato warm-up
  lily/              # 輕量工作流
  commands/claude/   # slash command 薄指標(OpenCode 以 symlink 共用)
docs/                # 架構與信任模型說明
legacy/              # 原始三份 setup 文件(完整論述保留於此)
personas/            # Holo / Motoko persona(Motoko 另支援 user-approved Lily takeover)
```

## 首次安裝後

跑一次 security test(`ppg doctor` 會依 harness 提醒):要求 agent `git push` → 應被擋;要求 agent 用 bash 改 `kotodute/scope.md` → 應被擋。互動式 harness 的依賴變更應跳 ask;Pi child-process 模式則阻擋並要求寫入 human TODO。
