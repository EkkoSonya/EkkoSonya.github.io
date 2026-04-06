---
title: Spring系列八股16 - MVC3 (Spring MVC 流程)
date: 2026-4-5
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

## MVC3

### 前后端分离下 Spring MVC 流程

```
传统 MVC：         前后端分离：
Controller         Controller
    ↓                  ↓
返回 ModelAndView   返回 JSON 数据
    ↓                  ↓
服务端渲染 HTML     前端自己渲染页面
```

#### 完整流程

```
前端（Vue/React）发送请求
        ↓
DispatcherServlet 接收请求
        ↓
HandlerMapping 查路由表，找到对应 Controller 方法
        ↓
HandlerAdapter 调用 Controller 方法
        ↓
Controller 调用 Service → DAO → 数据库
        ↓
返回 Java 对象
        ↓
HttpMessageConverter 把对象转成 JSON
        ↓
前端收到 JSON，自己渲染页面
```

#### `@RestController`

```java
@RestController          // = @Controller + @ResponseBody
@RequestMapping("/user")
public class UserController {
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUser(id);  // 直接返回对象，自动转 JSON
    }
}
```

`@ResponseBody` 告诉 Spring：不要找 View，把返回值直接转成 JSON 写进响应体

前后端分离下，Spring MVC 的 View 层消失了，Controller 只返回 JSON，由 `@ResponseBody + HttpMessageConverter` 负责把 Java 对象序列化成 JSON 响应给前端

### HandlerMapping 和 HandlerAdapter

#### `HandlerMapping`

作用：`HandlerMapping`负责将请求映射到处理器（Controller）

功能：根据请求的URL、请求参数等信息，找到处理请求的 Controller

类型：Spring 提供了多种`HandlerMapping`实现，如`BeanNameUrlHandlerMapping`、`RequestMappingHandlerMapping`等。

工作流程：根据请求信息确定要请求的处理器(Controller), `HandlerMapping` 可以根据URL、请求参数等规则确定对应的处理器。

#### `HandlerAdapter`

作用：`HandlerAdapter`负责调用处理器(Controller)来处理请求
功能：处理器(Controller)可能有不同的接口类型（Controller接口、`HttpRequestHandler`接口等），HandlerAdapter根据处理器的类型来选择合适的方法来调用处理器。
类型：Spring提供了多个HandlerAdapter实现，用于适配不同类型的处理器。
工作流程：根据处理器的接口类型，选择相应的HandlerAdapter来调用处理器

### `HttpMessageConverter`

```
传统 MVC：         前后端分离：
Controller         Controller
    ↓                  ↓
返回 ModelAndView   返回 JSON 数据
    ↓                  ↓
服务端渲染 HTML     前端自己渲染页面
```

在前后端分离的项目中，负责 Java 对象 ↔ HTTP 报文之间的互相转换

#### 核心工作

```
请求进来（前端 → 后端）
JSON 字符串  →  Java 对象      （反序列化）

响应出去（后端 → 前端）
Java 对象   →  JSON 字符串     （序列化）
```

##### 1. 读（Read）：将 HTTP 报文转换为 Java 对象

当客户端（如浏览器、Postman）向你的接口发起请求，并在 Body 中携带了 JSON 数据时：

- 你的 Controller 方法上通常会打上 `@RequestBody` 注解。
- 此时，Spring 会遍历已注册的 `HttpMessageConverter` 列表，找到能处理 `application/json` 类型的转换器。
- 转换器会读取 HTTP 请求的输入流（InputStream），并利用底层的 JSON 库（通常是 Jackson）将其反序列化为你方法参数中指定的 Java 对象。

##### 2. 写（Write）：将 Java 对象转换为 HTTP 报文

当你的业务逻辑处理完毕，需要将数据返回给前端时：

- 你的 Controller 类上通常会打上 `@RestController`（自带 `@ResponseBody` 语义）。
- 你的方法直接 return 了一个 Java 对象（比如一个 `User` 实体或一个统装类 `Result<T>`）。
- Spring 同样会找到合适的 `HttpMessageConverter`，将这个 Java 对象序列化成 JSON 字符串，并写入 HTTP 的输出流（OutputStream）返回给客户端

#### 常见转换器

Spring Boot 默认集成 Jackson，引入依赖就自动生效，不需要额外配置

| 转换器 | 处理类型 |
| --- | --- |
| `MappingJackson2HttpMessageConverter` | JSON（最常用，默认） |
| `StringHttpMessageConverter` | 纯文本 |
| `ByteArrayHttpMessageConverter` | 字节流/文件 |

#### 如何使用

每个转换器都实现了 canRead() / canWrite() 方法：

```java
public class MappingJackson2HttpMessageConverter {

    // 能不能读（反序列化）
    public boolean canRead(Class<?> clazz, MediaType mediaType) {
        return mediaType.equals(MediaType.APPLICATION_JSON);  // Content-Type 是 JSON 才处理
    }

    // 能不能写（序列化）
    public boolean canWrite(Class<?> clazz, MediaType mediaType) {
        return mediaType.equals(MediaType.APPLICATION_JSON);  // Accept 是 JSON 才处理
    }
}
```

HandlerAdapter 调用时遍历所有转换器，谁 canRead/canWrite 返回 true 谁来处理：

```java
for (HttpMessageConverter converter : converters) {
    if (converter.canWrite(returnType, targetMediaType)) {
        converter.write(returnValue, targetMediaType, response);  // 找到了，写入响应
        break;
    }
}
```

> 因为底层采用的是 for 循环 + break/return 的机制
>
> HttpMessageConverter 列表是有顺序的，排在前面的转换器享有优先处理权！

因此，在配置自定义 Converter 时，我们经常需要将其插队到列表的最前面：

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        // 将自定义的转换器插到索引 0 的位置，确保它最先被 for 循环遍历到
        converters.add(0, new MyCustomJsonConverter());
    }
}
```
