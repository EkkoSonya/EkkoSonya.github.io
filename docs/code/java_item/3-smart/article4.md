---
title: item3 - 4 用户管理模块2
date: 2026-1-8
category:
  - code
tag:
  - java_item
  - PaiSmart
# star: true
# sticky: true
order: -0.6
---

解决用户注册、登录以及权限控制

## 目的

- 确保用户身份安全性
- 有灵活权限管理机制，基于角色的访问控制，通过 RBAC 实现不同角色(管理员|普通用户)功能权限区分
- 为其他模块提供信息支持

## 实现功能

下面这两部分内容主要涉及的是

`SecurityConfig` `JwtAuthenticationFilter`

`CustomUserDetailsService` `OrgTagAuthorizationFilter`

这几个模块内容

用户有一张表 `users` 存的是信息，就包括了 角色 以及 组织标签，还有主标签

此外，有一张组织标签表 存放了所有创建的组织，并包含对应信息 (名称、创建者等)

### 权限验证 (RBAC)

RBAC，全称为 Role-Based Access Control

通过将用户分配到不同的角色，并为角色分配权限，从而实现对资源的访问控制

利用 Spring Security 来实现 RBAC

Spring Security 本质上是一个基于 Filter 的安全框架。当请求进入应用时，会经过一系列安全过滤器链，每个过滤器负责不同的安全功能

主要解决了两大问题：认证（Authentication）和授权（Authorization）

认证就是验证“你是谁”，比如用户登录时验证用户名密码是否正确

授权就是验证“你能做什么”，比如检查用户是否有权限访问某个页面或调用某个接口

#### 主要流程

- 解析请求头中的 JWT Token，验证有效性；
- 提取用户 ID、角色和组织标签信息；
- 对功能权限请求，根据用户角色判断是否允许访问；
- 对数据权限请求，根据用户组织标签判断是否可以访问特定资源；
- 允许或拒绝请求访问

##### 角色定义

- USER（普通用户） ：可以上传文件、进行对话、查看自己的历史记录
- ADMIN（管理员） ：除了普通用户的所有权限外，还能管理所有用户、查看系统状态、管理知识库

##### 组织标签

- 私人空间 ：以"PRIVATE_"开头的资源，只有创建者能访问
- 组织资源 ：根据用户的组织标签来控制访问权限
- 公开资源 ：所有认证用户都能访问

#### 具体使用

##### Config —— `SecurityConfig`

启用 Spring Security，来配置具体的路由匹配角色逻辑

定义了哪些 URL 需要什么级别的权限，并配置了认证和授权过滤器的执行顺序，以及会话管理策略

