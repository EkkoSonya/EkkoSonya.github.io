---
title: Spring系列八股6 - Spring 启动分析
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

### 最简单的 Spring 模版

```java
package com.ekko;

import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;

@Configuration
public class Main {
    public static void main(String[] args) {
      // 这就是启动 Spring 容器最核心、最简单的一行代码
      AnnotationConfigApplicationContext context =
              new AnnotationConfigApplicationContext(Main.class);

      System.out.println("Spring 容器启动完成！");
    }
}
```

#### 运行源码

```java
// Spring 框架源码：AnnotationConfigApplicationContext.java

public class AnnotationConfigApplicationContext extends GenericApplicationContext implements AnnotationConfigRegistry {
  private final AnnotatedBeanDefinitionReader reader;
  private final ClassPathBeanDefinitionScanner scanner;

  public AnnotationConfigApplicationContext() {
    StartupStep createAnnotatedBeanDefReader = this.getApplicationStartup().start("spring.context.annotated-bean-reader.create");
    this.reader = new AnnotatedBeanDefinitionReader(this);
    createAnnotatedBeanDefReader.end();
    this.scanner = new ClassPathBeanDefinitionScanner(this);
  }

  ...

  public AnnotationConfigApplicationContext(Class<?>... componentClasses) {
      // 第一步：调用无参构造函数
      // 动作：在这里会隐式地初始化一个 BeanFactory，并实例化“读取器 (Reader)”和“扫描器 (Scanner)”。
      // 意义：准备好了处理注解的工具。
      this();
      
      // 第二步：注册配置类
      // 动作：把你传入的 AppConfig.class 解析成一个 BeanDefinition，并放入 beanDefinitionMap 中。
      // 意义：把启动入口（图纸）交给 Spring。
      register(componentClasses);
      
      // 第三步：刷新容器（核心大戏！）
      // 动作：包含 7 大核心步骤的 refresh() 方法。
      // 意义：完成包扫描、执行后置处理器、实例化所有单例 Bean 等全部生命周期。
      refresh();
  }

  ...

}
```

- `this()`: 负责准备环境。
- `register()`: 负责注入最初始的元数据（可以理解为给 Spring 一个“线头”）。
- `refresh()`: 则是一个庞大的、标准的模板方法（Template Method 设计模式）
  - 顺着 register() 给的线头，refresh() 里的 `ConfigurationClassPostProcessor` 就会顺藤摸瓜，把包下所有的 `@Component` 都扫描出来。

`register()` 是把传入的配置类注册成 `BeanDefinition`，给 Spring 一个"线头"，后续 `refresh()` 中的 `ConfigurationClassPostProcessor` 会从这个线头开始扫描

### Spring 启动分析

Spring 容器的启动过程，本质上就是执行 `AbstractApplicationContext` 类中大名鼎鼎的 `refresh()` 方法的过程

这个方法是加了 synchronized 锁的，也就是所谓的“刷新容器”

它不仅包含了“图纸归档”（Bean 注册），更统揽了从环境准备到对象实例化的全局工作

如果将整个启动流程按照 `refresh()` 方法的核心源码骨架来拆解，可以归纳为以下七个核心阶段

#### 1. 准备阶段 (Prepare Refresh) 以及 初始化 BeanFactory

这是启动的“热身”环节

Spring 会在这个阶段记录容器的启动时间，标记当前容器的状态为“激活”，并初始化一些上下文环境中的占位符属性（Property Sources）

同时，它也会验证那些被标记为“必须存在”的系统属性是否都已经配置到位。

Spring 会在这一步创建一个全新的 `DefaultListableBeanFactory`（也就是那个核心容器对象）

对应源码：`obtainFreshBeanFactory()` 和 `prepareBeanFactory()`

- 获取工厂：其实在 `new AnnotationConfigApplicationContext()` 的第一步 this() 中，底层就已经创建好了一个 `DefaultListableBeanFactory`。这里主要是把它取出来。
- 准备工具：Spring 会给这个工厂配置上类加载器（ClassLoader）、表达式解析器（SpEL），并默默地塞几个系统级的 Bean 进去（比如 Environment）。

