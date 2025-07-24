---
title: Content - Servlet2
date: 2025-07-22
category:
  - code
tag:
  - javaweb
# star: true
# sticky: true
order: -0.7463
---

## Servlet2

### 使用POST请求完成登陆

一般通过 `Post` 操作来向服务器传输数据

我们需要修改一下我们的`Servlet`，让其能够接收一个POST请求：

```java
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.getParameterMap().forEach((k, v) -> {
            System.out.println(k + ": " + Arrays.toString(v));
        });
    }
}
```

`ParameterMap`存储了我们发送的POST请求所携带的表单数据，我们可以直接将其遍历查看，浏览器发送了什么数据。

对应的前端用 `form` 来进行提交：

```html
<body>
    <h1>登录到系统</h1>
    <form method="post" action="login">
        <hr>
        <div>
            <label>
                <input type="text" placeholder="用户名" name="username">
            </label>
        </div>
        <div>
            <label>
                <input type="password" placeholder="密码" name="password">
            </label>
        </div>
        <div>
            <button>登录</button>
        </div>
    </form>
</body>
```

通过修改form标签的属性，现在我们点击登录按钮，会自动向后台发送一个POST请求，请求地址为当前地址+/login（注意不同路径的写法），也就是我们上面编写的Servlet路径。

运行服务器，测试后发现，在点击按钮后，确实向服务器发起了一个POST请求，并且携带了表单中文本框的数据。

#### 实现简单登录功能

根据已有的基础，将其与数据库打通，我们进行一个真正的用户登录操作

##### Mybatis 配置

1. 去数据库里创建一个表作为测试

2. 在 `pom.xml` 中装好 `mybatis` 以及 数据库驱动 `mysql`

    ```xml
        <dependency>
            <groupId>org.mybatis</groupId>
            <artifactId>mybatis</artifactId>
            <version>3.5.7</version>
        </dependency>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <version>8.0.27</version>
        </dependency>
    ```

3. 在 `Resources` 文件夹写 `mybatis-config.xml` 配置文件
    其中，驱动名就是对应的 `com.mysql.jc.jdbc.Driver`，其他就很好找的

    ```xml
        <?xml version="1.0" encoding="UTF-8" ?>
        <!DOCTYPE configuration
                PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
                "http://mybatis.org/dtd/mybatis-3-config.dtd">
        <configuration>
            <environments default="development">
                <environment id="development">
                    <transactionManager type="JDBC"/>
                    <dataSource type="POOLED">
                        <property name="driver" value="${驱动类（含包名）}"/>
                        <property name="url" value="${数据库连接URL}"/>
                        <property name="username" value="${用户名}"/>
                        <property name="password" value="${密码}"/>
                    </dataSource>
                </environment>
            </environments>
        </configuration>
    ```

4. 再去编写对应逻辑，创建一个实体类以及`Mapper`来进行用户信息查询：
    `Mapper`创在对应的`Mapper`文件夹下，然后去`mybatis-config.xml`填写对应`mapper`的配置

    ```java
    @Data
    public class User {
        String username;
        String password;
    }
    ```

    ```java
    public interface UserMapper {
        @Select("select * from users where username = #{username} and password = #{password}")
        User getUser(@Param("username") String username, @Param("password") String password);
    }
    ```

    ```xml
    <mappers>
        <mapper class="com.example.dao.UserMapper"/>
    </mappers>
    ```

##### 实现登录功能

1. 初始化得到 `mybatis` 配置连接数据库
2. 在 `doPost` 中写对应的登录逻辑

