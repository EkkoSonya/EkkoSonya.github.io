---
title: Alg1 - ACM 模式
date: 2026-4-7
category:
  - code
tag:
  - Alg
  - 笔试相关
# star: true
# sticky: true
order: -0.5
---

## ACM 模式(输入输出)

### Scanner 类

`Scanner` 是 Java 中用于解析基本类型和字符串的简单文本扫描器，位于 `java.util` 包中

`Scanner` 的核心逻辑是**基于分隔符（Delimiter）将输入拆分为标记（Tokens）**。

- **默认分隔符**：空白符（包括空格、回车 `\n`、制表符 `\t` 等）。
- **解析方式**：它不仅能读字符串，还能自动尝试将标记转换为 `int`、`double` 等基本类型

本质上就是建立一个输入流读取器，通过分隔符界定标记（token）的边界，逐个从缓冲区消耗数据，并可自动转换为指定类型（int、double 等）

#### 常用方法一览

**读取类方法**（真正消耗缓冲区，没有数据时阻塞等待）：

| 方法 | 返回类型 | 切割方式 | 说明 |
| --- | --- | --- | --- |
| `next()` | String | **按分隔符** | 读取下一个标记（遇到空格/换行停止） |
| `nextInt()` / `nextLong()` | int/long | **按分隔符** | 读取并解析为整数 |
| `nextDouble()` | double | **按分隔符** | 读取并解析为浮点数 |
| `nextBoolean()` | boolean | **按分隔符** | 读取并解析为布尔值 |
| `nextLine()` | String | **按换行符** | 读取整行（包括空格，但不包括换行符） |

**判断类方法**（只查看不消耗，没有数据时阻塞等待）：

| 方法 | 返回类型 | 说明 |
| --- | --- | --- |
| `hasNext()` | boolean | 是否还有下一个标记 |
| `hasNextInt()` / `hasNextLong()` | boolean | 是否还有下一个整数 |
| `hasNextDouble()` | boolean | 是否还有下一个浮点数 |

**资源管理**：

| 方法 | 说明 |
| --- | --- |
| `close()` | 关闭扫描器，释放资源 |

#### 核心机制：分隔符与缓冲区

**分隔符的作用**：Scanner 用它来"切割"输入，区分不同的标记（Tokens）

**默认分隔符**：空白符（空格、制表符 `\t`）  
**换行符处理**：`\n` 既是分隔符，也是行结束标记

示例输入：

```
5 apple 3.14
```

Scanner 切割结果：

- `5` → `nextInt()`
- `apple` → `next()`
- `3.14` → `nextDouble()`

---

**缓冲区机制**（必须理解的核心！）

```
用户输入 "5 apple" ↓
缓冲区: "5 apple\n" ↓
Scanner 逐个消耗标记
```

**关键规则**：

- **读取方法** (`next()`, `nextInt()`, `nextLine()`) → 消耗缓冲区数据
- **判断方法** (`hasNext()`, `hasNextInt()`) → 只查看，不消耗
- **类型不匹配** → 数据**留在缓冲区**，等待处理

---

**三个必记的场景对比**

| 场景 | 输入 | 缓冲区状态 | 后果 |
| --- | --- | --- | --- |
| `nextInt()` 成功 | `5 apple` | `5` 被消耗，`apple\n` 留下 | ✅ 继续读取 |
| `nextInt()` 失败 | `apple 5` | `apple` **留在缓冲区** | ❌ 抛异常，需手动清空 |
| `nextInt()` + `nextLine()` | `5↵` | 换行符 `\n` 未被消耗 | ❌ `nextLine()` 返回空串 |

#### 常见陷阱与解决方案

##### ⚠️ 陷阱1：`nextInt()` + `nextLine()` 组合

**现象**：`nextInt()` 读取一个数字，`nextLine()` 返回空串而不是下一行

**原因**：`nextInt()` 只消耗数字，**不消耗换行符 `\n`**

```
缓冲区变化：
"5 hello\n"
 ↓ nextInt()
" hello\n"  （只消耗了 5，换行符还在！）
 ↓ nextLine()
""（直接遇到换行符，返回空串）
```

**解决方案**：`nextInt()` 后加一行 `sc.nextLine();` 清空换行符

```java
int n = sc.nextInt();
sc.nextLine();  // 吃掉换行符！
String line = sc.nextLine();  // 正常读取下一行
```

---

##### ⚠️ 陷阱2：类型不匹配导致无限循环

**现象**：用户输入非整数，`nextInt()` 抛异常，程序卡死

**原因**：抛异常后数据仍留在缓冲区，循环一直卡在同一行

```java
// ❌ 错误做法
while (true) {
    int n = sc.nextInt();  // 输入 "abc" → 抛异常
    // 无法进行下去，abc 仍在缓冲区
}
```

**解决方案**：先用 `hasNext()` 判断，再决定是否读取

```java
// ✅ 正确做法
while (!sc.hasNextInt()) {
    System.out.println("请输入整数！");
    sc.next();  // 清除无效数据
}
int n = sc.nextInt();  // 安全读取
```

---

#### 速记问答

| 问题 | 答案 |
| --- | --- |
| `next()` 和 `nextLine()` 有什么区别？ | `next()` 按空白符切割（不读换行），`nextLine()` 按换行切割（读整行含空格） |
| 为什么 `nextInt() + nextLine()` 出问题？ | `nextInt()` 不消耗换行符，`nextLine()` 直接遇到换行返回空串 |
| 类型不匹配时数据去哪了？ | 留在缓冲区，需要用 `next()` 或 `nextLine()` 手动清除 |
| 什么时候会阻塞等待？ | 所有 `next...()` 和 `hasNext...()` 方法都会在缓冲区无数据时阻塞 |

### 示例

#### 快速上手模版

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // 建议写法：配合 hasNext 使用，防止读取异常
        while (sc.hasNextInt()) {
            int n = sc.nextInt();
            // 处理逻辑
            System.out.println("Input: " + n);
        }
        
        sc.close(); // 良好的习惯是在结束时关闭流
    }
}
```

#### 数组类

##### 单行输入，先给数组长度 n，再给 n 个元素

- 输入示例：5 1 2 3 4 5（第一个数是 n，后面是 n 个元素）
- 输出示例：1 2 3 4 5（空格分隔输出）

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // 1. 先读数组长度n
        int n = sc.nextInt();
        int[] arr = new int[n];
        // 2. 循环读n个元素
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
        }
        // 3. 执行算法（这里以直接输出为例）
        printArray(arr);
        sc.close();
    }

    // 辅助：输出数组（避免最后一个空格）
    public static void printArray(int[] arr) {
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) System.out.print(" ");
            System.out.print(arr[i]);
        }
        System.out.println();
    }
}
```

##### 单行输入，不给长度，直接给元素

- 输入示例：1 2 3 4 5（只有元素，无 n）
- 输出示例：1 2 3 4 5

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // 1. 读一整行，按空格分割
        String line = sc.nextLine();
        String[] strs = line.split(" ");
        // 2. 转成int数组
        int[] arr = new int[strs.length];
        for (int i = 0; i < strs.length; i++) {
            arr[i] = Integer.parseInt(strs[i]);
        }
        // 3. 执行算法+输出
        printArray(arr);
        sc.close();
    }

    public static void printArray(int[] arr) { /* 同上，复用 */ }
}
```

- 读一行 split，遍历转类型；长度不用给，数组自动定

#### 链表类

链表题必须自己定义 `ListNode`，输入通常是一行节点值

- 输入示例：1 2 3 4 5（节点值空格分隔）
- 输出示例：1→2→3→4→5（或空格分隔）
