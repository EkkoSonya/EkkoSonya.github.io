---
title: Alg3 - 集合常用API
date: 2026-4-8
category:
  - code
tag:
  - Alg
  - 笔试相关
# star: true
# sticky: true
order: -0.5
---

## 接口体系

```
Collection
├── Set（无序、无重复）
│   ├── HashSet          // O(1) 增删查，无序
│   ├── LinkedHashSet    // 保持插入顺序
│   └── TreeSet          // 有序（红黑树），O(log n)
├── List（有序、可重复）
│   ├── ArrayList        // 动态数组，O(1) 查，O(n) 增删
│   ├── LinkedList       // 链表，O(n) 查，O(1) 增删头尾
│   └── Vector           // 线程安全的ArrayList（较少用）
└── Queue（队列）
    ├── LinkedList       // 普通队列
    ├── PriorityQueue    // 优先级队列（小根堆）
    ├── Deque            // 双端队列
    │   └── LinkedList/ArrayDeque
    └── BlockingQueue    // 阻塞队列（多线程）

Map（键值对，无重复键）
├── HashMap              // O(1) 平均，无序
├── LinkedHashMap        // 保持插入顺序
├── TreeMap              // 有序（红黑树），O(log n)
├── Hashtable            // 线程安全（较少用）
└── ConcurrentHashMap    // 线程安全的HashMap
```

## 常用方法速查

```java
// Set
Set<Integer> set = new HashSet<>();
set.add(1);
set.contains(1);        // O(1)
set.remove(1);

// List
List<Integer> list = new ArrayList<>();
list.add(1);
list.get(0);            // O(1)
list.remove(0);         // O(n)
list.size();

// Map
Map<Integer, Integer> map = new HashMap<>();
map.put(1, 100);
map.get(1);             // O(1)
map.containsKey(1);
map.values();           // 获取所有值
map.entrySet();         // 遍历键值对

// Queue / Deque
Queue<Integer> q = new LinkedList<>();
q.offer(1);             // 入队
q.poll();               // 出队（队空返回null）
q.peek();               // 查看队头（队空返回null）

Deque<Integer> dq = new ArrayDeque<>();
dq.addFirst(1);         // 头部插入
dq.addLast(1);          // 尾部插入
dq.removeFirst();
dq.removeLast();

// PriorityQueue（小根堆）
PriorityQueue<Integer> pq = new PriorityQueue<>();
pq.offer(5);
pq.poll();              // 取出最小值
pq.peek();

// 大根堆
PriorityQueue<Integer> maxPq = 
    new PriorityQueue<>((a, b) -> b - a);
```

## **高频场景选择**

| 场景 | 推荐 | 复杂度 |
| --- | --- | --- |
| 去重 | `HashSet` | O(1) |
| 计数 | `HashMap` | O(1) |
| TopK最大/最小 | `PriorityQueue` | O(log n) |
| 需要有序 | `TreeSet/TreeMap` | O(log n) |
| 保持插入顺序 | `LinkedHashMap` | O(1) |
| BFS/滑动窗口 | `Queue/Deque` | O(1) |
| LRU缓存 | `LinkedHashMap` | O(1) |
| 范围查询 | `TreeMap` | O(log n) |

## **详细方法速查**

### HashSet

```java
Set<Integer> set = new HashSet<>();
set.add(1);                    // 添加，重复返回false
set.addAll(Arrays.asList(2,3)); // 批量添加
set.contains(1);               // O(1) 查询
set.remove(1);                 // 删除
set.clear();                   // 清空
set.size();
```

### ArrayList

```java
List<Integer> list = new ArrayList<>();
list.add(1);                   // 末尾添加
list.add(0, 99);               // 指定位置添加，O(n)
list.get(0);                   // O(1) 查询
list.set(0, 99);               // 修改
list.remove(0);                // O(n) 删除
list.indexOf(1);               // 查找位置
list.subList(0, 2);            // [0,2) 子列表
list.size();
```

### LinkedList

```java
LinkedList<Integer> list = new LinkedList<>();
list.addFirst(1);              // 头部添加，O(1)
list.addLast(1);               // 尾部添加，O(1)
list.getFirst();               // 获取第一个
list.getLast();                // 获取最后一个
list.removeFirst();            // 头部删除，O(1)
list.removeLast();             // 尾部删除，O(1)
list.peekFirst();              // 查看头部（安全）
list.peekLast();               // 查看尾部（安全）
```

### HashMap

