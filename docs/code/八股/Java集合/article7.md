---
title: Java集合7 - Set
date: 2026-3-19
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

### Set

#### HashSet 的底层实现

HashSet 是由 HashMap 实现的，只不过值由一个固定的 Object 对象填充，而键用于操作

```java
public class HashSet<E>
    extends AbstractSet<E>
    implements Set<E>, Cloneable, java.io.Serializable
{
  static final long serialVersionUID = -5024744406713321676L;
  private transient HashMap<E,Object> map;
  // Dummy value to associate with an Object in the backing Map
  private static final Object PRESENT = new Object();
  // ……
}
```

实际开发中，HashSet 并不常用，比如，如果我们需要按照顺序存储一组元素，那么 ArrayList 和 LinkedList 更适合；如果我们需要存储键值对并根据键进行查找，那么 HashMap 可能更适合

HashSet 主要用于去重，比如，我们需要统计一篇文章中有多少个不重复的单词，就可以使用 HashSet 来实现

HashSet 会自动去重，因为它是用 HashMap 实现的，HashMap 的键是唯一的，相同键会覆盖掉原来的键，于是第二次 add 一个相同键的元素会直接覆盖掉第一次的键

#### HashSet 和 ArrayList 的区别

- ArrayList 是基于动态数组实现的，HashSet 是基于 HashMap 实现的。
- ArrayList 允许重复元素和 null 值，可以有多个相同的元素；HashSet 保证每个元素唯一，不允许重复元素，基于元素的 hashCode 和 equals 方法来确定元素的唯一性。
- ArrayList 保持元素的插入顺序，可以通过索引访问元素；HashSet 不保证元素的顺序，元素的存储顺序依赖于哈希算法，并且可能随着元素的添加或删除而改变

#### HashSet 怎么判断元素重复，重复了是否 put

HashSet 的 add 方法是通过调用 HashMap 的 put 方法实现的

```java
public boolean add(E e) {
  return map.put(e, PRESENT)==null;
}
```

所以 HashSet 判断元素重复的逻辑底层依然是 HashMap 的底层逻辑

![](./img/7.png)
