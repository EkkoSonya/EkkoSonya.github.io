---
title: javaweb - Lombok1
date: 2024-05-26
category:
  - code
tag:
  - javaweb
  - Lombok1
# star: true
# sticky: true
order: -0.7491
---

## Lombok1

我们发现，在以往编写项目时，尤其是在类进行类内部成员字段封装时，需要编写大量的`get/set`方法，这不仅使得我们类定义中充满了get和set方法，同时如果字段名称发生改变，又要挨个进行修改，甚至当字段变得很多时，构造方法的编写会非常麻烦！

通过使用 Lombok（小辣椒）就可以解决这样的问题！
![img](../../img/javaweb/8.png)

使用原生方式和小辣椒方式编写类的区别，首先是传统方式：

```java
public class Student {
    private Integer sid;
    private String name;
    private String sex;

    public Student(Integer sid, String name, String sex) {
        this.sid = sid;
        this.name = name;
        this.sex = sex;
    }

    public Integer getSid() {             //长！
        return sid;
    }

    public void setSid(Integer sid) {     //到！
        this.sid = sid;
    }

    public String getName() {             //爆！
        return name;
    }

    public void setName(String name) {    //炸！
        this.name = name;
    }

    public String getSex() {
        return sex;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }
}
```

而使用Lombok之后：

```java
@Getter
@Setter
@AllArgsConstructor
public class Student {
    private Integer sid;
    private String name;
    private String sex;
}
```

我们发现，使用Lombok之后，**只需要添加几个注解**，就能够解决掉我们之前长长的一串代码！

### 配置Lombok

- 首先我们需要导入Lombok的jar依赖，和jdbc依赖是一样的，放在项目目录下直接导入就行了。可以在这里进行下载：<https://projectlombok.org/download>
- 然后我们要安装一下Lombok插件，由于IDEA默认都安装了Lombok的插件，因此直接导入依赖后就可以使用了。
- 重启IDEA

Lombok 是一种插件化注解API，是通过**添加注解**来实现的，然后在`javac`进行编译的时候，进行处理(**编译阶段处理**)。

Java的编译过程可以分成三个阶段：
![img](../../img/javaweb/9.png)

1. 所有源文件会被解析成语法树。
2. 调用注解处理器。如果注解处理器产生了新的源文件，新文件也要进行编译。
3. 最后，语法树会被分析并转化成类文件。

实际上在上述的第二阶段，会执行*[lombok.core.AnnotationProcessor](https://github.com/rzwitserloot/lombok/blob/master/src/core/lombok/core/AnnotationProcessor.java)*，它所做的工作就是我们上面所说的，修改语法树。

### 使用Lombok

我们通过实战来演示一下Lombok的实用注解：

- 我们通过添加`@Getter`和`@Setter`来为当前类的所有字段生成`get/set`方法，他们可以添加到类或是字段上，注意静态字段不会生成，final字段无法生成set方法。
  - 我们还可以使用`@Accessors`来控制生成`Getter`和`Setter`的样式。

- 我们通过添加`@ToString`来为当前类生成预设的toString方法。

- 我们可以通过添加`@EqualsAndHashCode`来快速生成比较和哈希值方法。

- 我们可以通过添加`@AllArgsConstructor`和`@NoArgsConstructor`来快速生成全参构造和无参构造。

- 我们可以添加`@RequiredArgsConstructor`来快速生成参数只包含`final`或被标记为`@NonNull`的成员字段。

- 使用`@Data`能代表`@Setter`、`@Getter`、`@RequiredArgsConstructor`、`@ToString`、`@EqualsAndHashCode`全部注解。
  - 一旦使用`@Data`就不建议此类有继承关系，因为`equal`方法可能不符合预期结果（尤其是仅比较子类属性）。

- 使用`@Value`与`@Data`类似，但是并不会生成setter并且成员属性都是final的。

- 使用`@SneakyThrows`来自动生成try-catch代码块。

- 使用`@Cleanup`作用与局部变量，在最后自动调用其`close()`方法（可以自由更换）

- 使用`@Builder`来快速生成**建造者模式**。
  - 通过使用`@Builder.Default`来指定默认值。
  - 通过使用`@Builder.ObtainVia`来指定默认值的获取方式。
