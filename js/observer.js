// 将需要observe的数据对象进行递归遍历,包括子对象的属性都加上setter和getter
// 给这个对象的属性赋值就可以触发setter,监听到数据变化
function Observer(data) {
  this.data = data;
  this.walk(data);
}

Observer.prototype = {
  walk: function(data) {
    var me = this;
    Object.keys(data).forEach(function(key) {
      me.convert(key, data[key]);
    });
  },
  convert: function(key, val) {
    this.defineReactive(this.data, key, val);
  },

  // 
  defineReactive: function(data, key, val) {
    var dep = new Dep();
    var childObj = observe(val); //监听子属性

    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再define
      get: function() {
        if (Dep.target) {
          dep.depend(); //设置依赖
        }
        return val;
      },
      set: function(newVal) {
        if (newVal === val) {
          return;
        }
        val = newVal;
        // 新的值是object的话，进行监听
        childObj = observe(newVal);
        // 通知订阅者
        dep.notify();
      }
    });
  }
};

function observe(value, vm) {
  if (!value || typeof value !== 'object') {
    return;
  }
  return new Observer(value);
};


var uid = 0;

function Dep() {
  //每个Vue实例都会有一个递增的id
  this.id = uid++;
  this.subs = [];
}

// 依赖
// Dep是一个Watcher所对应的数据依赖,在这个对象中也存有一个subs数组,用来保存和这个依赖有关的Watcher
// 其成员函数主要是depend和notify 前者用来设置某个Watcher的依赖 后者用来通知和这个依赖相关的Watcher
// 来运行其回调函数
Dep.prototype = {
  addSub: function(sub) {
    this.subs.push(sub);
  },

  depend: function() {
    Dep.target.addDep(this);
  },

  removeSub: function(sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  notify: function() {
    this.subs.forEach(function(sub) {
      sub.update();
    });
  }
};
//一个全局唯一的, 因为同一时间只能有一个watcher 依赖的对象的值 被计算
Dep.target = null;