```java
/**
 * 配置Spring Security的类
 * 该类定义了应用的安全配置，包括请求的授权规则、CSRF保护的配置以及会话管理策略
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  // 日志记录器，用于记录安全配置的相关信息
  private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

  @Autowired
  private JwtAuthenticationFilter jwtAuthenticationFilter;
  
  @Autowired
  private OrgTagAuthorizationFilter orgTagAuthorizationFilter;

  /**
   * 配置SecurityFilterChain bean的方法
   * 该方法主要用于配置应用的安全规则，包括哪些请求需要授权、CSRF保护的启用或禁用、会话管理策略等
   *
   * @param http HttpSecurity对象，用于配置应用的安全规则
   * @return SecurityFilterChain对象，代表配置好的安全过滤链
   * @throws Exception 如果配置过程中发生错误，会抛出异常
   */
  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
      try {
          // 禁用CSRF保护
          http.csrf(csrf -> csrf.disable())
                  // 配置请求的授权规则
                  .authorizeHttpRequests(authorize -> authorize
                          // 允许静态资源访问
                          .requestMatchers("/", "/test.html", "/static/test.html", "/static/**", "/*.js", "/*.css", "/*.ico").permitAll()
                          // 允许 WebSocket 连接
                          .requestMatchers("/chat/**", "/ws/**").permitAll()
                          // 允许登录注册接口
                          .requestMatchers("/api/v1/users/register", "/api/v1/users/login").permitAll()
                          // 允许测试接口
                          .requestMatchers("/api/v1/test/**").permitAll()
                          // 文件上传和下载相关接口 - 普通用户和管理员都可访问
                          .requestMatchers("/api/v1/upload/**", "/api/v1/parse", "/api/v1/documents/download", "/api/v1/documents/preview").hasAnyRole("USER", "ADMIN")
                          // 对话历史相关接口 - 用户只能查看自己的历史，管理员可以查看所有
                          .requestMatchers("/api/v1/users/conversation/**").hasAnyRole("USER", "ADMIN")
                          // 搜索接口 - 普通用户和管理员都可访问
                          .requestMatchers("/api/search/**").hasAnyRole("USER", "ADMIN")
                          // 聊天相关接口 - WebSocket停止Token获取 (允许匿名访问)
                          .requestMatchers("/api/chat/websocket-token").permitAll()
                          // 管理员专属接口 - 知识库管理、系统状态、用户活动监控
                          .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                          // 用户组织标签管理接口
                          .requestMatchers("/api/v1/users/primary-org").hasAnyRole("USER", "ADMIN")
                          // 其他请求需要认证
                          .anyRequest().authenticated())
                  // 配置会话管理策略
                  // 设置会话创建策略为STATELESS，表示不会创建会话，通常用于无状态的API应用
                  .sessionManagement(session -> session
                          .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                  // 添加JWT认证过滤器
                  .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                  // 添加组织标签授权过滤器
                  .addFilterAfter(orgTagAuthorizationFilter, JwtAuthenticationFilter.class);

          // 记录安全配置加载成功的信息
          logger.info("Security configuration loaded successfully.");
          // 返回配置好的安全过滤链
          return http.build();
      } catch (Exception e) {
          // 记录配置安全过滤链失败的错误信息
          logger.error("Failed to configure security filter chain", e);
          // 抛出异常，以便外部处理
          throw e;
      }
  }
}
```

##### JWT 认证过滤器 —— `JwtAuthenticationFilter`

继承了 OncePerRequestFilter，确保每个请求只被处理一次，负责在每个 HTTP 请求中验证 JWT 令牌并设置 Spring Security 认证上下文

通过截取请求的 Token 来实现校验和自动刷新

```java
/**
 * 自定义的过滤器，用于解析请求头中的 JWT Token，并验证用户身份。
 * 如果 Token 有效，则将用户信息和权限设置到 Spring Security 的上下文中，后续的请求可以基于用户角色进行授权。
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils; // 用于生成和解析 JWT Token

    @Autowired
    private CustomUserDetailsService userDetailsService; // 加载用户详细信息

    /**
     * 每次请求都会调用此方法，用于解析 JWT Token 并设置用户认证信息。
     * 实现无感知的token自动刷新机制。
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 从请求头中提取 JWT Token
            String token = extractToken(request);
            if (token != null) {
                String newToken = null;
                String username = null;
                
                // 首先检查token是否有效
                if (jwtUtils.validateToken(token)) {
                    // Token有效，检查是否需要预刷新
                    if (jwtUtils.shouldRefreshToken(token)) {
                        newToken = jwtUtils.refreshToken(token);
                        if (newToken != null) {
                            logger.info("Token auto-refreshed proactively");
                        }
                    }
                    username = jwtUtils.extractUsernameFromToken(token);
                } else {
                    // Token无效/过期，检查是否在宽限期内可以刷新
                    if (jwtUtils.canRefreshExpiredToken(token)) {
                        newToken = jwtUtils.refreshToken(token);
                        if (newToken != null) {
                            logger.info("Expired token refreshed within grace period");
                            username = jwtUtils.extractUsernameFromToken(newToken);
                        }
                    }
                }
                
                // 如果有新token，通过响应头返回给前端
                if (newToken != null) {
                    response.setHeader("New-Token", newToken);
                }
                
                // 设置用户认证信息
                if (username != null && !username.isEmpty()) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
            filterChain.doFilter(request, response); // 继续执行过滤链
        } catch (Exception e) {
            // 记录错误日志
            logger.error("Cannot set user authentication: {}", e);
        }
    }

    /**
     * 从请求头中提取 JWT Token。
     */
    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // 去掉 "Bearer " 前缀
        }
        return null;
    }
}
```

