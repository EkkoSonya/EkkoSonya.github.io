---
title: Spring系列八股11 - AOP3
date: 2026-4-3
category:
  - code
tag:
  - java
  - spring
  - 八股
# star: true
# sticky: true
order: -0.5
---

## AOP3

### Spring AOP 通知方式

Spring AOP 提供了多种通知方式，允许我们在方法执行的不同阶段插入逻辑。常用的通知方式有：

- 前置通知 (`@Before`)
- 返回通知 (`@AfterReturning`)
- 异常通知 (`@AfterThrowing`)
- 后置通知 (`@After`)
- 环绕通知 (`@Around`)

#### 前置通知 `@Before`

前置通知是在目标方法执行之前执行的通知

这种通知比较简单，主要用来做一些准备工作，比如参数校验、权限检查、记录方法开始执行的日志等等

前置通知无法阻止目标方法的执行，也无法修改方法的参数，它只能在方法执行前做一些额外的操作

我们在项目中经常用它来记录操作日志，比如记录谁在什么时候调用了什么方法

```java
@Aspect
@Component
public class LoggingAspect {
  @Before("execution(* com.example.service.*.*(..))")
  public void logBefore(JoinPoint joinPoint) {
    // 打印方法名和参数
    System.out.println("调用方法: " + joinPoint.getSignature().getName());
    System.out.println("参数: " + Arrays.toString(joinPoint.getArgs()));
  }
}
```

#### 后置通知 `@After`

后置通知是在目标方法执行完成后执行的，不管方法是正常返回还是抛出异常都会执行

这种通知主要用来做一些清理工作，比如释放资源、记录方法执行完成的日志等等

需要注意的是，后置通知**拿不到方法的返回值**，**也捕获不到异常信息**，它就是纯粹的在方法执行后做一些收尾工作

```java
@Aspect
@Component
public class LoggingAspect {
  @After("execution(* com.example.service.*.*(..))")
  public void logAfter(JoinPoint joinPoint) {
    // 打印方法执行完成的日志
    System.out.println("方法执行完成: " + joinPoint.getSignature().getName());
  }
}
```

#### 返回通知 `@AfterReturning`

返回通知是在目标方法正常返回后执行的

这种通知可以获取到方法的返回值，我们可以在注解中指定 returning 参数来接收返回值

返回通知经常用来做一些基于返回结果的后续处理，比如缓存方法的返回结果、根据返回值发送通知等等。如果方法抛出异常的话，返回通知是不会执行的

```java
@Aspect
@Component
public class LoggingAspect {
  @AfterReturning(pointcut = "execution(* com.example.service.*.*(..))", returning = "result")
  public void logAfterReturning(JoinPoint joinPoint, Object result) {
    // 打印方法执行完成的日志
    System.out.println("方法执行完成: " + joinPoint.getSignature().getName());
    // 打印方法返回值
    System.out.println("返回值: " + result);
  }
}
```

#### 异常通知 `@AfterThrowing`

异常通知是在目标方法抛出异常后执行的

我们可以在注解中指定 throwing 参数来接收异常对象

异常通知主要用来做异常处理和记录，比如记录错误日志、发送告警、异常统计等等

需要注意的是，**异常通知不能处理异常，异常还是会继续向上抛出**

```java
@Aspect
@Component
public class LoggingAspect {
  @AfterThrowing(pointcut = "execution(* com.example.service.*.*(..))", throwing = "ex")
  public void logAfterThrowing(JoinPoint joinPoint, Throwable ex) {
    // 打印方法名和异常信息
    System.out.println("方法执行异常: " + joinPoint.getSignature().getName());
    System.out.println("异常信息: " + ex.getMessage());
  }
}
```

#### 环绕通知 `@Around`

环绕通知是最强大也是我们用得最多的一种通知

它可以在方法执行前后都执行逻辑，而且可以控制目标方法是否执行，还可以修改方法的参数和返回值

环绕通知的方法必须接收一个 ProceedingJoinPoint 参数，通过调用其 proceed() 方法来执行目标方法。

### 触发时间

Spring AOP 是在 Bean 的初始化阶段发生的，具体来说是在 Bean 生命周期的后置处理阶段

在 Bean 实例化完成、属性注入完成之后，Spring 会调用所有 `BeanPostProcessor` 的 `postProcessAfterInitialization` 方法，AOP 代理的创建就是在这个阶段完成的

### AOP 与 OOP 关系

AOP 和 OOP 是互补的编程思想：

- OOP 通过类和对象封装数据和行为，专注于核心业务逻辑。
- AOP 提供了解决横切关注点（如日志、权限、事务等）的机制，将这些逻辑集中管理

### 总结

AOP，也就是面向切面编程，是一种编程范式，旨在提高代码的模块化。比如说可以将日志记录、事务管理等分离出来，来提高代码的可重用性。

AOP 的核心概念包括切面、连接点、通知、切点和织入等

- 像日志打印、事务管理等都可以抽离为切面，可以声明在类的方法上。像 @Transactional 注解，就是一个典型的 AOP 应用，它就是通过 AOP 来实现事务管理的。我们只需要在方法上添加 @Transactional 注解，Spring 就会在方法执行前后添加事务管理的逻辑
- Spring AOP 是基于代理的，它默认使用 JDK 动态代理和 CGLIB 代理来实现 AOP
- Spring AOP 的织入方式是运行时织入，而 AspectJ 支持编译时织入、类加载时织入

### 实际应用场景

事务管理是用得最多的场景，基本上每个项目都会用到

只需要在 Service 方法上加个 @Transactional 注解，Spring 就会自动帮我们管理事务的开启、提交和回滚。

日志记录也是一个很常见的应用