#### 2. 加载图纸 (Obtain & Prepare BeanFactory)

对应源码：`invokeBeanFactoryPostProcessors(beanFactory)`

**这是 `refresh` 中极其关键的一步，也是连接你之前代码的核心！**

1. **解析 `@ComponentScan`**：Spring 容器目前只有 `AppConfig` 这一张图纸。Spring 会找到内部默认注册的 `ConfigurationClassPostProcessor`（它就是一个超高级的 `BeanFactoryPostProcessor`），由它去读取 `AppConfig` 上的包扫描路径。
2. **生成新图纸**：顺着路径，它扫描到了你写的 `Pig` 类（带有 `@Component`）。于是，系统通过上一个环节聊到的 `doRegisterBean()` 逻辑，把 `Pig` 也变成了 `BeanDefinition` 存入 Map。至此，所有图纸收集完毕。

#### 3. 执行工厂后置处理器 (Invoke BeanFactoryPostProcessors)

图纸加载完毕，但在正式”动工”之前，Spring 允许我们对图纸进行最后的修改。

- **调用自定义扩展**：图纸齐了，Spring 开始在 Map 里寻找哪些图纸实现了 `BeanFactoryPostProcessor` 接口。它发现了你的 `Pig` 类！
- **实例化并执行**：Spring 提前把 `Pig` 实例化，然后调用了它的 `postProcessBeanFactory` 方法。**此时，你的控制台打印出了 `"Hello World"`。**

调用实现了 `BeanDefinitionRegistryPostProcessor` 和 `BeanFactoryPostProcessor` 接口 的类

**执行顺序**：

1. 先执行所有实现了 `BeanDefinitionRegistryPostProcessor` 接口的类的 `postProcessBeanDefinitionRegistry` 方法
2. 再执行所有实现了 `BeanFactoryPostProcessor` 接口的类的 `postProcessBeanFactory` 方法

**典型应用**：最核心的 `ConfigurationClassPostProcessor` 就在这个阶段工作，它会：

- 解析 `@Configuration`、`@ComponentScan`、`@Import`、`@PropertySource` 等注解
- 完成包扫描，把扫描到的 Bean 定义注册到容器中

**这个阶段结束后，所有 Bean 的定义信息彻底锁定**

比如假设我们有个 `Pig` 类

```java
@Component
public class Pig implements BeanFactoryPostProcessor {
  @Override
  public void postProcessBeanFactory(ConfigurableListableBeanFactory configurableListableBeanFactory) throws BeansException {
      System.out.println("Hello World");
  }
}
```

就会被提前实例化

#### 4. 注册 Bean 后置处理器 (Register BeanPostProcessors)

> 上一步处理的是 BeanFactory 的后置处理器（管图纸的），这一步处理的是 Bean 的后置处理器（管实例对象的）

**注意，这一步只是“注册”，不是执行**

Spring 会从 `beanDefinitionMap` 中找出所有实现了 `BeanPostProcessor` 接口的类，把它们提前实例化，并按照优先级（PriorityOrdered、Ordered 等）放入一个特定的集合中

这些后置处理器是 AOP 生效的基础，它们将在后续 Bean 的“初始化前后”被调用，用来对普通的 Bean 进行功能增强（比如生成代理对象）

> （比如专门负责处理 `@Autowired` 的，或者专门负责生成 AOP 动态代理的）

#### 5. 初始化基础设施 (Init MessageSource, EventMulticaster, etc.)

这是 Spring 为了支撑更庞大架构而准备的底层设施：

- **MessageSource**：初始化国际化（i18n）组件。
- **ApplicationEventMulticaster**：初始化事件广播器。Spring 的事件驱动模型（发布/订阅）就是依赖这个组件运作的。
- **onRefresh()**：这是一个模板方法，留给子类扩展的。**这里非常关键，如果是 Spring Boot 环境下，它会在这里启动内嵌的 Web 容器（比如 Tomcat 或 Undertow）。**