此外，针对这个请求，当已经成功校验了用户时，会把这个用户的信息注入到 `SecurityContextHolder.getContext()` 上下文里，这样到其他执行的地方需要校验时就可以分析

```java
// 创建认证对象并设置到 Security 上下文中
UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
        userDetails, null, userDetails.getAuthorities());
authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
SecurityContextHolder.getContext().setAuthentication(authentication);
```

并在 `SecurityConfig` 配置过滤器顺序，放在默认的 `UsernamePasswordAuthenticationFilter`前，这样当请求走到后面默认的 `UsernamePasswordAuthenticationFilter`（表单登录过滤器）时：

会先检查："当前线程是不是已经认证过了"，发现已经有用户的信息了，就会直接跳过自己的认证逻辑，直接把请求传给下一个过滤器

```java
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
```

##### 自定义用户详情服务

```java
/**
 * 实现 Spring Security 的 UserDetailsService 接口，用于加载用户的详细信息（包括用户名、密码和权限）。
 * 通过用户名从数据库中查找用户，并将其转换为 Spring Security 所需的 UserDetails 格式
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

  @Autowired
  private UserRepository userRepository; // 用于访问用户数据

  /**
   * 根据用户名加载用户详细信息。
   */
  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
      // 从数据库中查找用户
      User user = userRepository.findByUsername(username)
              .orElseThrow(() -> new UsernameNotFoundException("User not found"));

      // 返回 Spring Security 所需的 UserDetails 对象
      return new org.springframework.security.core.userdetails.User(
              user.getUsername(),
              user.getPassword(),
              getAuthorities(user.getRole()) // 获取用户的角色权限
      );
  }

  /**
   * 将用户的角色转换为 Spring Security 的权限格式。
   */
  private Collection<? extends GrantedAuthority> getAuthorities(User.Role role) {
      return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
  }
}
```

### 组织管理

首先，系统引入了基于角色的权限控制。并内置了两种角色：普通用户（USER）和管理员（ADMIN）

通过在 SecurityConfig 中配置接口访问规则，不同角色的用户可以访问不同的 API

在此基础上，还设计了基于组织标签的访问权限控制，以实现更细粒度的数据隔离

每个用户可以关联一个或多个组织标签，而用户在上传文档时同样会绑定对应的组织标签

即，用户可以有多个组织标签，文件也有多个组织标签，在文件获取上，只有与用户具有相同组织标签的文件才可以被用户获取

当用户发起请求时，会通过 OrgTagAuthorizationFilter 检查用户的组织标签是否与资源的组织标签是否匹配

此外，对于有多个标签的用户

系统采用以下策略处理权限冲突：

- 用户只需要拥有资源所需的任何一个组织标签，即可获得访问权限。
- 对于公开资源，所有用户都可以访问。
- 对于私有资源，只有资源所有者和管理员可以访问。
- 对于管理员来说，拥有最高权限，可以绕过组织标签的限制。

#### 组织标签过滤器 — `OrgTagAuthorizationFilter`

在 `SecurityConfig` 中是放在 `JwtAuthenticationFilter` 之前，目的就是先校验下请求的目标是否涉及到了资源的访问，如果有需要进行匹配，否则就直接放行

主要流程：

首先过滤器会根据当前请求路径判断

如果是路径包含了 `/upload/chunk || /upload/merge || /documents/uploads || /search/hybrid || (/documents/[a-fA-F0-9]{32} 且 "DELETE".equals(request.getMethod()))` (最后一个是表示匹配由 32 位 MD5 码的文件路径，然后是删除文档操作)

那么就需要进行组织记录，操作是解析请求的token先判断是否登录，登录了就将对应的用户和组织名塞入请求头 (因为过滤器是在处理逻辑 Controller 之前的)

```java
// 将用户ID和角色设置为请求属性，供控制器方法使用
String token = extractToken(request);
if (token != null) {
    String userId = jwtUtils.extractUserIdFromToken(token);
    String role = jwtUtils.extractRoleFromToken(token);
    if (userId != null) {
        request.setAttribute("userId", userId);
        request.setAttribute("role", role);
        logger.debug("为{}请求设置userId属性: {}, role: {}", operation, userId, role);
    } else {
        logger.warn("{}请求中无法从token提取userId", operation);
    }
} else {
    logger.warn("{}请求中未找到有效token", operation);
}
```

