---
title: Alg - 图论1 (基础知识)
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

## 图论基础

### 简单介绍

想象一下，现在有一个巨大的社交网络，其中每个人都与若干个人有联系
如果是你，你会怎么表示它的数学模型呢（或者说，你会怎样把它抽象出来，使它易于表示、观看）；

一个很显然的做法是：将人抽象成点，将人与人的关系抽象成线，两个点有连线，当且仅当这两个点代表的两个人有联系；
也就是说，两个人有联系时，我们就把他们连起来；

图就是将复杂的关系简单化的一种数据结构，能够轻而易举地看出复杂关系，并加以研究

> 想起了本科跟着老师搞复杂网络，就是在matlab搞图

### 定义

给定两个集合：$V, E$, 其中 $V$ 存放所有的点，$E$ 存放所有的边，那么图 $G$ 就是这两个集合的组合: $G=(V,E)$

由于 $V$ 存放所有的点，称 $V$ 为点集；$E$ 存放所有边，称 $E$ 为边集

#### 有向图与无向图

- **无向图**：边没有方向，边 $(u, v)$ 与 $(v, u)$ 表示同一条边，通常记作无序对 $\{u, v\}$
- **有向图**（Digraph）：边有方向，边 $(u, v)$ 表示从 $u$ 指向 $v$ 的弧，$(u, v) \neq (v, u)$

#### 边的表示

对于边 $e \in E$：

- 在无向图中，$e = \{u, v\}$，称 $u, v$ 为边 $e$ 的**端点**，也称 $u$ 与 $v$ **相邻**
- 在有向图中，$e = (u, v)$，称 $u$ 为**起点**（弧尾），$v$ 为**终点**（弧头）

#### 特殊概念

- **自环**：一条边的两个端点相同，即 $e = \{u, u\}$ 或 $e = (u, u)$
- **重边**（平行边）：两个顶点之间存在多条边
- **简单图**：既没有自环也没有重边的图
- **完全图**：任意两个不同顶点之间都有一条边的简单图，$n$ 个顶点的无向完全图记作 $K_n$，边数为 $\frac{n(n-1)}{2}$
- **连通图**：无向图中任意两个顶点之间都存在路径
- **强连通图**：有向图中任意两个顶点 $u, v$，既存在 $u \to v$ 的路径，也存在 $v \to u$ 的路径

#### 顶点的度

- **无向图**：顶点 $v$ 的**度**（Degree）记作 $\deg(v)$，表示与 $v$ 关联的边的数目
- **有向图**：
  - **出度**（Out-degree）：以 $v$ 为起点的边的数目，记作 $\deg^+(v)$
  - **入度**（In-degree）：以 $v$ 为终点的边的数目，记作 $\deg^-(v)$

> **握手定理**：所有顶点的度数之和等于边数的两倍，即 $\sum_{v \in V} \deg(v) = 2|E|$。推论：图中度数为奇数的顶点个数必为偶数。

### 图的存储

#### 邻接矩阵

用一个 $n \times n$ 的矩阵 $A$ 来表示图，其中 $n = |V|$：

- 无向图：$A[i][j] = 1$ 表示顶点 $i$ 和 $j$ 之间有边，否则为 $0$；矩阵关于主对角线对称
- 有向图：$A[i][j] = 1$ 表示存在从 $i$ 到 $j$ 的边
- 带权图：$A[i][j] = w_{ij}$ 表示边 $(i, j)$ 的权值，无边时通常记作 $\infty$

> - 空间复杂度：$O(n^2)$
> - 优点：判断两点间是否有边只需 $O(1)$
> - 缺点：稀疏图浪费空间