如果你是用 Spring Boot 启动（比如使用了 `ServletWebServerApplicationContext`），Spring Boot 会重写这个方法，在这里利用代码去 `new Tomcat()` 并启动内嵌的 Web 服务器。

#### 6. 实例化所有非懒加载单例 (Finish BeanFactory Initialization)

> 这是整个启动流程中最耗时、最复杂的一步，真正的对象全都在这里诞生

对应的方法是 `finishBeanFactoryInitialization(beanFactory)`

Spring 会遍历 `beanDefinitionMap` 中所有的图纸，把那些**不是懒加载的单例 Bean** 全部创建出来。底层核心是调用 `getBean(beanName)` 方法：

1. **实例化 (Instantiation)**：利用 Java 反射，调用类的构造函数（通常是无参构造）在堆内存中 `new` 出一个半成品对象。
2. **属性填充 (PopulateBean)**：也就是依赖注入。遇到 `@Autowired`，就去容器里找对应的 Bean 塞进去（如果遇到循环依赖，就在这里通过“三级缓存”解决）。
3. **初始化 (InitializeBean)**：
    - **执行前置处理**：刚才招募的 `BeanPostProcessor` 上场，执行 `postProcessBeforeInitialization`。
    - **执行初始化方法**：执行 `@PostConstruct` 注解标注的方法，或者 `InitializingBean` 接口的 `afterPropertiesSet`。
    - **执行后置处理（AOP 爆发点）**：执行 `postProcessAfterInitialization`。**如果这个 Bean 需要被事务拦截或切面增强，Spring 就会在这一步悄悄地把返回的对象替换成一个 CGLIB 或 JDK 动态代理对象。**
4. **入库**：完全搞定的 Bean（或其代理对象），会被正式放入名为 `singletonObjects` 的 `ConcurrentHashMap`（一级缓存）中。

**三级缓存解决循环依赖**：

- **一级缓存** `singletonObjects`：完整的单例 Bean
- **二级缓存** `earlySingletonObjects`：提前暴露的半成品 Bean（已实例化但未初始化）
- **三级缓存** `singletonFactories`：ObjectFactory，用于生成早期引用（处理 AOP 代理）

在这个阶段结束时，所有的核心单例对象都已经稳稳地躺在一级缓存中。

#### 7. 完成刷新与收尾 (Finish Refresh)

所有组件都就位后，容器就算启动成功了

Spring 会在这一步清理一些启动过程中的临时缓存，初始化生命周期处理器（LifecycleProcessor），并向整个系统广播一个 `ContextRefreshedEvent` 事件

很多开发者会监听这个事件，用来在 Spring 容器启动完毕后执行一些自定义的业务逻辑（比如加载缓存、启动定时任务等）。

---

### 面试常见追问

**Q1：refresh() 为什么加 synchronized 锁？**

防止多线程同时启动/刷新容器。容器启动过程中状态变化复杂，并发刷新会导致 Bean 定义混乱、单例重复创建等问题。

**Q2：如果 refresh() 失败会发生什么？**

会抛出异常，同时调用 `destroyBeans()` 销毁已创建的单例 Bean，避免残留脏数据。

**Q3：Spring Boot 启动流程和 Spring 有什么区别？**

Spring Boot 的 `SpringApplication.run()` 底层还是会调用 `refresh()`，但在此之前做了更多事情：

- 创建合适的 `ApplicationContext` 类型（Servlet/Reactive/非 Web）
- 执行所有 `ApplicationContextInitializer`
- 加载 `ApplicationContextInitializer` 和 `ApplicationListener`
- 扫描并加载 `META-INF/spring.factories` 中的自动配置类

### Bean 注册流程

Bean 的注册流程，实际上发生在 Bean 实例化之前。如果要打个比方，Bean 的注册就是“绘制并归档图纸”的过程，而后续的生命周期才是“按图纸造房子”

