---
title: Javassm - SpringMVC2
date: 2025-09-04
category:
  - code
tag:
  - javassm
  - Spring
# star: true
# sticky: true
order: -0.6
---

## Controller控制器2

### @RequestMapping详解

前面我们已经了解了如何创建一个控制器来处理我们的请求，接着我们只需要在控制器添加一个方法用于处理对应的请求即可

之前我们需要完整地编写一个Servlet来实现，而现在我们只需要添加一个`@RequestMapping`即可实现

从它的名字我们也能得知，此注解就是将**请求和处理请求的方法建立一个映射关系**，当收到请求时就可以根据映射关系调用对应的请求处理方法

注解定义如下：

```java
@Mapping
public @interface RequestMapping {
    String name() default "";

    @AliasFor("path")
    String[] value() default {};

    @AliasFor("value")
    String[] path() default {};

    RequestMethod[] method() default {};

    String[] params() default {};

    String[] headers() default {};

    String[] consumes() default {};

    String[] produces() default {};
}
```

其中最关键的是path属性（等价于value），它决定了当前方法处理的请求路径，注意路径必须全局唯一，**任何路径只能有一个方法进行处理**，它是一个数组，也就是说**此方法不仅仅可以只用于处理某一个请求路径**，我们可以使用此方法**处理多个请求路径**：

```java
@RequestMapping({"/index", "/test"})
public ModelAndView index(){
    return new ModelAndView("index");
}
```

现在我们访问/index或是/test都会经过此方法进行处理。

我们也可以直接将`@RequestMapping`添加到类名上，表示**为此类中的所有请求映射添加一个路径前缀**，比如：

```java
@Controller
@RequestMapping("/yyds")
public class MainController {

    @RequestMapping({"/index", "/test"})
    public ModelAndView index(){
        return new ModelAndView("index");
    }
}
```

那么现在我们需要访问`/yyds/index`或是`/yyds/test`才可以得到此页面。

#### 辅助功能

我们可以直接在IDEA下方的**端点**板块中查看当前Web应用程序定义的所有请求映射，并且可以通过IDEA为我们提供的内置Web客户端直接访问某个路径。

#### 通配符匹配

路径还支持使用通配符进行匹配：

- ?：表示任意一个字符，比如`@RequestMapping("/index/x?")`可以匹配/index/xa、/index/xb等等。
- *：表示任意0-n个字符，比如`@RequestMapping("/index/*")`可以匹配/index/lbwnb、/index/yyds等。
- **：表示当前目录或基于当前目录的多级目录，比如`@RequestMapping("/index/**")`可以匹配/index、/index/xxx等。

#### `method`属性

我们接着来看下一个method属性，顾名思义，它就是请求的方法类型，我们**可以限定请求方式**

比如：

```java
@RequestMapping(value = "/index", method = RequestMethod.POST)
public ModelAndView index(){
    return new ModelAndView("index");
}
```

现在我们如果直接使用浏览器访问此页面，会显示405方法不支持

因为浏览器默认是直接使用GET方法获取页面，而我们这里指定为POST方法访问此地址，所以访问失败，我们现在再去端点中用POST方式去访问，成功得到页面。

##### `@PostMapping`、`@GetMapping`

我们也可以使用衍生注解直接设定为指定类型的请求映射：

```java
@PostMapping(value = "/index")
public ModelAndView index(){
    return new ModelAndView("index");
}
```

这里使用了`@PostMapping`直接指定为POST请求类型的请求映射，同样的，还有`@GetMapping`可以直接指定为GET请求方式，这里就不一一列举了。

#### `params`属性

我们可以使用`params`属性来指定请求必须携带哪些请求参数，比如：

```java
@RequestMapping(value = "/index", params = {"username", "password"})
public ModelAndView index(){
    return new ModelAndView("index");
}
```

比如这里我们要求请求中必须携带`username`和`password`属性，否则无法访问。

它还支持表达式，比如我们可以这样编写：

```java
@RequestMapping(value = "/index", params = {"!username", "password"})
public ModelAndView index(){
    return new ModelAndView("index");
}
```

在username之前添加一个感叹号**表示请求的不允许携带此参数**，否则无法访问，我们甚至可以直接设定一个固定值：

```java
@RequestMapping(value = "/index", params = {"username!=test", "password=123"})
public ModelAndView index(){
    return new ModelAndView("index");
}
```

这样，请求参数username不允许为test，并且password必须为123，否则无法访问。

##### 获取请求参数

想要获取对应的参数，可以用 `@RequestParam` 注解

```java
@RequestMapping(value = "/pp", params = {"text"})
    public String pp(@RequestParam("text") String text, Model model){
        model.addAttribute("name", text);
        return "index";
    }
```

