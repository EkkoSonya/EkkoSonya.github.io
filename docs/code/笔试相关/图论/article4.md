---
title: Alg - 图论4 最短路径(Dijkstra + Floyd 算法)
date: 2026-4-10
category:
  - code
tag:
  - Alg
  - 笔试相关
# star: true
# sticky: true
order: -0.5
---

## 最短路径算法

### 问题定义

给定一个图 $G = (V, E)$，每条边有一个权值 $w(e)$，求从一个点到另一个点的路径，使得路径上所有边的权值之和最小。

最短路径问题在现实中有广泛的应用：

- **导航系统**：地图中两点间的最短/最快路线
- **网络路由**：数据包选择最优传输路径
- **任务调度**：关键路径法（CPM）中的时间估算

最短路径问题主要分为两类：

- **单源最短路径**：从一个起点到其余所有点的最短距离（Dijkstra、Bellman-Ford、SPFA）
- **多源最短路径**：任意两点之间的最短距离（Floyd-Warshall）

---

## Dijkstra 算法

出发节点 k

数组 `dist[n]`：从 k 到 i 的当前最短距离，初始化 `dist[k] = 0`，其余为 INF

数组 `visited[n]`：标记节点 i 是否已确定最短路径

循环：从未访问节点中取 `dist` 最小的，该节点最短路径确定

用该节点的最短路径去松弛其他未访问节点的 `dist`

> `dist[k] = 0` 初始就是最小的，所以起点 k 一定是第一个被确定的节点，然后以 k 为中介更新其邻居的 `dist`，然后再遍历时就会选此时最短的 `dist` 确定下来，进而进一步循环

### 核心思想

Dijkstra 算法解决**单源最短路径**问题，基于**贪心策略**：

> 每次从未确定最短路径的顶点中，选出距离起点最近的那个顶点，然后用它去**松弛**其邻居。

类比理解：想象你往池塘里扔一颗石子，水波从中心向外扩散，**离中心近的格子先被波及**，然后依次向外推进。

### 关键概念：松弛操作（Relaxation）

对于边 $(u, v)$ 权值为 $w$，如果 $dist[u] + w < dist[v]$，说明通过 $u$ 到 $v$ 比之前知道的路径更短，则更新 $dist[v]$：

$$dist[v] = \min(dist[v],\ dist[u] + w)$$

```java
// 松弛操作
void relax(int u, int v, int w) {
    if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;  // 记录前驱，用于还原路径
    }
}
```

### 算法流程

1. 初始化 $dist[start] = 0$，其余 $dist[i] = \infty$
2. 将所有顶点放入未访问集合
3. **循环**：从未访问顶点中选出 $dist$ 最小的顶点 $u$
4. 标记 $u$ 为已访问，对 $u$ 的每个邻居 $v$ 执行松弛
5. 重复步骤 3-4，直到所有顶点都被访问

```java
// 朴素 Dijkstra —— 适合稠密图（邻接矩阵），O(V²)
int[] dijkstra(int[][] graph, int start, int n) {
    int[] dist = new int[n];
    boolean[] visited = new boolean[n];
    int INF = Integer.MAX_VALUE;

    Arrays.fill(dist, INF);
    dist[start] = 0;

    for (int i = 0; i < n; i++) {
        // 选未访问中距离最小的点
        int u = -1;
        int minDist = INF;
        for (int j = 0; j < n; j++) {
            if (!visited[j] && dist[j] < minDist) {
                minDist = dist[j];
                u = j;
            }
        }

        if (u == -1) break;  // 剩余点不可达
        visited[u] = true;

        // 松弛邻居
        for (int v = 0; v < n; v++) {
            if (!visited[v] && graph[u][v] != INF
                && dist[u] + graph[u][v] < dist[v]) {
                dist[v] = dist[u] + graph[u][v];
            }
        }
    }
    return dist;
}
```

### 优先队列优化版

朴素版每次要遍历所有顶点找最小值，效率低

用**优先队列**（最小堆）维护待扩展顶点，可以快速取出 $dist$ 最小的点。

