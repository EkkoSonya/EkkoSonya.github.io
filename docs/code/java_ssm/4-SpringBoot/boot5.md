---
title: Javassm - SpringBoot5
date: 2025-10-11
category:
  - code
tag:
  - javassm
  - Spring
# star: true
# sticky: true
order: -0.58
---

## 实现原理探究

我们在前面的学习中切实感受到了SpringBoot为我们带来的便捷，那么它为何能够实现如此快捷的开发模式，starter又是一个怎样的存在，它是如何进行自动配置的，我们现在就开始研究。

### 启动原理与实现

首先 SpringBoot 项目启动之后，在 `DemoApplication` 里

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

对应的 `SpringApplication` 中的静态`run`方法：

```java
public static ConfigurableApplicationContext run(Class<?> primarySource, String... args) {
    return run(new Class[]{primarySource}, args);
}
```

套娃如下：

```java
public static ConfigurableApplicationContext run(Class<?>[] primarySources, String[] args) {
    return (new SpringApplication(primarySources)).run(args);
}
```

我们发现，这里直接new了一个新的`SpringApplication`对象

传入我们的主类 (`DemoApplication`) 作为构造方法参数，并调用了非static的`run`方法

#### `SpringApplication` 构造方法

先看看构造方法里面做了什么事情：

```java
// 先套一层娃，对应的 ResourceLoader 为 null
public SpringApplication(Class<?>... primarySources) {
    this((ResourceLoader)null, primarySources);
}

public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
    ...
    // 资源加载器默认根据前面判断，这里为null
    this.resourceLoader = resourceLoader;
    // 设置主要源，也就是我们的启动主类
    Assert.notNull(primarySources, "PrimarySources must not be null");
    this.primarySources = new LinkedHashSet(Arrays.asList(primarySources));
    // 这里是关键，这里会判断当前SpringBoot应用程序是否为Web项目，并返回当前的项目类型
    // deduceFromClasspath是根据类路径下判断是否包含SpringBootWeb依赖
    // 如果不包含就是NONE类型，包含就是SERVLET类型
    this.webApplicationType = WebApplicationType.deduceFromClasspath();
    this.bootstrapRegistryInitializers = new ArrayList(this.getSpringFactoriesInstances(BootstrapRegistryInitializer.class));
    // 获取并设置所有ApplicationContextInitializer实现，这些都是应用程序上下文初始化器
    // 这个接口用于在 Spring 容器执行 onRefresh 方法刷新之前执行一个回调函数
    // 通常用于向 SpringBoot 启动的容器中注入一些属性，比如ContextIdApplicationContextInitializer就是
    // 将配置中定义的 spring.application.name 属性值设定为应用程序上下文的ID
    this.setInitializers(this.getSpringFactoriesInstances(ApplicationContextInitializer.class));
    // 设置应用程序监听器
    this.setListeners(this.getSpringFactoriesInstances(ApplicationListener.class));
    // 找到并设定当前的启动主类
    this.mainApplicationClass = this.deduceMainApplicationClass();
}
```

```java
static WebApplicationType deduceFromClasspath() {
    // 这里的ClassUtils.isPresent是通过反射机制判断类路径下是否存在对应的依赖
    if (ClassUtils.isPresent(WEBFLUX_INDICATOR_CLASS, null) && !ClassUtils.isPresent(WEBMVC_INDICATOR_CLASS, null)
        && !ClassUtils.isPresent(JERSEY_INDICATOR_CLASS, null)) {
      return WebApplicationType.REACTIVE;   
      // 判断出存在WebFlux依赖且其他不存在，返回WebFlux类型
    }
    // 如果不包含WebFlux相关依赖，就找找有没有Servlet相关依赖，只要发现缺失直接返回NONE普通类型
    for (String className : SERVLET_INDICATOR_CLASSES) {
      if (!ClassUtils.isPresent(className, null)) {
        return WebApplicationType.NONE;
      }
    }
    return WebApplicationType.SERVLET; 
    // 否则就是Servlet环境了，返回SERVLET类型（也就是我们之前用到的）
}
```

通过阅读上面的源码，我们发现`getSpringFactoriesInstances`这个方法可以**一次性获取指定类型已注册的实现类**。

##### `this.getSpringFactoriesInstances`

`getSpringFactoriesInstances`这个方法可以**一次性获取指定类型已注册的实现类**, 这样去找到所有实现该类的实现类。

