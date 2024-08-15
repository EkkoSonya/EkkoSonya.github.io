"use strict";(self.webpackChunklearn_data=self.webpackChunklearn_data||[]).push([[235],{3671:(n,s)=>{s.A=(n,s)=>{const a=n.__vccOpts||n;for(const[n,e]of s)a[n]=e;return a}},3413:(n,s,a)=>{a.r(s),a.d(s,{comp:()=>o,data:()=>c});var e=a(7847);const t=[(0,e.Fv)('<h2 id="类与对象" tabindex="-1"><a class="header-anchor" href="#类与对象"><span>类与对象</span></a></h2><p><strong>类</strong>: 是对一类事物的描述，是抽象的、概念上的定义.<br><strong>对象</strong>: 是某一类事物实际存在的每个个体，因而也被称为实例（instance）， 是类的一个具体化个体.</p><p>类的创建:<br> 类名的首字母通常是大写的.</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">Person</span> <span class="token punctuation">{</span><span class="token comment">//这里定义的人类具有三个属性，名字、年龄、性别</span>\n    <span class="token class-name">String</span> name<span class="token punctuation">;</span>   <span class="token comment">//直接在类中定义变量，表示类具有的属性</span>\n    <span class="token keyword">int</span> age<span class="token punctuation">;</span>\n    <span class="token class-name">String</span> sex<span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>对象实例的创建 <code>new Person()</code> :</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token class-name">String</span><span class="token punctuation">[</span><span class="token punctuation">]</span> args<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token class-name">Person</span> p <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>对于对象而言，其变量名存储的是对象的引用（类似于c++指针的情况），并非是所对应的对象本身，即</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token class-name">String</span><span class="token punctuation">[</span><span class="token punctuation">]</span> args<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token comment">//这里的a存放的是具体的某个值</span>\n  <span class="token keyword">int</span> a <span class="token operator">=</span> <span class="token number">10</span><span class="token punctuation">;</span>\n  <span class="token comment">//创建一个变量指代我们刚刚创建好的对象，变量的类型就是对应的类名</span>\n  <span class="token comment">//这里的p1存放的是对象的引用，而不是本体，我们可以通过对象的引用来间接操作对象</span>\n  <span class="token class-name">Person</span> p1 <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n  <span class="token class-name">Person</span> p2 <span class="token operator">=</span> p1<span class="token punctuation">;</span>\n  <span class="token comment">// 我们将变量p2赋值为p1的值，那么实际上只是传递了对象的引用，而不是对象本身的复制</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在创建了对象之后，就可以进行一定操作，如: 访问、修改对象的属性.<br> 不同对象的属性是分开独立存放的，每个对象都有一个自己的空间，修改一个对象的属性并不会影响到其他对象.<br> 关于对象类型的变量，我们也可以不对任何对象进行引用：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token class-name">String</span><span class="token punctuation">[</span><span class="token punctuation">]</span> args<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token class-name">Person</span> p <span class="token operator">=</span> <span class="token keyword">null</span><span class="token punctuation">;</span>   <span class="token comment">//此时变量没有引用任何对象</span>\n  p<span class="token punctuation">.</span>name <span class="token operator">=</span> <span class="token string">&quot;小红&quot;</span><span class="token punctuation">;</span>   <span class="token comment">//我任性，就是要操作</span>\n  <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span>p<span class="token punctuation">.</span>name<span class="token punctuation">)</span><span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>会出现异常，即空指针异常.<br> 对象创建成功之后，它的属性没有进行赋值，但是我们前面说了，变量使用之前需要先赋值，那么创建对象之后能否直接访问呢？<br> 果直接创建对象，那么对象的属性都会存在初始值，如果是基本类型，那么默认是统一为0（如果是boolean的话，默认值为false）如果是引用类型，那么默认是null。</p><h2 id="方法的创建与使用" tabindex="-1"><a class="header-anchor" href="#方法的创建与使用"><span>方法的创建与使用</span></a></h2><p>类除了具有属性外，还可以定义一些方法来描述同一类的行为。<br> 方法是语句的集合，是为了完成某件事情而存在的。<br> 方法名称同样可以随便起，但是规则跟变量的命名差不多，也是尽量使用小写字母开头的单词，如果是多个单词，一般使用驼峰命名法最规范。</p><p><strong>方法的定义如下</strong>:</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code>返回值类型 方法名称<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    方法体<span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>具体而言:</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">Person</span> <span class="token punctuation">{</span>\n    <span class="token class-name">String</span> name<span class="token punctuation">;</span>\n    <span class="token keyword">int</span> age<span class="token punctuation">;</span>\n    <span class="token class-name">String</span> sex<span class="token punctuation">;</span>\n\n    <span class="token comment">//自我介绍只需要完成就行，没有返回值，所以说使用void</span>\n    <span class="token keyword">void</span> <span class="token function">hello</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">{</span>\n        <span class="token comment">//完成自我介绍需要执行的所有代码就在这个花括号中编写</span>\n        <span class="token comment">//这里编写代码跟我们之前在main中是一样的（实际上main就是一个函数）</span>\n        <span class="token comment">//自我介绍需要用到当前对象的名字和年龄，我们直接使用成员变量即可，变量的值就是当前对象的存放值</span>\n        <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span><span class="token string">&quot;我叫 &quot;</span><span class="token operator">+</span>name<span class="token operator">+</span><span class="token string">&quot; 今年 &quot;</span><span class="token operator">+</span>age<span class="token operator">+</span><span class="token string">&quot; 岁了！&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方法的调用</strong>:</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token class-name">String</span><span class="token punctuation">[</span><span class="token punctuation">]</span> args<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token class-name">Person</span> p <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n    p<span class="token punctuation">.</span>name <span class="token operator">=</span> <span class="token string">&quot;小明&quot;</span><span class="token punctuation">;</span>\n    p<span class="token punctuation">.</span>age <span class="token operator">=</span> <span class="token number">18</span><span class="token punctuation">;</span>\n    p<span class="token punctuation">.</span><span class="token function">hello</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n    <span class="token comment">//我们只需要使用 . 运算符，就可以执行定义好的方法了，只需要 .方法名称() 即可</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="方法的进阶使用" tabindex="-1"><a class="header-anchor" href="#方法的进阶使用"><span>方法的进阶使用</span></a></h3><h4 id="this-的使用" tabindex="-1"><a class="header-anchor" href="#this-的使用"><span>this 的使用</span></a></h4><p>有时候我们的方法中可能会出现一些与成员变量重名的变量：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">void</span> <span class="token function">setName</span><span class="token punctuation">(</span><span class="token class-name">String</span> name<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    name <span class="token operator">=</span> name<span class="token punctuation">;</span>\n    <span class="token comment">//出现重名时，优先使用作用域最接近的</span>\n    <span class="token comment">//这里实际上是将方法参数的局部变量name赋值为本身</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们如果想要在方法中访问到当前对象的属性，那么可以使用<strong>this关键字</strong>，来明确表示当前类的示例对象本身：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">void</span> <span class="token function">setName</span><span class="token punctuation">(</span><span class="token class-name">String</span> name<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token keyword">this</span><span class="token punctuation">.</span>name <span class="token operator">=</span> name<span class="token punctuation">;</span>   <span class="token comment">//让当前对象的name变量值等于参数传入的值</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>当然，如果方法内没有变量出现重名的情况，那么默认情况下可以不使用this关键字来明确表示当前对象：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token class-name">String</span> <span class="token function">getName</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token keyword">return</span> name<span class="token punctuation">;</span>    <span class="token comment">//这里没有使用this，但是当前作用域下只有对象属性的name变量，所以说直接就使用了</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="方法的重载" tabindex="-1"><a class="header-anchor" href="#方法的重载"><span>方法的重载</span></a></h4><p>有些时候，参数类型可能会多种多样，我们的方法需要能够同时应对多种情况。</p><p>一个类中可以包含<strong>多个同名的方法</strong>，但是需要的形式参数不一样，方法的返回类型，可以相同，也可以不同，<strong>但是仅返回类型不同，是不允许的！</strong></p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">int</span> <span class="token function">sum</span><span class="token punctuation">(</span><span class="token keyword">int</span> a<span class="token punctuation">,</span> <span class="token keyword">int</span> b<span class="token punctuation">)</span><span class="token punctuation">{</span>\n    <span class="token keyword">return</span> a <span class="token operator">+</span> b<span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n\n<span class="token keyword">double</span> <span class="token function">sum</span><span class="token punctuation">(</span><span class="token keyword">double</span> a<span class="token punctuation">,</span> <span class="token keyword">double</span> b<span class="token punctuation">)</span><span class="token punctuation">{</span>\n    <span class="token comment">//为了支持小数加法，我们可以进行一次重载</span>\n    <span class="token keyword">return</span> a <span class="token operator">+</span> b<span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="构造方法" tabindex="-1"><a class="header-anchor" href="#构造方法"><span>构造方法</span></a></h3><p>我们前面创建对象，都是直接使用new关键字就能直接搞定了，但是我们发现，对象在创建之后，各种属性都是默认值，那么能否实现在对象创建时就为其指定名字、年龄、性别呢？<br> 要在对象创建时进行处理，我们可以使用**构造方法（构造器）**来完成。</p><p>构造方法不需要填写返回值，并且方法名称与类名相同，默认情况下每个类都会自带一个没有任何参数的无参构造方法（只是不用我们去写，编译出来就自带）当然，我们也可以手动声明，对其进行修改：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">Person</span> <span class="token punctuation">{</span>\n    <span class="token class-name">String</span> name<span class="token punctuation">;</span>\n    <span class="token keyword">int</span> age<span class="token punctuation">;</span>\n    <span class="token class-name">String</span> sex<span class="token punctuation">;</span>\n\n    <span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">{</span>\n      <span class="token comment">//构造方法不需要指定返回值，并且方法名称与类名相同</span>\n      name <span class="token operator">=</span> <span class="token string">&quot;小明&quot;</span><span class="token punctuation">;</span>\n      <span class="token comment">//构造方法会在对象创建时执行，我们可以将各种需要初始化的操作都在这里进行处理</span>\n      age <span class="token operator">=</span> <span class="token number">18</span><span class="token punctuation">;</span>\n      sex <span class="token operator">=</span> <span class="token string">&quot;男&quot;</span><span class="token punctuation">;</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>构造方法会在new的时候自动执行, 当然，我们也可以为构造方法设定参数：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">Person</span> <span class="token punctuation">{</span>\n    <span class="token class-name">String</span> name<span class="token punctuation">;</span>\n    <span class="token keyword">int</span> age<span class="token punctuation">;</span>\n    <span class="token class-name">String</span> sex<span class="token punctuation">;</span>\n\n    <span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token class-name">String</span> name<span class="token punctuation">,</span> <span class="token keyword">int</span> age<span class="token punctuation">,</span> <span class="token class-name">String</span> sex<span class="token punctuation">)</span><span class="token punctuation">{</span>   <span class="token comment">//跟普通方法是一样的</span>\n        <span class="token keyword">this</span><span class="token punctuation">.</span>name <span class="token operator">=</span> name<span class="token punctuation">;</span>\n        <span class="token keyword">this</span><span class="token punctuation">.</span>age <span class="token operator">=</span> age<span class="token punctuation">;</span>\n        <span class="token keyword">this</span><span class="token punctuation">.</span>sex <span class="token operator">=</span> sex<span class="token punctuation">;</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意，在我们自己定义一个构造方法之后，会<strong>覆盖掉默认的那一个无参构造方法</strong>，除非我们<strong>手动重载一个无参构造</strong>，否则要创建这个类的对象，必<strong>须调用我们自己定义的构造方法</strong>.</p><p>当然，要给成员变量设定初始值，我们不仅可以通过构造方法，也可以直接在定义时赋值：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">Person</span> <span class="token punctuation">{</span>\n    <span class="token class-name">String</span> name <span class="token operator">=</span> <span class="token string">&quot;未知&quot;</span><span class="token punctuation">;</span>   <span class="token comment">//直接赋值，那么对象构造好之后，属性默认就是这个值</span>\n    <span class="token keyword">int</span> age <span class="token operator">=</span> <span class="token number">10</span><span class="token punctuation">;</span>\n    <span class="token class-name">String</span> sex <span class="token operator">=</span> <span class="token string">&quot;男&quot;</span><span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这里需要特别注意，成员变量的初始化，并不是在构造方法之后，而是在这之前就已经完成了.</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token class-name">String</span> name<span class="token punctuation">,</span> <span class="token keyword">int</span> age<span class="token punctuation">,</span> <span class="token class-name">String</span> sex<span class="token punctuation">)</span><span class="token punctuation">{</span>\n    <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>age<span class="token punctuation">)</span><span class="token punctuation">;</span>\n    <span class="token comment">// 在赋值之前看看是否有初始值</span>\n    <span class="token comment">// 这里是 this.age 而非 age</span>\n    <span class="token comment">// 此时this.age已经初始化完，但还未复制，this.age = 0</span>\n    <span class="token keyword">this</span><span class="token punctuation">.</span>name <span class="token operator">=</span> name<span class="token punctuation">;</span>\n    <span class="token keyword">this</span><span class="token punctuation">.</span>age <span class="token operator">=</span> age<span class="token punctuation">;</span>\n    <span class="token keyword">this</span><span class="token punctuation">.</span>sex <span class="token operator">=</span> sex<span class="token punctuation">;</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们也可以在类中添加代码块，代码块同样会在对象构造之前进行，在成员变量初始化之后执行：</p><div class="language-java line-numbers-mode" data-ext="java" data-title="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">Person</span> <span class="token punctuation">{</span>\n    <span class="token class-name">String</span> name<span class="token punctuation">;</span>\n    <span class="token keyword">int</span> age<span class="token punctuation">;</span>\n    <span class="token class-name">String</span> sex<span class="token punctuation">;</span>\n\n    <span class="token punctuation">{</span>\n        <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span><span class="token string">&quot;我是代码块&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>   <span class="token comment">//代码块中的内容会在对象创建时仅执行一次</span>\n    <span class="token punctuation">}</span>\n\n    <span class="token class-name">Person</span><span class="token punctuation">(</span><span class="token class-name">String</span> name<span class="token punctuation">,</span> <span class="token keyword">int</span> age<span class="token punctuation">,</span> <span class="token class-name">String</span> sex<span class="token punctuation">)</span><span class="token punctuation">{</span>\n        <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span><span class="token string">&quot;我被构造了&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n        <span class="token keyword">this</span><span class="token punctuation">.</span>name <span class="token operator">=</span> name<span class="token punctuation">;</span>\n        <span class="token keyword">this</span><span class="token punctuation">.</span>age <span class="token operator">=</span> age<span class="token punctuation">;</span>\n        <span class="token keyword">this</span><span class="token punctuation">.</span>sex <span class="token operator">=</span> sex<span class="token punctuation">;</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>',44)],p={},o=(0,a(3671).A)(p,[["render",function(n,s){return(0,e.uX)(),(0,e.CE)("div",null,t)}]]),c=JSON.parse('{"path":"/code/java/java%201.html","title":"Java - 类与对象1","lang":"zh-CN","frontmatter":{"title":"Java - 类与对象1","date":"2024-08-15T00:00:00.000Z","category":["code"],"tag":["java"],"order":-0.5,"description":"类与对象 类: 是对一类事物的描述，是抽象的、概念上的定义. 对象: 是某一类事物实际存在的每个个体，因而也被称为实例（instance）， 是类的一个具体化个体. 类的创建: 类名的首字母通常是大写的. 对象实例的创建 new Person() : 对于对象而言，其变量名存储的是对象的引用（类似于c++指针的情况），并非是所对应的对象本身，即 在创建...","head":[["meta",{"property":"og:url","content":"http://ekkosonya.cn/code/java/java%201.html"}],["meta",{"property":"og:site_name","content":"EkkoSonya\'s Blog"}],["meta",{"property":"og:title","content":"Java - 类与对象1"}],["meta",{"property":"og:description","content":"类与对象 类: 是对一类事物的描述，是抽象的、概念上的定义. 对象: 是某一类事物实际存在的每个个体，因而也被称为实例（instance）， 是类的一个具体化个体. 类的创建: 类名的首字母通常是大写的. 对象实例的创建 new Person() : 对于对象而言，其变量名存储的是对象的引用（类似于c++指针的情况），并非是所对应的对象本身，即 在创建..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2024-08-15T15:58:29.000Z"}],["meta",{"property":"article:author","content":"EkkoSonya"}],["meta",{"property":"article:tag","content":"java"}],["meta",{"property":"article:published_time","content":"2024-08-15T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2024-08-15T15:58:29.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"Java - 类与对象1\\",\\"image\\":[\\"\\"],\\"datePublished\\":\\"2024-08-15T00:00:00.000Z\\",\\"dateModified\\":\\"2024-08-15T15:58:29.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"EkkoSonya\\",\\"url\\":\\"http://ekkosonya.cn\\"}]}"]]},"headers":[{"level":2,"title":"类与对象","slug":"类与对象","link":"#类与对象","children":[]},{"level":2,"title":"方法的创建与使用","slug":"方法的创建与使用","link":"#方法的创建与使用","children":[{"level":3,"title":"方法的进阶使用","slug":"方法的进阶使用","link":"#方法的进阶使用","children":[]},{"level":3,"title":"构造方法","slug":"构造方法","link":"#构造方法","children":[]}]}],"git":{"createdTime":1723737509000,"updatedTime":1723737509000,"contributors":[{"name":"EkkoSonya","email":"ekkosonya@163.com","commits":1}]},"readingTime":{"minutes":6.59,"words":1978},"filePathRelative":"code/java/java 1.md","localizedDate":"2024年8月15日","excerpt":"<h2>类与对象</h2>\\n<p><strong>类</strong>: 是对一类事物的描述，是抽象的、概念上的定义.<br>\\n<strong>对象</strong>: 是某一类事物实际存在的每个个体，因而也被称为实例（instance）， 是类的一个具体化个体.</p>\\n<p>类的创建:<br>\\n类名的首字母通常是大写的.</p>\\n<div class=\\"language-java\\" data-ext=\\"java\\" data-title=\\"java\\"><pre class=\\"language-java\\"><code><span class=\\"token keyword\\">public</span> <span class=\\"token keyword\\">class</span> <span class=\\"token class-name\\">Person</span> <span class=\\"token punctuation\\">{</span><span class=\\"token comment\\">//这里定义的人类具有三个属性，名字、年龄、性别</span>\\n    <span class=\\"token class-name\\">String</span> name<span class=\\"token punctuation\\">;</span>   <span class=\\"token comment\\">//直接在类中定义变量，表示类具有的属性</span>\\n    <span class=\\"token keyword\\">int</span> age<span class=\\"token punctuation\\">;</span>\\n    <span class=\\"token class-name\\">String</span> sex<span class=\\"token punctuation\\">;</span>\\n<span class=\\"token punctuation\\">}</span>\\n</code></pre></div>","autoDesc":true}')}}]);