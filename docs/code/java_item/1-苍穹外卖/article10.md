---
title: Javassm - item1-10 (微信登录 + 商品浏览 1)
date: 2025-11-13
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## HTTPClient

HttpClient 是Apache Jakarta Common 下的子项目，可以用来提供高效的、最新的、功能丰富的支持 HTTP 协议的客户端编程工具包，并且它支持 HTTP 协议最新的版本和建议

**HttpClient作用**

- 发送HTTP请求
- 接收响应数据

### 应用场景

当我们在使用扫描支付、查看地图、获取验证码、查看天气等功能时，其实，应用程序本身并未实现这些功能，都是在应用程序里访问提供这些功能的服务，访问这些服务需要发送HTTP请求，并且接收响应数据，可通过HttpClient来实现

### `maven`坐标

```xml
<dependency>
    <groupId>org.apache.httpcomponents</groupId>
    <artifactId>httpclient</artifactId>
    <version>4.5.13</version>
</dependency>
```

### HttpClient的核心API

- HttpClient：Http客户端对象类型，使用该类型对象可发起Http请求。
- HttpClients：可认为是构建器，可创建HttpClient对象。
- CloseableHttpClient：实现类，实现了HttpClient接口。
- HttpGet：Get方式请求类型。
- HttpPost：Post方式请求类型。

### HttpClient发送请求步骤

- 创建HttpClient对象
- 创建Http请求对象
- 调用HttpClient的execute方法发送请求

### 简单案例

#### 1. GET方式请求

进入到sky-server模块，编写测试代码，发送GET请求。

**实现步骤：**

1. 创建HttpClient对象
2. 创建请求对象
3. 发送请求，接受响应结果
4. 解析结果
5. 关闭资源

```java
@SpringBootTest
public class HttpClientTest {
    /**
     * 测试通过httpclient发送GET方式的请求
     */
    @Test
    public void testGET() throws Exception{
        //创建httpclient对象
        CloseableHttpClient httpClient = HttpClients.createDefault();

        //创建请求对象
        HttpGet httpGet = new HttpGet("http://localhost:8080/user/shop/status");

        //发送请求，接受响应结果
        CloseableHttpResponse response = httpClient.execute(httpGet);

        //获取服务端返回的状态码
        int statusCode = response.getStatusLine().getStatusCode();
        System.out.println("服务端返回的状态码为：" + statusCode);

        HttpEntity entity = response.getEntity();
        String body = EntityUtils.toString(entity);
        System.out.println("服务端返回的数据为：" + body);

        //关闭资源
        response.close();
        httpClient.close();
    }
}
```

#### 2. POST方式请求

在HttpClientTest中添加POST方式请求方法

相比GET请求来说，POST请求若携带参数需要封装请求体对象，并将该对象设置在请求对象中。

**实现步骤**

1. 创建HttpClient对象
2. 创建请求对象
3. 发送请求，接收响应结果
4. 解析响应结果
5. 关闭资源

```java
/**
 * 测试通过httpclient发送POST方式的请求
 */
@Test
public void testPOST() throws Exception{
    // 创建httpclient对象
    CloseableHttpClient httpClient = HttpClients.createDefault();

    //创建请求对象
    HttpPost httpPost = new HttpPost("http://localhost:8080/admin/employee/login");

    JSONObject jsonObject = new JSONObject();
    jsonObject.put("username","admin");
    jsonObject.put("password","123456");

    StringEntity entity = new StringEntity(jsonObject.toString());
    //指定请求编码方式
    entity.setContentEncoding("utf-8");
    //数据格式
    entity.setContentType("application/json");
    httpPost.setEntity(entity);

    //发送请求
    CloseableHttpResponse response = httpClient.execute(httpPost);

    //解析返回结果
    int statusCode = response.getStatusLine().getStatusCode();
    System.out.println("响应码为：" + statusCode);

    HttpEntity entity1 = response.getEntity();
    String body = EntityUtils.toString(entity1);
    System.out.println("响应数据为：" + body);

    //关闭资源
    response.close();
    httpClient.close();
}
```