这里就要提到`spring.factories`文件了，它是 Spring 仿造Java SPI实现的一种类加载机制。

它在 `META-INF/spring.factories` 文件中配置接口的实现类名称，然后在程序中读取这些配置文件并实例化。

这种自定义的SPI机制是 `Spring Boot Starter` 实现的基础。

SPI的常见例子：

- 数据库驱动加载接口实现类的加载：JDBC加载不同类型数据库的驱动
- 日志门面接口实现类加载：SLF4J加载不同提供商的日志实现类

说白了就是人家定义接口，但是实现可能有很多种，但是核心只提供接口，需要我们按需选择对应的实现，这种方式是高度解耦的。

##### `spring.factories`

我们可以来看看`spring-boot-starter`依赖中怎么定义的，其中有一个很关键的点：

```xml
<dependency>
   <groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-autoconfigure</artifactId>
   <version>3.1.1</version>
   <scope>compile</scope>
</dependency>
```

这个`spring-boot-autoconfigure`是什么东西？

实际上这个就是我们整个依赖实现自动配置的关键。打开这个依赖内部，可以看到这里确实有一个`spring.factories`文件：

![alt text](img/26.png)

这个里面定义了很多接口的实现类，比如我们刚刚看到的`ApplicationContextInitializer`接口：

![alt text](img/27.png)

不仅仅是`spring-boot-starter`存在这样的文件，其他很多依赖，比如`spring-boot-start-test`也有着对应的`autoconfigure`模块，只不过大部分SpringBoot维护的组件，都默认将其中的`spring.factories`信息统一写到了`spring-boot-autoconfigure`和`spring-boot-starter`中，方便后续维护。

##### 具体方法实现

实际上调用的是 `SpringFactoriesLoader.forDefaultResourceLocation()` 静态方法

现在我们清楚，原来这些都是通过一个单独的文件定义的，所以我们来看看`getSpringFactoriesInstances`方法做了什么：

```java
private <T> List<T> getSpringFactoriesInstances(Class<T> type) {
    return this.getSpringFactoriesInstances(type, (SpringFactoriesLoader.ArgumentResolver)null);
}

private <T> List<T> getSpringFactoriesInstances(Class<T> type, SpringFactoriesLoader.ArgumentResolver argumentResolver) {
    // 这里通过SpringFactoriesLoader加载类路径下的文件
    return SpringFactoriesLoader.forDefaultResourceLocation(this.getClassLoader()).load(type, argumentResolver);
}
```

```java
public static SpringFactoriesLoader forDefaultResourceLocation(@Nullable ClassLoader classLoader) {
    // 查找所有依赖下的META-INF/spring.factories文件，解析并得到最终的SpringFactoriesLoader对象
    return forResourceLocation("META-INF/spring.factories", classLoader);
}
```

所以`getSpringFactoriesInstances`其实就是通过读取所有`META-INF/spring.factories`文件得到的列表，然后实例化指定类型下读取到的所有实现类并返回，这样，我们就清楚SpringBoot这一大堆参与自动配置的类是怎么加载进来的了。

#### `SpringApplication.run` 方法

现在我们回到一开始的地方，目前SpringApplication对象已经构造好了，继续来看看`run`方法做了什么：

