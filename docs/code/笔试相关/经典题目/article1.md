---
title: Alg - 典型题目 (LRU)
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

## LRU

请你设计并实现一个满足  [LRU (最近最少使用) 缓存](https://baike.baidu.com/item/LRU) 约束的数据结构。

实现 `LRUCache` 类：

- `LRUCache(int capacity)` 以 **正整数** 作为容量 `capacity` 初始化 LRU 缓存
- `int get(int key)` 如果关键字 `key` 存在于缓存中，则返回关键字的值，否则返回 `1` 。
- `void put(int key, int value)` 如果关键字 `key` 已经存在，则变更其数据值 `value` ；如果不存在，则向缓存中插入该组 `key-value` 。如果插入操作导致关键字数量超过 `capacity` ，则应该 **逐出** 最久未使用的关键字。

函数 `get` 和 `put` 必须以 `O(1)` 的平均时间复杂度运行

```java
/**
 * 设计思路：HashMap + 双向链表 (Double LinkedList)
 * 1. HashMap: 实现 O(1) 查找，存储 <Key, Node>。
 * 2. 双向链表: 实现 O(1) 删除和插入，维护“最近使用”的顺序。
 * 3. 哨兵节点 (Sentinel): 使用虚拟 head/tail 简化链表边界判断。
 */
class LRUCache {
    // 1. 节点类：必须有 key，因为从链表删末尾时，需要根据 key 去删 map
    static class Node {
        int key, val;
        Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }

    private int cap;
    private Map<Integer, Node> map = new HashMap<>();
    private Node head, tail; // 虚拟头尾节点，省去判空逻辑

    public LRUCache(int capacity) {
        this.cap = capacity;
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    // --- 两个核心辅助动作，背下这两个，剩下的全是拼图 ---

    // 动作A：把节点从当前位置抠出来
    private void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    // 动作B：把节点塞到头节点后面（最常访问位置）
    private void addToHead(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    // --- 业务逻辑 ---

    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key);
        removeNode(node);  // 先抠出来
        addToHead(node);   // 再塞到头
        return node.val;
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) {
            Node node = map.get(key);
            node.val = value; // 更新值
            removeNode(node);
            addToHead(node);
        } else {
            if (map.size() == cap) {
                // 满员了：删末尾（tail之前的那个）
                Node last = tail.prev;
                removeNode(last);
                map.remove(last.key);
            }
            Node newNode = new Node(key, value);
            addToHead(newNode);
            map.put(key, newNode);
        }
    }
}
```
