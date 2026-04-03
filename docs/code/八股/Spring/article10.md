---
title: Spring系列八股10 - AOP2 (织入方式)
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

## AOP2

### Spring AOP 织入方式

Spring AOP 是在运行时通过动态代理来实现织入的，当我们从 Spring 容器中获取 Bean 的时候，如果这个 Bean 需要被切面处理，Spring 就会**返回一个代理对象**给我们。

即在那个 bean 工厂里放到就是对应代理对象，真实对象被包在代理里面，只有 jp.proceed() 调用时才会触达它

织入有三种主要方式，按照它们的执行时机来区分

#### 运行时织入 (动态代理)

运行时织入是我们在 Spring 中最常见的方式，也就是通过动态代理来实现

Spring AOP 采用的就是这种方式

当 Spring 容器启动的时候，如果发现某个 Bean 需要被切面处理，就会为这个 Bean 创建一个代理对象

如果目标类实现了接口，Spring 会使用 JDK 的动态代理技术

```java
// 接口
public interface UserService {
  void saveUser(String username);
}

// 实现类
@Service
public class UserServiceImpl implements UserService {
  @Override
  public void saveUser(String username) {
    System.out.println("保存用户: " + username);
  }
}

// Spring 自动创建的代理（伪代码）
public class UserServiceProxy implements UserService {
  private UserService target;
  private List<Advisor> advisors;
  
  @Override
  public void saveUser(String username) {
    // 执行前置通知
    for (Advisor advisor : advisors) {
      if (advisor.getPointcut().matches(this.getClass().getMethod("saveUser", String.class))) {
        advisor.getAdvice().before();
      }
    }
    // 执行目标方法
    target.saveUser(username);
    // 执行后置通知
    for (Advisor advisor : advisors) {
      advisor.getAdvice().after();
    }
  }
}
```

如果目标类没有实现接口，就会使用 CGLIB 来创建一个子类作为代理

```java
// 没有接口的类
@Service
public class OrderService {
    public void createOrder(String orderId) {
        System.out.println("创建订单: " + orderId);
    }
}

// CGLIB 生成的代理子类（伪代码）
public class OrderService$$EnhancerByCGLIB$$12345 extends OrderService {
  private MethodInterceptor interceptor;
  
  @Override
  public void createOrder(String orderId) {
    // 通过 MethodInterceptor 执行切面逻辑
    interceptor.intercept(this, getMethod("createOrder"), new Object[]{orderId}, 
      new MethodProxy() {
        @Override
        public Object invokeSuper(Object obj, Object[] args) {
          return OrderService.super.createOrder((String) args[0]);
        }
      });
  }
}
```

运行时织入的优点是实现简单，不需要特殊的编译器或 JVM 配置，缺点是有一定的性能开销，因为每次方法调用都要经过代理

Spring AOP 默认的织入方式就是运行时织入，使用起来非常简单，只需要加个 @Aspect 注解和相应的通知注解就可以了

虽然性能上不如编译期织入，但是对于大部分业务场景来说，这点性能开销是完全可以接受的

#### 编译期织入 (不会生成代理对象)

编译期织入是在编译 Java 源码的时候就把切面逻辑织入到目标类中

这种方式最典型的实现就是 AspectJ 编译器

它会在编译的时候直接修改字节码，把切面的逻辑插入到目标方法中

```java
// 源代码
@Aspect
public class LoggingAspect {
  @Before("execution(* com.example.service.*.*(..))")
  public void logBefore(JoinPoint joinPoint) {
    System.out.println("方法执行前: " + joinPoint.getSignature().getName());
  }
}

@Service
public class UserService {
  public void saveUser(String username) {
    System.out.println("保存用户: " + username);
  }
}
```

这样生成的 class 文件就已经包含了切面逻辑，运行时不需要额外的代理机制

```java
// 编译器自动生成的代码
public class UserService {
  public void saveUser(String username) {
    // 织入的切面代码
    System.out.println("方法执行前: saveUser");
    
    // 原始业务代码
    System.out.println("保存用户: " + username);
  }
}
```

编译期织入的优点是性能最好，因为没有代理的开销，但缺点是需要使用特殊的编译器，而且比较复杂，在 Spring 项目中用得不多

#### 类加载期织入

类加载期织入是在 JVM 加载 class 文件的时候进行织入

这种方式通过 Java 的 Instrumentation API 或者自定义的 ClassLoader 来实现，在类被加载到 JVM 之前修改字节码

```java
public class WeavingClassLoader extends ClassLoader {
  @Override
  protected Class<?> findClass(String name) throws ClassNotFoundException {
    byte[] classBytes = loadClassBytes(name);
    
    // 在这里进行字节码织入
    byte[] wovenBytes = weaveAspects(classBytes);
    
    return defineClass(name, wovenBytes, 0, wovenBytes.length);
  }
    
  private byte[] weaveAspects(byte[] classBytes) {
    // 使用 ASM 或其他字节码操作库进行织入
    return classBytes;
  }
}
```

AspectJ 的 Load-Time Weaving 就是这种方式的典型实现

它比编译期织入更灵活一些，但是配置相对复杂，需要在 JVM 启动参数中指定 Java agent，在 Spring 中也有支持，但用得不是特别多

### AspectJ

AspectJ 是一个 AOP 框架，它可以做很多 Spring AOP 干不了的事情，比如说编译时、编译后和类加载时织入切面。并且提供了很多复杂的切点表达式和通知类型

Spring AOP 只支持方法级别的拦截，而且只能拦截 Spring 容器管理的 Bean。但是 AspectJ 可以拦截任何 Java 对象的方法调用、字段访问、构造方法执行、异常处理等等