```java
public ConfigurableApplicationContext run(String... args) {
    long startTime = System.nanoTime();
    DefaultBootstrapContext bootstrapContext = this.createBootstrapContext();
    ConfigurableApplicationContext context = null;
    this.configureHeadlessProperty();
    // 获取所有的SpringApplicationRunListener，并通知启动事件，默认只有一个实现类EventPublishingRunListener
    // EventPublishingRunListener会将初始化各个阶段的事件转发给所有监听器
    SpringApplicationRunListeners listeners = this.getRunListeners(args);
    listeners.starting(bootstrapContext, this.mainApplicationClass);
    try {
        // 环境配置，包括我们之前配置的多环境选择
        ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
        ConfigurableEnvironment environment = this.prepareEnvironment(listeners, bootstrapContext, applicationArguments);
        // 打印Banner，从这里开始我们就可以切切实实看到运行了
        Banner printedBanner = this.printBanner(environment);
        // 创建ApplicationContext，也就是整个Spring应用程序的IoC容器，SSM阶段已经详细介绍过
        // 注意这里会根据构造时得到的类型，创建不同的ApplicationContext实现类（比如Servlet环境下就是Web容器）
        context = this.createApplicationContext();
        context.setApplicationStartup(this.applicationStartup);
        // 对ApplicationContext进行前置处理，这里会将创建对象时设定的所有ApplicationContextInitializer拿来执行一次initialize方法，这也验证了我们之前的说法，这一步确实是在刷新容器之前进行的
        this.prepareContext(bootstrapContext, context, environment, listeners, applicationArguments, printedBanner);
        // 执行ApplicationContext的refresh方法，刷新容器初始化所有的Bean，这个也在SSM阶段详细介绍过了
        this.refreshContext(context);
        this.afterRefresh(context, applicationArguments);
        Duration timeTakenToStartup = Duration.ofNanos(System.nanoTime() - startTime);
        if (this.logStartupInfo) {
            (new StartupInfoLogger(this.mainApplicationClass)).logStarted(this.getApplicationLog(), timeTakenToStartup);
        }
        listeners.started(context, timeTakenToStartup);
        // 因为所有的Bean都已经加载，这里就可以调用全部的自定义Runner实现了
        this.callRunners(context, applicationArguments);
    ...
    //结束
    return context;
}
```

至此，SpringBoot项目就正常启动了, 同时在 `this.prepareContext` 把我们的启动类也注册到容器里。

我们发现，即使是SpringBoot，也是离不开Spring最核心的`ApplicationContext`容器，因为它再怎么也是一个Spring项目，即使玩得再高级不还是得围绕IoC容器来进行么。

所以说，SSM阶段学习的内容才是真正的核心，而SpringBoot仅仅是对Spring进行的一层强化封装，便于快速创建Spring项目罢了，这也是为什么一直强调不能跳过SSM先学SpringBoot的原因。

#### `createApplicationContext`方法

既然都谈到这里了，我们不妨再来看一下这里的`ApplicationContext`是怎么来的，打开`createApplicationContext`方法：

```java
protected ConfigurableApplicationContext createApplicationContext() {
    return this.applicationContextFactory.create(this.webApplicationType); //这个类型已经在new的时候确定了
}
```

我们发现在构造方法中`applicationContextFactory`直接使用的是DEFAULT：

```java
...
this.applicationContextFactory = ApplicationContextFactory.DEFAULT;
...
```

```java
ApplicationContextFactory DEFAULT = new DefaultApplicationContextFactory();   //使用的是默认实现类
```

我们继续向下，`DefaultApplicationContextFactory`的源码`create`方法部分：

```java
public ConfigurableApplicationContext create(WebApplicationType webApplicationType) {
    try {
        return (ConfigurableApplicationContext)this.getFromSpringFactories(webApplicationType, ApplicationContextFactory::create, this::createDefaultApplicationContext);  //套娃获取ConfigurableApplicationContext实现
    } catch (Exception var3) {
        throw new IllegalStateException("Unable create a default ApplicationContext instance, you may need a custom ApplicationContextFactory", var3);
    }
}

private <T> T getFromSpringFactories(WebApplicationType webApplicationType, BiFunction<ApplicationContextFactory, WebApplicationType, T> action, Supplier<T> defaultResult) {
  // 可以看到，这里又是通过SpringFactoriesLoader获取到所有候选的ApplicationContextFactory实现
  for (ApplicationContextFactory candidate : SpringFactoriesLoader.loadFactories(ApplicationContextFactory.class,
      getClass().getClassLoader())) {
      T result = action.apply(candidate, webApplicationType);
      if (result != null) {
        return result;   
        // 如果是Servlet环境，这里会找到实现，直接返回
      }
    }
    // 如果是普通的SpringBoot项目，连Web环境都没有，那么就直接创建普通的ApplicationContext
    return (defaultResult != null) ? defaultResult.get() : null;
}
```

既然这里又是`SpringFactoriesLoader`加载`ApplicationContextFactory`实现，我们就直接去看有些啥：

![alt text](img/28.png)

我们也不出意外地在`spring.factories`中找到了这两个实现，因为目前是Servlet环境，所以在返回时得到最终的结果，也就是生成的`AnnotationConfigServletWebServerApplicationContext`对象，也就是说到这里为止，Spring的容器就基本已经确定了，差不多可以开始运行了。

### 自动配置原理

简而言之就是SpringBoot读取`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`文件来确定要加载哪些自动配置类来实现的全自动化，真正做到添加依赖就能够直接完成配置和运行，至此，SpringBoot的原理部分就探究完毕了。