```java
// 邻接矩阵
int n = 5;
int[][] adjMatrix = new int[n][n];
int INF = Integer.MAX_VALUE;

// 初始化：带权图，自身到自身距离为 0，其余为无穷
for (int i = 0; i < n; i++) {
    Arrays.fill(adjMatrix[i], INF);
    adjMatrix[i][i] = 0;
}

// 无向图加边
void addEdge(int[][] g, int u, int v, int w) {
    g[u][v] = w;
    g[v][u] = w;  // 无向图需要对称
}
// 有向图只需 g[u][v] = w

// 判断两点间是否有边
boolean hasEdge(int[][] g, int u, int v) {
    return g[u][v] != 0 && g[u][v] != INF;
}
```

#### 邻接表

为每个顶点维护一个链表（或动态数组），存储与其相邻的所有顶点：

- 无向图：顶点 $u$ 的链表中包含所有与 $u$ 相邻的顶点
- 有向图：通常存储出边表，即顶点 $u$ 的链表中包含所有 $u$ 能直接到达的顶点

> - 空间复杂度：$O(|V| + |E|)$
> - 优点：节省空间（尤其是稀疏图），遍历邻居高效
> - 缺点：判断两点间是否有边需要遍历链表

**无权图：**

```java
List<Integer>[] adj = new ArrayList[n];
for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();

// 加边
adj[u].add(v);          // 有向图
adj[v].add(u);          // 无向图再加这行

// 遍历顶点 u 的所有邻居
for (int neighbor : adj[u]) {
    System.out.println(neighbor);
}
```

**带权图：**

```java
class Edge {
    int to, weight;
    Edge(int to, int weight) {
        this.to = to;
        this.weight = weight;
    }
}

List<Edge>[] adj = new ArrayList[n];
for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();

// 加边
adj[u].add(new Edge(v, w));
adj[v].add(new Edge(u, w));   // 无向图再加这行

// 遍历顶点 u 的所有邻居
for (Edge e : adj[u]) {
    System.out.println("to: " + e.to + ", weight: " + e.weight);
}
```

#### 边集数组

用一个数组存储所有边，每条边记录起点、终点和权值（如果有）：

> - 空间复杂度：$O(|E|)$
> - 优点：结构简单，适合 Kruskal 等基于边的算法
> - 缺点：找某个顶点的邻居需要遍历所有边

### 例题 - 课程表

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses - 1` 。

在选修某些课程之前需要一些先修课程。 先修课程按数组 `prerequisites` 给出，其中 `prerequisites[i] = [ai, bi]` ，表示如果要学习课程 `ai` 则 **必须** 先学习课程  `bi` 。

- 例如，先修课程对 `[0, 1]` 表示：想要学习课程 `0` ，你需要先完成课程 `1` 。

请你判断是否可能完成所有课程的学习？如果可以，返回 `true` ；否则，返回 `false`

#### 题解

本题本质是判断**有向图是否有环**，可以用**拓扑排序（Kahn 算法）**解决：

1. **建图**：对于 `[ai, bi]`（学 `ai` 前必须先学 `bi`），建立有向边 `bi -> ai`，同时统计每个节点的**入度**
2. **初始化队列**：将所有入度为 0 的节点入队（这些课程没有先修要求，可以直接学）
3. **BFS 遍历**：每次取出队首节点，将其所有后继节点的入度减 1；若某个后继节点入度变为 0，说明其先修课程已全部完成，将其入队
4. **判断结果**：统计出队的节点总数，若等于课程总数则无环（能学完），否则有环（存在循环依赖）

##### 代码

```java
class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // 邻接表建图
        List<List<Integer>> edges = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) edges.add(new ArrayList<>());
        
        // 入度数组
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            edges.get(p[1]).add(p[0]);  // p[1] -> p[0]
            indeg[p[0]]++;
        }

        // 入度为 0 的节点入队
        Queue<Integer> que = new LinkedList<>();
        for (int i = 0; i < numCourses; i++)
            if (indeg[i] == 0) que.offer(i);

        int count = 0;
        while (!que.isEmpty()) {
            int u = que.poll();
            count++;
            for (int v : edges.get(u))
                if (--indeg[v] == 0) que.offer(v);
        }
        
        return count == numCourses;
    }
}
```
