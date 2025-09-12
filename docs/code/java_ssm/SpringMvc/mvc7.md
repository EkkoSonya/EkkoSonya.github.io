---
title: Javassm - SpringMVC7 (杂)
date: 2025-09-06
category:
  - code
tag:
  - javassm
  - Spring
# star: true
# sticky: true
order: -0.6
---

## MVC

![alt text](img/16.png)

### HandleMapping

可以看到有：

![alt text](img/17.png)

应该这是 Spring MVC 自带的三个 `HandleMapping`

![alt text](img/19.png)

```java
private void initHandlerMappings(ApplicationContext context) {
        this.handlerMappings = null;
        if (this.detectAllHandlerMappings) {
            Map<String, HandlerMapping> matchingBeans = BeanFactoryUtils.beansOfTypeIncludingAncestors(context, HandlerMapping.class, true, false);
            if (!matchingBeans.isEmpty()) {
                this.handlerMappings = new ArrayList(matchingBeans.values());
                AnnotationAwareOrderComparator.sort(this.handlerMappings);
            }
        }
        ...
}
```

这里主要会遍历，利用 `BeanFactoryUtils.beansOfTypeIncludingAncestors()` 去找对应的 `Bean`

![alt text](img/18.png)