如果并不是上面的请求路径，那么再判断是否是文件分片上传的路径 `/upload/chunk` 来进行处理

首先会尝试获取请求路径中是否包含了文件的MD5

```java
String resourceId = extractResourceIdFromPath(request);
```

`extractResourceIdFromPath` 为内部私有方法，目的就是根据请求路径来尝试匹配是否包含了文件的MD5或者文档ID

随后基于此判断，为 null 直接放行

否则，进一步基于 资源id 来获取它所对应的标签

```java
ResourceInfo resourceInfo = getResourceInfo(resourceId);
```

`getResourceInfo`是根据所传的文件MD5去 文件主表 (file_upload) 来查找是否存在

如果是分片上传并且资源未找到(首次上传) 或者 没有资源，就直接放行

反之找到了，那么就可以得到资源所对应的组织标签

进而进一步判断，如果资源是公开的，那也直接放行

```java
// 如果是公开资源、资源没有组织标签、或属于默认组织，直接放行
if (resourceInfo.isPublic() || 
  resourceOrgTag == null || 
  resourceOrgTag.isEmpty() || 
  DEFAULT_ORG_TAG.equals(resourceOrgTag)) {
  logger.debug("资源是公开的或无组织标签或属于默认组织，放行请求");
  filterChain.doFilter(request, response);
  return;
}
```

否则就要与用户标签进行判断，先判断是否是私人标签，再分析组织标签

随后会给 JWT 过滤器

##### 整体代码

