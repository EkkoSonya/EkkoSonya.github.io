---
title: Java集合3 - Map
date: 2026-3-17
category:
  - code
tag:
  - java
  - Collections
# star: true
# sticky: true
order: -0.5
---

## Java 集合

![alt text](img/1.png)

### Map

常见的Map集合 (非线程安全)：

- `HashMap`: 是基于**哈希表**实现的Map，它根据**键的哈希值来存储和获取键值对**，JDK 1.8中是用**数组+链表+红黑树来实现的**
  - HashMap是非线程安全的，在多线程环境下，当多个线程同时对HashMap进行操作时，可能会导致数据不一致或出现死循环等问题。比如在扩容时，多个线程可能会同时修改哈希表的结构，从而破坏数据的完整性。
- `LinkedHashMap`: 继承自HashMap，它在HashMap的基础上，使用**双向链表**维护了键值对的插入顺序或访问顺序，使得迭代顺序与插入顺序或访问顺序一致。
  - 由于它继承自HashMap，在多线程并发访问时，同样会出现与HashMap类似的线程安全问题。
- `TreeMap`: 是基于**红黑树**实现的Map，它可以对键进行排序，默认按照自然顺序排序，也可以通过指定的比较器进行排序
  - TreeMap是非线程安全的，在多线程环境下，如果多个线程同时对TreeMap进行插入、删除等操作，可能会破坏红黑树的结构，导致数据不一致或程序出现异常

常见的Map集合（线程安全）：

- `Hashtable`: 是早期 Java 提供的线程安全的Map实现，它的实现方式与HashMap类似，但在方法上使用了synchronized关键字来保证线程安全。通过在每个可能修改Hashtable状态的方法上加上synchronized关键字，使得在同一时刻，只能有一个线程能够访问Hashtable的这些方法，从而保证了线程安全。
- `ConcurrentHashMap`: 在 JDK 1.8 以前采用了分段锁等技术来提高并发性能。在ConcurrentHashMap中，将数据分成多个段（Segment），每个段都有自己的锁。在进行插入、删除等操作时，只需要获取相应段的锁，而不是整个Map的锁，这样可以允许多个线程同时访问不同的段，提高了并发访问的效率。在 JDK 1.8 以后是通过 volatile + CAS 或者 synchronized 来保证线程安全的

#### 常用方法

##### 增加元素

```java
V put(K key, V value)                           // 添加键值对，返回旧值（如果存在）
void putAll(Map<? extends K, ? extends V> m)    // 批量添加
V putIfAbsent(K key, V value)                   // 键不存在时才添加
```

##### 删除元素

```java
V remove(Object key)                            // 删除指定键，返回对应值
boolean remove(Object key, Object value)        // 键值都匹配时才删除
void clear()                                    // 清空 Map
```

##### 修改元素

```java
V replace(K key, V value)                       // 替换指定键的值
boolean replace(K key, V oldValue, V newValue)  // 旧值匹配时才替换
```

##### 查询元素

```java
V get(Object key)                               // 获取指定键的值
V getOrDefault(Object key, V defaultValue)      // 获取值，不存在返回默认值
boolean containsKey(Object key)                 // 是否包含指定键
boolean containsValue(Object value)             // 是否包含指定值
```

##### Map 信息

```java
int size()                                      // 键值对数量
boolean isEmpty()                               // 是否为空
```

##### 视图操作

```java
Set<K> keySet()                                 // 获取所有键的集合
Collection<V> values()                          // 获取所有值的集合
Set<Map.Entry<K, V>> entrySet()                 // 获取所有键值对的集合
```

##### java 8+ 新增方法

```java
void forEach(BiConsumer<? super K, ? super V> action)  // 遍历所有键值对
V compute(K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction)  // 计算新值
V computeIfAbsent(K key, Function<? super K, ? extends V> mappingFunction)  // 键不存在时计算
V computeIfPresent(K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction)  // 键存在时计算
V merge(K key, V value, BiFunction<? super V, ? super V, ? extends V> remappingFunction)  // 合并值
```
