---
title: 数据库2
date: 2024-03-23
category:
  - code
tag:
  - javaweb
  - mysql
# star: true
# sticky: true
order: -0.7497
---

## 数据库 2

## SQL 语句

结构化查询语言（Structured Query Language）简称SQL，这是一种特殊的语言，它专门用于数据库的操作。每一种数据库都支持SQL，但是他们之间会存在一些细微的差异，因此不同的数据库都存在自己的“方言”。

SQL语句**不区分大小写**（关键字推荐使用大写），它支持多行，并且需要使用`;`进行结尾！

SQL也支持注释，通过使用`--`或是`#`来编写注释内容，也可以使用`/*`来进行多行注释。

我们要学习的就是以下四种类型的SQL语言：

- 数据查询语言（Data Query Language, DQL）
  基本结构是由`SELECT`子句，`FROM`子句，`WHERE`子句组成的查询块。

- 数据操纵语言（Data Manipulation Language, DML）是SQL语言中，负责对数据库对象运行数据访问工作的指令集，
  以`INSERT`、`UPDATE`、`DELETE`三种指令为核心，分别代表插入、更新与删除，是开发以数据为中心的应用程序必定会使用到的指令。
  
- 数据库定义语言DDL(Data Definition Language)，是用于描述数据库中要存储的现实世界实体的语言。
  
- DCL（Data Control Language）是数据库控制语言。
  是用来设置或更改数据库用户或角色权限的语句
  包括（grant,deny,revoke等）语句。在默认状态下，只有sysadmin,dbcreator,db_owner或db_securityadmin等人员才有权力执行DCL。

我们平时所说的CRUD其实就是增删改查（Create/Retrieve/Update/Delete）

### 数据库定义语言（DDL）

#### SQL数据类型

以下的数据类型用于字符串存储：

- `char(n)`可以存储任意字符串，但是是**固定长度为n**，如果插入的长度小于定义长度时，则用空格填充。
- `varchar(n)`也可以存储任意数量字符串，**长度不固定**，但**不能超过n**，不会用空格填充。

以下数据类型用于存储数字：

- `smallint`用于存储小的整数，范围在 (-32768，32767)
- `int`用于存储一般的整数，范围在 (-2147483648，2147483647)
- `bigint`用于存储大型整数，范围在 (-9,223,372,036,854,775,808，9,223,372,036,854,775,807)
- `float`用于存储单精度小数
- `double`用于存储双精度的小数

以下数据类型用于存储时间：

- `date`存储日期
- `time`存储时间
- `year`存储年份
- `datetime`用于混合存储日期+时间

#### 列级约束条件

列级约束有六种：

- 主键 Primary key
  确保列中的每个值都是唯一的，并且不能为空。一个表只能有一个主键，主键列的值用来唯一标识每一行数据。在主键列中，不允许有重复的值和空值。

  `id INT PRIMARY KEY` 表示 `id` 列是主键，且不能为空且唯一。

- 外键 foreign key
  用于建立和维护两表之间的关系，确保列中的值必须存在于另一表的主键或唯一约束列中。它保证数据的参照完整性。即外键列中的数据值必须对应于另一表的主键或唯一列中的某个值。

  `FOREIGN KEY (department_id) REFERENCES departments(id)`，表示 `department_id` 列是外键，参照 `departments` 表的 `id` 列。

- 唯一 unique
  确保列中的每个值都是唯一的，但允许空值。与主键类似，唯一约束保证列中所有的非空数据都是唯一的。一个表可以有多个唯一约束，不同于主键，唯一约束允许有空值。

  `email VARCHAR(255) UNIQUE` 表示 `email` 列的值是唯一的。

- 检查 check （MySQL不支持）
  用于定义列的值必须满足某些条件。检查约束通常用于限制某些特定的数值范围或模式。

  `age INT CHECK (age >= 18)`，表示 `age` 列的值必须大于或等于 18。

- 默认 default 
  用于为列指定默认值。如果在插入数据时没有为该列提供值，则会使用默认值。默认值仅在插入数据时使用，如果插入时该列有明确值，则默认值不会生效。

  `status VARCHAR(10) DEFAULT 'active'`，表示 `status` 列在未指定值时默认值为 'active'。

- 非空/空值 not null/ null
  用于定义列是否可以为空。NOT NULL 约束要求该列的每一行必须有一个非空值，而 NULL 允许列中的某些行没有值。

  `name VARCHAR(100) NOT NULL` 表示 `name` 列不能为 `NULL`，每一行必须有值。

