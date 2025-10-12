---
title: Javassm - SpringBoot4
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

## 常用框架介绍

前面我们介绍了SpringBoot项目的基本搭建，相信各位小伙伴已经体验到SpringBoot 3带来的超强便捷性了，不过光靠这些还不够，我们还需要了解更多框架来丰富我们的网站，通过了解其他的SpringBoot整合框架，我们就可以在我们自己的Web服务器上实现更多更高级的功能，同时也是为了给我们后续学习前后端分离项目做准备。

### 邮件发送模块

我们在注册很多的网站时，都会遇到邮件或是手机号验证，也就是通过你的邮箱或是手机短信去接受网站发给你的注册验证信息，填写验证码之后，就可以完成注册了，同时，网站也会绑定你的手机号或是邮箱。

那么，像这样的功能，我们如何实现呢？SpringBoot已经给我们提供了封装好的邮件模块使用：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

在学习邮件发送之前，我们需要先了解一下什么是电子邮件。

> 电子邮件也是一种通信方式，是互联网应用最广的服务。通过网络的电子邮件系统，用户可以以非常低廉的价格（不管发送到哪里，都只需负担网费，实际上就是把信息发送到对方服务器而已）、非常快速的方式，与世界上任何一个地方的电子邮箱用户联系。

要在Internet上提供电子邮件功能，必须有专门的电子邮件服务器。例如现在Internet很多提供邮件服务的厂商：新浪、搜狐、163、QQ邮箱等，他们都有自己的邮件服务器。这些服务器类似于现实生活中的邮局，它主要负责接收用户投递过来的邮件，并把邮件投递到邮件接收者的电子邮箱中。

实际上和Http一样，邮件发送也有自己的协议，也就是约定邮件数据长啥样以及如何通信。

![alt text](img/17.png)

比较常用的协议有两种：

1. SMTP协议（主要用于发送邮件 Simple Mail Transfer Protocol）
2. POP3协议（主要用于接收邮件 Post Office Protocol 3）

#### 基本原理

整个发送/接收流程大致如下：

![alt text](img/18.png)

实际上每个邮箱服务器都有一个smtp发送服务器和pop3接收服务器

比如要从QQ邮箱发送邮件到163邮箱，那么我们只需要通过QQ邮箱客户端告知QQ邮箱的smtp服务器我们需要发送邮件，以及邮件的相关信息，然后QQ邮箱的smtp服务器就会帮助我们发送到163邮箱的pop3服务器上，163邮箱会通过163邮箱客户端告知对应用户收到一封新邮件。

而我们如果想要实现给别人发送邮件，那么就需要连接到对应电子邮箱的smtp服务器上，并告知其我们要发送邮件。

而SpringBoot已经帮助我们将最基本的底层通信全部实现了，我们只需要关心smtp服务器的地址以及我们要发送的邮件长啥样即可。

#### 例子

