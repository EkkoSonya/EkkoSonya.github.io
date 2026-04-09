---
title: Alg5 - 图论 (DFS && BFS)
date: 2026-4-9
category:
  - code
tag:
  - Alg
  - 笔试相关
# star: true
# sticky: true
order: -0.5
---

## DFS

**深度优先搜索（Depth-First Search）** 是一种用于遍历或搜索图、树的算法。

### 核心思想

从起点出发，沿着一条路径尽可能深入，直到无法继续时回溯，再探索其他路径。

### 特点

- 使用**栈**（或递归调用栈）实现
- 不保证找到最短路径
- 时间复杂度：O(V + E)，V 为顶点数，E 为边数
- 空间复杂度：O(V)（递归深度最多为顶点数）
- 适合：路径搜索、连通性判断、拓扑排序、回溯问题

### 代码模板

```java
// 邻接表表示图
List<List<Integer>> adj = new ArrayList<>();
boolean[] visited;

// 递归实现（最常用）
void dfs(int u) {
    visited[u] = true;
    // 处理当前节点
    for (int v : adj.get(u)) {
        if (!visited[v]) {
            dfs(v);
        }
    }
}

// 栈实现（避免栈溢出）
void dfs(int start, int n) {
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(start);

    while (!stack.isEmpty()) {
        int u = stack.pop();
        if (visited[u]) continue;  // 跳过已访问节点
        visited[u] = true;

        for (int v : adj.get(u)) {
            if (!visited[v]) {
                stack.push(v);
            }
        }
    }
}
```

### 网格 DFS 模板

矩阵/网格问题中常用的 DFS 写法：

```java
int[][] grid;
int m, n;
boolean[][] visited;
int[] dx = {-1, 1, 0, 0};  // 上下左右四个方向
int[] dy = {0, 0, -1, 1};

void dfs(int x, int y) {
    visited[x][y] = true;
    // 处理当前格子

    for (int i = 0; i < 4; i++) {
        int nx = x + dx[i];
        int ny = y + dy[i];
        // 边界检查 + 未访问检查
        if (nx >= 0 && nx < m && ny >= 0 && ny < n && !visited[nx][ny]) {
            dfs(nx, ny);
        }
    }
}

// 简化写法：直接枚举四个方向
void dfs2(int x, int y) {
    if (x < 0 || x >= m || y < 0 || y >= n || visited[x][y]) {
        return;
    }
    visited[x][y] = true;
    dfs2(x + 1, y);
    dfs2(x - 1, y);
    dfs2(x, y + 1);
    dfs2(x, y - 1);
}
```

### 经典应用

| 问题 | 说明 |
| --- | --- |
| 岛屿数量 | 统计连通分量 |
| 全排列/组合 | 回溯搜索 |
| 拓扑排序 | DAG 判环 |
| 二叉树遍历 | 前/中/后序 |
| 路径问题 | 判断是否存在路径 |

---

## BFS

**广度优先搜索（Breadth-First Search）** 是一种逐层遍历图、树的算法。

### 核心思想

从起点出发，先访问所有相邻节点，再访问这些节点的相邻节点，层层向外扩展。

### 特点

- 使用**队列**实现
- **保证找到最短路径**（无权图）
- 时间复杂度：O(V + E)
- 空间复杂度：O(V)（队列最多存储一层节点）
- 适合：最短路径、层级遍历、最少步数问题

### ⚠️ 关键点：visited 标记时机

**正确做法：入队时标记**

```java
// ✅ 正确：入队时标记
void bfs(int start) {
    Queue<Integer> queue = new LinkedList<>();
    queue.offer(start);
    visited[start] = true;  // 入队时立即标记

    while (!queue.isEmpty()) {
        int u = queue.poll();
        for (int v : adj.get(u)) {
            if (!visited[v]) {
                visited[v] = true;  // 入队时标记，避免重复入队
                queue.offer(v);
            }
        }
    }
}
```

**错误做法：出队时标记**

```java
// ❌ 错误：出队时标记，会导致同一节点多次入队
void bfsWrong(int start) {
    Queue<Integer> queue = new LinkedList<>();
    queue.offer(start);
    // visited[start] = true;  // 没有标记

    while (!queue.isEmpty()) {
        int u = queue.poll();
        if (visited[u]) continue;
        visited[u] = true;  // 太晚了，可能已经重复入队多次
        // ...
    }
}
```

### 网格 BFS 模板