```java
// 优先队列优化 —— 适合稀疏图（邻接表），O((V + E) log V)
static class Edge {
    int to, weight;
    Edge(int to, int weight) { this.to = to; this.weight = weight; }
}

int[] dijkstra(List<Edge>[] adj, int start, int n) {
    int[] dist = new int[n];
    int INF = Integer.MAX_VALUE;
    Arrays.fill(dist, INF);
    dist[start] = 0;

    // 优先队列按距离升序排列
    PriorityQueue<Node> pq = new PriorityQueue<>();
    pq.offer(new Node(start, 0));

    while (!pq.isEmpty()) {
        Node cur = pq.poll();
        int u = cur.id;

        if (cur.dist > dist[u]) continue;  // 过时条目，跳过

        for (Edge e : adj[u]) {
            int newDist = dist[u] + e.weight;
            if (newDist < dist[e.to]) {
                dist[e.to] = newDist;
                pq.offer(new Node(e.to, newDist));
            }
        }
    }
    return dist;
}

static class Node implements Comparable<Node> {
    int id, dist;
    Node(int id, int dist) { this.id = id; this.dist = dist; }
    @Override
    public int compareTo(Node o) { return this.dist - o.dist; }
}
```

> **⚠️ 优先队列的 lazy deletion 技巧**：Java 的 `PriorityQueue` 不支持 decrease-key 操作，所以直接插入新条目，旧条目在出队时通过 `cur.dist > dist[u]` 判断并跳过。

### ⚠️ 不能处理负权边

Dijkstra 的贪心策略**依赖一个前提**：一旦某个顶点被标记为已访问，其最短距离就不会再被更新。但如果存在负权边，已经被确定的点可能被更小的路径"反超"，导致结果错误。

```
示例（Dijkstra 会出错）：

    A ──3── B
    │       │
    4      -5
    │       │
    C ──1── D

从 A 出发：
Dijkstra 顺序：A(0) → B(3) → C(4) → D(5)  ❌ 错误
实际最短：A → C → D = 5，但 A → B → D = -2  ✅ 正确
```

**有负权边怎么办？** 使用 Bellman-Ford 或 SPFA 算法。

### 路径还原

上面的代码只求出了最短距离，如果需要输出具体路径，可以维护一个 `prev[]` 数组记录前驱节点：

```java
// 在松弛时记录前驱
if (newDist < dist[e.to]) {
    dist[e.to] = newDist;
    prev[e.to] = u;              // 新增：记录是从哪个点过来的
    pq.offer(new Node(e.to, newDist));
}

// 从终点回溯到起点，得到逆序路径
List<Integer> reconstructPath(int[] prev, int start, int end) {
    List<Integer> path = new ArrayList<>();
    for (int at = end; at != -1; at = prev[at]) {
        path.add(at);
    }
    Collections.reverse(path);
    return path.get(0) == start ? path : Collections.emptyList();
}
```

---

## Floyd-Warshall 算法

### 核心思想

Floyd-Warshall 算法解决**多源最短路径**问题，求任意两点之间的最短距离。

基于**动态规划**：

> 设 $dp[k][i][j]$ 表示只经过前 $k$ 个顶点作为中间节点时，$i$ 到 $j$ 的最短距离。
>
> 状态转移方程：$dp[k][i][j] = \min(dp[k-1][i][j],\ dp[k-1][i][k] + dp[k-1][k][j])$

通俗理解：**枚举每个点 $k$ 作为"中间人"，看看从 $i$ 经过 $k$ 再到 $j$ 是否比直接从 $i$ 到 $j$ 更短。**

### 算法流程

1. 初始化 $dp[i][j]$ 为邻接矩阵（$i=j$ 时为 0，无边时为 $\infty$）
2. 枚举中间点 $k$（0 到 $n-1$）
3. 枚举所有点对 $(i, j)$，尝试通过 $k$ 松弛
4. 最终 $dp[i][j]$ 即为 $i$ 到 $j$ 的最短距离

```java
// Floyd-Warshall —— O(V³)
void floydWarshall(int[][] graph, int n) {
    int INF = Integer.MAX_VALUE / 2;  // 注意：用一半防止加法溢出
    int[][] dist = new int[n][n];

    // 初始化
    for (int i = 0; i < n; i++) {
        Arrays.fill(dist[i], INF);
        dist[i][i] = 0;
    }
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            dist[i][j] = graph[i][j];

    // 三层核心循环
    for (int k = 0; k < n; k++) {       // 枚举中间点
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
            }
        }
    }
}
```

