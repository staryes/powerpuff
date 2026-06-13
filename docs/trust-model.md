# Trust Model

## 原則:執行檢查的程式,不能跑在被限制者寫得到的地方

任何「同一個 user 能改回來的設定」都只是君子協定。各層強度由弱到強:

1. **Prompt 層**(warm-up 的 You Must Not)——擋誠實的指令漂移,這是大宗,但對越界行為無強制力。
2. **Harness 層**——Claude Code 的 settings permissions + PreToolUse hook;Vibe 的 per-role TOML `enabled_tools` 白名單。攔截發生在模型取得執行能力之前,模型無法跳過;但規則是字串比對,有被變形寫法繞過的空間(guard hook 封掉 bash 側門是為此)。settings 與 hook 自身都在 deny 清單內,防 agent 改規則自我解鎖。
3. **OS / container 層**——唯讀掛載、斷網、(必要時)獨立 user。無人看管的 fan-out 建議在 container 內跑。
4. **環境外錨點**——憑證隔離(push key / 簽章 key 走 1Password SSH agent 或 YubiKey touch,agent 觸發時人類會看到授權請求)、遠端 branch protection、巢狀 state repo 的 git 歷史。

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

## Handoff:Kotodute

角色間狀態傳遞用 Kotodute(S-expression,見 `templates/common/kotodute.md`):

- 強制把 **facts(附 evidence)** 與 **assumptions(附 basis)** 分開,不確定性不能藏在精簡措辭裡
- `koto-check.py` 提供結構性機械驗證;讀的人先驗證再信任
- scope.md 與 human-todo.md 是人類介面,維持 markdown

## scope.md 凍結

Blossom 在 Plan 階段寫 scope.md,執行期間凍結。enforcement:guard hook 封 bash 寫入;Buttercup 用 git 歷史驗證「scope.md 的最後變更早於實作的第一個變更」,執行期間任何改動 = 自動 CHANGES_REQUESTED。clean 模式下這段歷史活在巢狀 state repo 裡。