这套流程的核心目的是：把我们在代码里写的 `@Component`、`@Bean`、XML 配置等信息，提取出来包装成 Spring 能理解的 `BeanDefinition` 对象，并安全地存放到容器的缓存池中。

站在源码和底层架构的视角，整个注册流程可以拆分为以下几个关键步骤（以注解驱动 `AnnotationConfigApplicationContext` 为例）：

#### 1. 启动与扫描准备 (Scanning Setup)

当你启动 Spring 容器（比如调用 `ApplicationContext.refresh()` 方法）时，注册流程正式开始。
Spring 会初始化一个**扫描器**（通常是 `ClassPathBeanDefinitionScanner`）和一个**读取器**（`AnnotatedBeanDefinitionReader`）

此时，Spring 会首先把你显式传入的配置类（带有 `@Configuration` 的类）注册为第一个 `BeanDefinition`。

#### 2. 解析配置与包扫描 (Parsing & Scanning)

这是注册流程中最繁重的一步，主要由一个极其重要的系统级后置处理器——**`ConfigurationClassPostProcessor`** 来主导。

- **解析 `@ComponentScan`**：Spring 会读取配置类上的扫描路径，然后利用底层的 ASM 技术（直接读取 `.class` 文件的字节码，而不是把类加载到 JVM 中，这样效率更高）去遍历对应包下的所有类。
- **过滤并识别注解**：它会检查这些类上是否标记了 `@Component`、`@Service`、`@Controller` 等注解。
- **处理 `@Bean` 和 `@Import`**：同时，它还会解析 `@Configuration` 类内部标注了 `@Bean` 的方法，以及通过 `@Import` 导入的其他组件。

#### 3. 封装为 BeanDefinition (Encapsulation)

一旦 Spring 识别出一个合格的 Bean 候选者，它并不会立刻 `new` 这个对象，而是将这个类的各种元数据提取出来，封装成一个 **`BeanDefinition`** 对象

这个对象里记录了极其关键的信息：

- **Class 名称**：这个 Bean 到底是哪个具体类。
- **Scope（作用域）**：是单例（Singleton）还是多例（Prototype）。
- **是否懒加载（Lazy-init）**：是否在容器启动时就立刻创建。
- **依赖关系**：它通过构造器或者 `@DependsOn` 依赖了哪些其他的 Bean。
- **初始化/销毁方法**：也就是指定的 `init-method` 和 `destroy-method`。

#### 4. 注册到 BeanDefinitionRegistry (Registration)

图纸画好了，接下来就是归档

Spring 的核心容器工厂（通常是 `DefaultListableBeanFactory`）实现了一个叫 `BeanDefinitionRegistry` 的接口

这相当于 Spring 内部的“档案室”。

- Spring 会调用 `registerBeanDefinition(String beanName, BeanDefinition beanDefinition)` 方法。
- **核心动作**：将解析好的 `BeanDefinition` 放入一个叫做 **`beanDefinitionMap`** 的缓存中。
- 作为一个 Java 后端开发者，你对并发编程应该不陌生。这个 `beanDefinitionMap` 的底层实际上就是一个 **`ConcurrentHashMap<String, BeanDefinition>`**，以 Bean 的名称（比如 "userService"）为 Key，以对应的图纸对象为 Value。将图纸放入这个 Map，标志着**该 Bean 的注册流程正式完成**。

#### 5. 注册完成后的扩展点 (BeanFactoryPostProcessor)

当所有 Bean 的图纸都注册到 Map 中之后，Spring 故意在这里停顿了一下，提供了一个极其强大的扩展点：**`BeanFactoryPostProcessor`**

在开始根据图纸“造房子”（实例化）之前，Spring 允许你编写自定义逻辑来遍历这个 `beanDefinitionMap`，甚至**修改里面已经注册好的图纸**

比如，你可以把某个类的作用域从单例强行改成多例，或者修改某个属性的注入值

比如常见的 `@Value` 占位符（`${jdbc.url}`）替换，就是在这个阶段通过 `PropertySourcesPlaceholderConfigurer` 来完成的
