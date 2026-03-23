---
title: JUC 八股6 - ThreadLocal2
date: 2026-03-23
category:
  - code
tag:
  - java
  - juc
  - 八股
# star: true
# sticky: true
order: -0.5
---

## ThreadLocal2

### 内存泄露

ThreadLocalMap 的 Key 是 弱引用，但 Value 是强引用。

如果一个线程一直在运行，并且 value 一直指向某个强引用对象，那么这个对象就不会被回收，从而导致内存泄漏。

问题场景：ThreadLocal 对象本身没人引用了，但线程还在运行（比如线程池的核心线程）

#### 解决内存泄露

使用完 ThreadLocal 后，及时调用 remove() 方法释放内存空间

```java
try {
    threadLocal.set(value);
    // 执行业务操作
} finally {
    threadLocal.remove(); // 确保能够执行清理
}
```

remove() 会调用 ThreadLocalMap 的 remove 方法遍历哈希表，找到 key 等于当前 ThreadLocal 的 Entry，找到后会调用 Entry 的 clear 方法，将 Entry 的 value 设置为 null

```java
private void remove(ThreadLocal<?> key) {
    Entry[] tab = table;
    int len = tab.length;
    // 计算 key 的 hash 值
    int i = key.threadLocalHashCode & (len-1);
    // 遍历数组，找到 key 为 null 的 Entry
    for (Entry e = tab[i];
            e != null;
            e = tab[i = nextIndex(i, len)]) {
        if (e.get() == key) {
            // 将该 Entry 的 key 置为 null（即 Entry 失效）
            e.clear();
            // 清理过期的 entry
            expungeStaleEntry(i);
            return;
        }
    }
}

public void clear() {
    this.referent = null;
}
```

然后执行 expungeStaleEntry() 方法，清除 key 为 null 的 Entry

#### 什么时候 remove

不是每次操作都 remove，主要是根据使用场景来决定的。在一些短生命周期的场景中，比如处理单个 HTTP 请求的上下文信息，我通常会在请求结束时统一 remove

但在一些需要跨多个方法调用保持状态的场景中，就不会每次都 remove。

我的使用原则是：

- 在方法级别使用时，try-finally 保证 remove
- 在请求级别使用时，通过拦截器或 Filter 统一清理
- 如果存储的对象比较大，使用完立即 remove
- 定期检查 ThreadLocal 的使用情况，避免遗漏

#### key 为什么要弱引用

弱引用的好处是，当内存不足的时候，JVM 能够及时回收掉弱引用的对象

key 是弱引用，new WeakReference(new ThreadLocal()) 是弱引用对象，当 JVM 进行垃圾回收时，只要发现了弱引用对象，就会将其回收。

一旦 key 被回收，ThreadLocalMap 在进行 set、get 的时候就会对 key 为 null 的 Entry 进行清理

总结一下，在 ThreadLocal 被垃圾收集后，下一次访问 ThreadLocalMap 时，Java 会自动清理那些键为 null 的 entry，这个过程会在执行 get()、set()、remove()时触发

#### 分析

> 问题场景：ThreadLocal 对象本身没人引用了，但线程还在运行（比如线程池的核心线程）
>
> value 强引用是避免数据丢失，如果我们还要用到

如果 value 也是弱引用

```java
ThreadLocal<User> tl = new ThreadLocal<>();
tl.set(new User("111"));

// 假设没有其他强引用指向这个 User
User u = null;
```

下次 GC 时：

- User 对象被回收（只有 Entry.value 指着它，是弱引用）
- 你再 tl.get() 拿到 null

如果 value 是弱引用，用户根本无法控制何时被回收，这个 API 就没法用了

所以，虽然 map 里的 key 是弱引用，可能会被 gc 回收 (仅当 ThreadLocal 对象本身没人引用，只有这个弱引用在)

那么说明这个本身就没有意义了，所以 `get()` 时会检测这些没有意义的数据，清理

```java
// ThreadLocal.java
public T get() {
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null) {
        ThreadLocalMap.Entry e = map.getEntry(this);
        if (e != null) {
            @SuppressWarnings("unchecked")
            T result = (T)e.value;
            return result;
        }
    }
    return setInitialValue();
}

static class ThreadLocalMap {
    ...
    private Entry[] table;
    ...
    private Entry getEntry(ThreadLocal<?> key) {
        // 根据这个 threadlocal 的hash算对应索引为止
        int i = key.threadLocalHashCode & (table.length - 1);
        Entry e = table[i];
        // 判断 Entry 的弱引用 key 是否还指向 key 这个对象
        if (e != null && e.refersTo(key))
            return e;
        else
            // key 可能被gc了获取 e==null
            return getEntryAfterMiss(key, i, e);
    }
    ...
}
```

当通过 hash & (len-1) 计算出的位置上没找到目标 ThreadLocal，或者该位置被其他 ThreadLocal 占了，就需要线性探测往后找

```java
private Entry getEntryAfterMiss(ThreadLocal<?> key, int i, Entry e) {
    Entry[] tab = table;
    int len = tab.length;

    while (e != null) {
        if (e.refersTo(key))
            return e;
        if (e.refersTo(null))
            expungeStaleEntry(i);
        else
            i = nextIndex(i, len);
        e = tab[i];
    }
    return null;
}
```
