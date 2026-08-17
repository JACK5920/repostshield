# 🛡 RepostShield — 一键部署指南（小白版）

> 一个**已能运行**的创作者内容工具：把一段内容自动改写成 6 个平台的版本，并在发布前做"合规体检"（重复内容 / AI 痕迹 / 社区准则风险）。
> 本仓库已经写好了全部代码，你不需要懂编程，**照下面的步骤点按钮就能上线**。

---

## 📁 文件说明（不用改，了解即可）

| 文件 | 作用 |
|---|---|
| `index.html` | 落地页 + 工作台页面 |
| `app.js` | 页面逻辑（生成、复制、每日 3 次免费限制） |
| `api/generate.js` | AI 后端（调用 OpenRouter，改写 + 合规检查） |
| `server.js` | 本地预览服务器（给你自己看效果用） |
| `test.js` | 自检脚本（已经跑通，不用管） |
| `vercel.json` | 上线平台配置 |
| `.env.example` | 密钥填写示例（复制改名成 `.env` 用） |

---

## 🧰 第一步：准备 3 个免费账号（总共 10 分钟）

### 1️⃣ OpenRouter（提供 AI 能力）
1. 打开 https://openrouter.ai → 注册（可用 Google/GitHub 登录）
2. 右上角头像 → **Keys** → **Create Key** → 复制这串 `sk-or-v1-...`
3. 建议先充 **$5**（左栏 **Credits** → 用支付宝/信用卡都行），改写一篇约花几分钱，$5 能用很久

### 2️⃣ GitHub（存放代码）
1. 打开 https://github.com → 注册 → 记下用户名
2. 右上角 **+** → **New repository** → 名字写 `repostshield` → **Create repository**（页面别关）

### 3️⃣ Vercel（免费托管网站，等于把你的网站发到公网）
1. 打开 https://vercel.com → 点 **Sign Up** → **Continue with GitHub** 授权登录

---

## 🚀 第二步：把代码传上 GitHub（约 5 分钟）

> 下面的命令在电脑上打开"终端"运行。Windows 按 `Win 键` → 输入 `PowerShell` → 回车。

```powershell
# 1) 进入项目文件夹（把路径替换成你自己的）
cd C:\Users\Administrator\Desktop\01\repostshield

# 2) 初始化并提交代码
git init
git add .
git commit -m "RepostShield MVP"

# 3) 关联你刚创建的 GitHub 仓库（把 USERNAME 换成你的 GitHub 用户名）
git remote add origin https://github.com/USERNAME/repostshield.git
git push -u origin main
```

> 首次 push 会让你登录 GitHub —— 在浏览器弹窗里点 **Sign in with your browser** 授权即可。
> 如果提示分支名不是 `main` 而是 `master`，把最后一行改成 `git push -u origin master`。

---

## 🌐 第三步：在 Vercel 一键上线（约 3 分钟，全程点按钮）

1. 打开 https://vercel.com/new
2. 点 **Import** 你刚推上去的 `repostshield` 仓库
3. 保持默认设置，直接点 **Deploy**
4. 等 1~2 分钟，看到 **Congratulations** 页面 = 上线成功！

### 最后一步：把 AI 密钥交给网站（必做，否则不能生成）
1. 在 Vercel 项目页点 **Settings** → **Environment Variables**
2. 添加：
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: 粘贴第一步的 `sk-or-v1-...`
3. 再点 **Deployments** → 最新一次部署右侧 **•••** → **Redeploy**（让密钥生效）
4. 完成后你的网址 `https://repostshield.vercel.app` 就能正常生成内容了 ✅

---

## 👀 想先在本地看效果？（可选，不用也能上线）

```powershell
cd C:\Users\Administrator\Desktop\01\repostshield
copy .env.example .env        # 把密钥填进 .env（记事本打开改）
npm start
```

然后浏览器打开 http://localhost:3000 就能看到页面并试用。

---

## 💳 第四步：接上付费（约 10 分钟，收钱）

1. 打开 https://www.lemonsqueezy.com → 注册
2. 创建一个 **Product**，名字 `RepostShield Creator`，价格 **$15 / monthly**
3. 完成付款方式设置后，点 **Share** 复制你的**付款链接**（形如 `https://repostshield.lemonsqueezy.com/buy/xxxx`）
4. 用记事本打开 `app.js`，把开头的 `const UPGRADE_URL = "#"` 改成你的链接，保存
5. 再 `git add .` → `git commit -m "add payment"` → `git push`，Vercel 会自动重新上线

> Lemon Squeezy 会自动处理发票和海外税务（对个体/个人开发者最省事），每次扣 $1+5% 手续费，没有月费。

---

## 🔧 常见问题

**Q: 生成时报"Server not configured"？**
→ 说明 `OPENROUTER_API_KEY` 没设置成功。回第三步第 4 条，确认加好了变量并点了 Redeploy。

**Q: 想换更聪明的模型？**
→ 在 Vercel 加环境变量 `OPENROUTER_MODEL`，值填 `anthropic/claude-3.5-haiku` 或 `google/gemini-flash-1.5`，再 Redeploy。

**Q: 太贵 / 太便宜？**
→ 改价格直接编辑 Lemon Squeezy 的 Product；改免费次数改 `app.js` 里的 `FREE_DAILY_LIMIT`。

**Q: 别人能白嫖吗？**
→ 免费档每天限 3 次（浏览器本地记录）。真正防滥用要做登录系统，等有付费用户后再升级，MVP 阶段这样够用。

**Q: 我这台电脑的 node 命令不见了？**
→ 无所谓，代码已经在 GitHub 上，Vercel 那边不需要你电脑。本机只用来改文案和推代码。

---

## 📣 上线后：第一周推广清单（关键！）

| 天 | 动作 |
|---|---|
| 第 1 天 | 发 **Product Hunt**（https://www.producthunt.com 注册→Submit a product） |
| 第 1 天 | 发 **Indie Hackers**（https://www.indiehackers.com 分享你的产品故事） |
| 第 2 天 | 去 Reddit 创作者板块（r/NewTubers、r/content_marketing、r/InstagramMarketing）发"我做了个工具帮你跨平台搬运+防限流"并附链接 |
| 第 2 天 | 找 **10 个认识的创作者**试用，送 3 个月免费，换真实截图和反馈 |
| 第 3 天 | 收集反馈 → 告诉我，我帮你迭代下一版 |

**建议先记录一个数据**：访问你网址的人数里，有多少人真的粘贴内容点了 Generate。超过 40% 就说明需求成立，可以继续投钱投时间。

---

## 💰 成本 & 收入预期（诚实说明）

- **成本**：Vercel 免费、GitHub 免费、Lemon Squeezy 无月费（每单抽成）、OpenRouter $5 预充（能用很久）
- **收入**：$15/月 × 订阅用户。先冲到 **10 个付费用户（MRR $150）**，验证复购和退款率，再谈放大。
- **现实预期**：前 1~2 周可能只有个位数用户，这不代表失败——重点看"用过的人是否愿意留下/推荐"。

---

*有任何一步卡住，直接把报错截图或文字发给我，我帮你解决。*
