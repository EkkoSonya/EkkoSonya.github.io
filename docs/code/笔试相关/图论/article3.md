---
title: Alg - 图论3 前缀树 (Trie)
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

## 概念

**Trie**（发音 "try"，又称前缀树、字典树）是一种树形数据结构，用于高效存储和检索字符串。

### 核心思想

利用字符串的**公共前缀**来减少存储空间和查询时间。

### 结构图示

存储 `["app", "apple", "apply", "bat"]` 的结构：

```
        (root)
       /      \
      a        b
      |        |
      p        a
      |        |
      p*       t*
    / | \
   l  l  e*
   |  |
   y* e*
      |
      *
```

- `*` 表示 isEnd = true（单词结尾）
- 公共前缀 `app` 只存储一次

---

## 节点结构

```java
class TrieNode {
    TrieNode[] children;  // 子节点数组，通常长度为 26（小写字母）
    boolean isEnd;        // 是否为单词结尾

    public TrieNode() {
        children = new TrieNode[26];
        isEnd = false;
    }
}
```

**为什么用数组而不是 HashMap？**

| 方式 | 空间 | 查询时间 | 适用场景 |
| --- | --- | --- | --- |
| 数组 | 固定 26 | O(1) | 字符集固定且小（如小写字母） |
| HashMap | 动态 | O(1) | 字符集大或不确定（如 Unicode） |

---

## 基本操作

### 插入

```java
void insert(String word) {
    TrieNode node = root;
    for (char c : word.toCharArray()) {
        int idx = c - 'a';
        if (node.children[idx] == null) {
            node.children[idx] = new TrieNode();
        }
        node = node.children[idx];
    }
    node.isEnd = true;
}
```

### 查找

```java
boolean search(String word) {
    TrieNode node = find(word);
    return node != null && node.isEnd;
}
```

### 前缀匹配

```java
boolean startsWith(String prefix) {
    return find(prefix) != null;
}

// 辅助方法：查找前缀，返回末尾节点
TrieNode find(String prefix) {
    TrieNode node = root;
    for (char c : prefix.toCharArray()) {
        int idx = c - 'a';
        if (node.children[idx] == null) return null;
        node = node.children[idx];
    }
    return node;
}
```

---

## 完整实现

```java
class Trie {
    private Trie[] children;
    private boolean isEnd;

    public Trie() {
        children = new Trie[26];
        isEnd = false;
    }

    public void insert(String word) {
        Trie node = this;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) {
                node.children[idx] = new Trie();
            }
            node = node.children[idx];
        }
        node.isEnd = true;
    }

    public boolean search(String word) {
        Trie node = find(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private Trie find(String prefix) {
        Trie node = this;
        for (char c : prefix.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) return null;
            node = node.children[idx];
        }
        return node;
    }
}
```

---

## 复杂度分析

设字符串平均长度为 L，字符串数量为 N。

| 操作 | 时间复杂度 | 说明 |
| --- | --- | --- |
| insert | O(L) | 遍历字符串长度 |
| search | O(L) | 同上 |
| startsWith | O(L) | 同上 |

**空间复杂度**：最坏 O(N × L × 26)，实际远小于此（因为有公共前缀）

---

## 应用场景

| 场景 | 说明 |
| --- | --- |
| 自动补全 | 输入前缀，返回所有匹配词 |
| 拼写检查 | 快速判断单词是否存在 |
| 词频统计 | 节点增加 count 字段 |
| 字符串排序 | 先序遍历即可按字典序输出 |
| 前缀匹配 | 搜索引擎关键词提示 |

---

## 进阶操作

### 查找所有以某前缀开头的单词

```java
List<String> findAllWithPrefix(String prefix) {
    List<String> result = new ArrayList<>();
    TrieNode node = find(prefix);
    if (node != null) {
        dfs(node, prefix, result);
    }
    return result;
}

void dfs(TrieNode node, String path, List<String> result) {
    if (node.isEnd) {
        result.add(path);
    }
    for (int i = 0; i < 26; i++) {
        if (node.children[i] != null) {
            dfs(node.children[i], path + (char)('a' + i), result);
        }
    }
}
```

### 删除单词

```java
// 简单版本：只标记 isEnd = false（不真正删除节点）
void delete(String word) {
    TrieNode node = find(word);
    if (node != null && node.isEnd) {
        node.isEnd = false;
    }
}
```

---

## 经典例题

| 题目 | 题号 | 难度 | 要点 |
| --- | --- | --- | --- |
| 实现 Trie | LeetCode 208 | 中 | 基本操作 |
| 添加与搜索单词 | LeetCode 211 | 中 | 支持通配符 |
| 单词搜索 II | LeetCode 212 | 困 | Trie + DFS |
| 替换单词 | LeetCode 648 | 中 | 前缀匹配 |
| 键值映射 | LeetCode 677 | 中 | 存储权值 |

---

## 面试常见问题

**Q: Trie 和 HashMap 的区别？**

| 特性 | Trie | HashMap |
| --- | --- | --- |
| 前缀匹配 | 支持 | 不支持 |
| 空间效率 | 公共前缀共享 | 每个字符串独立存储 |
| 查询时间 | O(L) | O(L)（计算哈希） |
| 实现复杂度 | 较复杂 | 简单 |

**Q: 什么时候用 Trie？**

- 需要**前缀匹配**功能
- 字符串有大量**公共前缀**
- 需要**按字典序遍历**

**Q: 如何优化空间？**

- 用 HashMap 替代数组（字符集大时）
- 双数组 Trie（高级实现）
- 压缩前缀树（合并单分支路径）
