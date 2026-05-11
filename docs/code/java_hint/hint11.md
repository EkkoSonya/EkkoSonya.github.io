---
title: hint - 请求从客户端发出的流程
date: 2026-04-05
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

## 整体流程

如果后端是 Spring Boot（常见是 Spring MVC + Tomcat），一个请求从客户端发出到后端处理完成，大致可以分成两层来看：

### 一、从网络角度看，请求是怎么到后端的

#### 1. 客户端发起请求

客户端可能是：

- 浏览器
- App
- 前端项目（Vue/React）
- 其他服务

比如前端发一个请求：

```
POST /api/user/login HTTP/1.1
Host: example.com
Content-Type: application/json

{"username":"zs","password":"123456"}
```

#### 2. 先找到服务器

客户端要先知道请求发给谁，一般会经历：

- **DNS 解析**：把域名转成 IP
- **建立连接**：
  - HTTP：TCP 连接
  - HTTPS：TCP + TLS/SSL 握手

#### 3. 请求到达服务器

请求到了服务器之后，可能先经过：

- Nginx（反向代理）
- 网关（Spring Cloud Gateway / Zuul）
- 负载均衡
- 再转发到你的 Spring Boot 应用

所以很多时候并不是直接打到 Spring Boot，而是：

**客户端 → Nginx/Gateway → Spring Boot**

---

### 二、从 Spring Boot 内部看，请求是怎么处理的

假设你是传统的 **Spring Boot + Spring MVC**，内部流程通常是：

#### 整体主线

**客户端**

→ **Tomcat**

→ **Filter**

→ **DispatcherServlet**

→ **Interceptor**

→ **Controller**

→ **Service**

→ **DAO/Mapper**

→ **数据库/Redis/其他服务**

→ 返回结果

---

### 三、详细拆开说

#### 1. Tomcat 接收请求

Spring Boot 启动后，默认会内嵌一个 **Tomcat**。

它负责：

- 监听端口（比如 8080）
- 接收 HTTP 请求
- 把 HTTP 报文解析成 Java 对象
- 交给 Spring MVC 处理

也就是：

> 网络通信这层主要是 Tomcat 干的，不是 Controller 直接收包。

---

#### 2. 先经过 Filter

请求进入 Spring 之前，通常先过 **Filter 过滤器**。

常见用途：

- 编码处理
- 跨域处理
- 日志记录
- 权限校验
- 请求包装

例如：

```
publicclassLoginFilterimplementsFilter {
publicvoiddoFilter(ServletRequestreq,ServletResponseres,FilterChainchain) {
System.out.println("请求进入 Filter");
chain.doFilter(req,res);
    }
}
```

你可以理解成：

> Filter 更偏底层，属于 Servlet 规范这一层。

---

#### 3. 到 DispatcherServlet

这是 Spring MVC 的核心入口，叫：

**前端控制器（Front Controller）**

它负责统一调度整个请求处理流程。

可以理解成：

> 所有请求先进总调度中心，再决定交给哪个 Controller 方法。

---

#### 4. HandlerMapping 找到对应 Controller

DispatcherServlet 会根据请求路径，找到对应的方法。

比如：

```
@RestController
@RequestMapping("/api/user")
publicclassUserController {

    @PostMapping("/login")
publicStringlogin(@RequestBodyLoginDTOdto) {
return"ok";
    }
}
```

请求是：

```
POST /api/user/login
```

那么 Spring 就会定位到：

```
login(@RequestBodyLoginDTO dto)
```

---

#### 5. Interceptor 拦截器执行

在真正执行 Controller 前，可能会先走 **Interceptor**。

常见用途：

- 登录校验
- token 校验
- 统一日志
- 接口耗时统计

执行顺序一般是：

- `preHandle()`：Controller 前
- `postHandle()`：Controller 后、视图渲染前
- `afterCompletion()`：整个请求结束后

它比 Filter 更接近 Spring MVC。

---

#### 6. 参数解析

Spring 会自动帮你把请求数据转成方法参数。

比如：

##### URL 参数

```
GET /user?id=1
```

对应：

```
@GetMapping("/user")
publicUsergetUser(@RequestParamIntegerid)
```

##### 路径参数

```
GET /user/1
```

对应：