既然主类已经在初始阶段注册为Bean，那么在加载时，就会根据注解定义，进行更多的额外操作。

所以我们来看看主类上的`@SpringBootApplication`注解做了什么事情。

```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(
    excludeFilters = {@Filter(
    type = FilterType.CUSTOM,
    classes = {TypeExcludeFilter.class}
), @Filter(
    type = FilterType.CUSTOM,
    classes = {AutoConfigurationExcludeFilter.class}
)}
)
public @interface SpringBootApplication {
  ...
```

我们发现，`@SpringBootApplication`上添加了`@ComponentScan`注解，此注解我们此前已经认识过了，但是这里并没有配置具体扫描的包，因此它会自动将声明此接口的类所在的包作为`basePackage`，所以，当添加`@SpringBootApplication`之后也就等于直接开启了自动扫描，我们所有的配置都会自动加载，但是一定注意不能**在主类之外的包进行Bean定义**，否则无法扫描到，需要手动配置。

#### `@EnableAutoConfiguration`

我们自己类路径下的配置、还有各种Bean定义如何读取的问题解决了，接着我们来看第二个注解`@EnableAutoConfiguration`，它就是其他Starter自动配置的核心了，我们来看看它是如何定义的：

```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigurationPackage
@Import({AutoConfigurationImportSelector.class})
public @interface EnableAutoConfiguration {
  ...
```

这里就是SSM阶段我们认识的老套路了，直接一手`@Import`，通过这种方式来将一些外部的类进行加载，注册为 Bean。

我们来看看`AutoConfigurationImportSelector`做了什么事情：

```java
public class AutoConfigurationImportSelector implements DeferredImportSelector, BeanClassLoaderAware, ResourceLoaderAware, BeanFactoryAware, EnvironmentAware, Ordered {
        ...
}
```

我们看到它实现了很多接口，包括大量的Aware接口，我们在SSM阶段也介绍过，实际上就是为了感知某些必要的对象，在加载时将其存到当前类中。

其中最核心的是`DeferredImportSelector`接口，它是`ImportSelector`的子类，它定义了`selectImports`方法，用于返回需要加载的类名称

在Spring加载`ImportSelector`时，会调用此方法来获取更多需要加载的类，并将这些类全部注册为Bean：

```java
public interface ImportSelector {
    String[] selectImports(AnnotationMetadata importingClassMetadata);

    @Nullable
    default Predicate<String> getExclusionFilter() {
        return null;
    }
}
```

#### `@Import`注解处理解析 (铺垫)

![alt text](img/30.png)

到目前为止，我们了解了两种使用`@Import`有特殊机制的接口：`ImportSelector`（这里用到的）和`ImportBeanDefinitionRegistrar`（之前SSM阶段源码有讲）当然还有普通的`@Configuration`配置类。

##### `ConfigurationClassPostProcessor`

为了后续更好理解，我们可以来阅读一下`ConfigurationClassPostProcessor`的源码，实际上这个后置处理器是Spring中提供的，这是专门用于处理配置类的后置处理器

其中`ImportBeanDefinitionRegistrar`，还有这里的`ImportSelector`都是靠它来处理，不过当时Spring阶段没有深入讲解，我们来看看它到底是如何处理`@Import`的：

```java
@Override
public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
    ...
    processConfigBeanDefinitions(registry);   //常规套娃
}
```

