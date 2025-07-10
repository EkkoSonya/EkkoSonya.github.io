---
title: Maven4 - 导入本地依赖
date: 2025-07-10
category:
  - code
tag:
  - javaweb
  - Maven
# star: true
# sticky: true
order: -0.7467
---

## Maven4 - 导入本地依赖

### Maven项目导入自己项目 `mvn install`

如何在其他项目中引入我们自己编写的Maven项目作为依赖使用。

这里我们创建一个用于测试的简单项目：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.test</groupId>
    <artifactId>TestMaven</artifactId>
    <version>1.0-SNAPSHOT</version>

    ...

</project>
```

```java
public class TestUtils {
    public static void test() {
        System.out.println("抛开事实不谈，你们就没有一点错吗？");
    }
}
```

接着我们点击右上角的Maven选项

然后执行`install`或直接在命令行中输入`mvn install`来安装我们自己的项目到本地Maven仓库中。

接着我们就可以**在需要使用此项目作为依赖的其他项目中使用它**了，只需要填写和这边一样的坐标：

```xml
<dependency>
    <groupId>com.test</groupId>
    <artifactId>TestMaven</artifactId>
    <version>1.0-SNAPSHOT</version>
</dependency>
```

接着我们就可以在项目中直接使用了：

```java
public static void main(String[] args) {
    TestUtils.test();
}
```

#### 依赖传递

注意，如果我们的旧项目中引入了一些其他的依赖，那么此依赖是**会一起被传递的**

比如这里我们添加了MyBatis的依赖到原项目中：

```xml
<dependencies>
    <dependency>
        <groupId>org.mybatis</groupId>
        <artifactId>mybatis</artifactId>
        <version>3.5.16</version>
    </dependency>
</dependencies>
```

此时在引入此项目的其他项目中，此依赖也被一起传递

也就是说，当我们的项目依赖于其他内容时，为了保证完整性，**默认情况下会一并引入所有此项目包含的依赖项**。

#### 可选依赖 `optional`

**作用在被导入的项目中**

在某些情况下，可能我们并不希望某些依赖直接被项目连带引入，因此，当项目中的某些依赖不希望被使用此项目作为依赖的项目使用时，我们可以给依赖添加`optional`标签表示此依赖是可选的

默认在导入依赖时，不会导入可选的依赖：

```xml
<optional>true</optional>
```

比如Mybatis的POM文件中，就存在大量的可选依赖：

```xml
<dependency>
  <groupId>org.slf4j</groupId>
  <artifactId>slf4j-api</artifactId>
  <version>1.7.30</version>
  <optional>true</optional>
</dependency>
<dependency>
  <groupId>org.slf4j</groupId>
  <artifactId>slf4j-log4j12</artifactId>
  <version>1.7.30</version>
  <optional>true</optional>
</dependency>
<dependency>
  <groupId>log4j</groupId>
  <artifactId>log4j</artifactId>
  <version>1.2.17</version>
  <optional>true</optional>
</dependency>
 ...
```

由于Mybatis要支持多种类型的日志，需要用到很多种不同的日志框架，因此需要导入这些依赖来做兼容，但是我们项目中并不一定会使用这些日志框架作为Mybatis的日志打印器，**因此这些日志框架仅Mybatis内部做兼容需要导入使用**，而我们可以选择不使用这些框架或是选择其中一个即可，也就是说**我们导入Mybatis之后想用什么日志框架再自己加就可以了。**

#### 排除依赖中的不必要依赖 `exclusion`

**作用在我们自己的项目中**

现在我们可以让使用此项目作为依赖的项目不使用可选依赖，但是如果别人的项目中没有将我们不希望的依赖作为可选依赖，这就导致我们还是会连带引入这些依赖

这个时候我们就可以通过排除依赖来防止添加不必要的依赖，只需添加`exclusion`标签即可：

```xml
<dependency>
    <groupId>com.test</groupId>
    <artifactId>TestMaven</artifactId>
    <version>1.1-SNAPSHOT</version>
    <exclusions>
        <exclusion>
            <groupId>org.mybatis</groupId>
            <artifactId>mybatis</artifactId>
            <!--  可以不指定版本号，只需要组名和项目名称  -->
        </exclusion>
    </exclusions>
</dependency>
```

此时我们通过这种方式手动排除了Test项目中包含的MyBatis依赖，这样项目中就不会包含此依赖了。