```
@GetMapping("/user/{id}")
publicUsergetUser(@PathVariableIntegerid)
```

##### JSON 请求体

```
POST /login
Content-Type: application/json

{"username":"zs","password":"123"}
```

对应：

```
@PostMapping("/login")
publicStringlogin(@RequestBodyLoginDTOdto)
```

这个过程中会用到 **HttpMessageConverter**，比如把 JSON 转成 Java 对象。

---

#### 7. 执行 Controller

Controller 一般只做：

- 接收参数
- 调用业务层
- 返回结果

例如：

```
@RestController
@RequestMapping("/user")
publicclassUserController {

    @Autowired
privateUserServiceuserService;

    @GetMapping("/{id}")
publicUserVOgetUser(@PathVariableLongid) {
returnuserService.getById(id);
    }
}
```

---

#### 8. 调用 Service

Service 层处理业务逻辑。

比如：

- 登录校验
- 订单创建
- 库存判断
- 调用多个下游服务

```
@Service
publicclassUserService {
publicUserVOgetById(Longid) {
// 业务逻辑
    }
}
```

---

#### 9. 调用 Mapper / Repository

这一层负责和数据库交互。

例如 MyBatis：

```
@Mapper
publicinterfaceUserMapper {
UserselectById(Longid);
}
```

Service 调 Mapper，Mapper 再去查 MySQL。

除了数据库，也可能访问：

- Redis
- ES
- MQ
- 其他微服务

---

#### 10. 返回结果

业务处理完后，结果会一层层返回：

**Mapper → Service → Controller**

如果是 `@RestController`，Spring 会把返回的 Java 对象自动转成 JSON。

比如：

```
returnnewUserVO(1L,"Tom");
```

最终响应给前端可能是：

```
{
  "id":1,
  "name":"Tom"
}
```

---

#### 11. 响应返回客户端

最后响应会再经过：

- Interceptor 的后置方法
- Filter 的返回流程
- Tomcat 把响应写回 socket

然后客户端收到结果。

---

### 四、你可以把整个流程记成这一条线

#### 简版流程

```plain
客户端
→ Nginx / 网关
→ Tomcat
→ Filter
→ DispatcherServlet
→ Interceptor
→ Controller
→ Service
→ Mapper / Repository
→ MySQL / Redis / 其他服务
→ 返回 JSON
→ 客户端
```

---

### 五、举个实际例子

前端调用：

```js
fetch("/api/user/1")
```

后端：

```java
@RestController
@RequestMapping("/api/user")
publicclassUserController {

    @Autowired
privateUserServiceuserService;

    @GetMapping("/{id}")
publicUserVOgetUser(@PathVariableLongid) {
returnuserService.getUser(id);
    }
}
```

Service：

```java
@Service
publicclassUserService {

    @Autowired
privateUserMapperuserMapper;

publicUserVOgetUser(Longid) {
Useruser=userMapper.selectById(id);
returnnewUserVO(user.getId(),user.getName());
    }
}
```

那调用链就是：

1. 前端发 `GET /api/user/1`
2. Tomcat 收到请求
3. Filter 执行
4. DispatcherServlet 分发
5. 找到 `UserController.getUser`
6. 解析 `@PathVariable id = 1`
7. 调 `userService.getUser(1)`
8. 调 `userMapper.selectById(1)`
9. 查数据库
10. 返回 `UserVO`
11. Spring 转成 JSON
12. 响应给前端

---

### 六、几个你面试里容易被问到的点

#### 1. Spring Boot 自己接收请求吗？

严格说不是直接“Spring Boot”接收，而是：

- 底层是 **Tomcat/Jetty/Undertow**
- Spring Boot 只是帮你自动配置好了这些东西

---

#### 2. Controller 为什么能直接拿到参数？

因为 Spring MVC 做了：

- 路由匹配
- 参数绑定
- 类型转换
- JSON 反序列化

---

#### 3. Filter 和 Interceptor 区别

你可以先这样理解：

- **Filter**：更底层，Servlet 层面的
- **Interceptor**：更靠近 Spring MVC，能拦截 Controller 执行

---

#### 4. JSON 是谁转的？

是 **HttpMessageConverter** 做的。

例如：

- 请求 JSON -> Java 对象
- Java 对象 -> 响应 JSON

底层常用 Jackson。