#### 表级约束条件

表级约束有四种：主键、外键、唯一、检查

- 主键
  主键约束保证表中的每一行数据都有唯一的标识符，且该列的值不能为空。一个表只能有一个主键。

  `CONSTRAINT pk_primary_key PRIMARY KEY (id)`

- 外键
  外键约束用于**在两个表之间建立参照完整性关系**，确保某列的值必须存在于另一表的主键或唯一约束列中。

```sql
CREATE TABLE Departments (
    DepartmentID INT,
    DepartmentName VARCHAR(50) NOT NULL,
    Location VARCHAR(50),
    ManagerID INT,
    Budget DECIMAL(10, 2),

    CONSTRAINT PK_Departments PRIMARY KEY (DepartmentID),
    CONSTRAINT UC_DepartmentName UNIQUE (DepartmentName),
    CONSTRAINT CK_BudgetPositive CHECK (Budget >= 0),
    CONSTRAINT FK_Manager FOREIGN KEY (ManagerID) REFERENCES Employees(EmployeeID),
    CONSTRAINT DF_Location DEFAULT 'Headquarters' FOR Location
);

```

#### 数据库操作
  
我们可以通过`create database`来创建一个数据库：

```sql
CREATE DATABASE 数据库名
```

为了能够支持中文，我们在创建时可以设定编码格式：

```sql
CREATE DATABASE IF NOT EXISTS 数据库名 DEFAULT CHARSET utf8 COLLATE utf8_general_ci;
```

如果我们创建错误了，我们可以将此数据库删除，通过使用`drop database`来删除一个数据库：

```sql
DROP DATABASE 数据库名
```

#### 创建表 `CREATE`

在创建表之前，一定要先切换到我们要创建表的数据库内 `use xxxx;`，默认并不是你创建的数据库。

数据库创建完成后，我们一般通过`create table`语句来创建一张表：

```sql
create table 表名(列名 数据类型[列级约束条件],
             列名 数据类型[列级约束条件],
             ...
             [,表级约束条件])
```

#### 修改表 `ALTER`

如果我们想修改表结构，我们可以通过`alter table`来进行修改：

```sql
ALTER TABLE 表名 [ADD 新列名 数据类型[列级约束条件]]
                [DROP COLUMN 列名[restrict|cascade]]
                [ALTER COLUMN 列名 新数据类型]
```

我们可以通过`ADD`来添加一个新的列，通过`DROP`来删除一个列，不过我们可以添加`restrict`或`cascade`，默认是`restrict`，表示如果此列作为其他表的约束或视图引用到此列时，将无法删除，而`cascade`会强制连带引用此列的约束、视图一起删除。还可以通过`ALTER`来修改此列的属性。

#### 删除表 `DROP`

我们可以通过`drop table`来删除一个表：

```sql
DROP TABLE 表名[restrict|cascade]
```

其中restrict和cascade上面的效果一致。

### 数据库操纵语言 (DML)

#### 插入数据 `INSERT INTO`

通过使用`insert into`语句来向数据库中插入一条数据（一条记录）：

```sql
INSERT INTO 表名 VALUES(值1, 值2, 值3)
```

如果插入的数据与列一一对应，那么可以省略列名，但是如果希望向指定列上插入数据，就需要给出列名：

```sql
INSERT INTO 表名(列名1, 列名2) VALUES(值1, 值2)
```

我们也可以一次性向数据库中插入多条数据：

```sql
INSERT INTO 表名(列名1, 列名2) VALUES(值1, 值2), (值1, 值2), (值1, 值2)
```

我们来试试看向我们刚刚创建的表中添加三条数据。

#### 修改数据 `UPDATE`

我们可以通过`update`语句来更新表中的数据：

```sql
UPDATE 表名 SET 列名=值,... WHERE 条件
```

注意，SQL语句中的等于判断是`=`

**警告：** 如果忘记添加`WHERE`字句来限定条件，**将使得整个表中此列的所有数据都被修改**！

#### 删除数据

我们可以通过使用`delete`来删除表中的数据：

```sql
DELETE FROM 表名
```

通过这种方式，**将删除表中全部数据**，我们也可以使用`where`来添加条件，只删除指定的数据：

```sql
DELETE FROM 表名 WHERE 条件
```
