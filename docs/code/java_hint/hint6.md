---
title: hint - i++与++i
date: 2025-12-27
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.74
---

`i++` 对应的 Java 字节码指令主要取决于 **变量 `i` 的类型**（是局部变量还是成员变量）以及 **它在代码中的使用方式**（是单独作为语句还是作为表达式的一部分）

### 1. 局部变量

当 `i` 是方法内的局部 `int` 变量时，Java 编译器会使用专门的指令 `iinc` 进行优化。

#### 情况 A：单独语句 (`i++;`)

如果只是单纯的自增，不涉及赋值给其他变量：

```java
public class Counter {
    int i = 0;
    public void add() {
        i++;
    }
}
```

**对应的字节码：**

```java
0: aload_0          // 加载 'this' 引用
1: dup              // 复制引用（为了 get 和 put）
2: getfield #2      // 获取字段 i 的值 (压入栈)
5: iconst_1         // 准备常量 1
6: iadd             // 执行加法 (栈顶值 + 1)
7: putfield #2      // 将结果写回字段 i
```

- **指令解读：** `iinc` 是一个非常高效的指令，它**直接在局部变量表（Local Variable Table）中修改值**，不需要将数据加载到操作数栈（Operand Stack）上进行计算，再存回去。

#### 情况 B：赋值语句 (`int a = i++;`)

这里涉及“先赋值，后自增”的逻辑，字节码会变得复杂一些：

```java
public void test() {
    int i = 1;
    int a = i++; 
}
```

**对应的字节码：**

```java
0: iconst_1
1: istore_1        // i = 1
2: iload_1         // 步骤1：将 i 的当前值 (1) 压入操作数栈（保留副本用于赋值）
3: iinc 1, 1       // 步骤2：局部变量表中的 i 自增为 2 (此时栈顶还是 1)
6: istore_2        // 步骤3：将栈顶的值 (1) 存入局部变量 a
```

- **关键点：** 这完美解释了为什么 `a = i++` 时，`a` 得到的是旧值。因为 `iload` 在 `iinc` 之前执行，保留了旧值的快照。

### 2. 成员变量

如果 `i` 是类的成员变量（实例变量或静态变量），**不能使用 `iinc` 指令**。因为成员变量存储在堆（Heap）或方法区中，而不是线程私有的局部变量表中

```java
public class Counter {
    int i = 0;
    public void add() {
        i++;
    }
}
```

**对应的字节码**

```java
0: aload_0          // 加载 'this' 引用
1: dup              // 复制引用（为了 get 和 put）
2: getfield #2      // 获取字段 i 的值 (压入栈)
5: iconst_1         // 准备常量 1
6: iadd             // 执行加法 (栈顶值 + 1)
7: putfield #2      // 将结果写回字段 i
```

- **区别：** 这里需要 `getfield` -> `iadd` -> `putfield` 这一套组合拳。
- **并发安全问题：** 正因为成员变量的 `i++` 不是单条指令（原子操作），而是“读-改-写”三个步骤，所以在多线程环境下，**`i++` 是线程不安全的**。

### 3. `i++` 与 `++i` 的字节码对比

很多面试题喜欢问这个，从字节码层面看非常清晰：

| **源代码** | **逻辑顺序** | **关键字节码顺序** |
| --- | --- | --- |
| **`a = i++`** | 先用旧值，再自增 | `iload` (压栈) $\rightarrow$ `iinc` (自增) $\rightarrow$ `istore` (赋值) |
| **`a = ++i`** | 先自增，再用新值 | `iinc` (自增) $\rightarrow$ `iload` (压栈)  $\rightarrow$  `istore` (赋值) |

> 注意： 如果只是单独写一行 i++; 或 ++i;（不赋值给别人），现代编译器生成的字节码通常是完全一样的，都是单纯的 iinc

---

### 总结表

| **变量位置** | **核心指令** | **说明** |
| --- | --- | --- |
| **局部变量 (`int`)** | **`iinc`** | 直接在局部变量槽位修改，极快。 |
| **成员变量 (实例)** | `getfield` + `iadd` + `putfield` | 需要进出操作数栈，非原子操作。 |
| **静态变量 (类)** | `getstatic` + `iadd` + `putstatic` | 同上，操作的是静态字段。 |

其实对于 `i++` 以及 `++i` 用在赋值操作时

后++ 会先将旧值压入操作数栈，然后自增，而赋值就是对应操作数栈里的旧值

先++ 则是先自增，然后将自增完的值入栈，所以对应赋值得到的就是自增后的值了

### `int a = i++ + ++i`

```java
public static void main(String[] args) throws InterruptedException {
    int i = 1;
    int a = i++ + ++i;
    System.out.println(a);
}
```

赋值运算符: 在 `a = b = c` 这种情况下，赋值确实是从右往左进行的（先算 b = c，再算 a = b）

赋值表达式的结果就是所赋的值

这种情况下，最终的结果是 `4`，因为首先执行顺序是 从左往右的，所以必然是 先 `i++` 然后 `++i`

`i++` 其是将原值放到栈里，然后自增自己，所以栈里的第一个元素是 `1` 然后 i 自增到 `2`

而 `++i` 是先自增再存储到栈，所以栈里第二个元素放的是 `3`, 同样 i 也自增到3

因此最终 a 的值对应是 4, i 对应是 3

#### 对应编译字节码

```java
public class com.ekko.Main {
  public com.ekko.Main();
    Code:
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return

  public static void main(java.lang.String[]) throws java.lang.InterruptedException;
    Code:
         0: iconst_1
         // a = 1
         1: istore_1 
         // 将 a 放入栈顶
         2: iload_1
         // 直接自增两次 a = 3
         3: iinc          1, 1
         6: iinc          1, 1
         // 再把 a 放入栈顶 栈里两个元素 3 1
         9: iload_1
        10: iadd
        // 相加 为4
        11: istore_2
        12: getstatic     #2                  // Field java/lang/System.out:Ljava/io/PrintStream;
        15: iload_2
        16: invokevirtual #3                  // Method java/io/PrintStream.println:(I)V
        19: return
}
```

#### 反编译结果

```java
public static void main(String[] args) throws InterruptedException {
    int i = 1;
    int var10000 = i++;
    ++i;
    int a = var10000 + i;
    System.out.println(a);
}
```