或者从 `HttpServletRequest` 拿

```java
@RequestMapping(value = "/pp", params = {"text"})
public String pp(HttpServletRequest request, Model model){
    String text = request.getParameter("text");
    model.addAttribute("name", text);
    return "index";
}
```

#### `header`属性

`header`属性用法与`params`一致，但是它要求的是**请求头中需要携带什么内容**，比如：

```java
@RequestMapping(value = "/index", headers = "!Connection")
public ModelAndView index(){
    return new ModelAndView("index");
}
```

那么，如果请求头中携带了`Connection`属性，将无法访问。

#### `其余属性`

其他两个属性：

- consumes： 指定处理请求的提交内容类型（Content-Type），例如application/json, text/html;
- produces:  指定返回的内容类型，仅当request请求头中的(Accept)类型中包含该指定类型才返回；

### @RequestParam和@RequestHeader详解

我们接着来看，如何获取到请求中的参数。

#### `@RequestParam`

我们只需要为方法添加一个形式参数，并在形式参数前面添加`@RequestParam`注解即可：

```java
@RequestMapping(value = "/index")
public ModelAndView index(@RequestParam("username") String username){
    System.out.println("接受到请求参数："+username);
    return new ModelAndView("index");
}
```

我们需要在`@RequestParam`中填写参数名称，参数的值会自动传递给形式参数，我们可以直接在方法中使用

注意，如果参数名称与形式参数名称相同，**即使不添加**`@RequestParam`也能获**取到参数值**。

##### `require`属性

一旦添加`@RequestParam`，那么此请求必须携带指定参数，我们也可以将`require`属性设定为false来将属性设定为非必须：

```java
@RequestMapping(value = "/index")
public ModelAndView index(@RequestParam(value = "username", required = false) String username){
    System.out.println("接受到请求参数："+username);
    return new ModelAndView("index");
}
```

##### `defaultValue`

我们还可以直接设定一个默认值，当请求参数缺失时，可以直接使用默认值：

```java
@RequestMapping(value = "/index")
public ModelAndView index(@RequestParam(value = "username", required = false, defaultValue = "伞兵一号") String username){
    System.out.println("接受到请求参数："+username);
    return new ModelAndView("index");
}
```

##### `HttpServletRequest`

如果需要使用Servlet原本的一些类，比如：

```java
@RequestMapping(value = "/index")
public ModelAndView index(HttpServletRequest request){
    System.out.println("接受到请求参数："+request.getParameterMap().keySet());
    return new ModelAndView("index");
}
```

直接添加`HttpServletRequest`为形式参数即可，SpringMVC会自动传递该请求原本的`HttpServletRequest`对象

同理，我们也可以添加`HttpServletResponse`作为形式参数，甚至可以直接将`HttpSession`也作为参数传递：

```java
@RequestMapping(value = "/index")
public ModelAndView index(HttpSession session){
    System.out.println(session.getAttribute("test"));
    session.setAttribute("test", "鸡你太美");
    return new ModelAndView("index");
}
```

#### 直接参数传递实体类

我们还可以直接将请求参数传递给一个实体类：

```java
@Data
public class User {
    String username;
    String password;
}
```

注意必须携带set方法或是构造方法中包含所有参数，**请求参数会自动根据类中的字段名称进行匹配**：

```java
@RequestMapping(value = "/index")
public ModelAndView index(User user){
    System.out.println("获取到cookie值为："+user);
    return new ModelAndView("index");
}
```

`@RequestHeader`与`@RequestParam`用法一致，不过它是**用于获取请求头参数**的，这里就不再演示了。

### @CookieValue和@SessionAttrbutie

#### `@CookieValue`

通过使用`@CookieValue`注解，我们也可以快速获取请求携带的Cookie信息：

```java
@RequestMapping(value = "/index")
public ModelAndView index(HttpServletResponse response,
                          @CookieValue(value = "test", required = false) String test){
    System.out.println("获取到cookie值为："+test);
    response.addCookie(new Cookie("test", "lbwnb"));
    return new ModelAndView("index");
}
```

#### `@SessionAttribute`

同样的，`Session`也能使用注解快速获取：

```java
@RequestMapping(value = "/index")
public ModelAndView index(@SessionAttribute(value = "test", required = false) String test,  HttpSession session){
    session.setAttribute("test", "xxxx");
    System.out.println(test);
    return new ModelAndView("index");
}
```

可以发现，通过使用SpringMVC框架，整个Web应用程序的开发变得非常简单，大部分功能只需要一个注解就可以搞定了，正是得益于Spring框架，SpringMVC才能大显身手。

### 重定向和请求转发

重定向和请求转发也非常简单，我们只需要在视图名称前面添加一个前缀即可

