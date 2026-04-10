---
title: Alg2 - String 常用API
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

## String 常用 API

### 1. 长度和判空

```java
String s = "hello";
int n = s.length();        // 5
boolean empty = s.isEmpty(); // false
```

### 2. 取字符

```java
char c = s.charAt(0);      // 'h'
char[] chars = s.toCharArray(); // 转为字符数组
```

### 3. 截取子串

```java
String sub1 = s.substring(1);     // "ello"，从索引1到末尾
String sub2 = s.substring(1, 3);  // "el"，[1,3)
String sub3 = s.substring(0, 1);  // "h"，第一个字符
```

### 4. 比较

```java
s.equals("hello");           // true，完全相等
s.equalsIgnoreCase("HELLO"); // true，忽略大小写
s.compareTo("hello");        // 0，字典序比较
// 不要用 == 比较字符串内容！== 比的是引用
```

### 5. 查找和定位

```java
s.contains("ll");            // true，包含子串
s.indexOf("l");              // 2，第一次出现位置
s.indexOf("l", 3);           // 3，从索引3开始查找
s.lastIndexOf("l");          // 3，最后出现位置
s.startsWith("he");          // true
s.endsWith("lo");            // true
s.startsWith("el", 1);       // true，从索引1开始
```

### 6. 大小写转换

```java
s.toLowerCase();             // "hello"
s.toUpperCase();             // "HELLO"
s.toLowerCase().toUpperCase(); // 链式调用
```

### 7. 去空格

```java
String str = "  hello world  ";
str.trim();                  // "hello world"，去首尾空格
str.strip();                 // Java 11+，更强大
```

### 8. 分割和替换

```java
String[] arr = "a,b,c".split(","); // ["a", "b", "c"]
String[] arr2 = "a b  c".split(" +"); // 正则：多个空格

String replaced = s.replace("l", "L");      // "heLLo"，全部替换
String replaced2 = s.replaceFirst("l", "L"); // "heLlo"，替换第一个
String replaced3 = s.replaceAll("[aeiou]", "*"); // 正则替换

// 重复
String repeat = "ab".repeat(3);   // "ababab"，Java 11+
```

### 9. 连接和格式化

```java
// 连接
String concat = "Hello" + " " + "World"; // "Hello World"
String joined = String.join(",", "a", "b", "c"); // "a,b,c"

// 格式化
String formatted = String.format("Hello %s, age %d", "Alice", 25);
// "Hello Alice, age 25"

// StringBuilder（高效拼接）
StringBuilder sb = new StringBuilder();
sb.append("Hello");
sb.append(" ");
sb.append("World");
String result = sb.toString(); // "Hello World"
```

### 10. 类型转换

```java
String s1 = String.valueOf(123);    // "123"
String s2 = String.valueOf(true);   // "true"
String s3 = String.valueOf(3.14);   // "3.14"

Integer num = Integer.parseInt("123");        // 123
Double d = Double.parseDouble("3.14");        // 3.14
Boolean b = Boolean.parseBoolean("true");     // true
```

### 11. 其他常用方法

```java
// 匹配
boolean match = "123".matches("\\d+"); // 正则匹配
s.matches("[a-z]+");                   // 全小写字母

// 字符替换
String s = "hello";
s.codePointAt(0);        // 'h' 的Unicode值
String.valueOf('A');     // "A"

// 字符串前缀/后缀（Java 11+）
"hello".stripLeading();  // 去前导空格
"hello".stripTrailing(); // 去尾部空格

// 获取第n个子字符串的索引
int idx = "a-b-c".indexOf("-", 0); // 从0开始找
```

## **常见场景速查**

| 场景 | 方法 |
| --- | --- |
| 检查是否为空 | `isEmpty()` 或 `length() == 0` |
| 忽略大小写比较 | `equalsIgnoreCase()` |
| 分割字符串 | `split("正则")` 或 `split(",")` |
| 去首尾空格 | `trim()` |
| 字符串拼接 | `StringBuilder` 或 `String.join()` |
| 替换内容 | `replace()/replaceAll()` |
| 大小写转换 | `toLowerCase()/toUpperCase()` |
| 查找位置 | `indexOf()/lastIndexOf()` |
| 提取子串 | `substring()` |
| 逐字遍历 | `for(char c : s.toCharArray())` |

## **性能建议**

```java
// ❌ 低效：字符串拼接会创建多个中间对象
String result = "";
for(int i = 0; i < n; i++) {
    result += "a";  // O(n²) 复杂度
}

// ✅ 高效：用 StringBuilder
StringBuilder sb = new StringBuilder();
for(int i = 0; i < n; i++) {
    sb.append("a"); // O(n) 复杂度
}
String result = sb.toString();

// ✅ 简洁：直接用 join 或 repeat
String result = "a".repeat(n);
```

## **字符串不可变性**

```java
String s = "hello";
s = s + "world";  // 创建新对象，原对象不变

String s1 = "abc";
String s2 = "abc";
s1 == s2;  // true，字符串池优化

String s3 = new String("abc");
s3 == s1;  // false，创建了新对象

// ✅ 比较内容用 equals()，不要用 ==
```