```java
public void processConfigBeanDefinitions(BeanDefinitionRegistry registry) {
    // 注意这个后置处理器继承自 BeanDefinitionRegistryPostProcessor
    // 所以这个阶段仅仅是已经完成扫描了所有的Bean，得到了所有的BeanDefinition，但是还没有进行任何处理
    // candidate是候选者的意思，一会会将标记了@Configuration的类作为ConfigurationClass加入到configCandidates中
    List<BeanDefinitionHolder> configCandidates = new ArrayList<>();
    // 直接取出所有已注册Bean的名称
    String[] candidateNames = registry.getBeanDefinitionNames();
    for (String beanName : candidateNames) {
       // 依次拿到对应的Bean定义，然后进行判断
       BeanDefinition beanDef = registry.getBeanDefinition(beanName);
       if (beanDef.getAttribute(ConfigurationClassUtils.CONFIGURATION_CLASS_ATTRIBUTE) != null) {
          ...
       }
       else if (ConfigurationClassUtils.checkConfigurationClassCandidate(beanDef, this.metadataReaderFactory)) {   
         // 判断是否为打了 @Configuration 的配置类，如果是就加入到候选列表中
          configCandidates.add(new BeanDefinitionHolder(beanDef, beanName));
       }
    }
    // 如果一个打了 @Configuration 的类都没发现，直接返回
    if (configCandidates.isEmpty()) {
       return;
    }
    // 对所有的配置类依据 @Order 进行排序
    configCandidates.sort((bd1, bd2) -> {
       int i1 = ConfigurationClassUtils.getOrder(bd1.getBeanDefinition());
       int i2 = ConfigurationClassUtils.getOrder(bd2.getBeanDefinition());
       return Integer.compare(i1, i2);
    });
    ...
    // 这里使用do-while语句依次解析所有的配置类
    ConfigurationClassParser parser = new ConfigurationClassParser(
          this.metadataReaderFactory, this.problemReporter, this.environment,
          this.resourceLoader, this.componentScanBeanNameGenerator, registry);
    Set<BeanDefinitionHolder> candidates = new LinkedHashSet<>(configCandidates);
    Set<ConfigurationClass> alreadyParsed = new HashSet<>(configCandidates.size());
    do {
       StartupStep processConfig = this.applicationStartup.start("spring.context.config-classes.parse");
       // 这里就会通过Parser解析配置类中大部分内容，包括我们之前遇到的@Import注解
       parser.parse(candidates);
       parser.validate();
       // 解析完成后读取到所有的配置类
       Set<ConfigurationClass> configClasses = new LinkedHashSet<>(parser.getConfigurationClasses());
      configClasses.removeAll(alreadyParsed);
       ... 
       // 将上面读取的配置类加载为Bean
       this.reader.loadBeanDefinitions(configClasses);
       ...
    }
    while (!candidates.isEmpty());
    ...
}
```

##### 配置类解析

我们就接着来看，`ConfigurationClassParser`是如何进行解析的，直接进入`parse`方法的关键部分：

```java
protected void processConfigurationClass(ConfigurationClass configClass, Predicate<String> filter) throws IOException {
    //处理 @Conditional 相关注解处理，后面会讲
    if (!this.conditionEvaluator.shouldSkip(configClass.getMetadata(), ConfigurationPhase.PARSE_CONFIGURATION)) {
        ...
        }
        ConfigurationClassParser.SourceClass sourceClass = this.asSourceClass(configClass, filter);
        do {
            // 这里就是最核心了
            sourceClass = this.doProcessConfigurationClass(configClass, sourceClass, filter);
        } while(sourceClass != null);

        this.configurationClasses.put(configClass, configClass);
    }
}
```

最后我们再来看最核心的`doProcessConfigurationClass`方法：

```java
protected final SourceClass doProcessConfigurationClass(ConfigurationClass configClass, SourceClass sourceClass)
    ...
    processImports(configClass, sourceClass, getImports(sourceClass), true);    // 处理Import注解
    ...
    return null;
}
```