比如重定向 `redirect`：

```java
@RequestMapping("/index")
public String index(){
    return "redirect:home";
}

@RequestMapping("/home")
public String home(){
    return "home";
}
```

通过添加`redirect:`前缀，就可以很方便地实现重定向

请求转发，其实也是一样的，使用`forward:`前缀表示转发给其他请求映射：

```java
@RequestMapping("/index")
public String index(){
    return "forward:home";
}

@RequestMapping("/home")
public String home(){
    return "home";
}
```

使用SpringMVC，只需要一个前缀就可以实现重定向和请求转发，非常方便。

### Bean的Web作用域

在学习Spring时我们讲解了Bean的作用域，包括`singleton`和`prototype`，Bean分别会以单例和多例模式进行创建

在`SpringMVC`中，它的作用域被继续细分：

- `request`：对于每次HTTP请求，使用request作用域定义的Bean都将产生一个新实例，请求结束后Bean也消失。

- `session`：对于每一个会话(一个页面)，使用session作用域定义的Bean都将产生一个新实例，会话过期后Bean也消失。

- `global session`：不常用，不做讲解。

这里我们创建一个测试类来试试看：

```java
public class TestBean {

}
```

接着将其注册为Bean，注意这里需要添加`@RequestScope`或是`@SessionScope`表示此Bean的Web作用域：

```java
@Bean
@RequestScope
public TestBean testBean(){
    return new TestBean();
}
```

接着我们将其自动注入到Controller中：

```java
@Controller
public class MainController {

    @Resource
    TestBean bean;

    @RequestMapping(value = "/index")
    public ModelAndView index(){
        System.out.println(bean);
        return new ModelAndView("index");
    }
}
```

我们发现，每次发起得到的Bean实例都不同，接着我们将其作用域修改为`@SessionScope`，这样作用域就上升到Session，只要清理浏览器的Cookie，那么都会被认为是同一个会话，只要是同一个会话，那么Bean实例始终不变。

实际上，它也是通过代理实现的，我们调用Bean中的方法会被转发到真正的Bean对象去执行。

## RestFul风格 `@PathVariable`

中文释义为**表现层状态转换**（名字挺高大上的），它不是一种标准，而是一种设计风格。

它的主要作用是充分并正确利用HTTP协议的特性，规范资源获取的URI路径。

通俗的讲，RESTful风格的设计允许**将参数通过URL拼接传到服务端**

目的是让URL看起来更简洁实用，并且我们可以充分使用多种HTTP请求方式（POST/GET/PUT/DELETE），来执行**相同请求地址的不同类型操作**。

因此，这种风格的连接，我们就可以直接从请求路径中读取参数，比如：

```
http://localhost:8080/mvc/index/123456
```

我们可以直接将index的下一级路径作为请求参数进行处理，也就是说现在的请求参数包含在了请求路径中：

```java
@RequestMapping("/index/{str}")
public String index(@PathVariable String str) {
    System.out.println(str);
    return "index";
}
```

注意请求路径我们可以手动添加类似占位符一样的信息，这样占位符位置的所有内容都会被作为请求参数，而方法的形参列表中必须包括一个与占位符同名的并且添加了`@PathVariable`注解的参数，或是由`@PathVariable`注解指定为占位符名称：

```java
@RequestMapping("/index/{str}")
public String index(@PathVariable("str") String text){
    System.out.println(text);
    return "index";
}
```

如果没有配置正确，方法名称上会出现黄线。

我们可以按照不同功能进行划分：

- POST <http://localhost:8080/mvc/index> -  添加用户信息，携带表单数据
- GET <http://localhost:8080/mvc/index/{id}> -  获取用户信息，id直接放在请求路径中
- PUT <http://localhost:8080/mvc/index> -  修改用户信息，携带表单数据
- DELETE <http://localhost:8080/mvc/index/{id}> -  删除用户信息，id直接放在请求路径中

我们分别编写四个请求映射：

```java
@Controller
public class MainController {

    @RequestMapping(value = "/index/{id}", method = RequestMethod.GET)
    public String get(@PathVariable("id") String text){
        System.out.println("获取用户："+text);
        return "index";
    }

    @RequestMapping(value = "/index", method = RequestMethod.POST)
    public String post(String username){
        System.out.println("添加用户："+username);
        return "index";
    }

    @RequestMapping(value = "/index/{id}", method = RequestMethod.DELETE)
    public String delete(@PathVariable("id") String text){
        System.out.println("删除用户："+text);
        return "index";
    }

    @RequestMapping(value = "/index", method = RequestMethod.PUT)
    public String put(String username){
        System.out.println("修改用户："+username);
        return "index";
    }
}
```

这只是一种设计风格而已，了解即可。