```java
Map<String, Integer> map = new HashMap<>();
map.put("a", 1);               // 添加/覆盖
map.putIfAbsent("b", 2);       // 不存在才添加
map.get("a");                  // O(1) 查询
map.getOrDefault("a", 0);      // 不存在返回默认值
map.containsKey("a");          // 键存在？
map.containsValue(1);          // 值存在？
map.remove("a");               // 删除
map.clear();                   // 清空
map.size();

// 遍历
for(Map.Entry<String, Integer> e : map.entrySet()) {
    String k = e.getKey();
    Integer v = e.getValue();
}
map.forEach((k, v) -> {});

// 计算
map.compute("a", (k, v) -> v + 1);
map.computeIfAbsent("a", k -> 0);
```

### TreeMap

```java
TreeMap<Integer, String> map = new TreeMap<>();
map.put(1, "a");
map.get(1);
map.remove(1);

// 有序特性
map.firstKey();                // 最小键
map.lastKey();                 // 最大键
map.headMap(5);                // <5 的部分
map.tailMap(5);                // ≥5 的部分
map.subMap(1, 5);              // [1,5) 的部分
map.floorKey(5);               // ≤5 的最大键
map.ceilingKey(5);             // ≥5 的最小键
```

### LinkedHashMap（LRU缓存）

```java
// 保持插入顺序
LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.put("a", 1);

// LRU 实现
LinkedHashMap<String, Integer> lru = 
    new LinkedHashMap<String, Integer>(16, 0.75f, true) {
        protected boolean removeEldestEntry(Map.Entry eldest) {
            return size() > 100;
        }
    };
```

### TreeSet

```java
TreeSet<Integer> set = new TreeSet<>();
set.add(1);
set.remove(1);

// 有序特性
set.first();                   // 最小元素
set.last();                    // 最大元素
set.floor(5);                  // ≤5 的最大元素
set.ceiling(5);                // ≥5 的最小元素
set.headSet(5);                // <5 的部分
set.tailSet(5);                // ≥5 的部分
```

### PriorityQueue（堆）

```java
// 小根堆（默认）
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.offer(5);              // 入堆，O(log n)
minHeap.poll();                // 出堆（最小），O(log n)
minHeap.peek();                // 查看堆顶，O(1)
minHeap.size();

// 大根堆
PriorityQueue<Integer> maxHeap = 
    new PriorityQueue<>((a, b) -> b - a);

// 自定义对象排序
PriorityQueue<Person> pq = 
    new PriorityQueue<>((p1, p2) -> p1.age - p2.age);

// ❌ 没有 get()、remove(Object) 效率高的方法
```

### Queue（FIFO）

```java
Queue<Integer> q = new LinkedList<>();
q.offer(1);                    // 入队
q.poll();                      // 出队（空返回null）
q.peek();                      // 查看队头（空返回null）
q.remove();                    // 出队（空异常）
q.element();                   // 查看队头（空异常）
q.size();
```

### Deque（双端队列）

```java
Deque<Integer> dq = new ArrayDeque<>();

// 头部操作
dq.addFirst(1);                // 头部添加
dq.pollFirst();                // 头部删除（空返回null）
dq.peekFirst();                // 查看头部

// 尾部操作
dq.addLast(1);                 // 尾部添加
dq.pollLast();                 // 尾部删除
dq.peekLast();                 // 查看尾部

// 栈操作
dq.push(1);                    // = addFirst
dq.pop();                      // = removeFirst
dq.peek();                     // = peekFirst
```

### Collections 工具类

```java
List<Integer> list = Arrays.asList(3, 1, 2);

Collections.sort(list);        // 升序
Collections.sort(list, (a, b) -> b - a); // 降序
Collections.reverse(list);     // 反转
Collections.shuffle(list);     // 随机打乱
Collections.max(list);         // 最大值
Collections.min(list);         // 最小值
Collections.frequency(list, 1); // 元素出现次数
Collections.binarySearch(list, 2); // 二分查找

// 线程安全
Map<String, Integer> syncMap = 
    Collections.synchronizedMap(new HashMap<>());
```

## **时间复杂度对比**

| 操作 | HashMap | TreeMap | ArrayList | LinkedList |
| --- | --- | --- | --- | --- |
| get | O(1) | O(log n) | O(1) | O(n) |
| put | O(1) | O(log n) | O(n) | O(n) |
| remove | O(1) | O(log n) | O(n) | O(n) |
| containsKey | O(1) | O(log n) | O(n) | O(n) |

## **易错点**

```java
// ❌ PriorityQueue 没有 get()，无法高效遍历
// ✅ 用 peek() 查看，poll() 取出

// ❌ ArrayList remove(int) 导致元素移动 O(n)
// ✅ 大量删除用 LinkedList 或迭代器删除

// ❌ HashMap 线程不安全
// ✅ 多线程用 ConcurrentHashMap

// ❌ for(int i) 遍历 HashMap 会报错
// ✅ 用 entrySet()、keySet()、values()
```
