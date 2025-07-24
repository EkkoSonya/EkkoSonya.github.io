---
title: Content - Servlet3
date: 2025-07-22
category:
  - code
tag:
  - javaweb
# star: true
# sticky: true
order: -0.7462
---

## Servlet3

### 重定向与请求转发

#### 重定向 302 `resp.sendRedirect()`

当我们希望用户登录完成之后，直接跳转到网站的首页，那么这个时候，我们就可以使用**重定向**来完成。

当浏览器收到一个重定向的响应时，会按照重定向响应给出的地址，再次向此地址发出请求。

实现重定向很简单，只需要调用一个方法即可

```java
resp.sendRedirect("time");
```

调用后，响应的状态码会被设置为`302`，并且响应头中添加了一个`Location`属性，此属性表示，需要重定向到哪一个网址。

现在，如果我们成功登陆，那么服务器会发送给我们一个重定向响应，这时，我们的浏览器会去重新请求另一个网址。这样，我们在登陆成功之后，就可以直接帮助用户跳转到用户首页了。

除了用写好的 `resp.sendRedircet()` 来进行重定向操作外，我们可以直接发送 `302` + 定义 `Location` 的位置即可

```java
resp.setStatus(302);
resp.setHeader("Location", "xxxx");
```

#### 请求转发

请求转发可以携带数据，重定向无法携带数据

那么我们接着来看请求转发，请求转发其实是一种服务器内部的跳转机制，我们知道，重定向会使得浏览器去重新请求一个页面

而请求转发则是**服务器内部进行跳转**，它的目的是，直接**将本次请求转发给其他Servlet进行处理，并由其他Servlet来返回结果**，因此它是在进行内部的转发。

```java
req.getRequestDispatcher("/time").forward(req, resp);
```

现在，在登陆成功的时候，我们将请求转发给处理时间的Servlet，注意这里的路径规则和之前的不同，我们需要填写**Servlet上指明的路径**，并且请求转发只能转发到此应用程序内部的Servlet，**不能转发给其他站点或是其他Web应用程序。**

现在再次进行登陆操作，我们发现，返回结果为一个405页面，证明了，我们的请求现在是被另一个Servlet进行处理，并且请求的信息全部被转交给另一个Servlet，由于此Servlet不支持POST请求，因此返回405状态码。

那么也就是说，该请求包括请求参数也一起被传递了，那么我们可以尝试获取以下POST请求的参数。

现在我们给此Servlet添加POST请求处理，直接转交给Get请求处理：

```java
@Override
protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    this.doGet(req, resp);
}
```

再次访问，成功得到结果，但是我们发现，浏览器**只发起了一次请求**，并没有再次请求新的URL，也就是说，这一次请求直接返回了请求转发后的处理结果。

请求转发可以携带数据！

```java
req.setAttribute("test", "我是请求转发前的数据");
req.getRequestDispatcher("/time").forward(req, resp);
```

```java
System.out.println(req.getAttribute("test"));
```

通过`setAttribute`方法来给当前请求添加一个附加数据，在请求转发后，我们可以直接获取到该数据。

重定向属于2次请求，因此无法使用这种方式来传递数据，那么，如何在重定向之间传递数据呢？

我们可以使用即将要介绍的`ServletContext`对象。

最后总结，两者的区别为：

- 请求转发是一次请求，重定向是两次请求
- 请求转发地址栏不会发生改变， 重定向地址栏会发生改变
- 请求转发可以共享请求参数 ，重定向之后，就获取不了共享参数了
- 请求转发只能转发给内部的Servlet

### ServletContext对象 - 全局存储通信

`ServletContext`全局唯一，它是属于**整个Web应用程序**的

可以通过`getServletContext()`来获取到此对象。

此对象也能设置附加值：

```java
ServletContext context = getServletContext();
context.setAttribute("test", "我是重定向之前的数据");
resp.sendRedirect("time");
```

```java
System.out.println(getServletContext().getAttribute("test"));
```

因为无论在哪里，无论什么时间，获取到的`ServletContext`始终是同一个对象，因此我们可以随时随地获取我们添加的属性。

它不仅仅可以用来进行数据传递，还可以做一些其他的事情，比如请求转发：

```java
context.getRequestDispatcher("/time").forward(req, resp);
```

它还可以获取**根目录下的资源文件**（注意是webapp根目录下的，不是resource中的资源）

```java
contest.getResourceAsStream()
```

### 初始化参数 `@WebInitParam`

初始化参数类似于**初始化配置需要的一些值**，比如我们的数据库连接相关信息，就可以通过初始化参数来给予Servlet，或是一些其他的配置项，也可以使用初始化参数来实现。

我们可以给一个`Servlet`添加一些初始化参数：

```java
@WebServlet(value = "/login", initParams = {
        @WebInitParam(name = "test", value = "我是一个默认的初始化参数")
})
```

它也是以键值对形式保存的，我们可以直接通过Servlet的`getInitParameter`方法获取：

```java
System.out.println(getInitParameter("test"));
```

#### 全局定义初始化参数

但是，这里的初始化参数仅仅是针对于此Servlet，我们也可以定义全局初始化参数，只需要在web.xml编写即可：

```xml
<context-param>
    <param-name>lbwnb</param-name>
    <param-value>我是全局初始化参数</param-value>
</context-param>
```

我们需要使用`ServletContext`来读取全局初始化参数：

```java
ServletContext context = getServletContext();
System.out.println(context.getInitParameter("lbwnb"));
```

有关`ServletContext`其他的内容，我们需要完成后面内容的学习，才能理解。
