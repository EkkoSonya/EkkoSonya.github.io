---
title: Javassm - 应用程序上下文
date: 2025-08-28
category:
  - code
tag:
  - javassm
  - Spring
# star: true
# sticky: true
order: -0.5989
---

### 应用程序上下文详解

前面我们详细介绍了`BeanFactory`是如何工作的，接着我们来研究一下`ApplicationContext`的内部

实际上我们真正在项目中使用的就是ApplicationContext的实现。

#### `ApplicationContext`接口

```java
public interface ApplicationContext extends EnvironmentCapable, ListableBeanFactory, HierarchicalBeanFactory, MessageSource, ApplicationEventPublisher, ResourcePatternResolver {
    @Nullable
    String getId();
    String getApplicationName();
    String getDisplayName();
    long getStartupDate();
    @Nullable
    ApplicationContext getParent();
    AutowireCapableBeanFactory getAutowireCapableBeanFactory() throws IllegalStateException;
}
```

它本身是一个接口，同时集成了多种类型的BeanFactory接口，说明它应该具有这些`BeanFactory`的能力，实际上我们在前面已经提到过

`ApplicationContext`是依靠内部维护的`BeanFactory`对象来完成这些功能的，并不是它本身就实现了这些功能。

#### 分析

这里我们就先从构造方法开始走起，以我们常用的`AnnotationConfigApplicationContext`为例：

```java
public AnnotationConfigApplicationContext(Class<?>... componentClasses) {
    this();                      //1. 首先会调用自己的无参构造
    register(componentClasses);  //2. 然后注册我们传入的配置类
    refresh();                   //3. 最后进行刷新操作（关键）
}
```

##### 调用无参构造

先来看第一步：

父类的无参构造调用，创建 `beanFactory`

```java
public GenericApplicationContext() {
    // 父类首先初始化内部维护的BeanFactory对象
    this.beanFactory = new DefaultListableBeanFactory();
}
```

自身无参构造调用

```java
public AnnotationConfigApplicationContext() {
    StartupStep createAnnotatedBeanDefReader = this.getApplicationStartup().start("spring.context.annotated-bean-reader.create");
    // 创建AnnotatedBeanDefinitionReader对象，用于后续处理 @Bean 注解
    this.reader = new AnnotatedBeanDefinitionReader(this);
    createAnnotatedBeanDefReader.end();
    // 创建ClassPathBeanDefinitionScanner对象，用于扫描类路径上的Bean
    this.scanner = new ClassPathBeanDefinitionScanner(this);
}
```

这样，`AnnotationConfigApplicationContext`的基本内容就初始化好了

不过在`Reader`中会将`ConfigurationClassPostProcessor`后置处理器加入到`BeanFactory`中

它继承自`BeanFactoryPostProcessor`，也就是说一会会在`BeanFactory`初始化完成之后进行后置处理：

```java
public AnnotatedBeanDefinitionReader(BeanDefinitionRegistry registry, Environment environment) {
    Assert.notNull(registry, "BeanDefinitionRegistry must not be null");
    Assert.notNull(environment, "Environment must not be null");
    this.registry = registry;
    this.conditionEvaluator = new ConditionEvaluator(registry, environment, null);
    // 这里注册了注解处理配置相关的后置处理器
    AnnotationConfigUtils.registerAnnotationConfigProcessors(this.registry);
}
```

实际上这个后置处理器的主要目的就是为了读取配置类中的各种Bean定义以及其他注解，比如@Import、@ComponentScan等。

同时这里也会注册一个`AutowiredAnnotationBeanPostProcessor`后置处理器到BeanFactory，它继承自BeanPostProcessor，用于处理后续生成的Bean对象，其实看名字就知道，这玩意就是为了处理@Autowire、@Value这种注解，用于自动注入，这里就不深入讲解具体实现了。

所以，第一步结束之后，就会有这两个关键的后置处理器放在容器中：

![alt text](img/6.png)

##### 注册配置类

接着是第二步，注册配置类：

```java
@Override
public void register(Class<?>... componentClasses) {
    Assert.notEmpty(componentClasses, "At least one component class must be specified");
    StartupStep registerComponentClass = this.getApplicationStartup().start("spring.context.component-classes.register")
    .tag("classes", () -> Arrays.toString(componentClasses));
    //使用我们上面创建的Reader注册配置类
    this.reader.register(componentClasses);
    registerComponentClass.end();
}
```

