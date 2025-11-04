---
title: hint - AOP
date: 2025-10-13
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

## 操作

AOP可以用来实现公共字段填充

1). 自定义注解 AutoFill，用于标识需要进行公共字段自动填充的方法

2). 自定义切面类 AutoFillAspect，统一拦截加入了 AutoFill 注解的方法，通过反射为公共字段赋值

3). 在 Mapper 的方法上加入 AutoFill 注解

在定义切面时，有两步：

1. 定义切点（Pointcut）：告诉 AOP —— 哪些方法需要被拦截；

2. 定义通知（Advice）：告诉 AOP —— 拦截到后要做什么。

```java
...
@Pointcut("execution(* com.sky.mapper.*.*(..)) && @annotation(com.sky.annotation.AutoFill)")
public void autoFillPointCut() {}

@Before("autoFillPointCut()")
public void autoFill(JoinPoint joinPoint) {
    log.info("开始进行公共字段自动填充...");
    ...
}
...
```

这样可以方便复用
