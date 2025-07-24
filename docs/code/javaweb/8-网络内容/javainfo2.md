---
title: Content - Tomact
date: 2025-07-20
category:
  - code
tag:
  - javaweb
# star: true
# sticky: true
order: -0.7465
---

## 网络基础2

### Tomact 安装

Tomcat（汤姆猫）就是一个典型的Web应用服务器软件，通过运行Tomcat服务器，我们就可以快速部署我们的Web项目，并交由Tomcat进行管理，我们只需要直接通过浏览器访问我们的项目即可。

那么首先，我们需要进行一个简单的环境搭建，我们需要在Tomcat官网下载最新的Tomcat服务端程序：<https://tomcat.apache.org/download-10.cgi>

- 下载：64-bit Windows zip

下载完成后，解压，并放入桌面，接下来需要配置一下环境变量，打开`高级系统设置`，打开`环境变量`，添加一个新的系统变量，变量名称为`JRE_HOME`，填写JDK的安装目录+/jre，比如Zulujdk默认就是：C:\Program Files\Zulu\zulu-8\jre

设置完成后，我们进入tomcat文件夹bin目录下，并在当前位置打开CMD窗口，将startup.sh拖入窗口按回车运行，如果环境变量配置有误，会提示，若没问题，服务器则正常启动。

如果出现乱码，说明编码格式配置有问题，我们修改一下服务器的配置文件，打开`conf`文件夹，找到`logging.properties`文件，这就是日志的配置文件（我们在前面已经给大家讲解过了）将ConsoleHandler的默认编码格式修改为GBK编码格式：

```properties
java.util.logging.ConsoleHandler.encoding = GBK
```

现在重新启动服务器，就可以正常显示中文了。

服务器启动成功之后，不要关闭，我们打开浏览器，在浏览器中访问：<http://localhost:8080/>

Tomcat服务器默认是使用8080端口（可以在配置文件中修改），访问成功说明我们的Tomcat环境已经部署成功了。

整个Tomcat目录下，我们已经认识了bin目录（所有可执行文件，包括启动和关闭服务器的脚本）以及conf目录（服务器配置文件目录），那么我们接着来看其他的文件夹：

- lib目录：Tomcat服务端运行的一些依赖，不用关心。
- logs目录：所有的日志信息都在这里。
- temp目录：存放运行时产生的一些临时文件，不用关心。
- work目录：工作目录，Tomcat会将jsp文件转换为java文件（我们后面会讲到，这里暂时不提及）
- webapp目录：所有的Web项目都在这里，每个文件夹都是一个Web应用程序：

我们发现，官方已经给我们预设了一些项目了，访问后默认使用的项目为ROOT项目，也就是我们默认打开的网站。

我们也可以访问example项目，只需要在后面填写路径即可：<http://localhost:8080/examples/>

或是docs项目（这个是Tomcat的一些文档）<http://localhost:8080/docs/>

Tomcat还自带管理页面，我们打开：<http://localhost:8080/manager>

提示需要用户名和密码，由于不知道是什么，我们先点击取消，页面中出现如下内容：

> You are not authorized to view this page. If you have not changed any configuration files, please examine the file `conf/tomcat-users.xml` in your installation. That file must contain the credentials to let you use this webapp.
>
> For example, to add the `manager-gui` role to a user named `tomcat` with a password of `s3cret`, add the following to the config file listed above.
>
> ```
> <role rolename="manager-gui"/>
> <user username="tomcat" password="s3cret" roles="manager-gui"/>
> ```
>
> Note that for Tomcat 7 onwards, the roles required to use the manager application were changed from the single `manager` role to the following four roles. You will need to assign the role(s) required for the functionality you wish to access.
>
> - `manager-gui` - allows access to the HTML GUI and the status pages
> - `manager-script` - allows access to the text interface and the status pages
> - `manager-jmx` - allows access to the JMX proxy and the status pages
> - `manager-status` - allows access to the status pages only
>
> The HTML interface is protected against CSRF but the text and JMX interfaces are not. To maintain the CSRF protection:
>
> - Users with the `manager-gui` role should not be granted either the `manager-script` or `manager-jmx` roles.
> - If the text or jmx interfaces are accessed through a browser (e.g. for testing since these interfaces are intended for tools not humans) then the browser must be closed afterwards to terminate the session.
>
> For more information - please see the [Manager App How-To](http://localhost:8080/docs/manager-howto.html).

现在我们按照上面的提示，去配置文件中进行修改：

```xml
  <role rolename="manager-gui"/>
  <user username="admin" password="admin" roles="manager-gui"/>
```

现在再次打开管理页面，已经可以成功使用此用户进行登陆了。登录后，展示给我们的是一个图形化界面，我们可以快速预览当前服务器的一些信息，包括已经在运行的Web应用程序，甚至还可以查看当前的Web应用程序有没有出现内存泄露。

同样的，还有一个虚拟主机管理页面，用于一台主机搭建多个Web站点，一般情况下使用不到，这里就不做演示了。

我们可以将我们自己的项目也放到webapp文件夹中，这样就可以直接访问到了，我们在webapp目录下新建test文件夹，将我们之前编写的前端代码全部放入其中（包括html文件、js、css、icon等），重启服务器。

我们可以直接通过 <http://localhost:8080/test/> 来进行访问。

### IDEA MAVEN 构建 web 项目

新建项目，选择 Java Enterprise 项目名称随便，项目模板选择Web应用程序，然后我们需要配置Web应用程序服务器，将我们的Tomcat服务器集成到IDEA中。配置很简单，首先点击新建，然后设置Tomcat主目录即可，配置完成后，点击下一步即可，依赖项使用默认即可，然后点击完成，之后IDEA会自动帮助我们创建Maven项目。
