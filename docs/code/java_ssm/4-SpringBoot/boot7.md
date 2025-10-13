---
title: Javassm - SpringBoot前后端分离1 (session)
date: 2025-10-13
category:
  - code
tag:
  - javassm
  - Spring
# star: true
# sticky: true
order: -0.58
---

## 前后端分离

前后端分离是一种软件架构模式，它将前端和后端的开发职责分开，使得前端和后端可以独立进行开发、测试和部署。在之前，我们都是编写Web应用程序，但是随着时代发展，各种桌面App、手机端App还有小程序层出不穷，这都完全脱离我们之前的开发模式，客户端和服务端的划分越来越明显，前后端分离开发势在必行。

在前后端分离架构中，前端主要负责展示层的开发，包括用户界面的设计、用户交互的实现等。前端使用一些技术栈，如Vue、React等技术来实现用户界面，同时通过Ajax、Axios等技术与后端进行数据的交互，这样前端无论使用什么技术进行开发，都与后端无关，受到的限制会小很多。

后端主要负责业务逻辑的处理和数据的存储，包括用户认证、数据验证、数据处理、数据库访问等，我们在SSM阶段就已经给各位小伙伴介绍过了前后端开发的相关思路了，实际上后端只需要返回前端需要的数据即可，我们一般使用JSON格式进行返回。

前后端分离架构的优势包括：

- 前后端可以同时独立进行开发，提高开发效率。
- 前端可以灵活选择技术栈和框架，提供更好的用户体验。
- 后端可以专注于业务逻辑的实现，提高代码的可维护性。
- 前后端通过接口进行通信，使得前端和后端可以分别进行部署，提高系统的可扩展性和灵活性。

## 基于Session的分离（有状态）

基于Cookie的前后端分离是最简单的一种，也是更接近我们之前学习的一种。在之前，我们都是使用SpringSecurity提供的默认登录流程完成验证。

我们发现，实际上SpringSecurity在登录之后，会利用Session机制记录用户的登录状态，这就要求我们每次请求的时候都需要携带Cookie才可以，因为Cookie中存储了用于识别的JSESSIONID数据。因此，要实现前后端分离，我们只需要稍微修改一下就可以实现了，这对于小型的单端应用程序非常友好。

### 学习环境搭建

考虑到各位小伙伴没有学习过Vue等前端框架，这里我们依然使用前端模版进行魔改。只不过现在我们的前端页面需要单独进行部署，而不是和后端揉在一起

这里我们需要先创建一个前端项目，依赖只需勾选SpringWeb即可，主要用作反向代理前端页面：

