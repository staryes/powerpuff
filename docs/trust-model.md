# Trust Model

## 原則:執行檢查的程式,不能跑在被限制者寫得到的地方

任何「同一個 user 能改回來的設定」都只是君子協定。各層強度由弱到強:

1. **Prompt 層**(warm-up 的 You Must Not)——擋誠實的指令漂移,這是大宗,但對越界行為無強制力。
2. **Harness 層**——Claude Code 的 settings permissions + PreToolUse hook;Vibe 的 per-role TOML `enabled_tools` 白名單;Pi 的 child-process tool allowlist + project extension `tool_call` guard。攔截發生在模型取得執行能力之前,模型無法跳過;但命令規則仍包含字串比對,有被變形寫法繞過的空間(settings、hook、extension 自身都在 protected paths,防 agent 改規則自我解鎖)。
3. **OS / container 層**——唯讀掛載、斷網、(必要時)獨立 user。無人看管的 fan-out 建議在 container 內跑。
4. **環境外錨點**——憑證隔離(push key / 簽章 key 走 1Password SSH agent 或 YubiKey touch,agent 觸發時人類會看到授權請求)、遠端 branch protection、巢狀工作區 repo(kotodute/)的 git 歷史。

## 操作三檔位

| 檔位 | 互動式(人在場) | 無人看管 |
|---|---|---|
| allow | 直接執行 | 直接執行 |
| ask(中風險、可逆) | harness 跳提示,人類按鍵即核可——提示由 harness UI 發出,agent 無法偽造 | 寫 PENDING TODO,人類回來處理 |
| deny(高風險、不可逆) | 封死;agent 寫 TODO,人類親自在終端機執行 | 同左 |

deny 檔沒有「核可後放行」:agent 從頭到尾沒有那個能力,所以沒有核可可以偽造——這取代了舊的 commit 核可儀式(commit author 不是身份驗證,任何能跑 git 的 agent 都能偽造)。人類跑完後,agent 驗證的是**環境狀態**(lockfile 變了、branch 在 remote 上),不是 TODO 的文字。

ask 清單保持短而具體,否則會養成反射性按 y 的習慣,ask 就退化成 allow。

## 角色獨立性

失效模式錯開:Blossom 訂標準(I/O contract + 驗證項目,寫到能直接出測試),Bubbles 作答並自測,Buttercup 拿同一份標準獨立實作測試來評分。Buttercup 不是自己出題自己改——題目來自 Blossom;防漏的關鍵在 **spec 的完整性**,不在誰把測試打進程式碼。驗收標準盡量寫成可機械執行的測試,pass/fail 由測試決定,不由任何人的判斷決定。

三人組的實際權限跟責任切割對齊:Blossom 只擁有正式 Powerpuff task contract,只能寫 `scope.md` 與自己的 handoff,不能改 OpenSpec 或產品;輕量契約由 Lily 以 `kotodute/lily/task.md` 獨立擁有。Bubbles 只能寫 `Allowed Paths` 並逐字執行 `Allowed Commands`;Buttercup 只能寫 `Reviewer Test Paths` 與 review handoff,並逐字執行 `Reviewer Commands`。Buttercup 的 findings 帶 owner type,由 Misato 分流;contract / requirement / architecture 問題不會被偽裝成 Bubbles 的 implementation retry。

Misato 路線中的 Holo / Motoko 是 advisory lens,不在 approval chain。Pi child guard 只允許它們讀專案並寫各自的 `kotodute/advice/*.md`;它們不能改 OpenSpec、產品檔案或 reviewer 結論。顧問建議若會改變需求或架構,Misato 必須停下來交由人類拍板。

Lily → Motoko 是另一種明確授權的 sequential takeover。Lily 只能提出請求並停止,不能自行派遣。`kotodute/lily/state.md` 是唯一 durable authorization status;shared handoff或legacy Lily handoff都不參與 gate。使用者先親自呼叫 `/motoko-takeover`:第一枚單次、限時、記憶體內 token只允許廣域 read-only reconnaissance;Motoko提出 `motoko-scope.md` 後停止。使用者檢視並親自呼叫 `/motoko-execute`,第二枚不可重放或平行使用的 token才允許 scope內實作。Motoko與Lily是serialized owner,可依序更新shared records;全域deny與protected paths仍優先。

## Shared records 與 internal Kotodute

`kotodute/issues.md`、monthly journal、六欄位 `handoff.md` 與 `human-todo.md` 是 project-shared 人類介面。只有 serialized entry owner(Misato、Lily、approved takeover Motoko)彙整;parallel/advisory children不得直接寫 shared journal/issues/handoff/run-log。Journal的重要決定使用可搜尋的 `— DECISION —` heading,反轉以新entry supersede舊entry。

角色/run內部狀態傳遞使用 Kotodute(S-expression):

- 強制把 **facts(附 evidence)** 與 **assumptions(附 basis)** 分開
- `koto-check.py` 提供結構性驗證;讀的人先驗證再信任
- shared Markdown handoff不取代internal `.koto`,internal Koto也不作人類續接入口

## scope.md 凍結

Blossom 在 Plan 階段寫 scope.md,執行期間凍結。enforcement:guard hook 封 bash 寫入(框架目錄 powerpuff/ 整個唯讀);Buttercup 用 `git -C kotodute log` 驗證「scope.md 的最後變更早於實作的第一個變更」,執行期間任何改動 = 自動 CHANGES_REQUESTED。clean 模式下這段歷史活在巢狀的 kotodute repo 裡。
