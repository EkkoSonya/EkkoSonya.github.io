---
title: Javassm - SpringBoot3
date: 2025-09-25
category:
  - code
tag:
  - javassm
  - Spring
# star: true
# sticky: true
order: -0.58
---

## 多环境配置

在日常开发中，我们项目会有多个环境。

例如开发环境（develop）也就是我们研发过程中疯狂敲代码修BUG阶段

生产环境（production ）项目开发得差不多了，可以放在服务器上跑了

不同的环境下，可能我们的配置文件也存在不同，但是我们不可能切换环境的时候又去重新写一次配置文件，所以我们可以将多个环境的配置文件提前写好，进行自由切换。

由于SpringBoot只会读取`application.properties`或是`application.yml`文件，那么怎么才能实现自由切换呢？

SpringBoot给我们提供了一种方式，我们可以通过配置文件指定：

```yaml
spring:
  profiles:
    active: dev
```

接着我们分别创建两个环境的配置文件，`application-dev.yml`和`application-prod.yml`分别表示开发环境和生产环境的配置文件

比如开发环境我们使用的服务器端口为8080，而生产环境下可能就需要设置为80或是443端口，那么这个时候就需要不同环境下的配置文件进行区分：

```yaml
server:
  port: 8080
```

```yaml
server:
  port: 80
```

这样我们就可以灵活切换生产环境和开发环境下的配置文件了。

### 日志系统多环境

SpringBoot自带的Logback日志系统也是支持多环境配置的

比如我们想在开发环境下输出日志到控制台，而生产环境下只需要输出到文件即可，这时就需要进行环境配置：

```xml
<springProfile name="dev">
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>
</springProfile>

<springProfile name="prod">
    <root level="INFO">
        <appender-ref ref="FILE"/>
    </root>
</springProfile>
```

注意`springProfile`是区分大小写的！

### Maven多环境配置

那如果我们希望生产环境中不要打包开发环境下的配置文件呢，我们目前虽然可以切换开发环境，但是打包的时候依然是所有配置文件全部打包，这样总感觉还欠缺一点完美，因此，打包的问题就只能找Maven解决

Maven也可以设置多环境：

```xml
<!--分别设置开发，生产环境-->
<profiles>
    <!-- 开发环境 -->
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <environment>dev</environment>
        </properties>
    </profile>
    <!-- 生产环境 -->
    <profile>
        <id>prod</id>
        <activation>
            <activeByDefault>false</activeByDefault>
        </activation>
        <properties>
            <environment>prod</environment>
        </properties>
    </profile>
</profiles>
```

接着，我们需要根据环境的不同，排除其他环境的配置文件(在`<build>`里)：

```xml
<resources>
<!--排除配置文件-->
    <resource>
        <directory>src/main/resources</directory>
        <!--先排除所有的配置文件-->
        <excludes>
            <!--使用通配符，当然可以定义多个exclude标签进行排除-->
            <exclude>application*.yml</exclude>
        </excludes>
    </resource>

    <!--根据激活条件引入打包所需的配置和文件-->
    <resource>
        <directory>src/main/resources</directory>
        <!--引入所需环境的配置文件-->
        <filtering>true</filtering>
        <includes>
            <include>application.yml</include>
            <!--根据maven选择环境导入配置文件-->
            <include>application-${environment}.yml</include>
        </includes>
    </resource>
</resources>
```

接着，我们可以直接将Maven中的`environment`属性，传递给SpringBoot的配置文件，在构建时替换为对应的值：

```yaml
spring:
  profiles:
    active: '@environment@'  
    #注意YAML配置文件需要加单引号，否则会报错
```

这样，根据我们Maven环境的切换，SpringBoot的配置文件也会进行对应的切换。

最后我们打开Maven栏目，就可以自由切换了，直接勾选即可，注意切换环境之后要重新加载一下Maven项目，不然不会生效！