```java
private void processImports(ConfigurationClass configClass, SourceClass currentSourceClass,
            Collection<SourceClass> importCandidates, Predicate<String> exclusionFilter,
            boolean checkForCircularImports) {
        ...
        if (checkForCircularImports && isChainedImportOnStack(configClass)) {
            // 检查是否存在循环导入情况
            this.problemReporter.error(new CircularImportProblem(configClass, this.importStack));
        }
        else {
            this.importStack.push(configClass);
            try {
                // 依次遍历所有@Import注解中添加的类
                for (SourceClass candidate : importCandidates) {
                    if (candidate.isAssignable(ImportSelector.class)) {
                        // 如果是ImportSelector类型，则加载类，并完成实例化
                        Class<?> candidateClass = candidate.loadClass();
                        ImportSelector selector = ParserStrategyUtils.instantiateClass(candidateClass, ImportSelector.class, this.environment, this.resourceLoader, this.registry);
                        ...
                        // 如果是DeferredImportSelector（延迟导入）则通过deferredImportSelectorHandler进行处理
                        if (selector instanceof DeferredImportSelector deferredImportSelector) {
                            this.deferredImportSelectorHandler.handle(configClass, deferredImportSelector);
                        }
                        else {
                        // 如果是普通的ImportSelector则直接执行selectImports方法得到需要额外导入的类名称
                            String[] importClassNames = selector.selectImports(currentSourceClass.getMetadata());
                            Collection<SourceClass> importSourceClasses = asSourceClasses(importClassNames, exclusionFilter);
                            //递归处理这里得到的全部类
                            processImports(configClass, currentSourceClass, importSourceClasses, exclusionFilter, false);
                        }
                    }
                    else if (candidate.isAssignable(ImportBeanDefinitionRegistrar.class)) {
                        // 判断是否为ImportBeanDefinitionRegistrar类型，SSM阶段已经讲解过了
                        Class<?> candidateClass = candidate.loadClass();
                        ImportBeanDefinitionRegistrar registrar =
                                ParserStrategyUtils.instantiateClass(candidateClass, ImportBeanDefinitionRegistrar.class, this.environment, this.resourceLoader, this.registry);
                        // 往configClass丢ImportBeanDefinitionRegistrar信息进去，之后再处理
                        configClass.addImportBeanDefinitionRegistrar(registrar, currentSourceClass.getMetadata());
                    }
                    else {
                        // 如果以上类型都不是，则不使用特殊机制，单纯导入为普通的配置类进行处理
                        this.importStack.registerImport(
                                currentSourceClass.getMetadata(), candidate.getMetadata().getClassName());
                        processConfigurationClass(candidate.asConfigClass(configClass), exclusionFilter);
                    }
                }
            }
            ...
        }
    }
}
```

不难注意到，虽然这里特别处理了`ImportSelector`对象，但是还针对`ImportSelector`的子接口`DeferredImportSelector`进行了额外处理，Deferred是延迟的意思，它是一个延迟执行的`ImportSelector`，并不会立即进处理，而是丢进DeferredImportSelectorHandler，并且在我们上面提到的`parse`方法的最后进行处理：

```java
public void parse(Set<BeanDefinitionHolder> configCandidates) {
     ...
    this.deferredImportSelectorHandler.process();  
    // 执行DeferredImportSelector的process方法，这里依然会进行上面的processImports操作，只不过被延迟到这个位置执行了
}
```

我们接着来看`DeferredImportSelector`正好就有一个`process`方法：

```java
ublic interface DeferredImportSelector extends ImportSelector {
    @Nullable
    default Class<? extends DeferredImportSelector.Group> getImportGroup() {
        return null;
    }

    public interface Group {
        void process(AnnotationMetadata metadata, DeferredImportSelector selector);

        Iterable<DeferredImportSelector.Group.Entry> selectImports();

        public static class Entry {
          ...
        }
    }
}
```

最后经过ConfigurationClassParser处理完成后，通过`parser.getConfigurationClasses()`就能得到通过配置类导入那些额外的配置类或是特殊的类。

##### 配置类注册

最后将这些配置类全部注册BeanDefinition，然后就可以交给接下来的Bean初始化过程去处理了：

```java
this.reader.loadBeanDefinitions(configClasses);
```

最后我们再去看`loadBeanDefinitions`是如何运行的：

```java
public void loadBeanDefinitions(Set<ConfigurationClass> configurationModel) {
    ConfigurationClassBeanDefinitionReader.TrackedConditionEvaluator trackedConditionEvaluator = new ConfigurationClassBeanDefinitionReader.TrackedConditionEvaluator();
    Iterator var3 = configurationModel.iterator();
    while(var3.hasNext()) {
        ConfigurationClass configClass = (ConfigurationClass)var3.next();
        this.loadBeanDefinitionsForConfigurationClass(configClass, trackedConditionEvaluator);
    }
}

private void loadBeanDefinitionsForConfigurationClass(ConfigurationClass configClass, ConfigurationClassBeanDefinitionReader.TrackedConditionEvaluator trackedConditionEvaluator) {
    if (trackedConditionEvaluator.shouldSkip(configClass)) {
        ...
    } else {
        if (configClass.isImported()) {
            this.registerBeanDefinitionForImportedConfigurationClass(configClass);  
            // 注册配置类自己
        }
        Iterator var3 = configClass.getBeanMethods().iterator();
        while(var3.hasNext()) {
            BeanMethod beanMethod = (BeanMethod)var3.next();
            this.loadBeanDefinitionsForBeanMethod(beanMethod); 
            // 注册@Bean注解标识的方法
        }
        // 注册@ImportResource引入的XML配置文件中读取的bean定义
        this.loadBeanDefinitionsFromImportedResources(configClass.getImportedResources());
        // 注册configClass中经过解析后保存的所有ImportBeanDefinitionRegistrar，注册对应的BeanDefinition
        this.loadBeanDefinitionsFromRegistrars(configClass.getImportBeanDefinitionRegistrars());
    }
}
```

