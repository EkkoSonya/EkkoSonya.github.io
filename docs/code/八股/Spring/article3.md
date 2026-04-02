---
title: Spring系列八股3 - Bean2 (作用域 + 线程安全问题)
date: 2026-4-2
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

## Spring基础

### Bean的作用域

#### 单例模式 (默认)

Bean 的作用域决定了 Bean 实例的生命周期和创建策略，singleton 是默认的作用域

整个 Spring 容器中只会有一个 Bean 实例。不管在多少个地方注入这个 Bean，拿到的都是同一个对象

```java
@Component  // 默认就是singleton
public class UserService {
  // 整个应用中只有一个UserService实例
}
```

生命周期和 Spring 容器相同，容器启动时创建，容器销毁时销毁

实际开发中，像 Service、Dao 这些业务组件基本都是单例的，因为单例既能节省内存，又能提高性能

#### 多例模式

当把 scope 设置为 prototype 时，每次从容器中获取 Bean 的时候都会创建一个新的实例

```java
@Component
@Scope("prototype")
public class OrderProcessor {
  // 每次注入或获取都是新的实例
}
```

当需要处理一些有状态的 Bean 时会用到 prototype，比如每个订单处理器需要维护不同的状态信息

#### 注入问题

需要注意的是，在 singleton Bean 中注入 prototype Bean 时要小心，因为 singleton Bean 只创建一次，所以 prototype Bean 也只会注入一次。这时候可以用 @Lookup 注解或者 ApplicationContext 来动态获取

```java
@Component
public class SingletonService {
  // 错误的做法，prototypeBean只会注入一次
  @Autowired
  private PrototypeBean prototypeBean;
  
  // 正确的做法，每次调用都获取新实例
  @Lookup
  public PrototypeBean getPrototypeBean() {
      return null;  // Spring会重写这个方法
  }
}
```

#### 其他模式

除了 singleton 和 prototype，Spring 还支持其他作用域，比如 request、session、application 和 websocket

- 如果作用于是 request，表示在 Web 应用中，每个 HTTP 请求都会创建一个新的 Bean 实例，请求结束后 Bean 就被销毁
- 如果作用于是 session，表示在 Web 应用中，每个 HTTP 会话都会创建一个新的 Bean 实例，会话结束后 Bean 被销毁
- application 作用域表示在整个应用中只有一个 Bean 实例，类似于 singleton，但它的生命周期与 ServletContext 绑定
- websocket 作用域表示在 WebSocket 会话中每个连接都有自己的 Bean 实例。WebSocket 连接建立时创建，连接关闭时销毁

### 单例Bean会存在线程安全问题吗

首先要明确一点。Spring 容器本身保证了 Bean 创建过程的线程安全，也就是说不会出现多个线程同时创建同一个单例 Bean 的情况。

> 线程安全的创建过程主要靠 synchronized 实现

```java
// 单例缓存
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

public Object getSingleton(String beanName, ObjectFactory<?> singletonFactory) {
  synchronized (this.singletonObjects) {  // 关键：同步锁
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null) {
      singletonObject = singletonFactory.getObject();
      this.singletonObjects.put(beanName, singletonObject);
    }
    return singletonObject;
  }
}
```

但是 Bean 创建完成后的使用过程，Spring 就不管了

换句话说，单例 Bean 在被创建后，如果它的内部状态是可变的，那么在多线程环境下就可能会出现线程安全问题

如果 Bean 中没有成员变量，或者成员变量都是不可变的，final 修饰的，那么就不存在线程安全问题

```java
@Service
public class UserServiceImpl implements UserService {
  @Resource
  private UserDao userDao;
  @Autowired
  private CountService countService;
  // 只有依赖注入的无状态字段
}

@Service
public class ConfigService {
  private final String appName;  // final修饰，不可变
  
  public ConfigService(@Value("${app.name}") String appName) {
      this.appName = appName;
  }
}
```

#### 如何解决单例 Bean 的线程安全问题

> 无状态优先，ThreadLocal 隔离，JUC 工具，加锁保底，改作用域兜后

| 方案 | 适用场景 | 核心思想 |
| --- | --- | --- |
| **无状态设计** | 通用 | 不存状态，数据走方法参数 |
| **ThreadLocal** | 需要线程独立状态 | 每个线程一份副本 |
| **线程安全类** | 计数/缓存 | 用 JUC（AtomicInteger、ConcurrentHashMap） |
| **加锁** | 复杂状态操作 | synchronized / Lock |
| **改作用域** | 必须有状态 | prototype / request 每次新建 |

第一种，使用局部变量，也就是使用无状态的单例 Bean，把所有状态都通过方法参数传递

```java
@Service
public class UserService {
  @Autowired
  private UserDao userDao;
  
  // 无状态方法，所有数据通过参数传递
  public User processUser(Long userId, String operation) {
    User user = userDao.findById(userId);
    // 处理逻辑...
    return user;
  }
}
```

第二种，当确实需要维护线程相关的状态时，可以使用 ThreadLocal 来保存状态。ThreadLocal 可以保证每个线程都有自己的变量副本，互不干扰

```java
@Service
public class UserContextService {
  private static final ThreadLocal<User> userThreadLocal = new ThreadLocal<>();
  
  public void setCurrentUser(User user) {
    userThreadLocal.set(user);
  }
  
  public User getCurrentUser() {
    return userThreadLocal.get();
  }
  
  public void clear() {
    userThreadLocal.remove(); // 防止内存泄漏
  }
}
```

第三种，如果需要缓存数据或者计数，使用 JUC 包下的线程安全类，比如说 AtomicInteger、ConcurrentHashMap、CopyOnWriteArrayList 等

第四种，对于复杂的状态操作，可以使用 synchronized 或 Lock

第五种，如果 Bean 确实需要维护状态，可以考虑将其改为 prototype 作用域，这样每次注入都会创建一个新的实例，避免了多线程共享同一个实例的问题，或者使用 request 作用域，这样每个 HTTP 请求都会创建一个新的实例

### `@Resource` 与 `@Autowired` 区别

> 当使用 `@Autowired` 注解注入 Bean 时，IDEA 会提示“Field injection is not recommended”

`@Autowired` 是 Spring 框架提供的注解，而 `@Resource` 是 Java EE 标准提供的注解

换句话说，`@Resource` 是 JDK 自带的，而 `@Autowired` 是 Spring 特有的

#### 区别

从注入方式上说，`@Autowired` 默认按照类型，也就是 `byType` 进行注入，而 `@Resource` 默认按照名称，也就是 `byName` 进行注入

当容器中存在多个相同类型的 Bean， 比如说有两个 `UserRepository` 的实现类，直接用 `@Autowired` 注入 `UserRepository` 时就会报错，因为 Spring 容器不知道该注入哪个实现类

```java
@Component
public class UserRepository21 implements UserRepository2 {}

@Component
public class UserRepository22 implements UserRepository2 {}

@Component
public class UserService2 {
  @Autowired
  private UserRepository2 userRepository; // 冲突
}
```