> **💡 为什么 k 循环在最外层？**
>
> Floyd 的正确性依赖于 $k$ 从小到大逐步引入中间点。如果 $k$ 在内层，就相当于允许任意顺序的松弛，无法保证动态规划的正确推导。
>
> 记住口诀：**"k 在外，i j 在内，顺序不能乱"**。

### 路径还原

Floyd 同样可以记录路径。用一个 `next[i][j]` 数组表示从 $i$ 到 $j$ 的最短路径上 $i$ 的下一个节点：

```java
int[][] next = new int[n][n];

// 初始化
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
        if (graph[i][j] != INF) next[i][j] = j;

// 在松弛时更新
if (dist[i][k] + dist[k][j] < dist[i][j]) {
    dist[i][j] = dist[i][k] + dist[k][j];
    next[i][j] = next[i][k];  // i 的下一个点变为走向 k 的第一个点
}

// 路径还原：从 i 沿着 next 走到 j
List<Integer> getPath(int i, int j) {
    List<Integer> path = new ArrayList<>();
    if (next[i][j] == 0) return path;  // 不可达
    path.add(i);
    while (i != j) {
        i = next[i][j];
        path.add(i);
    }
    return path;
}
```

### 检测负环

Floyd 可以检测图中是否存在负环：**如果 $dp[i][i] < 0$，说明存在从 $i$ 出发回到 $i$ 的负权回路。**

```java
boolean hasNegativeCycle(int[][] dist, int n) {
    for (int i = 0; i < n; i++)
        if (dist[i][i] < 0) return true;
    return false;
}
```

---

## Dijkstra vs Floyd 对比

| 特性 | Dijkstra | Floyd-Warshall |
| --- | --- | --- |
| 问题类型 | 单源最短路径 | 多源最短路径 |
| 核心策略 | 贪心 | 动态规划 |
| 时间复杂度 | $O(V^2)$ / $O((V+E)\log V)$ | $O(V^3)$ |
| 空间复杂度 | $O(V+E)$ | $O(V^2)$ |
| 负权边 | ❌ 不支持 | ✅ 支持 |
| 负环检测 | ❌ | ✅（检查 $dp[i][i] < 0$） |
| 适用场景 | 起点固定、求到各点距离 | 需要任意两点间距离 |
| 稠密图表现 | 朴素版 $O(V^2)$ 优秀 | 常数小，实际不慢 |

---

## 算法选择决策树

```
需要求最短路径
├── 有没有负权边？
│   ├── 有 → 用 Bellman-Ford / SPFA / Floyd
│   └── 没有 ↓
├── 只需要从一个起点出发？
│   ├── 是 → Dijkstra（稀疏图用优先队列优化，稠密图用朴素版）
│   └── 需要任意两点间的距离？
│       ├── 顶点数 ≤ 300 → Floyd（代码短、常数小）
│       └── 顶点数 > 300 → 对每个点跑一次 Dijkstra
```

---

## 实战例题

### 例题 1：网络延迟时间

> LeetCode 743：有 `n` 个网络节点（1 到 n），给定有向边列表 `times[i] = (u, v, w)`，表示信号从 `u` 到 `v` 需要 `w` 时间。从节点 `k` 发出信号，问所有节点收到信号需要多长时间？如果某些节点收不到信号返回 -1。

**分析**：单源最短路径问题，求起点 $k$ 到所有点的最短距离，再取最大值。边权非负，用 Dijkstra。

```java
class Solution {
    static class Edge {
        int to, weight;
        Edge(int to, int weight) { this.to = to; this.weight = weight; }
    }

    static class Node implements Comparable<Node> {
        int id, dist;
        Node(int id, int dist) { this.id = id; this.dist = dist; }
        @Override public int compareTo(Node o) { return this.dist - o.dist; }
    }

    public int networkDelayTime(int[][] times, int n, int k) {
        // 邻接表建图
        List<Edge>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] t : times) adj[t[0]].add(new Edge(t[1], t[2]));

        // Dijkstra
        int INF = Integer.MAX_VALUE;
        int[] dist = new int[n + 1];
        Arrays.fill(dist, INF);
        dist[k] = 0;

        PriorityQueue<Node> pq = new PriorityQueue<>();
        pq.offer(new Node(k, 0));

        while (!pq.isEmpty()) {
            Node cur = pq.poll();
            if (cur.dist > dist[cur.id]) continue;

            for (Edge e : adj[cur.id]) {
                int newDist = dist[cur.id] + e.weight;
                if (newDist < dist[e.to]) {
                    dist[e.to] = newDist;
                    pq.offer(new Node(e.to, newDist));
                }
            }
        }

        int maxDist = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == INF) return -1;
            maxDist = Math.max(maxDist, dist[i]);
        }
        return maxDist;
    }
}
```

