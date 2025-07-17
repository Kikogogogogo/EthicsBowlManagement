# 分数计算逻辑更新

## 更新内容

### Judge Questions计算方式变更

**变更前：**
- Judge Questions的总分 = 所有问题分数的总和
- Grand Total = Criteria Total + Questions Total

**变更后：**
- Judge Questions的总分 = 所有问题分数的平均分  
- Grand Total = Criteria Total + Questions Average

## 影响范围

### 后端修改
1. **StatisticsService.calculateTotalScore()** - 修改为使用平均分计算
2. **ScoreService.calculateTotalScore()** - 已经正确使用平均分（无需修改）

### 前端修改
1. **event-workspace.js** - Match Scores显示界面
   - 显示Questions Average（主要）和Questions Total（次要）
   - Grand Total使用平均分计算
   - 添加计算说明文字

## 示例

假设某评委给出的Judge Questions分数为：[3, 2, 3, 2]

**变更前：**
- Questions Total: 10 (3+2+3+2)
- 如果Criteria Total是6，Grand Total = 6 + 10 = 16

**变更后：**
- Questions Average: 2.5 (10÷4)
- Questions Total: 10 (仍显示，但仅供参考)
- 如果Criteria Total是6，Grand Total = 6 + 2.5 = 8.5

## 更新日期

2024年1月 - 根据用户需求调整分数计算标准 