```java
@WebServlet(value = "/login", loadOnStartup = 1)
public class LoginServlet extends HttpServlet {
    SqlSessionFactory factory;
    @Override
    public void init() throws ServletException {
        try {
            factory = new SqlSessionFactoryBuilder().build(Resources.getResourceAsStream("mybatis-config.xml"));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        //首先设置一下响应类型
        resp.setContentType("text/html;charset=UTF-8");
        //获取POST请求携带的表单数据
        Map<String, String[]> map = req.getParameterMap();
        //判断表单是否完整
        if(map.containsKey("username") && map.containsKey("password")) {
            String username = req.getParameter("username");
            String password = req.getParameter("password");
            try (SqlSession sqlSession = factory.openSession(true)){
                UserMapper mapper = sqlSession.getMapper(UserMapper.class);
                User user = mapper.getUser(username, password);
                //判断用户是否登陆成功，若查询到信息则表示存在此用户
                if(user != null){
                    System.out.println(user.toString());
                    resp.getWriter().write("登陆成功！");
                }else {
                    resp.getWriter().write("登陆失败，请验证您的用户名或密码！");
                }
            }
        }else {
            resp.getWriter().write("错误，您的表单数据不完整！");
        }
    }
}
```

### 上传和下载文件

#### 下载

首先我们来看看比较简单的下载文件，首先将我们的icon.png放入到resource文件夹中，接着我们编写一个Servlet用于处理文件下载：

```java
@WebServlet("/file")
public class FileServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
      resp.setContentType("image/png");  
      OutputStream outputStream = resp.getOutputStream();
      InputStream inputStream = Resources.getResourceAsStream("icon.png");

    }
}
```

为了更加快速地编写IO代码，我们可以引入一个工具库 `commons-io`：

```xml
<dependency>
    <groupId>commons-io</groupId>
    <artifactId>commons-io</artifactId>
    <version>2.6</version>
</dependency>
```

使用此类库可以快速完成IO操作：

```java
resp.setContentType("image/png");
OutputStream outputStream = resp.getOutputStream();
InputStream inputStream = Resources.getResourceAsStream("icon.png");
//直接使用copy方法完成转换
IOUtils.copy(inputStream, outputStream);
```

现在我们在前端页面添加一个链接，用于下载此文件：

```html
<hr>
<a href="file" download="icon.png">点我下载高清资源</a>
```

#### 上传

首先我们编写前端部分：

```html
<form method="post" action="file" enctype="multipart/form-data">
    <div>
        <input type="file" name="test-file">
    </div>
    <div>
        <button>上传文件</button>
    </div>
</form>
```

注意必须添加`enctype="multipart/form-data"`，来表示此表单用于文件传输。

现在我们来修改一下Servlet代码：

```java
@MultipartConfig
@WebServlet("/file")
public class FileServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try(FileOutputStream stream = new FileOutputStream("xxxx")){
            Part part = req.getPart("test-file");
            IOUtils.copy(part.getInputStream(), stream);
            resp.setContentType("text/html;charset=UTF-8");
            resp.getWriter().write("文件上传成功！");
        }
    }
}
```

part 为网站中上传的内容，将其copy到stream中

注意，必须添加`@MultipartConfig`注解来表示此Servlet用于处理文件上传请求。

现在我们再运行服务器，并将我们刚才下载的文件又上传给服务端。

### 使用XHR请求数据

现在我们希望，网页中的部分内容，可以动态显示，比如网页上有一个时间，旁边有一个按钮，点击按钮就可以刷新当前时间。

这个时候就需要我们在**网页展示时向后端发起请求**，并根据后端响应的结果，**动态地更新页面中的内容**

要实现此功能，就需要用到JavaScript来帮助我们，首先在js中编写我们的XHR请求，并在请求中完成动态更新：

```js
function updateTime() {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.getElementById("time").innerText = xhr.responseText
        }
    };
    xhr.open('GET', 'time', true);
    xhr.send();
}
```

接着修改一下前端页面，添加一个时间显示区域：

```html
<hr>
<div id="time"></div>
<br>
<button onclick="updateTime()">更新数据</button>
<script>
    updateTime()
</script>
```

最后创建一个Servlet用于处理时间更新请求：

```java
@WebServlet("/time")
public class TimeServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy年MM月dd日 HH:mm:ss");
        String date = dateFormat.format(new Date());
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write(date);
    }
}
```

GET请求也能传递参数, 后面跟 ? 就行