### 例题 2：寻找最便宜的航班

> LeetCode 787：有 `n` 个城市和若干航班，`flights[i] = [from, to, price]`。给定起点 `src`、终点 `dst` 和最多中转次数 `k`，求从 `src` 到 `dst` 不超过 `k` 次中转的最低价格。

**分析**：带中转次数限制的最短路，Dijkstra 的贪心在此不再适用（因为限制了步数）。可以用改进的 BFS/SPFA，或者直接用动态规划。这里给出 Floyd 思路的对比 —— 但 Floyd 无法直接处理"步数限制"，此题更适合 Bellman-Ford 风格的做法。

```java
// Bellman-Ford 风格 —— 限制松弛轮数为 k+1
class Solution {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int INF = Integer.MAX_VALUE / 2;
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;

        for (int i = 0; i <= k; i++) {  // 最多 k+1 轮松弛
            int[] prev = dist.clone();
            for (int[] f : flights) {
                int u = f[0], v = f[1], w = f[2];
                if (prev[u] != INF && prev[u] + w < dist[v]) {
                    dist[v] = prev[u] + w;
                }
            }
        }

        return dist[dst] == INF ? -1 : dist[dst];
    }
}
```

### 例题 3：城市间最少的中转航班

> 给定 $n$ 个城市的航班信息，求任意两城市间的最短航班距离。

**分析**：典型的多源最短路径，且数据规模通常不大（$n \leq 200$），直接用 Floyd。

```java
void shortestFlight(int n, int[][] flights) {
    int INF = Integer.MAX_VALUE / 2;
    int[][] dist = new int[n][n];

    // 初始化
    for (int i = 0; i < n; i++) {
        Arrays.fill(dist[i], INF);
        dist[i][i] = 0;
    }
    for (int[] f : flights) dist[f[0]][f[1]] = f[2];

    // Floyd 核心
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);

    // 输出结果
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            System.out.println(i + " → " + j + ": " + (dist[i][j] == INF ? "不可达" : dist[i][j]));
}
```

---

## 笔试常见坑点

### 1. INF 的选择

```java
// ❌ 错误：用 MAX_VALUE，松弛时加法会溢出
int INF = Integer.MAX_VALUE;
if (dist[u] + w < dist[v]) ...  // dist[u] + w 溢出变成负数！

// ✅ 正确：用 MAX_VALUE 的一半
int INF = Integer.MAX_VALUE / 2;  // 约 10^9，足够大且不会溢出
```

### 2. 优先队列中存的是什么

```java
// Dijkstra 优先队列存的是 (顶点编号, 当前最短距离)
// 按距离升序排列
PriorityQueue<Node> pq = new PriorityQueue<>((a, b) -> a.dist - b.dist);
```

### 3. 无向图的边处理

```java
// 无向图每条边要加两次
adj[u].add(new Edge(v, w));
adj[v].add(new Edge(u, w));  // 别忘了这行
```

### 4. Floyd 的三重循环顺序

```java
// ✅ 正确顺序：k 在最外层
for (int k = 0; k < n; k++)
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);

// ❌ 错误：k 在内层会得到错误结果
```

---

## 复杂度总结

| 算法 | 时间复杂度 | 空间复杂度 | 适用场景 |
| --- | --- | --- | --- |
| Dijkstra（朴素） | $O(V^2)$ | $O(V)$ | 稠密图 |
| Dijkstra（优先队列） | $O((V+E)\log V)$ | $O(V+E)$ | 稀疏图 |
| Floyd-Warshall | $O(V^3)$ | $O(V^2)$ | 多源、小图（$V \leq 500$） |