```java
@Component
public class OrgTagAuthorizationFilter extends OncePerRequestFilter {

  private static final Logger logger = LoggerFactory.getLogger(OrgTagAuthorizationFilter.class);
  private static final String DEFAULT_ORG_TAG = "DEFAULT"; // 默认组织标签
  private static final String PRIVATE_TAG_PREFIX = "PRIVATE_"; // 私人组织标签前缀

  @Autowired
  private JwtUtils jwtUtils;
  
  @Autowired
  private FileUploadRepository fileUploadRepository;

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
          throws ServletException, IOException {
      try {
          String path = request.getRequestURI();
          
          // 需要用户ID但不需要资源权限检查的API路径
          // 这些API只需要用户身份验证，不需要对特定资源进行权限检查
          // 控制器方法通过@RequestAttribute("userId")获取用户ID
          if (path.matches(".*/upload/chunk.*") || 
              path.matches(".*/upload/merge.*") || 
              path.matches(".*/documents/uploads.*") ||
              path.matches(".*/search/hybrid.*") ||
              (path.matches(".*/documents/[a-fA-F0-9]{32}.*") && "DELETE".equals(request.getMethod()))) {
              
              String operation = "未知操作";
              if (path.contains("/chunk")) {
                  operation = "分片上传";
              } else if (path.contains("/merge")) {
                  operation = "合并分片";
              } else if (path.contains("/uploads")) {
                  operation = "获取用户文档";
              } else if (path.contains("/search/hybrid")) {
                  operation = "混合检索";
              } else if ("DELETE".equals(request.getMethod()) && path.matches(".*/documents/[a-fA-F0-9]{32}.*")) {
                  operation = "删除文档";
              }
              
              logger.info("处理{}请求: {}", operation, path);
              
              // 将用户ID和角色设置为请求属性，供控制器方法使用
              String token = extractToken(request);
              if (token != null) {
                  String userId = jwtUtils.extractUserIdFromToken(token);
                  String role = jwtUtils.extractRoleFromToken(token);
                  if (userId != null) {
                      request.setAttribute("userId", userId);
                      request.setAttribute("role", role);
                      logger.debug("为{}请求设置userId属性: {}, role: {}", operation, userId, role);
                  } else {
                      logger.warn("{}请求中无法从token提取userId", operation);
                  }
              } else {
                  logger.warn("{}请求中未找到有效token", operation);
              }
              
              filterChain.doFilter(request, response);
              return;
          }
          
          boolean isChunkUpload = path.matches(".*/upload/chunk.*");
          logger.debug("请求路径: {}, 是否为分片上传: {}", path, isChunkUpload);
          
          // 获取路径中的资源ID
          String resourceId = extractResourceIdFromPath(request);
          
          // 如果URL不含资源ID，直接放行
          if (resourceId == null) {
              logger.debug("未找到资源ID，直接放行");
              filterChain.doFilter(request, response);
              return;
          }
          
          // 获取资源的组织标签
          ResourceInfo resourceInfo = getResourceInfo(resourceId);
          
          // 如果是分片上传并且资源未找到(首次上传)，允许请求通过
          if (isChunkUpload && resourceInfo == null) {
              logger.debug("分片上传 - 首次上传文件(无记录)，放行请求: {}", resourceId);
              filterChain.doFilter(request, response);
              return;
          }
          
          // 如果资源未找到，返回404
          if (resourceInfo == null) {
              logger.debug("资源未找到，返回404: {}", resourceId);
              response.setStatus(HttpServletResponse.SC_NOT_FOUND);
              return;
          }
          
          String resourceOrgTag = resourceInfo.getOrgTag();
          
          // 如果是公开资源、资源没有组织标签、或属于默认组织，直接放行
          if (resourceInfo.isPublic() || 
              resourceOrgTag == null || 
              resourceOrgTag.isEmpty() || 
              DEFAULT_ORG_TAG.equals(resourceOrgTag)) {
              logger.debug("资源是公开的或无组织标签或属于默认组织，放行请求");
              filterChain.doFilter(request, response);
              return;
          }
          
          // 从请求头获取token
          String token = extractToken(request);
          if (token == null) {
              logger.debug("未找到Token，返回401");
              response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
              return;
          }
          
          // 获取用户名和角色
          String username = jwtUtils.extractUsernameFromToken(token);
          String role = jwtUtils.extractRoleFromToken(token);
          
          // 如果是资源拥有者，直接放行
          if (username != null && username.equals(resourceInfo.getOwner())) {
              logger.debug("用户是资源拥有者，放行请求");
              filterChain.doFilter(request, response);
              return;
          }
          
          // 如果是管理员，直接放行
          if ("ADMIN".equals(role)) {
              logger.debug("用户是管理员，放行请求");
              filterChain.doFilter(request, response);
              return;
          }
          
          // 检查是否为私人组织标签资源
          if (resourceOrgTag.startsWith(PRIVATE_TAG_PREFIX)) {
              // 私人标签资源只允许拥有者访问，此处已排除拥有者和管理员，拒绝访问
              logger.debug("私人资源，且用户不是拥有者或管理员，拒绝访问");
              response.setStatus(HttpServletResponse.SC_FORBIDDEN);
              return;
          }
          
          // 获取用户的组织标签
          String userOrgTags = jwtUtils.extractOrgTagsFromToken(token);
          if (userOrgTags == null || userOrgTags.isEmpty()) {
              logger.debug("用户没有组织标签，拒绝访问");
              response.setStatus(HttpServletResponse.SC_FORBIDDEN);
              return;
          }
          
          // 检查用户是否有权限访问该资源
          if (isUserAuthorized(userOrgTags, resourceOrgTag)) {
              logger.debug("用户有访问权限，放行请求");
              filterChain.doFilter(request, response);
          } else {
              logger.debug("用户组织标签不匹配资源组织，拒绝访问");
              response.setStatus(HttpServletResponse.SC_FORBIDDEN);
          }
      } catch (Exception e) {
          logger.error("组织标签授权过滤器发生错误: {}", e.getMessage(), e);
          response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      }
  }
  ...
  // 功能函数实现
}
```

#### 主要目标

- 管理员创建组织标签，设置标签名称和描述

- 可选择设置父级组织标签（支持简单层级）

- 管理员为用户分配组织标签

- 系统自动保留用户的私人组织标签，确保其不被移除

- 用户查看自己的组织标签

#### 创建组织标签 (管理员)

##### 接口设计

