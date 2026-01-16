# 排名调整功能 (Ranking Adjustment Feature)

## 功能概述

管理员可以对比赛排名榜上的队伍进行手动调整，包括：
1. **Vote Adjustment（投票分数调整）** - 调整队伍的投票分数
2. **Win Point Adjustment（胜负场次调整）** - 调整队伍的胜/负/平场次

所有调整都会被记录到数据库日志中，包括操作管理员的信息和调整时间。

## 用户界面

### 入口
在Event Workspace页面的Current Standings区域，管理员可以看到"⚖️ Adjustment"按钮。

### 调整类型选择
点击按钮后，会弹出选择界面，提供两个选项：
- 🗳️ **Vote Adjustment** - 调整队伍的投票分数
- 🏆 **Win Point Adjustment** - 调整队伍的胜/负/平场次

### Vote Adjustment界面
- 显示所有队伍当前的投票分数
- 每个队伍有 +/- 按钮和输入框
- 可以输入正数或负数来增加或减少投票分数
- 支持小数（如 0.5）

### Win Point Adjustment界面
- 显示所有队伍当前的 W-L-T 记录（胜-负-平）
- 每个队伍有三个调整区域：
  - **Wins（胜场）** - 绿色区域
  - **Losses（负场）** - 红色区域
  - **Ties（平局）** - 黄色区域
- 每个区域都有 +/- 按钮和输入框
- 输入的是调整量（增量），而非最终值

## 技术实现

### 数据库模型

#### VoteLog 表
```sql
CREATE TABLE "vote_logs" (
    "id" TEXT PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "adjustment" DOUBLE PRECISION NOT NULL,  -- 调整量（可正可负）
    "admin_id" TEXT NOT NULL,
    "admin_name" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

#### WinLog 表
```sql
CREATE TABLE "win_logs" (
    "id" TEXT PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "wins_adj" INTEGER NOT NULL,      -- 胜场调整量
    "losses_adj" INTEGER NOT NULL,    -- 负场调整量
    "ties_adj" INTEGER NOT NULL,      -- 平局调整量
    "admin_id" TEXT NOT NULL,
    "admin_name" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### API 端点

#### Vote Adjustments
- **POST** `/api/v1/events/:eventId/vote-adjustments`
  - 权限：Admin only
  - 请求体：
    ```json
    {
      "adjustments": [
        {
          "teamId": "team-id-1",
          "adjustment": 1.5
        }
      ]
    }
    ```
  - 响应：调整成功的日志记录

- **GET** `/api/v1/events/:eventId/vote-logs`
  - 权限：Admin only
  - 响应：该赛事的所有投票调整日志

#### Win Point Adjustments
- **POST** `/api/v1/events/:eventId/win-adjustments`
  - 权限：Admin only
  - 请求体：
    ```json
    {
      "adjustments": [
        {
          "teamId": "team-id-1",
          "wins": 1,
          "losses": 0,
          "ties": -1
        }
      ]
    }
    ```
  - 响应：调整成功的日志记录

- **GET** `/api/v1/events/:eventId/win-logs`
  - 权限：Admin only
  - 响应：该赛事的所有胜负调整日志

### 排名计算逻辑

#### Vote Adjustment 应用
在 `statistics.service.js` 的 `calculateTeamStandings` 方法中：
```javascript
// 获取该队伍的所有投票调整记录
const voteAdjustment = voteAdjustments[team.id] || 0;
votes += voteAdjustment;  // 应用到总投票数
```

#### Win Point Adjustment 应用
在 `statistics.service.js` 的 `calculateTeamStandings` 方法中：
```javascript
// 获取该队伍的所有胜负调整记录
const winAdj = winAdjustments[team.id] || { wins: 0, losses: 0, ties: 0 };

// 将胜负调整转换为decimal wins（平局 = 0.5 胜）
wins += winAdj.wins + (winAdj.ties * 0.5);
totalMatches += winAdj.wins + winAdj.losses + winAdj.ties;
```

### 前端实现

#### 文件位置
`frontend/src/pages/event-workspace.js`

#### 主要方法
- `showAdjustmentModal()` - 显示调整类型选择界面
- `showVoteAdjustmentModal()` - 显示投票调整界面
- `showWinAdjustmentModal()` - 显示胜负调整界面
- `applyVoteAdjustments()` - 提交投票调整
- `applyWinAdjustments()` - 提交胜负调整

### 后端实现

#### Controller
`backend/src/controllers/event.controller.js`
- `applyVoteAdjustments()`
- `getVoteLogs()`
- `applyWinAdjustments()`
- `getWinLogs()`

#### Service
`backend/src/services/event.service.js`
- `applyVoteAdjustments()` - 保存投票调整日志
- `getVoteLogs()` - 查询投票调整日志
- `applyWinAdjustments()` - 保存胜负调整日志
- `getWinLogs()` - 查询胜负调整日志

`backend/src/services/statistics.service.js`
- `getEventStatistics()` - 从数据库加载所有调整日志
- `calculateTeamStandings()` - 在排名计算中应用调整

## 使用场景

### Vote Adjustment 适用场景
- 修正投票计数错误
- 补偿技术故障导致的投票丢失
- 应用比赛规则中的特殊投票加分/扣分

### Win Point Adjustment 适用场景
- 修正比赛记录错误
- 追加未在系统中记录的比赛结果
- 应用特殊规则（如罚分导致的胜场变负场）
- 调整因技术问题导致的错误记录

## 审计和追溯

所有调整都会永久保存在数据库中，包括：
- 调整的时间戳
- 执行调整的管理员ID和姓名
- 具体的调整值
- 受影响的队伍

管理员可以通过查看logs来追溯所有历史调整记录。

## 注意事项

1. **权限控制**：只有Admin角色可以执行调整操作
2. **累加效果**：多次调整会累加计算
3. **实时更新**：调整后排名立即重新计算并刷新显示
4. **可逆性**：可以通过反向调整来撤销之前的操作
5. **透明性**：所有调整都有完整的审计日志

## 数据库迁移

创建时间：2024-12-04

迁移文件：
- `20251129000001_add_vote_logs` - 创建VoteLog表
- `20251204224018_add_win_logs` - 创建WinLog表

运行迁移：
```bash
cd backend
npx prisma migrate dev
```






