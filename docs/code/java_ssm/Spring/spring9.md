---
title: Javassm - AOP2
date: 2025-08-16
category:
  - code
tag:
  - javassm
  - Spring
  - SpringEL
# star: true
# sticky: true
order: -0.5994
---

## AOP面向切片2

### 使用接口实现AOP

我们来看看如何使用`Advice`接口实现AOP。

它与我们之前学习的动态代理更接近一些，比如在方法开始执行之前或是执行之后会去调用我们实现的接口，首先我们需要将一个类实现`Advice`接口，只有实现此接口，才可以被通知

比如我们这里使用`MethodBeforeAdvice`表示是一个在方法执行之前的动作：

```java
public class StudentAOP implements MethodBeforeAdvice {
    @Override
    public void before(Method method, Object[] args, Object target) throws Throwable {
        System.out.println("通过Advice实现AOP");
    }
}
```

我们发现，方法中包括了很多的参数，其中args代表的是方法执行前得到的实参列表，还有target表示执行此方法的实例对象。

运行之后，效果和之前是一样的，但是在这里我们就可以快速获取到更多信息。

还是以简单的study方法为例：

```java
public class Student {
    public void study(){
        System.out.println("我是学习方法！");
    }
}
```

xml不需要配置 `<aop:aspect>` 只需要 `<aop:advisor>` 来指明对应的bean和切入点

```xml
<bean id="student" class="org.example.entity.Student"/>
<bean id="studentAOP" class="org.example.entity.StudentAOP"/>
<aop:config>
    <aop:pointcut id="test" expression="execution(* org.example.entity.Student.study())"/>
    <!--  这里只需要添加我们刚刚写好的advisor就可以了，注意是Bean的名字  -->
    <aop:advisor advice-ref="studentAOP" pointcut-ref="test"/>
</aop:config>
```

![alt text](img/33.png)

除了此接口以外，还有其他的接口，比如`AfterReturningAdvice`就需要实现一个方法执行之后的操作：

```java
public class StudentAOP implements MethodBeforeAdvice, AfterReturningAdvice {
    @Override
    public void before(Method method, Object[] args, Object target) throws Throwable {
        System.out.println("通过Advice实现AOP");
    }

    @Override
    public void afterReturning(Object returnValue, Method method, Object[] args, Object target) throws Throwable {
        System.out.println("我是方法执行之后的结果，方法返回值为："+returnValue);
    }
}
```

因为使用的是接口，就非常方便，直接写一起，配置文件都不需要改了

我们也可以使用`MethodInterceptor`（同样也是Advice的子接口）进行更加环绕那样的自定义的增强，它用起来就真的像代理一样，例子如下：

```java
public class Student {
    public String study(){
        System.out.println("我是学习方法！");
        return "lbwnb";
    }
}
```

```java
public class StudentAOP implements MethodInterceptor {   //实现MethodInterceptor接口
    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {  //invoke方法就是代理方法
        Object value = invocation.proceed();   //跟之前一样，需要手动proceed()才能调用原方法
        return value+"增强";
    }
}
```

使用起来还是挺简单的。

### 使用注解实现AOP

首先我们需要在主类添加`@EnableAspectJAutoProxy`注解，开启AOP注解支持：

```java
@EnableAspectJAutoProxy
@ComponentScan("org.example.entity")
@Configuration
public class MainConfiguration {
}
```

还是熟悉的玩法，类上直接添加`@Component`快速注册Bean：

```java
@Component
public class Student {
    public void study(){
        System.out.println("我是学习方法！");
    }
}
```

#### 定义增强方法 (`@Aspect` `@Before`)

接着我们需要在定义AOP增强操作的类上添加`@Aspect`注解和`@Component`将其注册为`Bean`即可，就像我们之前在配置文件中也要将其注册为Bean那样：

```java
@Aspect
@Component
public class StudentAOP {

}
```

接着，我们可以在里面编写增强方法，并将此方法添加到一个切点中

比如我们希望在`Student`的`study`方法执行之前执行我们的`before`方法：

那么只需要添加`@Before`注解即可：

```java
@Before("execution(* org.example.entity.Student.study())")  //execution写法跟之前一样
public void before(){
    System.out.println("我是之前执行的内容！");
}
```

这样，这个方法就会在指定方法执行之前执行了：

```java
public static void main(String[] args) {
    ApplicationContext context = new AnnotationConfigApplicationContext(MainConfiguration.class);
    Student bean = context.getBean(Student.class);
    bean.study();
}
```

![image-20221216165625372](https://oss.itbaima.cn/internal/markdown/2022/12/16/KpiXcdNt7BglYQh.png)

##### 添加`JoinPoint`参数

同样的，我们可以为其添加`JoinPoint`参数来获取切入点信息，使用方法跟之前一样：

```java
@Before("execution(* org.example.entity.Student.study())")
public void before(JoinPoint point){
    System.out.println("参数列表："+ Arrays.toString(point.getArgs()));
    System.out.println("我是之前执行的内容！");
}
```

##### 命名绑定模式

为了更方便，我们还可以直接将参数放入，比如：

```java
public void study(String str){
    System.out.println("我是学习方法！");
}
```

使用命名绑定模式，可以快速得到原方法的参数：

```java
@Before(value = "execution(* org.example.entity.Student.study(..)) && args(str)", argNames = "str")
// 命名绑定模式就是根据下面的方法参数列表进行匹配
// 这里args指明参数，注意需要跟原方法保持一致，然后在argNames中指明
public void before(String str){
    System.out.println(str);   
    //可以快速得到传入的参数
    System.out.println("我是之前执行的内容！");
}
```

#### 其他注解

除了`@Before`，还有很多可以直接使用的注解，比如`@AfterReturning`、`@AfterThrowing`等，比如`@AfterReturning`：

```java
public String study(){
    System.out.println("我是学习方法！");
    return "lbwnb";
}
```

```java
@AfterReturning(value = "execution(* org.example.entity.Student.study())", argNames = "returnVal", returning = "returnVal")   //使用returning指定接收方法返回值的参数returnVal
public void afterReturn(Object returnVal){
    System.out.println("返回值是："+returnVal);
}
```

##### 环绕

同样的，环绕也可以直接通过注解声明：

```java
@Around("execution(* com.test.bean.Student.test(..))")
public Object around(ProceedingJoinPoint point) throws Throwable {
    System.out.println("方法执行之前！");
    Object val = point.proceed();
    System.out.println("方法执行之后！");
    return val;
}
```

实际上，无论是使用注解或是XML配置，我们要做的流程都是一样的，在之后的学习中，我们还会遇到更多需要使用AOP的地方。