- URL: /api/v1/admin/org-tags
- Method: POST
- Headers:
  - Authorization: Bearer JWT_TOKEN_STRING
- Request Body:
  
  ```json
  {
    "tagId": "string",     // 标签ID，唯一
    "name": "string",      // 标签名称
    "description": "string", // 标签描述
    "parentTag": "string"  // 父标签ID（可选）
  }
  ```

- Response:
  
  ```json
  {
    "code": 200, // 成功
    "message": "Organization tag created successfully"
  }
  ```

##### `AdminController`

```java
/**
 * 创建组织标签
 */
@PostMapping("/org-tags")
public ResponseEntity<?> createOrganizationTag(
        @RequestHeader("Authorization") String token,
        @RequestBody OrgTagRequest request) {

  String adminUsername = jwtUtils.extractUsernameFromToken(token.replace("Bearer ", ""));
  validateAdmin(adminUsername);
  
  try {
      OrganizationTag tag = userService.createOrganizationTag(
          request.tagId(), 
          request.name(), 
          request.description(), 
          request.parentTag(), 
          adminUsername
      );
      return ResponseEntity.ok(Map.of("code", 200, "message", "组织标签创建成功", "data", tag));
  } catch (CustomException e) {
      LogUtils.logBusinessError("ADMIN_CREATE_ORG_TAG", adminUsername, "创建组织标签失败: %s", e, e.getMessage());
      return ResponseEntity.status(e.getStatus()).body(Map.of("code", e.getStatus().value(), "message", e.getMessage()));
  } catch (Exception e) {
      LogUtils.logBusinessError("ADMIN_CREATE_ORG_TAG", adminUsername, "创建组织标签异常: %s", e, e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .body(Map.of("code", 500, "message", "创建组织标签失败: " + e.getMessage()));
  }
}
```

##### `UserService`

```java
/**
 * 创建组织标签
 * 
 * @param tagId 标签唯一标识
 * @param name 标签名称
 * @param description 标签描述
 * @param parentTag 父标签ID（可选）
 * @param creatorUsername 创建者用户名（必须是管理员）
 */
@Transactional
public OrganizationTag createOrganizationTag(String tagId, String name, String description, 
                                            String parentTag, String creatorUsername) {
    // 验证创建者是否为管理员
    User creator = userRepository.findByUsername(creatorUsername)
            .orElseThrow(() -> new CustomException("Creator not found", HttpStatus.NOT_FOUND));
    
    if (creator.getRole() != User.Role.ADMIN) {
        throw new CustomException("Only administrators can create organization tags", HttpStatus.FORBIDDEN);
    }
    
    // 检查标签ID是否已存在
    if (organizationTagRepository.existsByTagId(tagId)) {
        throw new CustomException("Tag ID already exists", HttpStatus.BAD_REQUEST);
    }
    
    // 如果指定了父标签，检查父标签是否存在
    if (parentTag != null && !parentTag.isEmpty()) {
        organizationTagRepository.findByTagId(parentTag)
                .orElseThrow(() -> new CustomException("Parent tag not found", HttpStatus.NOT_FOUND));
    }
    
    OrganizationTag tag = new OrganizationTag();
    tag.setTagId(tagId);
    tag.setName(name);
    tag.setDescription(description);
    tag.setParentTag(parentTag);
    tag.setCreatedBy(creator);
    
    OrganizationTag savedTag = organizationTagRepository.save(tag);
    
    // 清除标签缓存，因为层级关系可能变化
    orgTagCacheService.invalidateAllEffectiveTagsCache();
    
    return savedTag;
}
```

#### 为用户分配组织标签

##### 接口设计

- URL: /api/v1/admin/users/{userId}/org-tags
- Method: PUT
- Headers:
  - Authorization: Bearer JWT_TOKEN_STRING
- Request Body:

  ```json
  {
    "orgTags": ["tag1", "tag2"]
  }
  ```

- Response:
  
  ```json
  {
    "code": 200, //   成功：
    "message": "Organization tags assigned successfully"
  }
  ```

##### `AdminController`