![image-20230722151228110](https://s2.loli.net/2023/07/22/A7gTxwv6r89tKh3.png)

如果学习了Nginx代理，使用Nginx代理前端项目会更好一些。

接着我们将所有的前端模版文件全部丢进对应的目录中，创建一个`web`目录到resource目录下，然后放入我们前端模版的全部文件：

![image-20230722154349756](https://s2.loli.net/2023/07/22/DtLF21ue7RVMQPY.png)

然后配置一下静态资源代理，现在我们希望的是页面直接被代理，不用我们手动去写Controller来解析视图：

```yaml
spring:
  web:
    resources:
      static-locations: classpath:/web
```

然后启动服务器就行了

这样前端页面就部署完成了，接着我们还需要创建一个后端项目，用于去编写我们的后端，选上我们需要的一些依赖：

![alt text](img/35.png)

接着我们需要修改一下后端服务器的端口，因为现在我们要同时开两个服务器，一个是负责部署前端的，一个是负责部署后端的，这样就是标准的前后端分离了，所以说为了防止端口打架，我们就把端口开放在8081上：

```yml
server:
  port: 8081
```

现在启动这两个服务器，我们的学习环境就搭建好了。

### 实现登录授权和跨域处理

在之前，我们的登录操作以及登录之后的页面跳转都是由SpringSecurity来完成，但是现在前后端分离之后，整个流程发生了变化，现在前端仅仅是调用登录接口进行一次校验即可，而后端只需要返回本次校验的结果，由前端来判断是否校验成功并跳转页面：

![alt text](img/36.png)

因此，现在我们只需要让登录模块响应一个JSON数据告诉前端登录成功与否即可，当然，前端在发起请求的时候依然需要携带Cookie信息，否则后端不认识是谁。

现在我们就来尝试实现一下这种模式，首先我们配置一下SpringSecurity的相关接口：

```java
@Configuration
public class SecurityConfiguration {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(conf -> {
                    conf.anyRequest().authenticated();
                })
                .formLogin(conf -> {
                    //一般分离之后，为了统一规范接口，使用 /api/模块/功能 的形式命名接口
                    conf.loginProcessingUrl("/api/auth/login");
                    conf.permitAll();
                })
                .csrf(AbstractHttpConfigurer::disable)
                .build();
    }
}
```

虽然这样成功定义了登录接口相关内容，但是怎么才能让SpringSecurity在登录成功之后返回一个JSON数据给前端而不是默认的重定向呢？

这时我们可以手动设置SuccessHandler和FailureHandler来实现：

```java
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                ...
                .formLogin(conf -> {
                    conf.loginProcessingUrl("/api/auth/login");
                    // 使用自定义的成功失败处理器
                    conf.failureHandler(this::onAuthenticationFailure);
                    conf.successHandler(this::onAuthenticationSuccess);
                    conf.permitAll();
                })
                ...
    }

    void onAuthenticationFailure(HttpServletRequest request,
                                 HttpServletResponse response,
                                 AuthenticationException exception) {

    }

    void onAuthenticationSuccess(HttpServletRequest request, 
                                 HttpServletResponse response, 
                                 Authentication authentication) {
        
    }
```

现在我们需要返回一个标准的JSON格式数据作为响应，这里我们根据Rest API标准来进行编写：

> REST API是遵循REST（Representational State Transfer, 表述性状态转移）原则的Web服务接口，下面简单介绍一下REST接口规范以及对应的响应数据该如何编写:
>
> ### 1. REST接口规范
>
> - **使用HTTP方法**：GET（检索资源）、POST（创建资源）、PUT（更新资源）、DELETE（删除资源）。
> - **无状态**: REST接口要求实现无状态从而使其独立于之前的请求。
> - **使用正确的HTTP状态码**：在HTTP响应中反馈操作的结果（例如，200表示成功，404表示资源不存在等）。
> - **URI 应该清晰易懂**：URI应能清晰地指示出所引用资源的类型和编号，并能易于理解和使用。
>
> ### 2. 响应数据格式
>
> REST应答一般使用的格式为JSON，以下是一个标准的JSON响应数据样例：
>
> ```json
> {
>   "code": 200,
>   "data": {
>     "id": 1,
>     "name": "Tom",
>     "age": 18
>   },
>   "message": "查询成功"
> }
> ```
>
> 字段的含义分别为：
>
> - **code**：HTTP状态码，表示请求的结果。常见的有200（成功）、400（客户端错误）、500（服务器错误）等。
> - **data**：响应的真实数据。在上例中，是一个包含用户信息的对象。
> - **message**：请求响应信息，常用于描述请求处理结果。
>
> 上述都是建议的最佳实践，实际应用中可以根据具体的业务需求进行适当的调整。

这里我们创建一个实体类来装载响应数据，可以使用记录类型：

```java
public record RestBean<T> (int code, T data, String message) {
    // 写几个工具方法，用于快速创建RestBean对象
    public static <T> RestBean<T> success(T data){
        return new RestBean<>(200, data, "请求成功");
    }

    public static <T> RestBean<T> failure(int code, String message){
        return new RestBean<>(code, null, message);
    }

    public static <T> RestBean<T> failure(int code){
        return failure(code, "请求失败");
    }

    // 将当前对象转换为JSON格式的字符串用于返回
    public String asJsonString() {
        return JSONObject.toJSONString(this, JSONWriter.Feature.WriteNulls);
    }
}
```

接着我们稍微设置一下对应的Handler即可：

```java
    void onAuthenticationFailure(HttpServletRequest request,
                                 HttpServletResponse response,
                                 AuthenticationException exception) throws IOException {
        response.setContentType("application/json;charset=utf-8");
        PrintWriter writer = response.getWriter();
        writer.write(RestBean.failure(401, exception.getMessage()).asJsonString());
    }

    void onAuthenticationSuccess(HttpServletRequest request,
                                 HttpServletResponse response,
                                 Authentication authentication) throws IOException {
        response.setContentType("application/json;charset=utf-8");
        PrintWriter writer = response.getWriter();
        writer.write(RestBean.success(authentication.getName()).asJsonString());
    }
```

现在我们就可以使用API测试工具来调试一下了：

![image-20230723193442527](https://s2.loli.net/2023/07/23/EiMUuCjcKpnOmRb.png)

可以看到响应的结果是标准的JSON格式数据，而不是像之前那样重定向到一个页面，这样前端发起的异步请求就可以进行快速判断了。

我们来尝试写一个简单的前端逻辑试试看，这里依然引入Axios框架来发起异步请求：

```html
<script src="https://unpkg.com/axios@1.1.2/dist/axios.min.js"></script>
<script>
    function getInfo() {
        axios.post('http://localhost:8081/api/auth/login', {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            withCredentials: true
        }).then(({data}) => {
            if(data.code === 200) {  //通过状态码进行判断
                window.location.href = '/index.html'  //登录成功进入主页
            } else {
                alert('登录失败：'+data.message)   //登录失败返回弹窗
            }
        })
    }
</script>
```

可能会有小伙伴好奇，这个前端不是每个页面都能随便访问吗，这登录跟不登录有啥区别？实际上我们的前端开发者会在前端做相应的路由以及拦截来控制页面的跳转，我们后端开发者无需担心，我们只需要保证自己返回的数据是准确无误的即可，其他的交给前端小姐姐就好，这里我们只是做个样子。

当点击按钮时就能发起请求了，但是我们现在遇到了一个新的问题：

![alt text](img/37.png)

我们在发起登录请求时，前端得到了一个跨域请求错误，这是因为我们前端的站点和后端站点不一致导致的，浏览器为了用户的安全，防止网页中一些恶意脚本跨站请求数据，会对未经许可的跨域请求发起拦截。

那么，我们怎么才能让这个请求变成我们许可的呢？对于跨域问题，是属于我们后端需要处理的问题，跟前端无关，我们需要在响应的时候，在响应头中添加一些跨域属性，来告诉浏览器从哪个站点发来的跨域请求是安全的，这样浏览器就不会拦截了。

#### 跨域解决配置

那么如何进行配置呢，我们现在使用了SpringSecurity框架，可以直接进行跨域配置：

```java
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                ...
                .cors(conf -> {
                    CorsConfiguration cors = new CorsConfiguration();
                    //添加前端站点地址，这样就可以告诉浏览器信任了
                    cors.addAllowedOrigin("http://localhost:8080");
                    //虽然也可以像这样允许所有 cors.addAllowedOriginPattern("*");
                    //但是这样并不安全，我们应该只许可给我们信任的站点
                    cors.setAllowCredentials(true);  //允许跨域请求中携带Cookie
                    cors.addAllowedHeader("*");   //其他的也可以配置，为了方便这里就 * 了
                    cors.addAllowedMethod("*");
                    cors.addExposedHeader("*");
                    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                    source.registerCorsConfiguration("/**", cors);  //直接针对于所有地址生效
                    conf.configurationSource(source);
                })
                ...
                .build();
    }
```

这样，当我们再次重启服务器，返回的响应头中都会携带跨域相关的信息，这样浏览器就不会进行拦截了：

![alt text](img/38.png)

这样就可以实现前后端分离的登录模式了

由于记住我功能和退出登录操作跟之前是一样的配置，这里我们就不进行演示了。

### 响应JSON化

前面我们完成了前后端分离的登录模式，我们来看看一般的业务接口该如何去实现，比如这里我们写一个非常简单的的用户名称获取接口：

```java
@RestController   
//为了方便，我们一律使用RestController，这样每个请求默认都返回JSON对象
@RequestMapping("/api/user")   
//用户相关的接口，路径可以设置为/api/user/xxxx
public class UserController {
    @GetMapping("/name")
    public RestBean<String> username() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return RestBean.success(user.getUsername());
    }
}
```

这样前端就可以在登录之后获取到这个接口的结果了，注意一定要在请求时携带Cookie，否则服务端无法识别身份，会直接被拦截并重定向：

```html
<script>
    axios.get('http://localhost:8081/api/user/name', {
        withCredentials: true  //携带Cookie访问，不然服务器不认识我们
    }).then(({data}) => {
        document.getElementById('username').innerText = data.data
    })
</script>
```

不过我们发现，我们的一些响应还是不完善，比如用户没有登录，默认还是会302重定向，但是实际上我们只需要告诉前端没有登录就行了，所以说我们修改一下未登录状态下返回的结果：

```java
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                ...
                .exceptionHandling(conf -> {
                    //配置授权相关异常处理器
                    conf.accessDeniedHandler(this::onAccessDeny);
                    //配置验证相关异常的处理器
                    conf.authenticationEntryPoint(this::onAuthenticationFailure);
                })
                .build();
    }
```

现在有三个方法(3个`Handler`)，但是实际上功能都是一样的，我们可以把它们整合为同一个方法, 根据异常类型去判断：

```java
private void handleProcess(HttpServletRequest request,
                    HttpServletResponse response,
                    Object exceptionOrAuthentication) throws IOException {
    response.setContentType("application/json;charset=utf-8");
    PrintWriter writer = response.getWriter();
    if(exceptionOrAuthentication instanceof AccessDeniedException exception) {
        writer.write(RestBean.failure(403, exception.getMessage()).asJsonString());
    } else if(exceptionOrAuthentication instanceof Exception exception) {
        writer.write(RestBean.failure(401, exception.getMessage()).asJsonString());
    } else if(exceptionOrAuthentication instanceof Authentication authentication){
        writer.write(RestBean.success(authentication.getName()).asJsonString());
    }
}
```

这样，用户在没有登录的情况下，请求接口就会返回我们的自定义JSON信息了

对于我们页面中的一些常见的异常，我们也可以编写异常处理器来将其规范化返回，比如404页面，我们可以直接配置让其抛出异常：

```yml
spring:
    mvc:
    throw-exception-if-no-handler-found: true
  web:
    resources:
      add-mappings: false
```

然后编写异常处理器：

```java
@RestController
@ControllerAdvice
public class ExceptionController {

    @ExceptionHandler(Exception.class)
    public RestBean<String> error(Exception e){
        if(e instanceof NoHandlerFoundException exception)  
            // 这里就大概处理一下404就行
            return RestBean.failure(404, e.getMessage());  
        else if (e instanceof ServletException exception)  
            // 其他的Servlet异常就返回400状态码
            return RestBean.failure(400, e.getMessage());
        else
            return RestBean.failure(500, e.getMessage());  
            // 其他异常直接返回500
    }
}
```

这样我们的后端就返回的是非常统一的JSON格式数据了，前端开发人员只需要根据我们返回的数据编写统一的处理即可，基于Session的前后端分离实现起来也是最简单的，几乎没有多少的学习成本，跟我们之前的使用是一样的，只是现在前端单独编写了而已。