这样，整个`@Configuration`配置类的底层配置流程我们就大致了解了。

#### `AutoConfigurationImportSelector`实现

接着我们来看`AutoConfigurationImportSelector`是如何实现自动配置的，可以看到内部类AutoConfigurationGroup的process方法，它是父接口的实现，因为父接口是`DeferredImportSelector`，根据前面的推导，很容易得知，实际上最后会调用`process`方法获取所有的自动配置类：

```java
public void process(AnnotationMetadata annotationMetadata, DeferredImportSelector deferredImportSelector) {
    Assert.state(deferredImportSelector instanceof AutoConfigurationImportSelector, () -> {
        return String.format("Only %s implementations are supported, got %s", AutoConfigurationImportSelector.class.getSimpleName(), deferredImportSelector.getClass().getName());
    });
    // 获取所有的Entry，其实就是读取来查看有哪些自动配置类
    AutoConfigurationImportSelector.AutoConfigurationEntry autoConfigurationEntry = ((AutoConfigurationImportSelector)deferredImportSelector).getAutoConfigurationEntry(annotationMetadata);
    this.autoConfigurationEntries.add(autoConfigurationEntry);
    Iterator var4 = autoConfigurationEntry.getConfigurations().iterator();

    while(var4.hasNext()) {
        String importClassName = (String)var4.next();
        this.entries.putIfAbsent(importClassName, annotationMetadata);
    }
    // 这里结束之后，entries中就有上面获取到的自动配置类了
}
```

我们接着来看`getAutoConfigurationEntry`方法：

```java
protected AutoConfigurationImportSelector.AutoConfigurationEntry getAutoConfigurationEntry(AnnotationMetadata annotationMetadata) {
    // 这里判断是否开启了自动配置，你想的没错，自动配置是可以关的
    if (!this.isEnabled(annotationMetadata)) {
        return EMPTY_ENTRY;
    } else {
        // 根据注解定义获取一些属性
        AnnotationAttributes attributes = this.getAttributes(annotationMetadata);
        // 获取所有需要自动配置的类
        List<String> configurations = this.getCandidateConfigurations(annotationMetadata, attributes);
        // 移除掉重复的自动配置类
        configurations = removeDuplicates(configurations);
        // 获取需要排除掉的自动配置类
        Set<String> exclusions = getExclusions(annotationMetadata, attributes);
        checkExcludedClasses(configurations, exclusions);
        configurations.removeAll(exclusions);
        ...
        return new AutoConfigurationEntry(configurations, exclusions);
    }
}
```

我们接着往里面看：

```java
protected List<String> getCandidateConfigurations(AnnotationMetadata metadata, AnnotationAttributes attributes) {
        // 这里继续套娃
        List<String> configurations = ImportCandidates.load(AutoConfiguration.class, this.getBeanClassLoader()).getCandidates();
        ...
}
```

到这里终于找到了：

```java
public static ImportCandidates load(Class<?> annotation, ClassLoader classLoader) {
        Assert.notNull(annotation, "'annotation' must not be null");
        ClassLoader classLoaderToUse = decideClassloader(classLoader);
        // 这里直接获取 META-INF/spring/注解类名.imports 中的所有内容
        String location = String.format("META-INF/spring/%s.imports", annotation.getName());
        ...
}
```

我们可以直接找到：

![alt text](img/29.png)

可以看到有很多自动配置类，实际上SpringBoot的starter都是依靠自动配置类来实现自动配置的，我们可以随便看一个，比如用于自动配置Mybatis框架的MybatisAutoConfiguration自动配置类：

```java
@Configuration
@ConditionalOnClass({SqlSessionFactory.class, SqlSessionFactoryBean.class})
@ConditionalOnSingleCandidate(DataSource.class)
@EnableConfigurationProperties({MybatisProperties.class})
@AutoConfigureAfter({DataSourceAutoConfiguration.class, MybatisLanguageDriverAutoConfiguration.class})
public class MybatisAutoConfiguration implements InitializingBean {
    ...
      
    @Bean
    @ConditionalOnMissingBean
    public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
        ...
    }

    @Bean
    @ConditionalOnMissingBean
    public SqlSessionTemplate sqlSessionTemplate(SqlSessionFactory sqlSessionFactory) {
        ...
    }

    ...
}
```