```java
/**
 * 为用户分配组织标签
 */
@PutMapping("/users/{userId}/org-tags")
public ResponseEntity<?> assignOrgTagsToUser(
      @RequestHeader("Authorization") String token,
      @PathVariable Long userId,
      @RequestBody AssignOrgTagsRequest request) {
  
  String adminUsername = jwtUtils.extractUsernameFromToken(token.replace("Bearer ", ""));
  validateAdmin(adminUsername);
  
  try {
      userService.assignOrgTagsToUser(userId, request.orgTags(), adminUsername);
      return ResponseEntity.ok(Map.of("code", 200, "message", "组织标签分配成功"));
  } catch (CustomException e) {
      LogUtils.logBusinessError("ADMIN_ASSIGN_ORG_TAGS", adminUsername, "分配组织标签失败: %s", e, e.getMessage());
      return ResponseEntity.status(e.getStatus()).body(Map.of("code", e.getStatus().value(), "message", e.getMessage()));
  } catch (Exception e) {
      LogUtils.logBusinessError("ADMIN_ASSIGN_ORG_TAGS", adminUsername, "分配组织标签异常: %s", e, e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .body(Map.of("code", 500, "message", "分配组织标签失败: " + e.getMessage()));
  }
}
```

##### `Service`

```java
/**
 * 为用户分配组织标签
 * 
 * @param userId 用户ID
 * @param orgTags 组织标签ID列表
 * @param adminUsername 管理员用户名
 */
@Transactional
public void assignOrgTagsToUser(Long userId, List<String> orgTags, String adminUsername) {
    // 验证操作者是否为管理员
    User admin = userRepository.findByUsername(adminUsername)
            .orElseThrow(() -> new CustomException("Admin not found", HttpStatus.NOT_FOUND));
    
    if (admin.getRole() != User.Role.ADMIN) {
        throw new CustomException("Only administrators can assign organization tags", HttpStatus.FORBIDDEN);
    }
    
    // 查找用户
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("User not found", HttpStatus.NOT_FOUND));
    
    // 验证所有标签是否存在
    for (String tagId : orgTags) {
        if (!organizationTagRepository.existsByTagId(tagId)) {
            throw new CustomException("Organization tag " + tagId + " not found", HttpStatus.NOT_FOUND);
        }
    }
    
    // 获取用户的现有组织标签
    Set<String> existingTags = new HashSet<>();
    if (user.getOrgTags() != null && !user.getOrgTags().isEmpty()) {
        existingTags = Arrays.stream(user.getOrgTags().split(",")).collect(Collectors.toSet());
    }
    
    // 找出并保留用户的私人组织标签
    String privateTagId = PRIVATE_TAG_PREFIX + user.getUsername();
    boolean hasPrivateTag = existingTags.contains(privateTagId);
    
    // 确保用户的私人组织标签不会被删除
    Set<String> finalTags = new HashSet<>(orgTags);
    if (hasPrivateTag && !finalTags.contains(privateTagId)) {
        finalTags.add(privateTagId);
    }
    
    // 将标签列表转换为逗号分隔的字符串
    String orgTagsStr = String.join(",", finalTags);
    user.setOrgTags(orgTagsStr);
    
    // 如果用户没有主组织标签且有组织标签，则优先使用私人标签作为主组织
    if ((user.getPrimaryOrg() == null || user.getPrimaryOrg().isEmpty()) && !finalTags.isEmpty()) {
        if (hasPrivateTag) {
            user.setPrimaryOrg(privateTagId);
        } else {
            user.setPrimaryOrg(new ArrayList<>(finalTags).get(0));
        }
    }
    
    userRepository.save(user);
    
    // 更新缓存
    orgTagCacheService.deleteUserOrgTagsCache(user.getUsername());
    orgTagCacheService.cacheUserOrgTags(user.getUsername(), new ArrayList<>(finalTags));
    // 同时清除有效标签缓存
    orgTagCacheService.deleteUserEffectiveTagsCache(user.getUsername());
    
    if (user.getPrimaryOrg() != null && !user.getPrimaryOrg().isEmpty()) {
        orgTagCacheService.cacheUserPrimaryOrg(user.getUsername(), user.getPrimaryOrg());
    }
}
```

#### 设置用户组织

#### 获取用户组织标签详情