```java
int[] dx = {-1, 1, 0, 0};
int[] dy = {0, 0, -1, 1};

void bfs(int[][] grid, int startX, int startY) {
    int m = grid.length, n = grid[0].length;
    boolean[][] visited = new boolean[m][n];
    Queue<int[]> queue = new LinkedList<>();

    queue.offer(new int[]{startX, startY});
    visited[startX][startY] = true;
    int step = 0;

    while (!queue.isEmpty()) {
        int size = queue.size();
        // 按层遍历，可以记录当前步数
        for (int i = 0; i < size; i++) {
            int[] cur = queue.poll();
            int x = cur[0], y = cur[1];

            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d];
                int ny = y + dy[d];
                if (nx >= 0 && nx < m && ny >= 0 && ny < n && !visited[nx][ny]) {
                    visited[nx][ny] = true;
                    queue.offer(new int[]{nx, ny});
                }
            }
        }
        step++;
    }
}
```

### 经典应用

| 问题 | 说明 |
| --- | --- |
| 最短路径 | 无权图最短路 |
| 层级遍历 | 二叉树按层输出 |
| 最少步数 | 迷宫、八数码 |
| 多源BFS | 01矩阵、腐烂橘子 |
| 拓扑排序 | 课程安排 |

### 多源 BFS

多个起点同时开始扩散，常用于求"到最近源点的距离"：

```java
// 例：腐烂橘子问题，多个腐烂源点同时扩散
int orangesRotting(int[][] grid) {
    int m = grid.length, n = grid[0].length;
    Queue<int[]> queue = new LinkedList<>();

    // 所有腐烂橘子入队（多源）
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (grid[i][j] == 2) {
                queue.offer(new int[]{i, j});
            }
        }
    }

    int time = 0;
    while (!queue.isEmpty()) {
        int size = queue.size();
        boolean spread = false;
        for (int i = 0; i < size; i++) {
            int[] cur = queue.poll();
            for (int d = 0; d < 4; d++) {
                int nx = cur[0] + dx[d];
                int ny = cur[1] + dy[d];
                if (nx >= 0 && nx < m && ny >= 0 && ny < n && grid[nx][ny] == 1) {
                    grid[nx][ny] = 2;
                    queue.offer(new int[]{nx, ny});
                    spread = true;
                }
            }
        }
        if (spread) time++;
    }
    return time;
}
```

---

## DFS vs BFS 对比

| 特性 | DFS | BFS |
| --- | --- | --- |
| 数据结构 | 栈/递归 | 队列 |
| 空间复杂度 | O(V) | O(V) |
| 最短路径 | 不保证 | 保证（无权图） |
| 实现难度 | 递归简单 | 需要队列 |
| 适用场景 | 路径搜索、回溯、连通性 | 最短路、层级遍历 |
| 栈溢出风险 | 有（深度大时） | 无 |

---

## 选择建议

- **求最短路径/最少步数** → BFS
- **遍历所有解/回溯搜索** → DFS
- **判断连通性** → 都可以，DFS 更简洁
- **深度可能很大** → 用栈实现的 DFS 或 BFS
- **需要按层处理** → BFS

---

## visited 是否需要恢复？

### 不恢复：图遍历（一去不回头）

visited 表示"节点已被处理过"，每个节点只访问一次：

```java
void dfs(int u) {
    visited[u] = true;
    for (int v : adj.get(u)) {
        if (!visited[v]) dfs(v);
    }
    // 不恢复，因为该节点已处理完毕
}
```

**场景**：岛屿数量、连通分量、判断是否存在路径

### 恢复：回溯搜索（试完换条路）

visited 表示"当前路径上的选择"，需要枚举所有可能解：

```java
void backtrack(int[] nums, List<Integer> path) {
    if (path.size() == nums.length) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);
        backtrack(nums, path);
        path.remove(path.size() - 1);
        used[i] = false;  // 恢复，让其他分支可用
    }
}
```

**场景**：全排列、组合、所有路径

### 总结

| 场景 | visited 含义 | 是否恢复 |
| --- | --- | --- |
| 图遍历 | 节点已处理 | 不恢复 |
| 回溯搜索 | 当前路径已选 | 必须恢复 |

---

## 经典例题

| 题目 | 题号 | 算法 |
| --- | --- | --- |
| 岛屿数量 | LeetCode 200 | DFS/BFS |
| 二叉树层序遍历 | LeetCode 102 | BFS |
| 最短路径 | LeetCode 1091 | BFS |
| 腐烂橘子 | LeetCode 994 | 多源BFS |
| 全排列 | LeetCode 46 | DFS 回溯 |
| 课程表 | LeetCode 207 | BFS 拓扑排序 |
| 被围绕的区域 | LeetCode 130 | DFS/BFS |
