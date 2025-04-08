---
title: Socket2
date: 2024-03-22
category:
  - code
tag:
  - javaweb
# star: true
# sticky: true
order: -0.7499
---

## Socket2

### Socket 传输文件

其实本质上都差不多，主要掌握几种流之间的操作，和 `socket` 的用法

1. 一般 `xxxOutputStream` 的操作是往对应的xxx流内写入一些东西；`xxxInputStream` 的操作是从对应的xxx流内获取一些东西。

```java
// Server.java
public class Server {
    public static void main(String[] args) {
        try(ServerSocket server = new ServerSocket(8080);
            FileOutputStream fileOutputStream = new FileOutputStream("net/data.txt");
        ){
            Socket socket = server.accept();
            InputStream inputstream = socket.getInputStream();
            byte[] bytes = new byte[1024];
            int i;
            while((i = inputstream.read(bytes)) != -1){
                fileOutputStream.write(bytes);
            }
            fileOutputStream.flush();
            socket.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }
}
```

```java
// Client.java
public class Client {
    public static void main(String[] args) {
        try (Socket socket = new Socket("localhost", 8080)){
            FileInputStream fileInputStream = new FileInputStream("1.txt");
            OutputStream stream = socket.getOutputStream();
            byte[] bytes = new byte[1024];
            int i;
            while((i = fileInputStream.read(bytes)) != -1){
                stream.write(bytes, 0, i);
            }
            stream.flush();
        }catch (IOException e){
            System.out.println("服务端连接失败！");
            e.printStackTrace();
        }
    }
}
```

### 使用浏览器访问Socket服务器

1. Http请求是基于TCP协议，不会保持长久连接，在收到响应的数据后会立即关闭TCP连接。
2. 尝试自己写的http相应时，要保持服务器一直在线，不能一个`socket`之后就done了，因为浏览器访问时会不止发一个请求，所以如果没有始终在线，浏览器会显示无法访问。

查看浏览器发起的请求

```java
public static void main(String[] args) {
        try(ServerSocket server = new ServerSocket(8080)){    //将服务端创建在端口8080上
            System.out.println("正在等待客户端连接...");
            Socket socket = server.accept();
            System.out.println("客户端已连接，IP地址为："+socket.getInetAddress().getHostAddress());
            InputStream in = socket.getInputStream();  //通过
            System.out.println("接收到客户端数据：");
            while (true){
                int i = in.read();
                if(i == -1) break;
                System.out.print((char) i);
            }
        }catch (Exception e){
            e.printStackTrace();
        }
    }
```

通过访问 <http://localhost:8080> 或是 <http://127.0.0.1:8080>, 来连接我们本地端口的服务器。

我们发现浏览器是无法打开这个链接的，但是我们服务端却收到了不少的信息：

```http
GET / HTTP/1.1
Host: 127.0.0.1:8080
Connection: keep-alive
Cache-Control: max-age=0
sec-ch-ua: "Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,und;q=0.8,en;q=0.7
```

实际上这些内容都是`Http`协议规定的请求头内容。HTTP是一种应用层协议，全称为超文本传输协议，它本质也是**基于TCP协议进行数据传输**，因此我们的服务端能够读取HTTP请求。**但是Http协议并不会保持长连接，在得到我们响应的数据后会立即关闭TCP连接。**

既然使用的是Http连接，如果我们的服务器要支持响应HTTP请求，那么就需要按照HTTP协议的规则，返回一个规范的响应文本，首先是响应头，它至少要包含一个响应码：

```http
HTTP/1.1 200 Accpeted
```

然后就是响应内容（注意一定要换行再写），对应支持HTTP协议的响应内容：

```java
public class Server {
    public static void main(String[] args) {
        try(ServerSocket server = new ServerSocket(8080)){
            // 必须加 while(true) 因为浏览器不止发一个请求
            while(true){
                System.out.println("正在等待客户端连接...");
                Socket socket = server.accept();
                System.out.println("客户端已连接，IP地址为："+socket.getInetAddress().getHostAddress());

                OutputStreamWriter writer = new OutputStreamWriter(socket.getOutputStream());
                writer.write("HTTP/1.1 200 Accepted\r\n");
                writer.write("\r\n");
                writer.write("Penguin!");
                writer.flush();
                socket.close();
            }

        }catch (Exception e){
            e.printStackTrace();
        }
    }
}
```