---
title: Spring系列八股19 - SpringBoot2 (自动装配分析 @Import)
date: 2026-4-6
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

## SpringBoot

### `@Import`

它的核心作用是：将指定的类、配置类或动态生成的 Bean 注册到 Spring 的 IoC 容器中

`@ComponentScan` 只能扫描你项目包路径下的类。但如果你想导入一个外部 jar 包里的类，或者一个不在扫描路径下的配置类，`@ComponentScan` 就够不着了。

`@Import` 就是解决这个问题的。

#### 引入普通类或 `@Configuration` 类

当你把项目拆分成了多个配置类，或者你想直接把某个没有加上 @Component 注解的第三方类注入到 Spring 容器时，就可以直接使用它

```java
// 被引入的配置类
@Configuration
public class DatabaseConfig {
    // ... 配置数据库 Bean
}

// 主配置类
@Configuration
@Import({DatabaseConfig.class, User.class}) // 明确引入 DatabaseConfig 和 User 类
public class AppConfig {
}
```

效果：DatabaseConfig 里面的 Bean 以及 User 类本身，都会被直接注册进 Spring 容器

#### 引入 `ImportSelector` 的实现类（动态引入机制）

这是 Spring Boot 自动装配（Auto-Configuration）的核心秘密所在。你可以通过编写代码逻辑，动态决定要向容器中注入哪些配置类

- 实现 ImportSelector 接口的 selectImports 方法，返回一个包含全限定类名的字符串数组。Spring 会把这些类注册进容器

```java
public class MyImportSelector implements ImportSelector {
    @Override
    public String[] selectImports(AnnotationMetadata importingClassMetadata) {
        // 可以根据条件（比如环境变量、其他注解存在与否）动态返回要加载的类
        return new String[]{"com.example.config.AConfig", "com.example.config.BConfig"};
    }
}

@Configuration
@Import(MyImportSelector.class) 
// Spring 会调用其 selectImports 方法并注入返回的类
public class AppConfig {}
```

#### 引入 ImportBeanDefinitionRegistrar 的实现类（最底层、最灵活的用法）

如果你需要更细粒度的控制，比如自己构建 BeanDefinition（Bean 的定义信息，包含作用域、懒加载等），你可以使用这种方式。

- MyBatis 的 `@MapperScan`、Feign 的 `@EnableFeignClients` 等框架整合注解，底层几乎全是用这个机制实现的，用来动态扫描并生成代理对象的 Bean。

#### 原理分析

> 为什么设计一个实现类 ImportSelector 接口，然后@Import它就会调用对应的selectImports方法

这并不是 Java 语言本身的某种自动机制，而是 Spring 容器在启动时，专门写了一段代码去“特殊照顾” ImportSelector 这个接口

##### 后置处理器 `ConfigurationClassPostProcessor`

在 Spring 启动时，有一个非常核心的“总管家”叫做 `ConfigurationClassPostProcessor`（它是一个 Bean 工厂后置处理器）

它的主要工作就是去解析所有的配置类（带有 `@Configuration`、`@Component`、`@Import` 等注解的类）

当这位总管家在解析某个配置类时，如果看到了 `@Import` 注解，它就会进入一个专门处理 Import 的解析器：`ConfigurationClassParser`

在 `ConfigurationClassParser` 的源码中（具体是 `processImports` 方法），Spring 拿到你 `@Import` 进来的类之后，做了一个**类型判断大分流**

```java
// configClass：当前正在被解析的配置类（比如标了 @SpringBootApplication 的主类）
// currentSourceClass：当前配置类的源信息
// importCandidates：@Import 里传入的所有候选类
// filter：过滤器，用于排除某些类
// checkForCircularImports：是否要检查循环导入
private void processImports(ConfigurationClass configClass, SourceClass currentSourceClass, Collection<SourceClass> importCandidates, Predicate<String> filter, boolean checkForCircularImports) {

  // 如果没有任何 @Import 的候选类，直接跳过
  if (!importCandidates.isEmpty()) {

      // 检查循环导入：比如 A @Import B，B 又 @Import A，这种情况直接报错
      if (checkForCircularImports && this.isChainedImportOnStack(configClass)) {
          this.problemReporter.error(new CircularImportProblem(configClass, this.importStack));
      } else {
          // 把当前配置类压栈，用于后续循环导入的检测
          this.importStack.push(configClass);

          try {
              // 遍历所有 @Import 进来的候选类，逐一判断类型
              for(SourceClass candidate : importCandidates) {

                  // ① 判断是否是 ImportSelector 类型（如 AutoConfigurationImportSelector）
                  if (candidate.isAssignable(ImportSelector.class)) {
                      Class<?> candidateClass = candidate.loadClass();
                      // 实例化这个 ImportSelector
                      ImportSelector selector = (ImportSelector)ParserStrategyUtils.instantiateClass(candidateClass, ImportSelector.class, this.environment, this.resourceLoader, this.registry);

                      // 如果 selector 自带了额外的排除过滤器，合并进来
                      Predicate<String> selectorFilter = selector.getExclusionFilter();
                      if (selectorFilter != null) {
                          filter = filter.or(selectorFilter);
                      }

                      // 判断是否是「延迟执行」的 ImportSelector
                      if (selector instanceof DeferredImportSelector) {
                          // DeferredImportSelector 不立即执行，等所有配置类都解析完再处理
                          // AutoConfigurationImportSelector 就实现了这个接口
                          // 目的是确保自动配置类在用户自定义的 Bean 之后再处理，避免覆盖用户配置
                          DeferredImportSelector deferredImportSelector = (DeferredImportSelector)selector;
                          this.deferredImportSelectorHandler.handle(configClass, deferredImportSelector);
                      } else {
                          // 普通 ImportSelector：立即调用 selectImports() 拿到要导入的类名数组
                          String[] importClassNames = selector.selectImports(currentSourceClass.getMetadata());
                          Collection<SourceClass> importSourceClasses = this.asSourceClasses(importClassNames, filter);
                          // 递归处理这些被导入的类（它们可能也有 @Import）
                          this.processImports(configClass, currentSourceClass, importSourceClasses, filter, false);
                      }

                  // ② 判断是否是 ImportBeanDefinitionRegistrar 类型
                  } else if (candidate.isAssignable(ImportBeanDefinitionRegistrar.class)) {
                      Class<?> candidateClass = candidate.loadClass();
                      // 实例化后先存起来，等配置类解析完再统一调用 registerBeanDefinitions()
                      ImportBeanDefinitionRegistrar registrar = (ImportBeanDefinitionRegistrar)ParserStrategyUtils.instantiateClass(candidateClass, ImportBeanDefinitionRegistrar.class, this.environment, this.resourceLoader, this.registry);
                      configClass.addImportBeanDefinitionRegistrar(registrar, currentSourceClass.getMetadata());

                  // ③ 普通类（既不是 ImportSelector 也不是 Registrar）
                  } else {
                      // 直接当作 @Configuration 配置类来处理，注册到容器中
                      this.importStack.registerImport(currentSourceClass.getMetadata(), candidate.getMetadata().getClassName());
                      this.processConfigurationClass(candidate.asConfigClass(configClass), filter);
                  }
              }
          } catch (BeanDefinitionStoreException ex) {
              throw ex;
          } catch (Throwable ex) {
              throw new BeanDefinitionStoreException("Failed to process import candidates for configuration class [" + configClass.getMetadata().getClassName() + "]: " + ex.getMessage(), ex);
          } finally {
              // 无论成功还是失败，最后都要把当前类从栈里弹出
              this.importStack.pop();
          }
      }

  }
}
```
