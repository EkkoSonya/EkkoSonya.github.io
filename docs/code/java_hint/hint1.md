---
title: hint - List初始化
date: 2025-06-16
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

带初始值的初始化

- 如果是 `java 9+`, 可以直接使用 `list.of`
  
  ```java
  List<String> list = List.of("a", "b", "c");
  ```

  ```java
  List<String> list = List.of(
    new Student("aaa",1),
    new Student("bbb",2),
    new Student("ccc",3),
  );
  ```
  
  这种方式创建的列表 不可修改，`add()` 和 `remove()` 都会抛出 `UnsupportedOperationException`。

- 但如果是 `java 8`，就没有这个，可以使用 `Stream`
  
  ```java
    List<Student> list1 = Stream.of(
        new Student("Alice", 20),
        new Student("Bob", 21),
        new Student("Charlie", 22)
    ).collect(Collectors.toList());
  ```

| 特性                     | `List.of(...)`                        | `Stream.of(...).collect(Collectors.toList())` |
|--------------------------|----------------------------------------|------------------------------------------------|
| Java 版本要求            | Java 9 及以上                          | Java 8 及以上                                  |
| 是否可变                 | ❌ 不可变（immutable）                | ✅ 可变（mutable）                             |
| 是否支持增删元素         | ❌ 抛出 `UnsupportedOperationException` | ✅ 支持 `.add()` / `.remove()` 等操作         |
| 是否允许包含 `null`      | ❌ 不允许，包含会抛出 `NullPointerException` | ✅ 允许包含 `null`                           |
| 是否简洁                 | ✅ 更简洁                              | 较繁琐，但功能灵活                             |
| 实际返回的 List 类型      | 通常为 `ImmutableCollections.ListN`    | 通常为 `ArrayList`                             |
