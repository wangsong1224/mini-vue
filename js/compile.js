// 解析模板指令,将模板中的变量替换成数据,然后初始化渲染页面的视图,并将每个指令对应的节点绑定
// 更新函数,添加监听数据的订阅者,一旦数据有变动,收到通知,更新视图
// https://sfault-image.b0.upaiyun.com/111/738/1117380429-57b3110440af0
function Compile(el, vm) {
  this.$vm = vm;
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);

  if (this.$el) {
    // 遍历解析过程中多次操作dom节点,为了提高性能,先将根节点el转换成fragment进行解析和编译操作
    // 解析完成,再将fragment添加回原来的真是dom节点中
    // DocumentFragment:每次js操作dom都会改变当前页面的呈现,并重绘整个页面,消耗了大量时间,可以创建一个
    // 文档碎片,把所有的新节点附加其上,然后把文档碎片的内容一次性添加到document中
    this.$fragment = this.node2Fragment(this.$el);
    this.init();
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function(el) {
    // 可以用createDocumentFragment()
    // DocumentFragment节点不属于文档书,集成的parentNode属性总是null
    // 有个特殊的属性,当请求把一个DocumentFragment节点插入文档书时,插入的不是节点自身,而是他的所有
    // 子孙节点,这使得DocumentFragment成了占位符,暂时存放那些一次插入文档的节点,还有利于实现文档的
    // 剪切 复制 粘贴
    var fragment = document.createDocumentFragment(),
      child;

    // 将原生节点拷贝到fragment
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }

    return fragment;
  },

  init: function() {
    this.compileElement(this.$fragment);
  },
  // 遍历所有节点及其子节点,进行扫描解析编译,调用对应的指令渲染函数进行数据渲染
  // 并调用对应的指令更新函数进行绑定
  compileElement: function(el) {
    var childNodes = el.childNodes,
      me = this;

    [].slice.call(childNodes).forEach(function(node) {
      var text = node.textContent;
      var reg = /\{\{(.*)\}\}/; // 表达式文本
      // 按元素节点方式编译 
      // 1元素节点 2属性节点 3文本节点... https://www.cnblogs.com/xiaohuochai/p/5785189.html
      if (me.isElementNode(node)) {
        me.compile(node);
      } else if (me.isTextNode(node) && reg.test(text)) {
        me.compileText(node, RegExp.$1);
      }
      // 遍历编译子节点
      if (node.childNodes && node.childNodes.length) {
        me.compileElement(node);
      }
    });
  },

  compile: function(node) {
    var nodeAttrs = node.attributes,
      me = this;
    [].slice.call(nodeAttrs).forEach(function(attr) {
      // 规定:指令以v-xxx命名
      var attrName = attr.name;
      if (me.isDirective(attrName)) {
        var exp = attr.value;
        var dir = attrName.substring(2);
        // 事件指令 如v-on:click
        if (me.isEventDirective(dir)) {
          compileUtil.eventHandler(node, me.$vm, exp, dir);
        } else {
          // 普通指令
          compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
        }
        node.removeAttribute(attrName);
      }
    });
  },

  compileText: function(node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },

  isDirective: function(attr) {
    return attr.indexOf('v-') == 0;
  },

  isEventDirective: function(dir) {
    return dir.indexOf('on') === 0;
  },

  isElementNode: function(node) {
    return node.nodeType == 1;
  },

  isTextNode: function(node) {
    return node.nodeType == 3;
  }
};

// 指令处理集合
var compileUtil = {
  text: function(node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },

  html: function(node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },

  model: function(node, vm, exp) {
    this.bind(node, vm, exp, 'model');

    var me = this,
      val = this._getVMVal(vm, exp);
    node.addEventListener('input', function(e) {
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }
      me._setVMVal(vm, exp, newValue);
      val = newValue;
    });
  },

  class: function(node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },

  bind: function(node, vm, exp, dir) {
    var updaterFn = updater[dir + 'Updater'];
    // 第一次初始化视图
    updaterFn && updaterFn(node, this._getVMVal(vm, exp));
    // 实例化订阅者,此操作会在对应的属性消息订阅器中添加该订阅者Watcher
    new Watcher(vm, exp, function(value, oldValue) {
      // 一旦属性值有变化,会收到通知执行此更新函数,更新视图
      updaterFn && updaterFn(node, value, oldValue);
    });
  },

  // 事件处理
  eventHandler: function(node, vm, exp, dir) {
    var eventType = dir.split(':')[1],
      fn = vm.$options.methods && vm.$options.methods[exp];

    if (eventType && fn) {
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },

  _getVMVal: function(vm, exp) {
    var val = vm;
    exp = exp.split('.');
    exp.forEach(function(k) {
      val = val[k];
    });
    return val;
  },

  _setVMVal: function(vm, exp, value) {
    var val = vm;
    exp = exp.split('.');
    exp.forEach(function(k, i) {
      // 非最后一个key，更新val的值
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }
};

// 更新函数
var updater = {
  textUpdater: function(node, value) {
    node.textContent = typeof value == 'undefined' ? '' : value;
  },

  htmlUpdater: function(node, value) {
    node.innerHTML = typeof value == 'undefined' ? '' : value;
  },

  classUpdater: function(node, value, oldValue) {
    var className = node.className;
    className = className.replace(oldValue, '').replace(/\s$/, '');

    var space = className && String(value) ? ' ' : '';

    node.className = className + space + value;
  },

  modelUpdater: function(node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};
// 通过递归遍历保证了每个节点及其子节点都会解析编译到,包括了{{}}表达式生命的文本节点
// 指令的声明规定要有特定的前缀v- 而other-attr不是指令只是普通的属性
// 监听数据 绑定更新函数的处理是在compileUtil.bind()中,通过new Watcher()
// 添加回调来接手数据变化的通知