这里以163邮箱 [https://mail.163.com](https://mail.163.com/) 为例

我们需要在配置文件中告诉SpringBootMail我们的smtp服务器的地址以及你的邮箱账号和密码

首先我们要去设置中开启smtp/pop3服务才可以，开启后会得到一个随机生成的密钥，这个就是我们的密码。

```yaml
spring:
  mail:
    # 163邮箱的地址为smtp.163.com，直接填写即可
    host: smtp.163.com
    # 你申请的163邮箱
    username: javastudy111@163.com
    # 注意密码是在开启smtp/pop3时自动生成的，记得保存一下，不然就找不到了
    password: AZJTOAWZESLMHTNI
```

配置完成后，接着我们来进行一下测试：

```java
@SpringBootTest
class SpringBootTestApplicationTests {

    // JavaMailSender是专门用于发送邮件的对象，自动配置类已经提供了Bean
    @Autowired
    JavaMailSender sender;

    @Test
    void contextLoads() {
        // SimpleMailMessage是一个比较简易的邮件封装，支持设置一些比较简单内容
        SimpleMailMessage message = new SimpleMailMessage();
        //设置邮件标题
        message.setSubject("PENGUIN!!");
        //设置邮件内容
        message.setText("penguin!!");
          //设置邮件发送给谁，可以多个，这里就发给你的QQ邮箱
        message.setTo("XXXX@qq.com");
          //邮件发送者，这里要与配置文件中的保持一致
        message.setFrom("javastudy111@163.com");
          //OK，万事俱备只欠发送
        sender.send(message);
    }

}
```

如果需要添加附件等更多功能，可以使用`MimeMessageHelper`来帮助我们完成：

```java
@Test
void contextLoads() throws MessagingException {
      //创建一个MimeMessage
    MimeMessage message = sender.createMimeMessage();
      //使用MimeMessageHelper来帮我们修改MimeMessage中的信息
    MimeMessageHelper helper = new MimeMessageHelper(message, true);
    helper.setSubject("Test");
    helper.setText("lbwnb");
    helper.setTo("你的QQ号@qq.com");
    helper.setFrom("javastudy111@163.com");
      //发送修改好的MimeMessage
    sender.send(message);
}
```

#### 实现邮件注册功能

最后，我们来尝试为我们的网站实现一个邮件注册功能

首先明确验证流程：请求验证码 -> 生成验证码（临时有效，注意设定过期时间） -> 用户输入验证码并填写注册信息 -> 验证通过注册成功！

接着我们就来着手写一下。

### 接口规则校验

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

通常我们在使用SpringMvc框架编写接口时，很有可能用户发送的数据存在一些问题，比如下面这个接口：

```java
@ResponseBody
@PostMapping("/submit")
public String submit(String username,
                     String password){
    System.out.println(username.substring(3));
    System.out.println(password.substring(2, 10));
    return "请求成功!";
}
```

这个接口中，我们需要将用户名和密码分割然后打印，在正常情况下，因为用户名长度规定不小于5，如果用户发送的数据是没有问题的，那么就可以正常运行，这也是我们所希望的情况，但是如果用户发送的数据并不是按照规定的，那么就会直接报错

这个时候，我们就需要在请求进来之前进行校验了，最简单的办法就是判断一下：

```java
@ResponseBody
@PostMapping("/submit")
public String submit(String username,
                     String password){
    if(username.length() > 3 && password.length() > 10) {
        System.out.println(username.substring(3));
        System.out.println(password.substring(2, 10));
        return "请求成功!";
    } else {
        return "请求失败";
    }
}
```

虽然这样就能直接解决问题，但是如果我们的每一个接口都需要这样去进行配置，那么是不是太麻烦了一点？

SpringBoot为我们提供了很方便的接口校验框架：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

#### 注解校验 `@Validated`

现在，我们可以直接使用注解完成全部接口的校验：

```java
@Slf4j
@Validated   //首先在Controller上开启接口校验
@Controller
public class TestController {

    ...

    @ResponseBody
    @PostMapping("/submit")
    //使用@Length注解一步到位
    public String submit(@Length(min = 3) String username,  
                         @Length(min = 10) String password){
        System.out.println(username.substring(3));
        System.out.println(password.substring(2, 10));
        return "请求成功!";
    }
}
```

现在，我们的接口校验就可以快速进行配置了，一个接口就能搞定，不过这样依然会抛出一个异常，对用户不太友好，我们可以稍微处理一下

这里我们可以直接使用之前在SSM阶段中学习的异常处理Controller来自行处理这类异常：

```java
@ControllerAdvice
public class ValidationController {

    @ResponseBody
    @ExceptionHandler(ConstraintViolationException.class)
    public String error(ValidationException e){
        return e.getMessage();   //出现异常直接返回消息
    }
}
```

![image-20230716221420324](https://s2.loli.net/2023/07/16/7JH6BzOhlUe9gkG.png)

除了@Length之外，我们也可以使用其他的接口来实现各种数据校验：

|   验证注解   |                        验证的数据类型                        |                           说明                           |
| :----------: | :----------------------------------------------------------: | :------------------------------------------------------: |
| @AssertFalse |                       Boolean,boolean                        |                      值必须是false                       |
| @AssertTrue  |                       Boolean,boolean                        |                       值必须是true                       |
|   @NotNull   |                           任意类型                           |                       值不能是null                       |
|    @Null     |                           任意类型                           |                       值必须是null                       |
|     @Min     | BigDecimal、BigInteger、byte、short、int、long、double 以及任何Number或CharSequence子类型 |                   大于等于@Min指定的值                   |
|     @Max     |                             同上                             |                   小于等于@Max指定的值                   |
| @DecimalMin  |                             同上                             |         大于等于@DecimalMin指定的值（超高精度）          |
| @DecimalMax  |                             同上                             |         小于等于@DecimalMax指定的值（超高精度）          |
|   @Digits    |                             同上                             |                限制整数位数和小数位数上限                |
|    @Size     |               字符串、Collection、Map、数组等                |       长度在指定区间之内，如字符串长度、集合大小等       |
|    @Past     |       如 java.util.Date, java.util.Calendar 等日期类型       |                    值必须比当前时间早                    |
|   @Future    |                             同上                             |                    值必须比当前时间晚                    |
|  @NotBlank   |                     CharSequence及其子类                     |         值不为空，在比较时会去除字符串的首位空格         |
|   @Length    |                     CharSequence及其子类                     |                  字符串长度在指定区间内                  |
|  @NotEmpty   |         CharSequence及其子类、Collection、Map、数组          | 值不为null且长度不为空（字符串长度不为0，集合大小不为0） |
|    @Range    | BigDecimal、BigInteger、CharSequence、byte、short、int、long 以及原子类型和包装类型 |                      值在指定区间内                      |
|    @Email    |                     CharSequence及其子类                     |                     值必须是邮件格式                     |
|   @Pattern   |                     CharSequence及其子类                     |               值需要与指定的正则表达式匹配               |
|    @Valid    |                        任何非原子类型                        |                     用于验证对象属性                     |

#### 对象处理

虽然这样已经很方便了，但是在遇到对象的时候，依然不太方便，比如：

```java
@Data
public class Account {
    String username;
    String password;
}
```

```java
@ResponseBody
@PostMapping("/submit")
public String submit(Account account){   //直接使用对象接收
    System.out.println(account.getUsername().substring(3));
    System.out.println(account.getPassword().substring(2, 10));
    return "请求成功!";
}
```

此时接口是以对象形式接收前端发送的表单数据的，这个时候就没办法向上面一样编写对应的校验规则了，那么现在又该怎么做呢？

对应对象类型，我们也可以进行验证，方法如下：

```java
@ResponseBody
@PostMapping("/submit")  
// 在参数上添加@Valid注解表示需要验证
public String submit(@Valid Account account){
    System.out.println(account.getUsername().substring(3));
    System.out.println(account.getPassword().substring(2, 10));
    return "请求成功!";
}
```

```java
@Data
public class Account {
    @Length(min = 3)   //只需要在对应的字段上添加校验的注解即可
    String username;
    @Length(min = 10)
    String password;
}
```

这样当受到请求时，就会对对象中的字段进行校验了，这里我们稍微修改一下ValidationController的错误处理

对于实体类接收参数的验证，会抛出`MethodArgumentNotValidException`异常，这里也进行一下处理：

```java
@ResponseBody
@ExceptionHandler({ConstraintViolationException.class, MethodArgumentNotValidException.class})
public String error(Exception e){
    if(e instanceof ConstraintViolationException exception) {
        return exception.getMessage();
    } else if(e instanceof MethodArgumentNotValidException exception){
        if (exception.getFieldError() == null) return "未知错误";
        return exception.getFieldError().getDefaultMessage();
    }
    return "未知错误";
}
```

这样就可以正确返回对应的错误信息了。

### 接口文档生成 `Swagger`

在前后端分离开发中，前端现在由专业的人来做，而我们往往只需要关心后端提供什么接口给前端人员调用，我们的工作被进一步细分了，这个时候为前端开发人员提供一个可以参考的文档是很有必要的。

但是这样的一个文档，我们也不可能单独写一个项目去进行维护，并且随着我们的后端项目不断更新，文档也需要跟随更新，这显然是很麻烦的一件事情，那么有没有一种比较好的解决方案呢？

当然有，那就是丝袜哥：Swagger

Swagger的主要功能如下：

- 支持 API 自动生成同步的在线文档：使用 Swagger 后可以直接通过代码生成文档，不再需要自己手动编写接口文档了，对程序员来说非常方便，可以节约写文档的时间去学习新技术。
- 提供 Web 页面在线测试 API：光有文档还不够，Swagger 生成的文档还支持在线测试。参数和格式都定好了，直接在界面上输入参数对应的值即可在线测试接口。

结合Spring框架（Spring-doc，官网：<https://springdoc.org/>），Swagger可以很轻松地利用注解以及扫描机制，来快速生成在线文档，以实现当我们项目启动之后，前端开发人员就可以打开Swagger提供的前端页面，查看和测试接口。依赖如下：

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.1.0</version>
</dependency>
```

项目启动之后，我们可以直接访问：<http://localhost:8080/swagger-ui/index.html>，就能看到我们的开发文档了：

![alt text](img/25.png)

可以看到这个开发文档中自动包含了我们定义的接口，并且还有对应的实体类也放在了下面。这个页面不仅仅是展示接口，也可以直接在上面进行调试

这就非常方便了，不仅前端人员可以快速查询接口定义，我们自己也可以在线进行接口测试，直接抛弃PostMan之类的软件了。

#### 自定义界面

虽然Swagger的UI界面已经可以很好地展示后端提供的接口信息了，但是非常的混乱

我们来看看如何配置接口的一些描述信息。首先我们的页面肯定要展示一下这个文档的一些信息，只需要一个Bean就能搞定：

```java
@Configuration
public class SwaggerConfigutaion {
    @Bean
    public OpenAPI springDocOpenAPI() {
            return new OpenAPI().info(new Info()
                .title("图书管理系统 - 在线API接口文档")   //设置API文档网站标题
                .description("这是一个图书管理系统的后端API文档，欢迎前端人员查阅！") //网站介绍
                .version("2.0")   //当前API版本
                .license(new License().name("我的B站个人主页")  //遵循的协议，这里拿来写其他的也行
                .url("https://space.bilibili.com/37737161")));
    }
}
```

这样我们的页面中就会展示自定义的文本信息了

#### 对应`Controller`编写API描述信息

接着我们来看看如何为一个Controller编写API描述信息：

```java
//使用@Tag注解来添加Controller描述信息
@Tag(name = "账户验证相关", description = "包括用户登录、注册、验证码请求等操作。")
public class TestController {
    ...
}
```

我们可以直接在类名称上面添加`@Tag`注解，并填写相关信息，来为当前的Controller设置描述信息。

接着我们可以为所有的请求映射配置描述信息：

```java
@ApiResponses({
       @ApiResponse(responseCode = "200", description = "测试成功"),
       @ApiResponse(responseCode = "500", description = "测试失败")   //不同返回状态码描述
})
@Operation(summary = "请求用户数据测试接口")   //接口功能描述
@ResponseBody
@GetMapping("/hello")
//请求参数描述和样例
public String hello(@Parameter(description = "测试文本数据", example = "KFCvivo50") @RequestParam String text) {
    return "Hello World";
}
```

对于那些不需要展示在文档中的接口，我们也可以将其忽略掉：

```java
@Hidden
@ResponseBody
@GetMapping("/hello")
public String hello() {
    return "Hello World";
}
```

对于实体类，我们也可以编写对应的API接口文档：

```java
@Data
@Schema(description = "用户信息实体类")
public class User {
    @Schema(description = "用户编号")
    int id;
    @Schema(description = "用户名称")
    String name;
    @Schema(description = "用户邮箱")
    String email;
    @Schema(description = "用户密码")
    String password;
}
```

这样，我们就可以在文档中查看实体类简介以及各个属性的介绍了。

#### 生产环境关闭文档

不过，这种文档只适合在开发环境下生成，如果是生产环境，我们需要关闭文档：

```java
springdoc:
  api-docs:
    enabled: false
```

这样就可以关闭了。

### 项目运行监控

我们的项目开发完成之后，肯定是需要上线运行的，不过在项目的运行过程中，我们可能需要对其进行监控，从而实时观察其运行状态，并在发生问题时做出对应调整，因此，集成项目运行监控就很有必要了。

SpringBoot框架提供了`spring-boot-starter-actuator`模块来实现监控效果：

```xml
<dependency>
   <groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

添加好之后，Actuator会自动注册一些接口用于查询当前SpringBoot应用程序的状态，官方文档如下：<https://docs.spring.io/spring-boot/docs/3.1.1/actuator-api/htmlsingle/#overview>

默认情况下，所有Actuator自动注册的接口路径都是`/actuator/{id}`格式的（可在配置文件中修改）

比如我们想要查询当前服务器的健康状态，就可以访问这个接口：<http://localhost:8080/actuator/health>，结果会以JSON格式返回给我们：

直接访问：<http://localhost:8080/actuator> 根路径，可以查看当前已经开启的所有接口，默认情况下只开启以下接口：

```json
{
  "_links": {
    "self": {"href":"http://localhost:8080/actuator","templated":false},  //actuator自己的信息
    "health-path":{"href":"http://localhost:8080/actuator/health/{*path}","templated":true},
    "health":{"href":"http://localhost:8080/actuator/health","templated":false}  //应用程序健康情况监控
    }
}
```

我们可以来修改一下配置文件，让其暴露全部接口：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: '*'   #使用*表示暴露全部接口
```

重启服务器，再次获取可用接口就可以看到全部的信息了，这里就不全部搬出来了，只列举一些常用的：

```json
{
  "_links": {
    //包含Actuator自己的信息
    "self": {"href":"http://localhost:8080/actuator","templated":false},
    //已注册的Bean信息
    "beans":{"href":"http://localhost:8080/actuator/beans","templated":false},
    //应用程序健康情况监控
    "health":{"href":"http://localhost:8080/actuator/health","templated":false},
    "health-path":{"href":"http://localhost:8080/actuator/health/{*path}","templated":true},
    //应用程序运行信息
    "info":{"href":"http://localhost:8080/actuator/info","templated":false},
    //系统环境相关信息
    "env": {"href":"http://localhost:8080/actuator/env","templated":false},
    "env-toMatch":{"href":"http://localhost:8080/actuator/env/{toMatch}","templated":true},
    //日志相关信息
    "loggers":{"href":"http://localhost:8080/actuator/loggers","templated":false},
    "loggers-name":{"href":"http://localhost:8080/actuator/loggers/{name}","templated":true},
    //快速获取JVM堆转储文件
    "heapdump":{"href":"http://localhost:8080/actuator/heapdump","templated":false},
    //快速获取JVM线程转储信息
    "threaddump":{"href":"http://localhost:8080/actuator/threaddump","templated":false},
    //计划任务相关信息
    "scheduledtasks":{"href":"http://localhost:8080/actuator/scheduledtasks","templated":false},
    //请求映射相关信息
    "mappings":{"href":"http://localhost:8080/actuator/mappings","templated":false},
    ...
  }
}
```

比如我们可以通过 <http://localhost:8080/actuator/info> 接口查看当前系统运行环境信息

我们发现，这里得到的数据是一个空的，这是因为我们还需要单独开启对应模块才可以：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: '*'
  #开启某些默认为false的信息
  info:
    env:
      enabled: true
    os:
      enabled: true
    java:
      enabled: true
```

再次请求，就能获得运行环境相关信息了，比如这里的Java版本、JVM信息、操作系统信息等：

![alt text](img/19.png)

我们也可以让health显示更加详细的系统状态信息，这里我们开启一下配置：

```yaml
management:
    ...
  endpoint:
    health:
      show-details: always  #展示详细内容
    env:
      show-values: always  #总是直接展示值
```

现在就能查看当前系统占用相关信息了，比如下面的磁盘占用、数据库等信息：

![alt text](img/20.png)

包括完整的系统环境信息，比如我们配置的服务器8080端口：

![alt text](img/21.png)

我们只需要通过这些接口就能快速获取到当前应用程序的运行信息了。

高级一点的还有线程转储和堆内存转储文件直接生成，便于我们对Java程序的运行情况进行分析

这里我们获取一下堆内存转储文件：<http://localhost:8080/actuator/heapdump>，文件下载之后直接使用IDEA就能打开：

![alt text](img/22.png)

可以看到其中创建的byte数组对象计数达到了72020个，其中我们自己的TestController对象只有有一个：

![alt text](img/23.png)

以及对应的线程转储信息，也可以通过 <http://localhost:8080/actuator/threaddump> 直接获取：

![alt text](img/24.png)