可以看到里面直接将`SqlSessionFactory`和`SqlSessionTemplate`注册为Bean了，由于这个自动配置类在上面的一套流程中已经加载了，这样就不需要我们手动进行注册这些Bean了。

#### `@Conditional`

不过这里有一个非常有意思的 @Conditional 注解，它可以根据条件来判断是否注册这个Bean，比如 @ConditionalOnMissingBean 注解就是当这个Bean不存在的时候，才会注册，如果这个Bean已经被其他配置类给注册了，那么这里就不进行注册。

经过这一套流程，简而言之就是SpringBoot读取`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`文件来确定要加载哪些自动配置类来实现的全自动化，真正做到添加依赖就能够直接完成配置和运行，至此，SpringBoot的原理部分就探究完毕了。

### 自定义Starter项目

我们仿照Mybatis来编写一个自己的starter，Mybatis的starter包含两个部分：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot</artifactId>
    <version>2.2.0</version>
  </parent>
  <!--  starter本身只做依赖集中管理，不编写任何代码  -->
  <artifactId>mybatis-spring-boot-starter</artifactId>
  <name>mybatis-spring-boot-starter</name>
  <properties>
    <module.name>org.mybatis.spring.boot.starter</module.name>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>
    <!--  编写的专用配置模块   -->
    <dependency>
      <groupId>org.mybatis.spring.boot</groupId>
      <artifactId>mybatis-spring-boot-autoconfigure</artifactId>
    </dependency>
    <dependency>
      <groupId>org.mybatis</groupId>
      <artifactId>mybatis</artifactId>
    </dependency>
    <dependency>
      <groupId>org.mybatis</groupId>
      <artifactId>mybatis-spring</artifactId>
    </dependency>
  </dependencies>
</project>
```

因此我们也将我们自己的starter这样设计，我们设计三个模块：

- spring-boot-hello：基础业务功能模块
- spring-boot-starter-hello：启动器
- spring-boot-autoconifgurer-hello：自动配置依赖

首先是基础业务功能模块，这里我们随便创建一个类就可以了：

```java
public class HelloWorldService {
    public void test(){
        System.out.println("Hello World!");
    }
}
```

启动器主要做依赖管理，这里就不写任何代码，只写pom文件：

```xml
<dependency>
      <groupId>org.example</groupId>
      <artifactId>spring-boot-autoconifgurer-hello</artifactId>
      <version>0.0.1-SNAPSHOT</version>
</dependency>

<dependency>
      <groupId>org.example</groupId>
      <artifactId>spring-boot-hello</artifactId>
      <version>0.0.1-SNAPSHOT</version>
</dependency>
```

导入autoconfigurer模块作为依赖即可，接着我们去编写autoconfigurer模块，首先导入依赖：

```xml
<dependencies>
    <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-autoconfigure</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-configuration-processor</artifactId>
            <optional>true</optional>
        </dependency>

        <dependency>
            <groupId>org.example</groupId>
            <artifactId>spring-boot-hello</artifactId>
            <version>0.0.1-SNAPSHOT</version>
        </dependency>
</dependencies>
```

接着创建一个HelloWorldAutoConfiguration作为自动配置类：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication
@EnableConfigurationProperties(HelloWorldProperties.class)
public class HelloWorldAutoConfiguration {

    Logger logger = Logger.getLogger(this.getClass().getName());

    @Autowired
    HelloWorldProperties properties;

    @Bean
    @ConditionalOnMissingBean
    public HelloWorldService helloWorldService(){
        logger.info("自定义starter项目已启动！");
        logger.info("读取到自定义配置："+properties.getValue());
        return new HelloWorldService();
    }
}
```

对应的配置读取类：

```java
@ConfigurationProperties("hello.world")
public class HelloWorldProperties {

    private String value;

    public void setValue(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
```

接着再编写`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`文件，并将我们的自动配置类添加即可：

```properties
com.test.autoconfigure.HelloWorldAutoConfiguration
```

最后再Maven根项目执行`install`安装到本地仓库，完成。接着就可以在其他项目中使用我们编写的自定义starter了。
