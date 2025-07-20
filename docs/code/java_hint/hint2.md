---
title: hint2
date: 2025-06-16
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

1. -128 到 +127 以内的int值都是自动包装好，所以对象都是一个
  ![alt text](./img/1.png)

2. `Scanner` 的 `nextInt`
    `Scanner scanner = new Scanner(System.in);`
   `scanner.nextInt()` 只读整数，不读换行符（\n）
   换行符仍然留在输入缓冲区中，需要清理对应的换行符

3. Java 中 finally 的行为

    不论 try 里是正常结束、遇到 return、遇到异常，finally 块里的内容都会被执行。

    ```java
      try {
          System.out.println(prompt);
          return scanner.nextInt();
      } catch (InputMismatchException e) {
          System.err.println("输入的不是数字，重新输入");
      } finally {
          scanner.nextLine(); // 关键：清除输入缓冲区的换行符
      }
    ```

    即使这样，也会执行 `finally`，这样解决了缓冲区存在 `\n` 的问题

4. consume
  