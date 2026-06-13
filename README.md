# Powerpuff

Multi-agent coding workflow,attach 到任何開發 repo。角色分工 + 檔案為媒介的狀態傳遞(Kotodute)+ 三檔位權限模型,支援 Claude Code / Vibe / OpenCode / pi。

## Quick Start

```bash
git clone <this-repo> ~/gitLocal/powerpuff
cd /path/to/your/project
~/gitLocal/powerpuff/ppg attach        # 互動式 TUI:選 harness、選 girls、選模式
```

非互動:

```bash
ppg attach --harness claude,vibe --girls blossom,bubbles,buttercup --mode clean --yes
ppg doctor    # 檢查安裝狀態、驗證 handoff
ppg detach    # 完整移除,專案無痕
```

## The Girls

| Girl | 角色 | 職責 |
|---|---|---|
| Misato | Orchestrator | 拆任務、判複雜度、路由、fan-out/合併(Vibe-native,經 `task` tool 派遣其他角色) |
| Blossom | Planner | 定義 scope:I/O contract + 驗證項目,精確到能直接寫測試 |
| Bubbles | Executor | 在 scope 邊界內實作,對驗證項目自測後交棒 |
| Buttercup | Reviewer | 從 spec 獨立實作測試、執行、回報;只揭發不修補 |
| Lily | Lightweight | 小修小補的輕量三階段(Plan/Execute/Check)一人包辦 |

選 Misato 會自動帶入三人組;Misato 的子代理派遣只在 Vibe 內可用。

## 安裝模式

- **clean(預設)**:目標專案零 tracked file。狀態目錄(`powerpuff/`、`lily/`)是巢狀 git repo(信任檢查所需的歷史在裡面),其餘檔案列入 `.git/info/exclude`(per-clone、不進版控),permissions 走 `.claude/settings.local.json`(Claude Code 原生自動忽略)。
- **tracked**:一般安裝,檔案進專案版控,適合要讓團隊共享 workflow 的 repo。

## 信任模型(摘要)

- **操作三檔位**:`allow` 正常工作;`ask` 中風險(harness 跳提示,人類按鍵即核可,不可偽造);`deny` 高風險不可逆(agent 永遠不能執行,寫入 `human-todo.md` 由人類親自跑)。
- **enforcement 不靠 prompt**:Claude Code 走 settings permissions + PreToolUse guard hook;Vibe 走 per-role TOML 白名單。憑證隔離(push key / 簽章 key 不進 agent 環境)是 deny 檔的真正錨點。
- **handoff 用 [Kotodute](templates/common/kotodute.md)**:機器優先的 S-expression 格式,強制區分 facts/assumptions/open/blockers,事實附 evidence,可用 `koto-check.py` 機械驗證。
- 詳見 [docs/trust-model.md](docs/trust-model.md)。

## Repo 結構

```
ppg                  # TUI / CLI 安裝器(純 bash,零依賴)
templates/
  common/            # kotodute 協定卡、koto-check.py、scope.md、human-todo.md
  enforcement/       # settings.json(三檔位)、powerpuff-guard.sh(bash 側門封鎖)
  base/              # Blossom / Bubbles / Buttercup warm-up + handoff.koto
  vibe/              # Misato + .vibe agents/prompts(TOML 白名單)
  lily/              # 輕量工作流
  commands/claude/   # slash command 薄指標(OpenCode 以 symlink 共用)
docs/                # 架構與信任模型說明
legacy/              # 原始三份 setup 文件(完整論述保留於此)
personas/            # Holo / Motoko 思考夥伴 persona(與 workflow 無關)
```

## 首次安裝後

跑一次 security test(`ppg doctor` 會提醒):要求 agent `git push` → 應被擋;要求 agent 用 bash 改 `powerpuff/task/scope.md` → 應被擋;要求裝套件 → 應跳 ask 提示而非直接執行。
