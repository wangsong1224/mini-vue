function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function (key) {
        me._proxyData(key);
    });

    this._initComputed();

    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function (key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxyData: function (key, setter, getter) {
        var me = this;
        setter = setter ||
            Object.defineProperty(me, key, {
                configurable: false,
                enumerable: true,
                get: function proxyGetter() {
                    return me._data[key];
                },
                set: function proxySetter(newVal) {
                    me._data[key] = newVal;
                }
            });
    },

    _initComputed: function () {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function (key) {
                // 访问器属性 会优先访问,与其同名的普通属性会被忽略
                Object.defineProperty(me, key, {
                    // 读取值
                    get: typeof computed[key] === 'function' ?
                        computed[key] : computed[key].get,
                    // 设置值
                    set: function () {}
                });
            });
        }
    }
};