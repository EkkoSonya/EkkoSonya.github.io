---
title: Spring系列八股22 - SpringBoot5 (Spring Boot Starter)
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

## SpringBoot5

### Spring Boot Starter

Starter 的核心思想是把相关的依赖打包在一起，让开发者只需要引入一个 starter 依赖，就能获得完整的功能模块

当我们在 pom.xml 中引入一个 starter 时，Maven 就会自动解析这个 starter 的依赖树，把所有需要的 jar 包都下载下来

每个 starter 都会包含对应的自动配置类，这些配置类通过条件注解来判断是否应该生效

比如当我们引入了 spring-boot-starter-web，它会自动配置 Spring MVC、内嵌的 Tomcat 服务器等

spring.factories 文件是 Spring Boot 自动装配的核心，它位于每个 starter 的 META-INF 目录下

> 3.0 后是 xxx.imports

这个文件列出了所有的自动配置类，Spring Boot 在启动时会读取这个文件，加载对应的配置类

```
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.demo.autoconfigure.DemoAutoConfiguration,\
com.example.demo.autoconfigure.AnotherAutoConfiguration
```

### 自定义一个 SpringBoot Starter

SpringBoot 官方建议第三方 starter 的命名格式是 xxx-spring-boot-starter，所以我们可以创建一个名为 my-spring-boot-starter 的项目

一共包括两个模块，一个是 autoconfigure 模块，包含自动配置逻辑；一个是 starter 模块，只包含依赖声明

#### 引入相关依赖

```xml
<properties>
    <spring.boot.version>2.3.1.RELEASE</spring.boot.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

#### 创建一个配置属性类

用于读取配置文件中的属性。通常使用 `@ConfigurationProperties` 注解来标记这个类

```java
@ConfigurationProperties(prefix = "mystarter")
public class MyStarterProperties {
    private String message = "Penguin";

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
```

#### 创建一个简单的服务类，用于提供业务逻辑

```java
public class MyService {
    private final String message;

    public MyService(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
```

#### 创建一个自动配置类

通常在 autoconfigure 包下，该类的作用是根据配置文件中的属性来创建和配置 Bean

然后自动装配扫描时就会检测到

```java
@Configuration
@EnableConfigurationProperties(MyStarterProperties.class)
public class MyServiceAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public MyService myService(MyStarterProperties properties) {
        return new MyService(properties.getMessage());
    }
}
```

#### 配置自动装配

在 `src/main/resources/META-INF/spring` 目录下创建一个名为 `org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件

告诉 SpringBoot 在启动时要加载我们的自动配置类

```java
com.ekko.mystarter.autoconfigure.MyServiceAutoConfiguration
```

#### 使用 Maven 打包这个项目

```shell
mvn clean install
```

#### 通过 Maven 来添加这个自定义的 Starter 依赖

在其他的 Spring Boot 项目中，通过 Maven 来添加这个自定义的 Starter 依赖

pom 引入：

```xml
<dependency>
    <groupId>com.ekko</groupId>
    <artifactId>my-spring-boot-starter</artifactId>
    <version>0.0.1-SNAPSHOT</version>
</dependency>
```

并通过 `application.properties` 配置信息：

```xml
mystarter.message=ekko
```

然后就可以在 Spring Boot 项目中注入 MyService 来使用它

### `application.properties`

**Spring Boot 默认只会加载主程序（即你的 `demo1`）类路径根目录下的 `application.properties`，而不会自动去扫描并合并所有 Jar 包根目录下的同名文件。**

如果每个 Starter 都往 `application.properties` 里写东西，那最后 Spring 该听谁的？为了避免这种混乱，Spring Boot 设计了一套优先级和加载机制。

Spring Boot 的 `ConfigDataEnvironment` 在启动时，默认的搜索路径是：

- 当前目录下的 `/config` 子目录。
- 当前目录。
- 类路径下的 `/config` 目录。
- **类路径根目录（Classpath Root）。**

当你把 `application.properties` 放在 Starter 的 Jar 包里时，它确实在类路径根目录下。但问题是：**主程序（Demo1）自己通常也有个 `application.properties`。**

在类路径中，如果存在多个同名资源，通常只有“第一个”被加载（通常是主程序里的那个），其他的会被**覆盖（Shadowed）**

Spring 不会对分散在各个 Jar 包里的 `application.properties` 进行“自动并集”操作。

#### 正确的做法：使用 `@ConfigurationProperties`（最推荐）

在 Starter 中，提供配置的最佳实践是：**在代码里定义默认值，并允许用户在 `demo1` 的配置文件中覆盖它。**

**第一步：定义属性类**

```java
@ConfigurationProperties(prefix = "ekko.mystarter")
public class MyStarterProperties {
    /**
     * 这里设置默认值
     */
    private String message = "Default Message from Starter";

    // Getter and Setter
}
```

**第二步：在配置类中启用**

```java
@Configuration
@EnableConfigurationProperties(MyStarterProperties.class)
public class MyServiceAutoConfiguration {
    
    @Bean
    public MyService myService(MyStarterProperties properties) {
        return new MyService(properties.getMessage());
    }
}
```

这样，用户如果想改，只需在 `demo1` 的 `application.properties` 里写 `ekko.mystarter.message=Hello` 即可。