现在配置类已经成功注册到IoC容器中了

##### `refresh`机制

我们接着来看第三步，到目前为止，我们已知的**仅仅是注册了配置类的Bean**，而**刷新操作**就是**配置所有Bean的关键部分**了

刷新操作是在 `AbstractApplicationContext` 中实现的：

```java
@Override
public void refresh() throws BeansException, IllegalStateException {
   synchronized (this.startupShutdownMonitor) {
   StartupStep contextRefresh = this.applicationStartup.start("spring.context.refresh");
   // 准备当前应用程序上下文，进行刷新、设置启动事件和活动标志以及执行其他初始化
   prepareRefresh();
   // 这个方法由子类实现，对内部维护的BeanFactory进行刷新操作，然后返回这个BeanFactory
   ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
   // 初始化配置Bean工厂，比如一些会用到的类加载器和后置处理器。
   prepareBeanFactory(beanFactory);
   try {
    // 由子类实现对BeanFactory的其他后置处理，目前没有看到有实现
    postProcessBeanFactory(beanFactory);
    StartupStep beanPostProcess = this.applicationStartup.start("spring.context.beans.post-process");
    // 实例化并调用所有注册的 BeanFactoryPostProcessor 类型的Bean
    // 这一步中，上面提到的BeanFactoryPostProcessor就开始工作了，比如包扫描、解析Bean配置等
    // 这一步结束之后，包扫描到的其他Bean就注册到BeanFactory中了
    invokeBeanFactoryPostProcessors(beanFactory);
    // 实例化并注册所有 BeanPostProcessor 类型的 Bean，不急着执行
    registerBeanPostProcessors(beanFactory);
    beanPostProcess.end();
    initMessageSource();
    initApplicationEventMulticaster();
    // 依然是提供给子类实现的，目的是用于处理一些其他比较特殊的Bean，目前似乎也没看到有实现
    onRefresh();
    // 注册所有的监听器
    registerListeners();
    // 将剩余所有非懒加载单例Bean全部实例化
    finishBeanFactoryInitialization(beanFactory);
    finishRefresh();
   } catch (BeansException ex) {
    ...
    // 发现异常直接销毁所有Bean
    destroyBeans();
    // 取消本次刷新操作，重置标记
    cancelRefresh(ex);
    // 继续往上抛异常
    throw ex;
   } finally {
    resetCommonCaches();
    contextRefresh.end();
   }
  }
}
```

所以，现在流程就很清晰了，实际上最主要的就是`refresh`方法，它从初始化到实例化所有的Bean整个流程都已经完成，在这个方法结束之后，整个IoC容器基本就可以正常使用了。

##### `finishBeanFactoryInitialization` 方法

我们继续来研究一下`finishBeanFactoryInitialization`方法，看看它是怎么加载所有Bean的

将剩余所有非懒加载单例Bean全部实例化：

```java
protected void finishBeanFactoryInitialization(ConfigurableListableBeanFactory beanFactory) {
  ...
  beanFactory.preInstantiateSingletons();   //套娃
}
```

```java
 @Override
 public void preInstantiateSingletons() throws BeansException {
  ...
  // 列出全部bean名称
  List<String> beanNames = new ArrayList<>(this.beanDefinitionNames);
  // 开始初始化所有Bean
  for (String beanName : beanNames) {
    // 得到Bean定义
   RootBeanDefinition bd = getMergedLocalBeanDefinition(beanName);
    // Bean不能是抽象类、不能是非单例模式、不能是懒加载的
   if (!bd.isAbstract() && bd.isSingleton() && !bd.isLazyInit()) {
    // 针对于Bean和FactoryBean分开进行处理
    if (isFactoryBean(beanName)) {
     Object bean = getBean(FACTORY_BEAN_PREFIX + beanName);
     if (bean instanceof SmartFactoryBean<?> smartFactoryBean && smartFactoryBean.isEagerInit()) {
      getBean(beanName);
     }
    } else {
     getBean(beanName);  
    // 最后都是通过调用getBean方法来初始化实例，这里就跟我们之前讲的连起来了
    }
   }
  }

  ...
}
```
