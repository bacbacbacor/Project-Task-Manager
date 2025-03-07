
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier} [start]
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let started = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (started) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            started = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
                // We need to set this to false because callbacks can still happen despite having unsubscribed:
                // Callbacks might already be placed in the queue which doesn't know it should no longer
                // invoke this derived store.
                started = false;
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1, Object: Object_1, console: console_1$5 } = globals;

    // (246:0) {:else}
    function create_else_block$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(246:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (239:0) {#if componentParams}
    function create_if_block$5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(239:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$5, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, _loc => _loc.location);
    const querystring = derived(loc, _loc => _loc.querystring);
    const params = writable(undefined);

    async function push$1(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    function restoreScroll(state) {
    	// If this exists, then this is a back navigation: restore the scroll position
    	if (state) {
    		window.scrollTo(state.__svelte_spa_router_scrollX, state.__svelte_spa_router_scrollY);
    	} else {
    		// Otherwise this is a forward navigation: scroll to top
    		window.scrollTo(0, 0);
    	}
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && (event.state.__svelte_spa_router_scrollY || event.state.__svelte_spa_router_scrollX)) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			restoreScroll(previousScrollState);
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push: push$1,
    		pop,
    		replace,
    		link,
    		restoreScroll,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Login.svelte generated by Svelte v3.59.2 */

    const { console: console_1$4 } = globals;
    const file$5 = "src\\Login.svelte";

    // (67:4) {#if errorMessage}
    function create_if_block$4(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*errorMessage*/ ctx[2]);
    			attr_dev(p, "class", "error-message svelte-17k23l8");
    			add_location(p, file$5, 67, 8, 2295);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errorMessage*/ 4) set_data_dev(t, /*errorMessage*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(67:4) {#if errorMessage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let button;
    	let t5;
    	let mounted;
    	let dispose;
    	let if_block = /*errorMessage*/ ctx[2] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Login";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Login";
    			t5 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "svelte-17k23l8");
    			add_location(h2, file$5, 62, 4, 2054);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Username");
    			attr_dev(input0, "class", "svelte-17k23l8");
    			add_location(input0, file$5, 63, 4, 2074);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Password");
    			attr_dev(input1, "class", "svelte-17k23l8");
    			add_location(input1, file$5, 64, 4, 2146);
    			attr_dev(button, "class", "svelte-17k23l8");
    			add_location(button, file$5, 65, 4, 2222);
    			attr_dev(div, "class", "login-container svelte-17k23l8");
    			add_location(div, file$5, 61, 0, 2019);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(div, t2);
    			append_dev(div, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(div, t3);
    			append_dev(div, button);
    			append_dev(div, t5);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(button, "click", /*login*/ ctx[3], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*errorMessage*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let username = "";
    	let password = "";
    	let errorMessage = "";

    	// Login function (converted from your login.js)
    	async function login() {
    		$$invalidate(2, errorMessage = "");

    		try {
    			const response = await fetch("http://localhost:3000/auth/login", {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify({ username, password })
    			});

    			const data = await response.json();

    			if (response.status !== 200) {
    				$$invalidate(2, errorMessage = data.message);
    				return;
    			}

    			// Ensure user id is received
    			if (!data.id) {
    				$$invalidate(2, errorMessage = "Login failed: Missing user ID.");
    				return;
    			}

    			// Save user details into localStorage
    			localStorage.setItem("loggedInUser", JSON.stringify({
    				id: data.id,
    				username: data.username,
    				role: data.role,
    				firstName: data.firstName,
    				lastName: data.lastName,
    				office: data.office || "Unknown",
    				firstTimeLogin: data.firstTimeLogin
    			}));

    			// Redirect based on firstTimeLogin and role
    			if (data.firstTimeLogin) {
    				window.location.href = "/change-password";
    				return;
    			}

    			if (data.role === "Admin") {
    				push("/admin");
    			} else if (data.role === "Manager") {
    				push("/manager");
    			} else if (data.role === "Employee") {
    				push("/employee");
    			}
    		} catch(error) {
    			console.error("Login error:", error);
    			$$invalidate(2, errorMessage = "Error connecting to server.");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({ username, password, errorMessage, login });

    	$$self.$inject_state = $$props => {
    		if ('username' in $$props) $$invalidate(0, username = $$props.username);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('errorMessage' in $$props) $$invalidate(2, errorMessage = $$props.errorMessage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		username,
    		password,
    		errorMessage,
    		login,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Admin.svelte generated by Svelte v3.59.2 */

    const { console: console_1$3 } = globals;
    const file$4 = "src\\Admin.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[77] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[77] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[77] = list[i];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[84] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[84] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[89] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[77] = list[i];
    	return child_ctx;
    }

    // (462:12) {#each users as user}
    function create_each_block_6(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*user*/ ctx[77].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*user*/ ctx[77].firstName + "";
    	let t2;
    	let t3;
    	let t4_value = /*user*/ ctx[77].lastName + "";
    	let t4;
    	let t5;
    	let td2;
    	let t6_value = /*user*/ ctx[77].role + "";
    	let t6;
    	let t7;
    	let td3;
    	let t8_value = (/*user*/ ctx[77].office || "N/A") + "";
    	let t8;
    	let t9;
    	let td4;
    	let button0;
    	let t11;
    	let button1;
    	let t13;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[32](/*user*/ ctx[77]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[33](/*user*/ ctx[77]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			td2 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td3 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td4 = element("td");
    			button0 = element("button");
    			button0.textContent = "✏️ Edit";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "🗑 Delete";
    			t13 = space();
    			attr_dev(td0, "class", "svelte-16i0fd4");
    			add_location(td0, file$4, 463, 16, 12682);
    			attr_dev(td1, "class", "svelte-16i0fd4");
    			add_location(td1, file$4, 464, 16, 12718);
    			attr_dev(td2, "class", "svelte-16i0fd4");
    			add_location(td2, file$4, 465, 16, 12777);
    			attr_dev(td3, "class", "svelte-16i0fd4");
    			add_location(td3, file$4, 466, 16, 12815);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 468, 18, 12888);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 469, 18, 12967);
    			attr_dev(td4, "class", "svelte-16i0fd4");
    			add_location(td4, file$4, 467, 16, 12864);
    			add_location(tr, file$4, 462, 14, 12660);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(td1, t3);
    			append_dev(td1, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td2);
    			append_dev(td2, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td3);
    			append_dev(td3, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td4);
    			append_dev(td4, button0);
    			append_dev(td4, t11);
    			append_dev(td4, button1);
    			append_dev(tr, t13);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_1, false, false, false, false),
    					listen_dev(button1, "click", click_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*users*/ 16 && t0_value !== (t0_value = /*user*/ ctx[77].id + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*users*/ 16 && t2_value !== (t2_value = /*user*/ ctx[77].firstName + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*users*/ 16 && t4_value !== (t4_value = /*user*/ ctx[77].lastName + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*users*/ 16 && t6_value !== (t6_value = /*user*/ ctx[77].role + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*users*/ 16 && t8_value !== (t8_value = (/*user*/ ctx[77].office || "N/A") + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(462:12) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    // (495:10) {#each tasks as task}
    function create_each_block_5(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*task*/ ctx[89].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*task*/ ctx[89].title + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*task*/ ctx[89].description + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = new Date(/*task*/ ctx[89].startDate).toLocaleDateString() + "";
    	let t6;
    	let t7;
    	let td4;
    	let t8_value = new Date(/*task*/ ctx[89].endDate).toLocaleDateString() + "";
    	let t8;
    	let t9;
    	let td5;
    	let t10_value = /*task*/ ctx[89].status + "";
    	let t10;
    	let t11;
    	let td6;
    	let t12_value = (/*task*/ ctx[89].assignedTo || "Unassigned") + "";
    	let t12;
    	let t13;
    	let td7;
    	let t14_value = /*task*/ ctx[89].createdBy + "";
    	let t14;
    	let t15;
    	let td8;
    	let button0;
    	let t17;
    	let button1;
    	let t19;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[34](/*task*/ ctx[89]);
    	}

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[35](/*task*/ ctx[89]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td5 = element("td");
    			t10 = text(t10_value);
    			t11 = space();
    			td6 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			td7 = element("td");
    			t14 = text(t14_value);
    			t15 = space();
    			td8 = element("td");
    			button0 = element("button");
    			button0.textContent = "✏️ Edit";
    			t17 = space();
    			button1 = element("button");
    			button1.textContent = "🗑 Delete";
    			t19 = space();
    			attr_dev(td0, "class", "svelte-16i0fd4");
    			add_location(td0, file$4, 496, 14, 13660);
    			attr_dev(td1, "class", "svelte-16i0fd4");
    			add_location(td1, file$4, 497, 14, 13694);
    			attr_dev(td2, "class", "svelte-16i0fd4");
    			add_location(td2, file$4, 498, 14, 13731);
    			attr_dev(td3, "class", "svelte-16i0fd4");
    			add_location(td3, file$4, 499, 14, 13774);
    			attr_dev(td4, "class", "svelte-16i0fd4");
    			add_location(td4, file$4, 500, 14, 13846);
    			attr_dev(td5, "class", "svelte-16i0fd4");
    			add_location(td5, file$4, 501, 14, 13916);
    			attr_dev(td6, "class", "svelte-16i0fd4");
    			add_location(td6, file$4, 502, 14, 13954);
    			attr_dev(td7, "class", "svelte-16i0fd4");
    			add_location(td7, file$4, 503, 14, 14012);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 505, 16, 14075);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 506, 16, 14152);
    			attr_dev(td8, "class", "svelte-16i0fd4");
    			add_location(td8, file$4, 504, 14, 14053);
    			add_location(tr, file$4, 495, 12, 13640);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td5);
    			append_dev(td5, t10);
    			append_dev(tr, t11);
    			append_dev(tr, td6);
    			append_dev(td6, t12);
    			append_dev(tr, t13);
    			append_dev(tr, td7);
    			append_dev(td7, t14);
    			append_dev(tr, t15);
    			append_dev(tr, td8);
    			append_dev(td8, button0);
    			append_dev(td8, t17);
    			append_dev(td8, button1);
    			append_dev(tr, t19);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_3, false, false, false, false),
    					listen_dev(button1, "click", click_handler_4, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*tasks*/ 32 && t0_value !== (t0_value = /*task*/ ctx[89].id + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*tasks*/ 32 && t2_value !== (t2_value = /*task*/ ctx[89].title + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*tasks*/ 32 && t4_value !== (t4_value = /*task*/ ctx[89].description + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*tasks*/ 32 && t6_value !== (t6_value = new Date(/*task*/ ctx[89].startDate).toLocaleDateString() + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*tasks*/ 32 && t8_value !== (t8_value = new Date(/*task*/ ctx[89].endDate).toLocaleDateString() + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*tasks*/ 32 && t10_value !== (t10_value = /*task*/ ctx[89].status + "")) set_data_dev(t10, t10_value);
    			if (dirty[0] & /*tasks*/ 32 && t12_value !== (t12_value = (/*task*/ ctx[89].assignedTo || "Unassigned") + "")) set_data_dev(t12, t12_value);
    			if (dirty[0] & /*tasks*/ 32 && t14_value !== (t14_value = /*task*/ ctx[89].createdBy + "")) set_data_dev(t14, t14_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(495:10) {#each tasks as task}",
    		ctx
    	});

    	return block;
    }

    // (526:4) {#if showUserModal}
    function create_if_block_8(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let label;
    	let t3;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t7;
    	let mounted;
    	let dispose;
    	let if_block = /*newUser*/ ctx[12].role && create_if_block_9(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Add New User";
    			t1 = space();
    			label = element("label");
    			label.textContent = "Select Role:";
    			t3 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Select Role";
    			option1 = element("option");
    			option1.textContent = "Manager";
    			option2 = element("option");
    			option2.textContent = "Employee";
    			t7 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "svelte-16i0fd4");
    			add_location(h2, file$4, 528, 10, 14721);
    			attr_dev(label, "for", "addUserRoleSelect");
    			add_location(label, file$4, 530, 10, 14758);
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			add_location(option0, file$4, 532, 12, 14892);
    			option1.__value = "Manager";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 533, 12, 14952);
    			option2.__value = "Employee";
    			option2.value = option2.__value;
    			add_location(option2, file$4, 534, 12, 15006);
    			attr_dev(select, "id", "addUserRoleSelect");
    			if (/*newUser*/ ctx[12].role === void 0) add_render_callback(() => /*select_change_handler*/ ctx[38].call(select));
    			add_location(select, file$4, 531, 10, 14821);
    			attr_dev(div0, "class", "modal-content svelte-16i0fd4");
    			add_location(div0, file$4, 527, 8, 14682);
    			attr_dev(div1, "class", "modal svelte-16i0fd4");
    			add_location(div1, file$4, 526, 6, 14653);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, label);
    			append_dev(div0, t3);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*newUser*/ ctx[12].role, true);
    			append_dev(div0, t7);
    			if (if_block) if_block.m(div0, null);

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[38]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newUser*/ 4096) {
    				select_option(select, /*newUser*/ ctx[12].role);
    			}

    			if (/*newUser*/ ctx[12].role) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_9(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(526:4) {#if showUserModal}",
    		ctx
    	});

    	return block;
    }

    // (538:10) {#if newUser.role}
    function create_if_block_9(ctx) {
    	let label0;
    	let t1;
    	let select;
    	let option;
    	let t3;
    	let label1;
    	let t5;
    	let input0;
    	let t6;
    	let label2;
    	let t8;
    	let input1;
    	let t9;
    	let label3;
    	let t11;
    	let input2;
    	let t12;
    	let label4;
    	let t14;
    	let input3;
    	let t15;
    	let label5;
    	let t17;
    	let input4;
    	let t18;
    	let button0;
    	let t20;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*offices*/ ctx[6];
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			label0.textContent = "Select Office:";
    			t1 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Select Office";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			label1 = element("label");
    			label1.textContent = "First Name:";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			label2 = element("label");
    			label2.textContent = "Last Name:";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			label3 = element("label");
    			label3.textContent = "Phone Number:";
    			t11 = space();
    			input2 = element("input");
    			t12 = space();
    			label4 = element("label");
    			label4.textContent = "Address:";
    			t14 = space();
    			input3 = element("input");
    			t15 = space();
    			label5 = element("label");
    			label5.textContent = "Birthday:";
    			t17 = space();
    			input4 = element("input");
    			t18 = space();
    			button0 = element("button");
    			button0.textContent = "Save User";
    			t20 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			attr_dev(label0, "for", "addUserOfficeSelect");
    			add_location(label0, file$4, 538, 12, 15117);
    			option.__value = "";
    			option.value = option.__value;
    			option.disabled = true;
    			add_location(option, file$4, 540, 14, 15263);
    			attr_dev(select, "id", "addUserOfficeSelect");
    			if (/*newUser*/ ctx[12].office === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[39].call(select));
    			add_location(select, file$4, 539, 12, 15186);
    			attr_dev(label1, "for", "addUserFirstName");
    			add_location(label1, file$4, 546, 12, 15496);
    			attr_dev(input0, "id", "addUserFirstName");
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$4, 547, 12, 15559);
    			attr_dev(label2, "for", "addUserLastName");
    			add_location(label2, file$4, 549, 12, 15651);
    			attr_dev(input1, "id", "addUserLastName");
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$4, 550, 12, 15712);
    			attr_dev(label3, "for", "addUserPhone");
    			add_location(label3, file$4, 552, 12, 15802);
    			attr_dev(input2, "id", "addUserPhone");
    			attr_dev(input2, "type", "text");
    			add_location(input2, file$4, 553, 12, 15863);
    			attr_dev(label4, "for", "addUserAddress");
    			add_location(label4, file$4, 555, 12, 15948);
    			attr_dev(input3, "id", "addUserAddress");
    			attr_dev(input3, "type", "text");
    			add_location(input3, file$4, 556, 12, 16006);
    			attr_dev(label5, "for", "addUserBirthday");
    			add_location(label5, file$4, 558, 12, 16094);
    			attr_dev(input4, "id", "addUserBirthday");
    			attr_dev(input4, "type", "date");
    			add_location(input4, file$4, 559, 12, 16154);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 561, 12, 16244);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 562, 12, 16303);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select, null);
    				}
    			}

    			select_option(select, /*newUser*/ ctx[12].office, true);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, label1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*newUser*/ ctx[12].firstName);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, label2, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, input1, anchor);
    			set_input_value(input1, /*newUser*/ ctx[12].lastName);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, label3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, input2, anchor);
    			set_input_value(input2, /*newUser*/ ctx[12].number);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, label4, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, input3, anchor);
    			set_input_value(input3, /*newUser*/ ctx[12].address);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, label5, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, input4, anchor);
    			set_input_value(input4, /*newUser*/ ctx[12].birthday);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler_1*/ ctx[39]),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[40]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[41]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[42]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[43]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[44]),
    					listen_dev(button0, "click", /*addUser*/ ctx[20], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_7*/ ctx[45], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*offices*/ 64) {
    				each_value_4 = /*offices*/ ctx[6];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}

    			if (dirty[0] & /*newUser*/ 4096) {
    				select_option(select, /*newUser*/ ctx[12].office);
    			}

    			if (dirty[0] & /*newUser*/ 4096 && input0.value !== /*newUser*/ ctx[12].firstName) {
    				set_input_value(input0, /*newUser*/ ctx[12].firstName);
    			}

    			if (dirty[0] & /*newUser*/ 4096 && input1.value !== /*newUser*/ ctx[12].lastName) {
    				set_input_value(input1, /*newUser*/ ctx[12].lastName);
    			}

    			if (dirty[0] & /*newUser*/ 4096 && input2.value !== /*newUser*/ ctx[12].number) {
    				set_input_value(input2, /*newUser*/ ctx[12].number);
    			}

    			if (dirty[0] & /*newUser*/ 4096 && input3.value !== /*newUser*/ ctx[12].address) {
    				set_input_value(input3, /*newUser*/ ctx[12].address);
    			}

    			if (dirty[0] & /*newUser*/ 4096) {
    				set_input_value(input4, /*newUser*/ ctx[12].birthday);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(label2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(label3);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(label4);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(label5);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(input4);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(538:10) {#if newUser.role}",
    		ctx
    	});

    	return block;
    }

    // (542:14) {#each offices as office}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*office*/ ctx[84].officeName + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*office*/ ctx[84].officeName;
    			option.value = option.__value;
    			add_location(option, file$4, 542, 16, 15370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*offices*/ 64 && t_value !== (t_value = /*office*/ ctx[84].officeName + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*offices*/ 64 && option_value_value !== (option_value_value = /*office*/ ctx[84].officeName)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(542:14) {#each offices as office}",
    		ctx
    	});

    	return block;
    }

    // (570:4) {#if showEditUserModal}
    function create_if_block_7(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let input0;
    	let t2;
    	let label0;
    	let t4;
    	let input1;
    	let t5;
    	let label1;
    	let t7;
    	let input2;
    	let t8;
    	let label2;
    	let t10;
    	let select0;
    	let option0;
    	let option1;
    	let t13;
    	let label3;
    	let t15;
    	let select1;
    	let t16;
    	let label4;
    	let t18;
    	let input3;
    	let t19;
    	let label5;
    	let t21;
    	let input4;
    	let t22;
    	let label6;
    	let t24;
    	let input5;
    	let t25;
    	let button0;
    	let t27;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*offices*/ ctx[6];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Edit User";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "First Name:";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Last Name:";
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Role:";
    			t10 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Manager";
    			option1 = element("option");
    			option1.textContent = "Employee";
    			t13 = space();
    			label3 = element("label");
    			label3.textContent = "Office:";
    			t15 = space();
    			select1 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t16 = space();
    			label4 = element("label");
    			label4.textContent = "Phone Number:";
    			t18 = space();
    			input3 = element("input");
    			t19 = space();
    			label5 = element("label");
    			label5.textContent = "Address:";
    			t21 = space();
    			input4 = element("input");
    			t22 = space();
    			label6 = element("label");
    			label6.textContent = "Birthday:";
    			t24 = space();
    			input5 = element("input");
    			t25 = space();
    			button0 = element("button");
    			button0.textContent = "Save Changes";
    			t27 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			attr_dev(h2, "class", "svelte-16i0fd4");
    			add_location(h2, file$4, 572, 10, 16564);
    			attr_dev(input0, "type", "hidden");
    			add_location(input0, file$4, 573, 10, 16594);
    			attr_dev(label0, "for", "editUserFirstName");
    			add_location(label0, file$4, 575, 10, 16662);
    			attr_dev(input1, "id", "editUserFirstName");
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$4, 576, 10, 16724);
    			attr_dev(label1, "for", "editUserLastName");
    			add_location(label1, file$4, 582, 10, 16870);
    			attr_dev(input2, "id", "editUserLastName");
    			attr_dev(input2, "type", "text");
    			add_location(input2, file$4, 583, 10, 16930);
    			attr_dev(label2, "for", "editUserRoleSelect");
    			add_location(label2, file$4, 589, 10, 17074);
    			option0.__value = "Manager";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 591, 12, 17208);
    			option1.__value = "Employee";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 592, 12, 17262);
    			attr_dev(select0, "id", "editUserRoleSelect");
    			if (/*editUserData*/ ctx[13].role === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[49].call(select0));
    			add_location(select0, file$4, 590, 10, 17131);
    			attr_dev(label3, "for", "editUserOfficeSelect");
    			add_location(label3, file$4, 595, 10, 17341);
    			attr_dev(select1, "id", "editUserOfficeSelect");
    			if (/*editUserData*/ ctx[13].office === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[50].call(select1));
    			add_location(select1, file$4, 596, 10, 17402);
    			attr_dev(label4, "for", "editUserPhone");
    			add_location(label4, file$4, 602, 10, 17644);
    			attr_dev(input3, "id", "editUserPhone");
    			attr_dev(input3, "type", "text");
    			add_location(input3, file$4, 603, 10, 17704);
    			attr_dev(label5, "for", "editUserAddress");
    			add_location(label5, file$4, 605, 10, 17793);
    			attr_dev(input4, "id", "editUserAddress");
    			attr_dev(input4, "type", "text");
    			add_location(input4, file$4, 606, 10, 17850);
    			attr_dev(label6, "for", "editUserBirthday");
    			add_location(label6, file$4, 608, 10, 17942);
    			attr_dev(input5, "id", "editUserBirthday");
    			attr_dev(input5, "type", "date");
    			add_location(input5, file$4, 609, 10, 18001);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 611, 10, 18095);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 612, 10, 18158);
    			attr_dev(div0, "class", "modal-content svelte-16i0fd4");
    			add_location(div0, file$4, 571, 8, 16525);
    			attr_dev(div1, "class", "modal svelte-16i0fd4");
    			add_location(div1, file$4, 570, 6, 16496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*editUserData*/ ctx[13].id);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(div0, t4);
    			append_dev(div0, input1);
    			set_input_value(input1, /*editUserData*/ ctx[13].firstName);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(div0, t7);
    			append_dev(div0, input2);
    			set_input_value(input2, /*editUserData*/ ctx[13].lastName);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(div0, t10);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			select_option(select0, /*editUserData*/ ctx[13].role, true);
    			append_dev(div0, t13);
    			append_dev(div0, label3);
    			append_dev(div0, t15);
    			append_dev(div0, select1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*editUserData*/ ctx[13].office, true);
    			append_dev(div0, t16);
    			append_dev(div0, label4);
    			append_dev(div0, t18);
    			append_dev(div0, input3);
    			set_input_value(input3, /*editUserData*/ ctx[13].number);
    			append_dev(div0, t19);
    			append_dev(div0, label5);
    			append_dev(div0, t21);
    			append_dev(div0, input4);
    			set_input_value(input4, /*editUserData*/ ctx[13].address);
    			append_dev(div0, t22);
    			append_dev(div0, label6);
    			append_dev(div0, t24);
    			append_dev(div0, input5);
    			set_input_value(input5, /*editUserData*/ ctx[13].birthday);
    			append_dev(div0, t25);
    			append_dev(div0, button0);
    			append_dev(div0, t27);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[46]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[47]),
    					listen_dev(input2, "input", /*input2_input_handler_1*/ ctx[48]),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[49]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[50]),
    					listen_dev(input3, "input", /*input3_input_handler_1*/ ctx[51]),
    					listen_dev(input4, "input", /*input4_input_handler_1*/ ctx[52]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[53]),
    					listen_dev(button0, "click", /*updateUser*/ ctx[23], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_8*/ ctx[54], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*editUserData*/ 8192) {
    				set_input_value(input0, /*editUserData*/ ctx[13].id);
    			}

    			if (dirty[0] & /*editUserData*/ 8192 && input1.value !== /*editUserData*/ ctx[13].firstName) {
    				set_input_value(input1, /*editUserData*/ ctx[13].firstName);
    			}

    			if (dirty[0] & /*editUserData*/ 8192 && input2.value !== /*editUserData*/ ctx[13].lastName) {
    				set_input_value(input2, /*editUserData*/ ctx[13].lastName);
    			}

    			if (dirty[0] & /*editUserData*/ 8192) {
    				select_option(select0, /*editUserData*/ ctx[13].role);
    			}

    			if (dirty[0] & /*offices*/ 64) {
    				each_value_3 = /*offices*/ ctx[6];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}

    			if (dirty[0] & /*editUserData*/ 8192) {
    				select_option(select1, /*editUserData*/ ctx[13].office);
    			}

    			if (dirty[0] & /*editUserData*/ 8192 && input3.value !== /*editUserData*/ ctx[13].number) {
    				set_input_value(input3, /*editUserData*/ ctx[13].number);
    			}

    			if (dirty[0] & /*editUserData*/ 8192 && input4.value !== /*editUserData*/ ctx[13].address) {
    				set_input_value(input4, /*editUserData*/ ctx[13].address);
    			}

    			if (dirty[0] & /*editUserData*/ 8192) {
    				set_input_value(input5, /*editUserData*/ ctx[13].birthday);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(570:4) {#if showEditUserModal}",
    		ctx
    	});

    	return block;
    }

    // (598:12) {#each offices as office}
    function create_each_block_3$1(ctx) {
    	let option;
    	let t_value = /*office*/ ctx[84].officeName + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*office*/ ctx[84].officeName;
    			option.value = option.__value;
    			add_location(option, file$4, 598, 14, 17524);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*offices*/ 64 && t_value !== (t_value = /*office*/ ctx[84].officeName + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*offices*/ 64 && option_value_value !== (option_value_value = /*office*/ ctx[84].officeName)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(598:12) {#each offices as office}",
    		ctx
    	});

    	return block;
    }

    // (619:4) {#if showAssignTaskModal}
    function create_if_block_5(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let t6;
    	let textarea;
    	let t7;
    	let label2;
    	let t9;
    	let input1;
    	let t10;
    	let label3;
    	let t12;
    	let input2;
    	let t13;
    	let label4;
    	let t15;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t19;
    	let label5;
    	let t21;
    	let select1;
    	let option3;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t23;
    	let button0;
    	let t25;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*users*/ ctx[4];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*user*/ ctx[77].id;
    	validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2$1(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Assign a Task";
    			t1 = space();
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t6 = space();
    			textarea = element("textarea");
    			t7 = space();
    			label2 = element("label");
    			label2.textContent = "Start Date:";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			label3 = element("label");
    			label3.textContent = "End Date:";
    			t12 = space();
    			input2 = element("input");
    			t13 = space();
    			label4 = element("label");
    			label4.textContent = "Status:";
    			t15 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Pending";
    			option1 = element("option");
    			option1.textContent = "In Progress";
    			option2 = element("option");
    			option2.textContent = "Completed";
    			t19 = space();
    			label5 = element("label");
    			label5.textContent = "Assign to:";
    			t21 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Select User";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t23 = space();
    			button0 = element("button");
    			button0.textContent = "Assign Task";
    			t25 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			attr_dev(h2, "class", "svelte-16i0fd4");
    			add_location(h2, file$4, 621, 10, 18410);
    			attr_dev(label0, "for", "assignTaskTitle");
    			add_location(label0, file$4, 623, 10, 18448);
    			attr_dev(input0, "id", "assignTaskTitle");
    			attr_dev(input0, "type", "text");
    			input0.required = true;
    			add_location(input0, file$4, 624, 10, 18503);
    			attr_dev(label1, "for", "assignTaskDescription");
    			add_location(label1, file$4, 631, 10, 18660);
    			attr_dev(textarea, "id", "assignTaskDescription");
    			textarea.required = true;
    			add_location(textarea, file$4, 632, 10, 18727);
    			attr_dev(label2, "for", "assignTaskStartDate");
    			add_location(label2, file$4, 638, 10, 18884);
    			attr_dev(input1, "id", "assignTaskStartDate");
    			attr_dev(input1, "type", "date");
    			input1.required = true;
    			add_location(input1, file$4, 639, 10, 18948);
    			attr_dev(label3, "for", "assignTaskEndDate");
    			add_location(label3, file$4, 646, 10, 19113);
    			attr_dev(input2, "id", "assignTaskEndDate");
    			attr_dev(input2, "type", "date");
    			input2.required = true;
    			add_location(input2, file$4, 647, 10, 19173);
    			attr_dev(label4, "for", "assignTaskStatus");
    			add_location(label4, file$4, 654, 10, 19334);
    			option0.__value = "Pending";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 656, 12, 19463);
    			option1.__value = "In Progress";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 657, 12, 19517);
    			option2.__value = "Completed";
    			option2.value = option2.__value;
    			add_location(option2, file$4, 658, 12, 19579);
    			attr_dev(select0, "id", "assignTaskStatus");
    			if (/*newTask*/ ctx[14].status === void 0) add_render_callback(() => /*select0_change_handler_1*/ ctx[59].call(select0));
    			add_location(select0, file$4, 655, 10, 19391);
    			attr_dev(label5, "for", "assignTaskAssignedTo");
    			add_location(label5, file$4, 661, 10, 19660);
    			option3.__value = "";
    			option3.value = option3.__value;
    			option3.disabled = true;
    			add_location(option3, file$4, 667, 12, 19864);
    			attr_dev(select1, "id", "assignTaskAssignedTo");
    			select1.required = true;
    			if (/*newTask*/ ctx[14].assignedTo === void 0) add_render_callback(() => /*select1_change_handler_1*/ ctx[60].call(select1));
    			add_location(select1, file$4, 662, 10, 19724);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 675, 10, 20158);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 676, 10, 20220);
    			attr_dev(div0, "class", "modal-content svelte-16i0fd4");
    			add_location(div0, file$4, 620, 8, 18371);
    			attr_dev(div1, "class", "modal svelte-16i0fd4");
    			add_location(div1, file$4, 619, 6, 18342);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*newTask*/ ctx[14].title);
    			append_dev(div0, t4);
    			append_dev(div0, label1);
    			append_dev(div0, t6);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*newTask*/ ctx[14].description);
    			append_dev(div0, t7);
    			append_dev(div0, label2);
    			append_dev(div0, t9);
    			append_dev(div0, input1);
    			set_input_value(input1, /*newTask*/ ctx[14].startDate);
    			append_dev(div0, t10);
    			append_dev(div0, label3);
    			append_dev(div0, t12);
    			append_dev(div0, input2);
    			set_input_value(input2, /*newTask*/ ctx[14].endDate);
    			append_dev(div0, t13);
    			append_dev(div0, label4);
    			append_dev(div0, t15);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*newTask*/ ctx[14].status, true);
    			append_dev(div0, t19);
    			append_dev(div0, label5);
    			append_dev(div0, t21);
    			append_dev(div0, select1);
    			append_dev(select1, option3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*newTask*/ ctx[14].assignedTo, true);
    			append_dev(div0, t23);
    			append_dev(div0, button0);
    			append_dev(div0, t25);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_2*/ ctx[55]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[56]),
    					listen_dev(input1, "input", /*input1_input_handler_2*/ ctx[57]),
    					listen_dev(input2, "input", /*input2_input_handler_2*/ ctx[58]),
    					listen_dev(select0, "change", /*select0_change_handler_1*/ ctx[59]),
    					listen_dev(select1, "change", /*select1_change_handler_1*/ ctx[60]),
    					listen_dev(button0, "click", /*assignTask*/ ctx[24], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_9*/ ctx[61], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newTask*/ 16384 && input0.value !== /*newTask*/ ctx[14].title) {
    				set_input_value(input0, /*newTask*/ ctx[14].title);
    			}

    			if (dirty[0] & /*newTask*/ 16384) {
    				set_input_value(textarea, /*newTask*/ ctx[14].description);
    			}

    			if (dirty[0] & /*newTask*/ 16384) {
    				set_input_value(input1, /*newTask*/ ctx[14].startDate);
    			}

    			if (dirty[0] & /*newTask*/ 16384) {
    				set_input_value(input2, /*newTask*/ ctx[14].endDate);
    			}

    			if (dirty[0] & /*newTask*/ 16384) {
    				select_option(select0, /*newTask*/ ctx[14].status);
    			}

    			if (dirty[0] & /*users*/ 16) {
    				each_value_2 = /*users*/ ctx[4];
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, select1, destroy_block, create_each_block_2$1, null, get_each_context_2$1);
    			}

    			if (dirty[0] & /*newTask*/ 16384) {
    				select_option(select1, /*newTask*/ ctx[14].assignedTo);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(619:4) {#if showAssignTaskModal}",
    		ctx
    	});

    	return block;
    }

    // (670:14) {#if user.role !== "Admin"}
    function create_if_block_6(ctx) {
    	let option;
    	let t0_value = /*user*/ ctx[77].firstName + "";
    	let t0;
    	let t1;
    	let t2_value = /*user*/ ctx[77].role + "";
    	let t2;
    	let t3;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			option.__value = option_value_value = /*user*/ ctx[77].id;
    			option.value = option.__value;
    			add_location(option, file$4, 670, 16, 20016);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 16 && t0_value !== (t0_value = /*user*/ ctx[77].firstName + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*users*/ 16 && t2_value !== (t2_value = /*user*/ ctx[77].role + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*users*/ 16 && option_value_value !== (option_value_value = /*user*/ ctx[77].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(670:14) {#if user.role !== \\\"Admin\\\"}",
    		ctx
    	});

    	return block;
    }

    // (669:12) {#each users as user (user.id)}
    function create_each_block_2$1(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*user*/ ctx[77].role !== "Admin" && create_if_block_6(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*user*/ ctx[77].role !== "Admin") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(669:12) {#each users as user (user.id)}",
    		ctx
    	});

    	return block;
    }

    // (683:4) {#if showEditTaskModal}
    function create_if_block_3$2(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let input0;
    	let t2;
    	let label0;
    	let t4;
    	let input1;
    	let t5;
    	let label1;
    	let t7;
    	let textarea;
    	let t8;
    	let label2;
    	let t10;
    	let input2;
    	let t11;
    	let label3;
    	let t13;
    	let input3;
    	let t14;
    	let label4;
    	let t16;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t20;
    	let label5;
    	let t22;
    	let select1;
    	let option3;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t24;
    	let button0;
    	let t26;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*users*/ ctx[4];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*user*/ ctx[77].id;
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Edit Task";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t7 = space();
    			textarea = element("textarea");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Start Date:";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "End Date:";
    			t13 = space();
    			input3 = element("input");
    			t14 = space();
    			label4 = element("label");
    			label4.textContent = "Status:";
    			t16 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Pending";
    			option1 = element("option");
    			option1.textContent = "In Progress";
    			option2 = element("option");
    			option2.textContent = "Completed";
    			t20 = space();
    			label5 = element("label");
    			label5.textContent = "Assign to:";
    			t22 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Select User";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t24 = space();
    			button0 = element("button");
    			button0.textContent = "Save Changes";
    			t26 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			attr_dev(h2, "class", "svelte-16i0fd4");
    			add_location(h2, file$4, 685, 10, 20470);
    			attr_dev(input0, "type", "hidden");
    			add_location(input0, file$4, 686, 10, 20500);
    			attr_dev(label0, "for", "editTaskTitle");
    			add_location(label0, file$4, 688, 10, 20568);
    			attr_dev(input1, "id", "editTaskTitle");
    			attr_dev(input1, "type", "text");
    			input1.required = true;
    			add_location(input1, file$4, 689, 10, 20621);
    			attr_dev(label1, "for", "editTaskDescription");
    			add_location(label1, file$4, 696, 10, 20781);
    			attr_dev(textarea, "id", "editTaskDescription");
    			textarea.required = true;
    			add_location(textarea, file$4, 697, 10, 20846);
    			attr_dev(label2, "for", "editTaskStartDate");
    			add_location(label2, file$4, 703, 10, 21006);
    			attr_dev(input2, "id", "editTaskStartDate");
    			attr_dev(input2, "type", "date");
    			input2.required = true;
    			add_location(input2, file$4, 704, 10, 21068);
    			attr_dev(label3, "for", "editTaskEndDate");
    			add_location(label3, file$4, 711, 10, 21236);
    			attr_dev(input3, "id", "editTaskEndDate");
    			attr_dev(input3, "type", "date");
    			input3.required = true;
    			add_location(input3, file$4, 712, 10, 21294);
    			attr_dev(label4, "for", "editTaskStatus");
    			add_location(label4, file$4, 719, 10, 21458);
    			option0.__value = "Pending";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 721, 12, 21588);
    			option1.__value = "In Progress";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 722, 12, 21642);
    			option2.__value = "Completed";
    			option2.value = option2.__value;
    			add_location(option2, file$4, 723, 12, 21704);
    			attr_dev(select0, "id", "editTaskStatus");
    			if (/*editTaskData*/ ctx[15].status === void 0) add_render_callback(() => /*select0_change_handler_2*/ ctx[67].call(select0));
    			add_location(select0, file$4, 720, 10, 21513);
    			attr_dev(label5, "for", "editTaskAssignedTo");
    			add_location(label5, file$4, 726, 10, 21785);
    			option3.__value = "";
    			option3.value = option3.__value;
    			option3.disabled = true;
    			add_location(option3, file$4, 732, 12, 21990);
    			attr_dev(select1, "id", "editTaskAssignedTo");
    			select1.required = true;
    			if (/*editTaskData*/ ctx[15].assignedTo === void 0) add_render_callback(() => /*select1_change_handler_2*/ ctx[68].call(select1));
    			add_location(select1, file$4, 727, 10, 21847);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 740, 10, 22284);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 741, 10, 22347);
    			attr_dev(div0, "class", "modal-content svelte-16i0fd4");
    			add_location(div0, file$4, 684, 8, 20431);
    			attr_dev(div1, "class", "modal svelte-16i0fd4");
    			add_location(div1, file$4, 683, 6, 20402);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*editTaskData*/ ctx[15].id);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(div0, t4);
    			append_dev(div0, input1);
    			set_input_value(input1, /*editTaskData*/ ctx[15].title);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(div0, t7);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*editTaskData*/ ctx[15].description);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(div0, t10);
    			append_dev(div0, input2);
    			set_input_value(input2, /*editTaskData*/ ctx[15].startDate);
    			append_dev(div0, t11);
    			append_dev(div0, label3);
    			append_dev(div0, t13);
    			append_dev(div0, input3);
    			set_input_value(input3, /*editTaskData*/ ctx[15].endDate);
    			append_dev(div0, t14);
    			append_dev(div0, label4);
    			append_dev(div0, t16);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*editTaskData*/ ctx[15].status, true);
    			append_dev(div0, t20);
    			append_dev(div0, label5);
    			append_dev(div0, t22);
    			append_dev(div0, select1);
    			append_dev(select1, option3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*editTaskData*/ ctx[15].assignedTo, true);
    			append_dev(div0, t24);
    			append_dev(div0, button0);
    			append_dev(div0, t26);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_3*/ ctx[62]),
    					listen_dev(input1, "input", /*input1_input_handler_3*/ ctx[63]),
    					listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[64]),
    					listen_dev(input2, "input", /*input2_input_handler_3*/ ctx[65]),
    					listen_dev(input3, "input", /*input3_input_handler_2*/ ctx[66]),
    					listen_dev(select0, "change", /*select0_change_handler_2*/ ctx[67]),
    					listen_dev(select1, "change", /*select1_change_handler_2*/ ctx[68]),
    					listen_dev(button0, "click", /*updateTask*/ ctx[26], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_10*/ ctx[69], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*editTaskData*/ 32768) {
    				set_input_value(input0, /*editTaskData*/ ctx[15].id);
    			}

    			if (dirty[0] & /*editTaskData*/ 32768 && input1.value !== /*editTaskData*/ ctx[15].title) {
    				set_input_value(input1, /*editTaskData*/ ctx[15].title);
    			}

    			if (dirty[0] & /*editTaskData*/ 32768) {
    				set_input_value(textarea, /*editTaskData*/ ctx[15].description);
    			}

    			if (dirty[0] & /*editTaskData*/ 32768) {
    				set_input_value(input2, /*editTaskData*/ ctx[15].startDate);
    			}

    			if (dirty[0] & /*editTaskData*/ 32768) {
    				set_input_value(input3, /*editTaskData*/ ctx[15].endDate);
    			}

    			if (dirty[0] & /*editTaskData*/ 32768) {
    				select_option(select0, /*editTaskData*/ ctx[15].status);
    			}

    			if (dirty[0] & /*users*/ 16) {
    				each_value_1 = /*users*/ ctx[4];
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, select1, destroy_block, create_each_block_1$1, null, get_each_context_1$1);
    			}

    			if (dirty[0] & /*editTaskData*/ 32768) {
    				select_option(select1, /*editTaskData*/ ctx[15].assignedTo);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(683:4) {#if showEditTaskModal}",
    		ctx
    	});

    	return block;
    }

    // (735:14) {#if user.role !== "Admin"}
    function create_if_block_4(ctx) {
    	let option;
    	let t0_value = /*user*/ ctx[77].firstName + "";
    	let t0;
    	let t1;
    	let t2_value = /*user*/ ctx[77].role + "";
    	let t2;
    	let t3;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			option.__value = option_value_value = /*user*/ ctx[77].id;
    			option.value = option.__value;
    			add_location(option, file$4, 735, 16, 22142);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 16 && t0_value !== (t0_value = /*user*/ ctx[77].firstName + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*users*/ 16 && t2_value !== (t2_value = /*user*/ ctx[77].role + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*users*/ 16 && option_value_value !== (option_value_value = /*user*/ ctx[77].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(735:14) {#if user.role !== \\\"Admin\\\"}",
    		ctx
    	});

    	return block;
    }

    // (734:12) {#each users as user (user.id)}
    function create_each_block_1$1(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*user*/ ctx[77].role !== "Admin" && create_if_block_4(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*user*/ ctx[77].role !== "Admin") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(734:12) {#each users as user (user.id)}",
    		ctx
    	});

    	return block;
    }

    // (748:4) {#if showReportModal}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let label0;
    	let t3;
    	let select;
    	let option;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t5;
    	let label1;
    	let t7;
    	let input0;
    	let t8;
    	let label2;
    	let t10;
    	let input1;
    	let t11;
    	let button0;
    	let t13;
    	let t14;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value = /*users*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*user*/ ctx[77].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	let if_block = /*reportPreviewHtml*/ ctx[19] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Task Report";
    			t1 = space();
    			label0 = element("label");
    			label0.textContent = "Select User:";
    			t3 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Select a user";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Start Date:";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "End Date:";
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			button0 = element("button");
    			button0.textContent = "Preview Report";
    			t13 = space();
    			if (if_block) if_block.c();
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "Close";
    			attr_dev(h2, "class", "svelte-16i0fd4");
    			add_location(h2, file$4, 750, 10, 22590);
    			attr_dev(label0, "for", "reportUserSelect");
    			add_location(label0, file$4, 752, 10, 22626);
    			option.__value = "";
    			option.value = option.__value;
    			option.disabled = true;
    			add_location(option, file$4, 757, 12, 22796);
    			attr_dev(select, "id", "reportUserSelect");
    			if (/*reportUserId*/ ctx[16] === void 0) add_render_callback(() => /*select_change_handler_2*/ ctx[70].call(select));
    			add_location(select, file$4, 753, 10, 22688);
    			attr_dev(label1, "for", "reportStartDateInput");
    			add_location(label1, file$4, 767, 10, 23176);
    			attr_dev(input0, "id", "reportStartDateInput");
    			attr_dev(input0, "type", "date");
    			add_location(input0, file$4, 768, 10, 23241);
    			attr_dev(label2, "for", "reportEndDateInput");
    			add_location(label2, file$4, 774, 10, 23383);
    			attr_dev(input1, "id", "reportEndDateInput");
    			attr_dev(input1, "type", "date");
    			add_location(input1, file$4, 775, 10, 23444);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 781, 10, 23582);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 790, 10, 23882);
    			attr_dev(div0, "class", "modal-content svelte-16i0fd4");
    			add_location(div0, file$4, 749, 8, 22551);
    			attr_dev(div1, "class", "modal svelte-16i0fd4");
    			add_location(div1, file$4, 748, 6, 22522);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, select);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select, null);
    				}
    			}

    			select_option(select, /*reportUserId*/ ctx[16], true);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(div0, t7);
    			append_dev(div0, input0);
    			set_input_value(input0, /*reportStartDate*/ ctx[17]);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(div0, t10);
    			append_dev(div0, input1);
    			set_input_value(input1, /*reportEndDate*/ ctx[18]);
    			append_dev(div0, t11);
    			append_dev(div0, button0);
    			append_dev(div0, t13);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div0, t14);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler_2*/ ctx[70]),
    					listen_dev(input0, "input", /*input0_input_handler_4*/ ctx[71]),
    					listen_dev(input1, "input", /*input1_input_handler_4*/ ctx[72]),
    					listen_dev(button0, "click", /*previewReport*/ ctx[29], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_11*/ ctx[73], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 16) {
    				each_value = /*users*/ ctx[4];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, select, destroy_block, create_each_block$2, null, get_each_context$2);
    			}

    			if (dirty[0] & /*reportUserId, users*/ 65552) {
    				select_option(select, /*reportUserId*/ ctx[16]);
    			}

    			if (dirty[0] & /*reportStartDate*/ 131072) {
    				set_input_value(input0, /*reportStartDate*/ ctx[17]);
    			}

    			if (dirty[0] & /*reportEndDate*/ 262144) {
    				set_input_value(input1, /*reportEndDate*/ ctx[18]);
    			}

    			if (/*reportPreviewHtml*/ ctx[19]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(div0, t14);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(748:4) {#if showReportModal}",
    		ctx
    	});

    	return block;
    }

    // (760:14) {#if user.role === "Manager" || user.role === "Employee"}
    function create_if_block_2$2(ctx) {
    	let option;
    	let t0_value = /*user*/ ctx[77].firstName + "";
    	let t0;
    	let t1;
    	let t2_value = /*user*/ ctx[77].lastName + "";
    	let t2;
    	let t3;
    	let t4_value = /*user*/ ctx[77].role + "";
    	let t4;
    	let t5;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = text(" (");
    			t4 = text(t4_value);
    			t5 = text(")\r\n                ");
    			option.__value = option_value_value = /*user*/ ctx[77].id;
    			option.value = option.__value;
    			add_location(option, file$4, 760, 16, 22980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    			append_dev(option, t4);
    			append_dev(option, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 16 && t0_value !== (t0_value = /*user*/ ctx[77].firstName + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*users*/ 16 && t2_value !== (t2_value = /*user*/ ctx[77].lastName + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*users*/ 16 && t4_value !== (t4_value = /*user*/ ctx[77].role + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*users*/ 16 && option_value_value !== (option_value_value = /*user*/ ctx[77].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(760:14) {#if user.role === \\\"Manager\\\" || user.role === \\\"Employee\\\"}",
    		ctx
    	});

    	return block;
    }

    // (759:12) {#each users as user (user.id)}
    function create_each_block$2(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = (/*user*/ ctx[77].role === "Manager" || /*user*/ ctx[77].role === "Employee") && create_if_block_2$2(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*user*/ ctx[77].role === "Manager" || /*user*/ ctx[77].role === "Employee") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(759:12) {#each users as user (user.id)}",
    		ctx
    	});

    	return block;
    }

    // (784:10) {#if reportPreviewHtml}
    function create_if_block_1$2(ctx) {
    	let div;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Download PDF";
    			attr_dev(div, "class", "report-preview");
    			add_location(div, file$4, 784, 12, 23691);
    			attr_dev(button, "class", "svelte-16i0fd4");
    			add_location(button, file$4, 787, 12, 23794);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*reportPreviewHtml*/ ctx[19];
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*downloadReport*/ ctx[30], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*reportPreviewHtml*/ 524288) div.innerHTML = /*reportPreviewHtml*/ ctx[19];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(784:10) {#if reportPreviewHtml}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div3;
    	let header;
    	let h1;
    	let t1;
    	let button0;
    	let t3;
    	let main;
    	let h20;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let section0;
    	let div0;
    	let h30;
    	let t9;
    	let p0;
    	let t10;
    	let t11;
    	let div1;
    	let h31;
    	let t13;
    	let p1;
    	let t14;
    	let t15;
    	let div2;
    	let h32;
    	let t17;
    	let p2;
    	let t18;
    	let t19;
    	let section1;
    	let h33;
    	let t21;
    	let button1;
    	let t23;
    	let table0;
    	let thead0;
    	let tr0;
    	let th0;
    	let t25;
    	let th1;
    	let t27;
    	let th2;
    	let t29;
    	let th3;
    	let t31;
    	let th4;
    	let t33;
    	let tbody0;
    	let t34;
    	let h21;
    	let t36;
    	let table1;
    	let thead1;
    	let tr1;
    	let th5;
    	let t38;
    	let th6;
    	let t40;
    	let th7;
    	let t42;
    	let th8;
    	let t44;
    	let th9;
    	let t46;
    	let th10;
    	let t48;
    	let th11;
    	let t50;
    	let th12;
    	let t52;
    	let th13;
    	let t54;
    	let tbody1;
    	let t55;
    	let button2;
    	let t57;
    	let button3;
    	let t59;
    	let t60;
    	let t61;
    	let t62;
    	let t63;
    	let mounted;
    	let dispose;
    	let each_value_6 = /*users*/ ctx[4];
    	validate_each_argument(each_value_6);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_1[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_5 = /*tasks*/ ctx[5];
    	validate_each_argument(each_value_5);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let if_block0 = /*showUserModal*/ ctx[7] && create_if_block_8(ctx);
    	let if_block1 = /*showEditUserModal*/ ctx[8] && create_if_block_7(ctx);
    	let if_block2 = /*showAssignTaskModal*/ ctx[9] && create_if_block_5(ctx);
    	let if_block3 = /*showEditTaskModal*/ ctx[10] && create_if_block_3$2(ctx);
    	let if_block4 = /*showReportModal*/ ctx[11] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Admin Dashboard";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Logout";
    			t3 = space();
    			main = element("main");
    			h20 = element("h2");
    			t4 = text("Welcome, ");
    			t5 = text(/*adminName*/ ctx[0]);
    			t6 = text("!");
    			t7 = space();
    			section0 = element("section");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Total Users";
    			t9 = space();
    			p0 = element("p");
    			t10 = text(/*totalUsers*/ ctx[1]);
    			t11 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Managers";
    			t13 = space();
    			p1 = element("p");
    			t14 = text(/*totalManagers*/ ctx[2]);
    			t15 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Employees";
    			t17 = space();
    			p2 = element("p");
    			t18 = text(/*totalEmployees*/ ctx[3]);
    			t19 = space();
    			section1 = element("section");
    			h33 = element("h3");
    			h33.textContent = "User Management";
    			t21 = space();
    			button1 = element("button");
    			button1.textContent = "➕ Add User";
    			t23 = space();
    			table0 = element("table");
    			thead0 = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "ID";
    			t25 = space();
    			th1 = element("th");
    			th1.textContent = "Name";
    			t27 = space();
    			th2 = element("th");
    			th2.textContent = "Role";
    			t29 = space();
    			th3 = element("th");
    			th3.textContent = "Office";
    			t31 = space();
    			th4 = element("th");
    			th4.textContent = "Actions";
    			t33 = space();
    			tbody0 = element("tbody");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t34 = space();
    			h21 = element("h2");
    			h21.textContent = "All Tasks (Admin View)";
    			t36 = space();
    			table1 = element("table");
    			thead1 = element("thead");
    			tr1 = element("tr");
    			th5 = element("th");
    			th5.textContent = "ID";
    			t38 = space();
    			th6 = element("th");
    			th6.textContent = "Title";
    			t40 = space();
    			th7 = element("th");
    			th7.textContent = "Description";
    			t42 = space();
    			th8 = element("th");
    			th8.textContent = "Start Date";
    			t44 = space();
    			th9 = element("th");
    			th9.textContent = "End Date";
    			t46 = space();
    			th10 = element("th");
    			th10.textContent = "Status";
    			t48 = space();
    			th11 = element("th");
    			th11.textContent = "Assigned To";
    			t50 = space();
    			th12 = element("th");
    			th12.textContent = "Created By";
    			t52 = space();
    			th13 = element("th");
    			th13.textContent = "Actions";
    			t54 = space();
    			tbody1 = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t55 = space();
    			button2 = element("button");
    			button2.textContent = "➕ Assign Task";
    			t57 = space();
    			button3 = element("button");
    			button3.textContent = "Generate Task Report";
    			t59 = space();
    			if (if_block0) if_block0.c();
    			t60 = space();
    			if (if_block1) if_block1.c();
    			t61 = space();
    			if (if_block2) if_block2.c();
    			t62 = space();
    			if (if_block3) if_block3.c();
    			t63 = space();
    			if (if_block4) if_block4.c();
    			add_location(h1, file$4, 423, 6, 11625);
    			attr_dev(button0, "class", "svelte-16i0fd4");
    			add_location(button0, file$4, 424, 6, 11657);
    			attr_dev(header, "class", "svelte-16i0fd4");
    			add_location(header, file$4, 422, 4, 11609);
    			add_location(h20, file$4, 428, 6, 11737);
    			add_location(h30, file$4, 433, 10, 11884);
    			add_location(p0, file$4, 434, 10, 11916);
    			attr_dev(div0, "class", "card svelte-16i0fd4");
    			add_location(div0, file$4, 432, 8, 11854);
    			add_location(h31, file$4, 437, 10, 11991);
    			add_location(p1, file$4, 438, 10, 12020);
    			attr_dev(div1, "class", "card svelte-16i0fd4");
    			add_location(div1, file$4, 436, 8, 11961);
    			add_location(h32, file$4, 441, 10, 12098);
    			add_location(p2, file$4, 442, 10, 12128);
    			attr_dev(div2, "class", "card svelte-16i0fd4");
    			add_location(div2, file$4, 440, 8, 12068);
    			attr_dev(section0, "class", "dashboard-cards svelte-16i0fd4");
    			add_location(section0, file$4, 431, 6, 11811);
    			add_location(h33, file$4, 448, 8, 12248);
    			attr_dev(button1, "class", "svelte-16i0fd4");
    			add_location(button1, file$4, 449, 8, 12282);
    			attr_dev(th0, "class", "svelte-16i0fd4");
    			add_location(th0, file$4, 453, 14, 12419);
    			attr_dev(th1, "class", "svelte-16i0fd4");
    			add_location(th1, file$4, 454, 14, 12446);
    			attr_dev(th2, "class", "svelte-16i0fd4");
    			add_location(th2, file$4, 455, 14, 12475);
    			attr_dev(th3, "class", "svelte-16i0fd4");
    			add_location(th3, file$4, 456, 14, 12504);
    			attr_dev(th4, "class", "svelte-16i0fd4");
    			add_location(th4, file$4, 457, 14, 12535);
    			add_location(tr0, file$4, 452, 12, 12399);
    			add_location(thead0, file$4, 451, 10, 12378);
    			add_location(tbody0, file$4, 460, 10, 12602);
    			attr_dev(table0, "class", "svelte-16i0fd4");
    			add_location(table0, file$4, 450, 8, 12359);
    			add_location(section1, file$4, 447, 6, 12229);
    			add_location(h21, file$4, 478, 6, 13185);
    			attr_dev(th5, "class", "svelte-16i0fd4");
    			add_location(th5, file$4, 482, 12, 13278);
    			attr_dev(th6, "class", "svelte-16i0fd4");
    			add_location(th6, file$4, 483, 12, 13303);
    			attr_dev(th7, "class", "svelte-16i0fd4");
    			add_location(th7, file$4, 484, 12, 13331);
    			attr_dev(th8, "class", "svelte-16i0fd4");
    			add_location(th8, file$4, 485, 12, 13365);
    			attr_dev(th9, "class", "svelte-16i0fd4");
    			add_location(th9, file$4, 486, 12, 13398);
    			attr_dev(th10, "class", "svelte-16i0fd4");
    			add_location(th10, file$4, 487, 12, 13429);
    			attr_dev(th11, "class", "svelte-16i0fd4");
    			add_location(th11, file$4, 488, 12, 13458);
    			attr_dev(th12, "class", "svelte-16i0fd4");
    			add_location(th12, file$4, 489, 12, 13492);
    			attr_dev(th13, "class", "svelte-16i0fd4");
    			add_location(th13, file$4, 490, 12, 13525);
    			add_location(tr1, file$4, 481, 10, 13260);
    			add_location(thead1, file$4, 480, 8, 13241);
    			add_location(tbody1, file$4, 493, 8, 13586);
    			attr_dev(table1, "class", "svelte-16i0fd4");
    			add_location(table1, file$4, 479, 6, 13224);
    			attr_dev(button2, "class", "svelte-16i0fd4");
    			add_location(button2, file$4, 513, 6, 14320);
    			attr_dev(button3, "class", "svelte-16i0fd4");
    			add_location(button3, file$4, 514, 6, 14404);
    			add_location(main, file$4, 427, 4, 11723);
    			add_location(div3, file$4, 421, 2, 11598);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, button0);
    			append_dev(div3, t3);
    			append_dev(div3, main);
    			append_dev(main, h20);
    			append_dev(h20, t4);
    			append_dev(h20, t5);
    			append_dev(h20, t6);
    			append_dev(main, t7);
    			append_dev(main, section0);
    			append_dev(section0, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t9);
    			append_dev(div0, p0);
    			append_dev(p0, t10);
    			append_dev(section0, t11);
    			append_dev(section0, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t13);
    			append_dev(div1, p1);
    			append_dev(p1, t14);
    			append_dev(section0, t15);
    			append_dev(section0, div2);
    			append_dev(div2, h32);
    			append_dev(div2, t17);
    			append_dev(div2, p2);
    			append_dev(p2, t18);
    			append_dev(main, t19);
    			append_dev(main, section1);
    			append_dev(section1, h33);
    			append_dev(section1, t21);
    			append_dev(section1, button1);
    			append_dev(section1, t23);
    			append_dev(section1, table0);
    			append_dev(table0, thead0);
    			append_dev(thead0, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t25);
    			append_dev(tr0, th1);
    			append_dev(tr0, t27);
    			append_dev(tr0, th2);
    			append_dev(tr0, t29);
    			append_dev(tr0, th3);
    			append_dev(tr0, t31);
    			append_dev(tr0, th4);
    			append_dev(table0, t33);
    			append_dev(table0, tbody0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(tbody0, null);
    				}
    			}

    			append_dev(main, t34);
    			append_dev(main, h21);
    			append_dev(main, t36);
    			append_dev(main, table1);
    			append_dev(table1, thead1);
    			append_dev(thead1, tr1);
    			append_dev(tr1, th5);
    			append_dev(tr1, t38);
    			append_dev(tr1, th6);
    			append_dev(tr1, t40);
    			append_dev(tr1, th7);
    			append_dev(tr1, t42);
    			append_dev(tr1, th8);
    			append_dev(tr1, t44);
    			append_dev(tr1, th9);
    			append_dev(tr1, t46);
    			append_dev(tr1, th10);
    			append_dev(tr1, t48);
    			append_dev(tr1, th11);
    			append_dev(tr1, t50);
    			append_dev(tr1, th12);
    			append_dev(tr1, t52);
    			append_dev(tr1, th13);
    			append_dev(table1, t54);
    			append_dev(table1, tbody1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tbody1, null);
    				}
    			}

    			append_dev(main, t55);
    			append_dev(main, button2);
    			append_dev(main, t57);
    			append_dev(main, button3);
    			append_dev(div3, t59);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t60);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div3, t61);
    			if (if_block2) if_block2.m(div3, null);
    			append_dev(div3, t62);
    			if (if_block3) if_block3.m(div3, null);
    			append_dev(div3, t63);
    			if (if_block4) if_block4.m(div3, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", logout$2, false, false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[31], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_5*/ ctx[36], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_6*/ ctx[37], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*adminName*/ 1) set_data_dev(t5, /*adminName*/ ctx[0]);
    			if (dirty[0] & /*totalUsers*/ 2) set_data_dev(t10, /*totalUsers*/ ctx[1]);
    			if (dirty[0] & /*totalManagers*/ 4) set_data_dev(t14, /*totalManagers*/ ctx[2]);
    			if (dirty[0] & /*totalEmployees*/ 8) set_data_dev(t18, /*totalEmployees*/ ctx[3]);

    			if (dirty[0] & /*deleteUser, users, editUser*/ 6291472) {
    				each_value_6 = /*users*/ ctx[4];
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_6(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tbody0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_6.length;
    			}

    			if (dirty[0] & /*deleteTask, tasks, editTask*/ 167772192) {
    				each_value_5 = /*tasks*/ ctx[5];
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}

    			if (/*showUserModal*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					if_block0.m(div3, t60);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showEditUserModal*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					if_block1.m(div3, t61);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*showAssignTaskModal*/ ctx[9]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					if_block2.m(div3, t62);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*showEditTaskModal*/ ctx[10]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_3$2(ctx);
    					if_block3.c();
    					if_block3.m(div3, t63);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*showReportModal*/ ctx[11]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block$3(ctx);
    					if_block4.c();
    					if_block4.m(div3, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const API_URL$2 = "http://localhost:3000";

    // Logout
    function logout$2() {
    	localStorage.removeItem("loggedInUser");
    	window.location.href = "/";
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Admin', slots, []);
    	let adminName = "";
    	let totalUsers = 0;
    	let totalManagers = 0;
    	let totalEmployees = 0;
    	let users = [];
    	let tasks = [];
    	let offices = [];

    	// Modal controls
    	let showUserModal = false;

    	let showEditUserModal = false;
    	let showAssignTaskModal = false;
    	let showEditTaskModal = false;
    	let showReportModal = false;

    	// Form data for new user
    	let newUser = {
    		role: "",
    		office: "",
    		firstName: "",
    		lastName: "",
    		number: "",
    		address: "",
    		birthday: ""
    	};

    	// Form data for editing user
    	let editUserData = {
    		id: null,
    		firstName: "",
    		lastName: "",
    		role: "",
    		office: "",
    		number: "",
    		address: "",
    		birthday: ""
    	};

    	// Form data for new task assignment
    	let newTask = {
    		title: "",
    		description: "",
    		startDate: "",
    		endDate: "",
    		status: "Pending",
    		assignedTo: "",
    		createdBy: ""
    	};

    	// Form data for editing task
    	let editTaskData = {
    		id: null,
    		title: "",
    		description: "",
    		startDate: "",
    		endDate: "",
    		status: "",
    		assignedTo: ""
    	};

    	// Report generation
    	let reportUserId = "";

    	let reportStartDate = "";
    	let reportEndDate = "";
    	let reportPreviewHtml = "";

    	onMount(() => {
    		const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    		if (loggedInUser) {
    			$$invalidate(0, adminName = `${loggedInUser.firstName} ${loggedInUser.lastName}`);
    		}

    		loadUsers();
    		loadTasks();
    		loadOffices();
    	});

    	// ---------------------
    	// Users & Offices
    	// ---------------------
    	async function loadUsers() {
    		try {
    			const res = await fetch(`${API_URL$2}/users`);
    			const data = await res.json();
    			$$invalidate(4, users = data);
    			$$invalidate(1, totalUsers = data.length);
    			$$invalidate(2, totalManagers = data.filter(u => u.role === "Manager").length);
    			$$invalidate(3, totalEmployees = data.filter(u => u.role === "Employee").length);
    		} catch(error) {
    			console.error("Error loading users:", error);
    		}
    	}

    	async function loadOffices() {
    		try {
    			const res = await fetch(`${API_URL$2}/offices`);
    			$$invalidate(6, offices = await res.json());
    		} catch(error) {
    			console.error("Error loading offices:", error);
    		}
    	}

    	async function addUser() {
    		if (!newUser.firstName || !newUser.lastName || !newUser.office) {
    			alert("Please fill in all required fields.");
    			return;
    		}

    		try {
    			const res = await fetch(`${API_URL$2}/users`, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(newUser)
    			});

    			const data = await res.json();
    			console.log("User added:", data);
    			await loadUsers();
    			$$invalidate(7, showUserModal = false);

    			// Reset form
    			$$invalidate(12, newUser = {
    				role: "",
    				office: "",
    				firstName: "",
    				lastName: "",
    				number: "",
    				address: "",
    				birthday: ""
    			});
    		} catch(error) {
    			console.error("Error adding user:", error);
    		}
    	}

    	async function deleteUser(userId) {
    		if (!confirm("Are you sure you want to delete this user?")) return;

    		try {
    			await fetch(`${API_URL$2}/users/${userId}`, { method: "DELETE" });
    			await loadUsers();
    		} catch(error) {
    			console.error("Error deleting user:", error);
    		}
    	}

    	async function editUser(userId) {
    		try {
    			const res = await fetch(`${API_URL$2}/users/${userId}`);
    			const data = await res.json();
    			$$invalidate(13, editUserData = { ...data });
    			$$invalidate(8, showEditUserModal = true);
    		} catch(error) {
    			console.error("Error fetching user details:", error);
    		}
    	}

    	async function updateUser() {
    		try {
    			const res = await fetch(`${API_URL$2}/users/${editUserData.id}`, {
    				method: "PUT",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(editUserData)
    			});

    			const data = await res.json();
    			console.log("User updated:", data);
    			await loadUsers();
    			$$invalidate(8, showEditUserModal = false);
    		} catch(error) {
    			console.error("Error updating user:", error);
    		}
    	}

    	// ---------------------
    	// Tasks
    	// ---------------------
    	async function loadTasks() {
    		try {
    			// For Admin, load all tasks
    			const res = await fetch(`${API_URL$2}/tasks`);

    			$$invalidate(5, tasks = await res.json());
    		} catch(error) {
    			console.error("Error loading tasks:", error);
    		}
    	}

    	async function assignTask() {
    		const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    		if (!loggedInUser) {
    			alert("You must be logged in.");
    			return;
    		}

    		$$invalidate(14, newTask.createdBy = loggedInUser.id, newTask);

    		if (!newTask.title || !newTask.startDate || !newTask.endDate || !newTask.assignedTo) {
    			alert("Please fill in all required fields for the task.");
    			return;
    		}

    		try {
    			const res = await fetch(`${API_URL$2}/tasks`, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(newTask)
    			});

    			const data = await res.json();
    			console.log("Task assigned:", data);
    			await loadTasks();
    			$$invalidate(9, showAssignTaskModal = false);

    			// Reset form
    			$$invalidate(14, newTask = {
    				title: "",
    				description: "",
    				startDate: "",
    				endDate: "",
    				status: "Pending",
    				assignedTo: "",
    				createdBy: ""
    			});
    		} catch(error) {
    			console.error("Error assigning task:", error);
    		}
    	}

    	async function editTask(taskId) {
    		try {
    			const res = await fetch(`${API_URL$2}/tasks/${taskId}`);
    			const task = await res.json();

    			$$invalidate(15, editTaskData = {
    				id: task.id,
    				title: task.title,
    				description: task.description,
    				startDate: task.startDate ? task.startDate.split("T")[0] : "",
    				endDate: task.endDate ? task.endDate.split("T")[0] : "",
    				status: task.status,
    				assignedTo: task.assignedTo
    			});

    			$$invalidate(10, showEditTaskModal = true);
    		} catch(error) {
    			console.error("Error fetching task details:", error);
    		}
    	}

    	async function updateTask() {
    		try {
    			const res = await fetch(`${API_URL$2}/tasks/${editTaskData.id}`, {
    				method: "PUT",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(editTaskData)
    			});

    			const data = await res.json();
    			console.log("Task updated:", data);
    			await loadTasks();
    			$$invalidate(10, showEditTaskModal = false);
    		} catch(error) {
    			console.error("Error updating task:", error);
    		}
    	}

    	async function deleteTask(taskId) {
    		try {
    			await fetch(`${API_URL$2}/tasks/${taskId}`, { method: "DELETE" });
    			await loadTasks();
    		} catch(error) {
    			console.error("Error deleting task:", error);
    		}
    	}

    	// ---------------------
    	// Report Generation
    	// ---------------------
    	async function loadUsersForReport() {
    		try {
    			const res = await fetch(`${API_URL$2}/users`);
    			const data = await res.json();

    			// Filter to managers & employees only
    			$$invalidate(4, users = data.filter(user => user.role === "Manager" || user.role === "Employee"));
    		} catch(error) {
    			console.error("Error loading users for report:", error);
    		}
    	}

    	async function previewReport() {
    		if (!reportUserId || !reportStartDate || !reportEndDate) {
    			alert("Please select a user and a date range.");
    			return;
    		}

    		try {
    			const res = await fetch(`${API_URL$2}/tasks?userId=${reportUserId}`);
    			const allTasks = await res.json();

    			const filtered = allTasks.filter(task => {
    				const taskDate = new Date(task.startDate);
    				return taskDate >= new Date(reportStartDate) && taskDate <= new Date(reportEndDate);
    			});

    			if (filtered.length === 0) {
    				$$invalidate(19, reportPreviewHtml = "<p>No tasks found for the selected criteria.</p>");
    			} else {
    				let html = `<table border='1' style='width:100%; border-collapse: collapse;'>
            <tr>
              <th>ID</th><th>Title</th><th>Description</th>
              <th>Start Date</th><th>End Date</th><th>Status</th>
            </tr>`;

    				filtered.forEach(task => {
    					html += `<tr>
              <td>${task.id}</td>
              <td>${task.title}</td>
              <td>${task.description}</td>
              <td>${new Date(task.startDate).toLocaleDateString()}</td>
              <td>${new Date(task.endDate).toLocaleDateString()}</td>
              <td>${task.status}</td>
            </tr>`;
    				});

    				html += "</table>";
    				$$invalidate(19, reportPreviewHtml = html);
    			}
    		} catch(error) {
    			console.error("Error generating report:", error);
    		}
    	}

    	function downloadReport() {
    		const { jsPDF } = window.jspdf;
    		const doc = new jsPDF();

    		doc.html(reportPreviewHtml, {
    			callback(doc) {
    				doc.save("task_report.pdf");
    			},
    			x: 10,
    			y: 10,
    			html2canvas: { scale: 0.295 }
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Admin> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(7, showUserModal = true);
    	const click_handler_1 = user => editUser(user.id);
    	const click_handler_2 = user => deleteUser(user.id);
    	const click_handler_3 = task => editTask(task.id);
    	const click_handler_4 = task => deleteTask(task.id);
    	const click_handler_5 = () => $$invalidate(9, showAssignTaskModal = true);

    	const click_handler_6 = () => {
    		$$invalidate(11, showReportModal = true);
    		loadUsersForReport();
    	};

    	function select_change_handler() {
    		newUser.role = select_value(this);
    		$$invalidate(12, newUser);
    	}

    	function select_change_handler_1() {
    		newUser.office = select_value(this);
    		$$invalidate(12, newUser);
    	}

    	function input0_input_handler() {
    		newUser.firstName = this.value;
    		$$invalidate(12, newUser);
    	}

    	function input1_input_handler() {
    		newUser.lastName = this.value;
    		$$invalidate(12, newUser);
    	}

    	function input2_input_handler() {
    		newUser.number = this.value;
    		$$invalidate(12, newUser);
    	}

    	function input3_input_handler() {
    		newUser.address = this.value;
    		$$invalidate(12, newUser);
    	}

    	function input4_input_handler() {
    		newUser.birthday = this.value;
    		$$invalidate(12, newUser);
    	}

    	const click_handler_7 = () => $$invalidate(7, showUserModal = false);

    	function input0_input_handler_1() {
    		editUserData.id = this.value;
    		$$invalidate(13, editUserData);
    	}

    	function input1_input_handler_1() {
    		editUserData.firstName = this.value;
    		$$invalidate(13, editUserData);
    	}

    	function input2_input_handler_1() {
    		editUserData.lastName = this.value;
    		$$invalidate(13, editUserData);
    	}

    	function select0_change_handler() {
    		editUserData.role = select_value(this);
    		$$invalidate(13, editUserData);
    	}

    	function select1_change_handler() {
    		editUserData.office = select_value(this);
    		$$invalidate(13, editUserData);
    	}

    	function input3_input_handler_1() {
    		editUserData.number = this.value;
    		$$invalidate(13, editUserData);
    	}

    	function input4_input_handler_1() {
    		editUserData.address = this.value;
    		$$invalidate(13, editUserData);
    	}

    	function input5_input_handler() {
    		editUserData.birthday = this.value;
    		$$invalidate(13, editUserData);
    	}

    	const click_handler_8 = () => $$invalidate(8, showEditUserModal = false);

    	function input0_input_handler_2() {
    		newTask.title = this.value;
    		$$invalidate(14, newTask);
    	}

    	function textarea_input_handler() {
    		newTask.description = this.value;
    		$$invalidate(14, newTask);
    	}

    	function input1_input_handler_2() {
    		newTask.startDate = this.value;
    		$$invalidate(14, newTask);
    	}

    	function input2_input_handler_2() {
    		newTask.endDate = this.value;
    		$$invalidate(14, newTask);
    	}

    	function select0_change_handler_1() {
    		newTask.status = select_value(this);
    		$$invalidate(14, newTask);
    	}

    	function select1_change_handler_1() {
    		newTask.assignedTo = select_value(this);
    		$$invalidate(14, newTask);
    	}

    	const click_handler_9 = () => $$invalidate(9, showAssignTaskModal = false);

    	function input0_input_handler_3() {
    		editTaskData.id = this.value;
    		$$invalidate(15, editTaskData);
    	}

    	function input1_input_handler_3() {
    		editTaskData.title = this.value;
    		$$invalidate(15, editTaskData);
    	}

    	function textarea_input_handler_1() {
    		editTaskData.description = this.value;
    		$$invalidate(15, editTaskData);
    	}

    	function input2_input_handler_3() {
    		editTaskData.startDate = this.value;
    		$$invalidate(15, editTaskData);
    	}

    	function input3_input_handler_2() {
    		editTaskData.endDate = this.value;
    		$$invalidate(15, editTaskData);
    	}

    	function select0_change_handler_2() {
    		editTaskData.status = select_value(this);
    		$$invalidate(15, editTaskData);
    	}

    	function select1_change_handler_2() {
    		editTaskData.assignedTo = select_value(this);
    		$$invalidate(15, editTaskData);
    	}

    	const click_handler_10 = () => $$invalidate(10, showEditTaskModal = false);

    	function select_change_handler_2() {
    		reportUserId = select_value(this);
    		$$invalidate(16, reportUserId);
    		$$invalidate(4, users);
    	}

    	function input0_input_handler_4() {
    		reportStartDate = this.value;
    		$$invalidate(17, reportStartDate);
    	}

    	function input1_input_handler_4() {
    		reportEndDate = this.value;
    		$$invalidate(18, reportEndDate);
    	}

    	const click_handler_11 = () => {
    		$$invalidate(11, showReportModal = false);
    		$$invalidate(19, reportPreviewHtml = "");
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		adminName,
    		totalUsers,
    		totalManagers,
    		totalEmployees,
    		users,
    		tasks,
    		offices,
    		showUserModal,
    		showEditUserModal,
    		showAssignTaskModal,
    		showEditTaskModal,
    		showReportModal,
    		newUser,
    		editUserData,
    		newTask,
    		editTaskData,
    		reportUserId,
    		reportStartDate,
    		reportEndDate,
    		reportPreviewHtml,
    		API_URL: API_URL$2,
    		loadUsers,
    		loadOffices,
    		addUser,
    		deleteUser,
    		editUser,
    		updateUser,
    		loadTasks,
    		assignTask,
    		editTask,
    		updateTask,
    		deleteTask,
    		loadUsersForReport,
    		previewReport,
    		downloadReport,
    		logout: logout$2
    	});

    	$$self.$inject_state = $$props => {
    		if ('adminName' in $$props) $$invalidate(0, adminName = $$props.adminName);
    		if ('totalUsers' in $$props) $$invalidate(1, totalUsers = $$props.totalUsers);
    		if ('totalManagers' in $$props) $$invalidate(2, totalManagers = $$props.totalManagers);
    		if ('totalEmployees' in $$props) $$invalidate(3, totalEmployees = $$props.totalEmployees);
    		if ('users' in $$props) $$invalidate(4, users = $$props.users);
    		if ('tasks' in $$props) $$invalidate(5, tasks = $$props.tasks);
    		if ('offices' in $$props) $$invalidate(6, offices = $$props.offices);
    		if ('showUserModal' in $$props) $$invalidate(7, showUserModal = $$props.showUserModal);
    		if ('showEditUserModal' in $$props) $$invalidate(8, showEditUserModal = $$props.showEditUserModal);
    		if ('showAssignTaskModal' in $$props) $$invalidate(9, showAssignTaskModal = $$props.showAssignTaskModal);
    		if ('showEditTaskModal' in $$props) $$invalidate(10, showEditTaskModal = $$props.showEditTaskModal);
    		if ('showReportModal' in $$props) $$invalidate(11, showReportModal = $$props.showReportModal);
    		if ('newUser' in $$props) $$invalidate(12, newUser = $$props.newUser);
    		if ('editUserData' in $$props) $$invalidate(13, editUserData = $$props.editUserData);
    		if ('newTask' in $$props) $$invalidate(14, newTask = $$props.newTask);
    		if ('editTaskData' in $$props) $$invalidate(15, editTaskData = $$props.editTaskData);
    		if ('reportUserId' in $$props) $$invalidate(16, reportUserId = $$props.reportUserId);
    		if ('reportStartDate' in $$props) $$invalidate(17, reportStartDate = $$props.reportStartDate);
    		if ('reportEndDate' in $$props) $$invalidate(18, reportEndDate = $$props.reportEndDate);
    		if ('reportPreviewHtml' in $$props) $$invalidate(19, reportPreviewHtml = $$props.reportPreviewHtml);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		adminName,
    		totalUsers,
    		totalManagers,
    		totalEmployees,
    		users,
    		tasks,
    		offices,
    		showUserModal,
    		showEditUserModal,
    		showAssignTaskModal,
    		showEditTaskModal,
    		showReportModal,
    		newUser,
    		editUserData,
    		newTask,
    		editTaskData,
    		reportUserId,
    		reportStartDate,
    		reportEndDate,
    		reportPreviewHtml,
    		addUser,
    		deleteUser,
    		editUser,
    		updateUser,
    		assignTask,
    		editTask,
    		updateTask,
    		deleteTask,
    		loadUsersForReport,
    		previewReport,
    		downloadReport,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		select_change_handler,
    		select_change_handler_1,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		click_handler_7,
    		input0_input_handler_1,
    		input1_input_handler_1,
    		input2_input_handler_1,
    		select0_change_handler,
    		select1_change_handler,
    		input3_input_handler_1,
    		input4_input_handler_1,
    		input5_input_handler,
    		click_handler_8,
    		input0_input_handler_2,
    		textarea_input_handler,
    		input1_input_handler_2,
    		input2_input_handler_2,
    		select0_change_handler_1,
    		select1_change_handler_1,
    		click_handler_9,
    		input0_input_handler_3,
    		input1_input_handler_3,
    		textarea_input_handler_1,
    		input2_input_handler_3,
    		input3_input_handler_2,
    		select0_change_handler_2,
    		select1_change_handler_2,
    		click_handler_10,
    		select_change_handler_2,
    		input0_input_handler_4,
    		input1_input_handler_4,
    		click_handler_11
    	];
    }

    class Admin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {}, null, [-1, -1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Admin",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Manager.svelte generated by Svelte v3.59.2 */

    const { console: console_1$2 } = globals;
    const file$3 = "src\\Manager.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[48] = list[i];
    	return child_ctx;
    }

    // (317:10) {:else}
    function create_else_block$1(ctx) {
    	let each_1_anchor;
    	let each_value_3 = /*tasks*/ ctx[1];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*deleteTask, tasks, editTask*/ 20482) {
    				each_value_3 = /*tasks*/ ctx[1];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(317:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (315:10) {#if tasks.length === 0}
    function create_if_block_3$1(ctx) {
    	let tr;
    	let td;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td = element("td");
    			td.textContent = "No tasks assigned.";
    			attr_dev(td, "colspan", "8");
    			attr_dev(td, "class", "svelte-erpzvl");
    			add_location(td, file$3, 315, 16, 8783);
    			add_location(tr, file$3, 315, 12, 8779);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(315:10) {#if tasks.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (318:12) {#each tasks as task}
    function create_each_block_3(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*task*/ ctx[48].title + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*task*/ ctx[48].description + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = new Date(/*task*/ ctx[48].startDate).toLocaleDateString() + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = new Date(/*task*/ ctx[48].endDate).toLocaleDateString() + "";
    	let t6;
    	let t7;
    	let td4;
    	let t8_value = /*task*/ ctx[48].status + "";
    	let t8;
    	let t9;
    	let td5;
    	let t10_value = (/*task*/ ctx[48].createdBy || "Unknown") + "";
    	let t10;
    	let t11;
    	let td6;
    	let t12_value = (/*task*/ ctx[48].assignedTo || "Unknown") + "";
    	let t12;
    	let t13;
    	let td7;
    	let button0;
    	let t15;
    	let button1;
    	let t17;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[18](/*task*/ ctx[48]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[19](/*task*/ ctx[48]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td5 = element("td");
    			t10 = text(t10_value);
    			t11 = space();
    			td6 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			td7 = element("td");
    			button0 = element("button");
    			button0.textContent = "✏️ Edit";
    			t15 = space();
    			button1 = element("button");
    			button1.textContent = "🗑 Delete";
    			t17 = space();
    			attr_dev(td0, "class", "svelte-erpzvl");
    			add_location(td0, file$3, 319, 16, 8919);
    			attr_dev(td1, "class", "svelte-erpzvl");
    			add_location(td1, file$3, 320, 16, 8958);
    			attr_dev(td2, "class", "svelte-erpzvl");
    			add_location(td2, file$3, 321, 16, 9003);
    			attr_dev(td3, "class", "svelte-erpzvl");
    			add_location(td3, file$3, 322, 16, 9077);
    			attr_dev(td4, "class", "svelte-erpzvl");
    			add_location(td4, file$3, 323, 16, 9149);
    			attr_dev(td5, "class", "svelte-erpzvl");
    			add_location(td5, file$3, 324, 16, 9189);
    			attr_dev(td6, "class", "svelte-erpzvl");
    			add_location(td6, file$3, 325, 16, 9245);
    			attr_dev(button0, "class", "svelte-erpzvl");
    			add_location(button0, file$3, 327, 18, 9326);
    			attr_dev(button1, "class", "svelte-erpzvl");
    			add_location(button1, file$3, 328, 18, 9405);
    			attr_dev(td7, "class", "svelte-erpzvl");
    			add_location(td7, file$3, 326, 16, 9302);
    			add_location(tr, file$3, 318, 14, 8897);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td5);
    			append_dev(td5, t10);
    			append_dev(tr, t11);
    			append_dev(tr, td6);
    			append_dev(td6, t12);
    			append_dev(tr, t13);
    			append_dev(tr, td7);
    			append_dev(td7, button0);
    			append_dev(td7, t15);
    			append_dev(td7, button1);
    			append_dev(tr, t17);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_1, false, false, false, false),
    					listen_dev(button1, "click", click_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*tasks*/ 2 && t0_value !== (t0_value = /*task*/ ctx[48].title + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*tasks*/ 2 && t2_value !== (t2_value = /*task*/ ctx[48].description + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*tasks*/ 2 && t4_value !== (t4_value = new Date(/*task*/ ctx[48].startDate).toLocaleDateString() + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*tasks*/ 2 && t6_value !== (t6_value = new Date(/*task*/ ctx[48].endDate).toLocaleDateString() + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*tasks*/ 2 && t8_value !== (t8_value = /*task*/ ctx[48].status + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*tasks*/ 2 && t10_value !== (t10_value = (/*task*/ ctx[48].createdBy || "Unknown") + "")) set_data_dev(t10, t10_value);
    			if (dirty[0] & /*tasks*/ 2 && t12_value !== (t12_value = (/*task*/ ctx[48].assignedTo || "Unknown") + "")) set_data_dev(t12, t12_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(318:12) {#each tasks as task}",
    		ctx
    	});

    	return block;
    }

    // (342:8) {#each employees as emp}
    function create_each_block_2(ctx) {
    	let option;
    	let t0_value = /*emp*/ ctx[41].firstName + "";
    	let t0;
    	let t1;
    	let t2_value = /*emp*/ ctx[41].lastName + "";
    	let t2;
    	let t3;
    	let t4_value = /*emp*/ ctx[41].role + "";
    	let t4;
    	let t5;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = text(" (");
    			t4 = text(t4_value);
    			t5 = text(")");
    			option.__value = option_value_value = /*emp*/ ctx[41].id;
    			option.value = option.__value;
    			add_location(option, file$3, 342, 10, 9873);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    			append_dev(option, t4);
    			append_dev(option, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*employees*/ 4 && t0_value !== (t0_value = /*emp*/ ctx[41].firstName + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*employees*/ 4 && t2_value !== (t2_value = /*emp*/ ctx[41].lastName + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*employees*/ 4 && t4_value !== (t4_value = /*emp*/ ctx[41].role + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*employees*/ 4 && option_value_value !== (option_value_value = /*emp*/ ctx[41].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(342:8) {#each employees as emp}",
    		ctx
    	});

    	return block;
    }

    // (355:6) {#if reportPreviewHtml}
    function create_if_block_2$1(ctx) {
    	let div;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Download PDF";
    			attr_dev(div, "class", "report-preview");
    			add_location(div, file$3, 355, 8, 10385);
    			attr_dev(button, "class", "svelte-erpzvl");
    			add_location(button, file$3, 358, 8, 10476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*reportPreviewHtml*/ ctx[7];
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*downloadReport*/ ctx[16], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*reportPreviewHtml*/ 128) div.innerHTML = /*reportPreviewHtml*/ ctx[7];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(355:6) {#if reportPreviewHtml}",
    		ctx
    	});

    	return block;
    }

    // (364:4) {#if showAssignTaskModal}
    function create_if_block_1$1(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let t6;
    	let textarea;
    	let t7;
    	let label2;
    	let t9;
    	let input1;
    	let t10;
    	let label3;
    	let t12;
    	let input2;
    	let t13;
    	let label4;
    	let t15;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t19;
    	let label5;
    	let t21;
    	let select1;
    	let option3;
    	let t23;
    	let button0;
    	let t25;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*employees*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Assign Task";
    			t1 = space();
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t6 = space();
    			textarea = element("textarea");
    			t7 = space();
    			label2 = element("label");
    			label2.textContent = "Start Date:";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			label3 = element("label");
    			label3.textContent = "End Date:";
    			t12 = space();
    			input2 = element("input");
    			t13 = space();
    			label4 = element("label");
    			label4.textContent = "Status:";
    			t15 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Pending";
    			option1 = element("option");
    			option1.textContent = "In Progress";
    			option2 = element("option");
    			option2.textContent = "Completed";
    			t19 = space();
    			label5 = element("label");
    			label5.textContent = "Assign to:";
    			t21 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Select User";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t23 = space();
    			button0 = element("button");
    			button0.textContent = "Assign Task";
    			t25 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(h2, file$3, 366, 10, 10700);
    			attr_dev(label0, "for", "managerTaskTitle");
    			add_location(label0, file$3, 368, 10, 10736);
    			attr_dev(input0, "id", "managerTaskTitle");
    			attr_dev(input0, "type", "text");
    			input0.required = true;
    			add_location(input0, file$3, 369, 10, 10792);
    			attr_dev(label1, "for", "managerTaskDescription");
    			add_location(label1, file$3, 376, 10, 10950);
    			attr_dev(textarea, "id", "managerTaskDescription");
    			textarea.required = true;
    			add_location(textarea, file$3, 377, 10, 11018);
    			attr_dev(label2, "for", "managerTaskStartDate");
    			add_location(label2, file$3, 383, 10, 11176);
    			attr_dev(input1, "id", "managerTaskStartDate");
    			attr_dev(input1, "type", "date");
    			input1.required = true;
    			add_location(input1, file$3, 384, 10, 11241);
    			attr_dev(label3, "for", "managerTaskEndDate");
    			add_location(label3, file$3, 391, 10, 11407);
    			attr_dev(input2, "id", "managerTaskEndDate");
    			attr_dev(input2, "type", "date");
    			input2.required = true;
    			add_location(input2, file$3, 392, 10, 11468);
    			attr_dev(label4, "for", "managerTaskStatus");
    			add_location(label4, file$3, 399, 10, 11630);
    			option0.__value = "Pending";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 401, 12, 11761);
    			option1.__value = "In Progress";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 402, 12, 11815);
    			option2.__value = "Completed";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 403, 12, 11877);
    			attr_dev(select0, "id", "managerTaskStatus");
    			if (/*newTask*/ ctx[5].status === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[27].call(select0));
    			add_location(select0, file$3, 400, 10, 11688);
    			attr_dev(label5, "for", "managerTaskAssignedTo");
    			add_location(label5, file$3, 406, 10, 11958);
    			option3.__value = "";
    			option3.value = option3.__value;
    			option3.disabled = true;
    			add_location(option3, file$3, 412, 12, 12164);
    			attr_dev(select1, "id", "managerTaskAssignedTo");
    			select1.required = true;
    			if (/*newTask*/ ctx[5].assignedTo === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[28].call(select1));
    			add_location(select1, file$3, 407, 10, 12023);
    			attr_dev(button0, "class", "svelte-erpzvl");
    			add_location(button0, file$3, 418, 10, 12382);
    			attr_dev(button1, "class", "svelte-erpzvl");
    			add_location(button1, file$3, 419, 10, 12444);
    			attr_dev(div0, "class", "modal-content svelte-erpzvl");
    			add_location(div0, file$3, 365, 8, 10661);
    			attr_dev(div1, "class", "modal svelte-erpzvl");
    			add_location(div1, file$3, 364, 6, 10632);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*newTask*/ ctx[5].title);
    			append_dev(div0, t4);
    			append_dev(div0, label1);
    			append_dev(div0, t6);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*newTask*/ ctx[5].description);
    			append_dev(div0, t7);
    			append_dev(div0, label2);
    			append_dev(div0, t9);
    			append_dev(div0, input1);
    			set_input_value(input1, /*newTask*/ ctx[5].startDate);
    			append_dev(div0, t10);
    			append_dev(div0, label3);
    			append_dev(div0, t12);
    			append_dev(div0, input2);
    			set_input_value(input2, /*newTask*/ ctx[5].endDate);
    			append_dev(div0, t13);
    			append_dev(div0, label4);
    			append_dev(div0, t15);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*newTask*/ ctx[5].status, true);
    			append_dev(div0, t19);
    			append_dev(div0, label5);
    			append_dev(div0, t21);
    			append_dev(div0, select1);
    			append_dev(select1, option3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*newTask*/ ctx[5].assignedTo, true);
    			append_dev(div0, t23);
    			append_dev(div0, button0);
    			append_dev(div0, t25);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[23]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[24]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[25]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[26]),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[27]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[28]),
    					listen_dev(button0, "click", /*assignTask*/ ctx[11], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_3*/ ctx[29], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newTask*/ 32 && input0.value !== /*newTask*/ ctx[5].title) {
    				set_input_value(input0, /*newTask*/ ctx[5].title);
    			}

    			if (dirty[0] & /*newTask*/ 32) {
    				set_input_value(textarea, /*newTask*/ ctx[5].description);
    			}

    			if (dirty[0] & /*newTask*/ 32) {
    				set_input_value(input1, /*newTask*/ ctx[5].startDate);
    			}

    			if (dirty[0] & /*newTask*/ 32) {
    				set_input_value(input2, /*newTask*/ ctx[5].endDate);
    			}

    			if (dirty[0] & /*newTask*/ 32) {
    				select_option(select0, /*newTask*/ ctx[5].status);
    			}

    			if (dirty[0] & /*employees*/ 4) {
    				each_value_1 = /*employees*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*newTask*/ 32) {
    				select_option(select1, /*newTask*/ ctx[5].assignedTo);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(364:4) {#if showAssignTaskModal}",
    		ctx
    	});

    	return block;
    }

    // (414:12) {#each employees as emp}
    function create_each_block_1(ctx) {
    	let option;
    	let t0_value = /*emp*/ ctx[41].firstName + "";
    	let t0;
    	let t1;
    	let t2_value = /*emp*/ ctx[41].role + "";
    	let t2;
    	let t3;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			option.__value = option_value_value = /*emp*/ ctx[41].id;
    			option.value = option.__value;
    			add_location(option, file$3, 414, 14, 12264);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*employees*/ 4 && t0_value !== (t0_value = /*emp*/ ctx[41].firstName + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*employees*/ 4 && t2_value !== (t2_value = /*emp*/ ctx[41].role + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*employees*/ 4 && option_value_value !== (option_value_value = /*emp*/ ctx[41].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(414:12) {#each employees as emp}",
    		ctx
    	});

    	return block;
    }

    // (426:4) {#if showEditTaskModal}
    function create_if_block$2(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let input0;
    	let t2;
    	let label0;
    	let t4;
    	let input1;
    	let t5;
    	let label1;
    	let t7;
    	let textarea;
    	let t8;
    	let label2;
    	let t10;
    	let input2;
    	let t11;
    	let label3;
    	let t13;
    	let input3;
    	let t14;
    	let label4;
    	let t16;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t20;
    	let label5;
    	let t22;
    	let select1;
    	let option3;
    	let t24;
    	let button0;
    	let t26;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value = /*employees*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Edit Task";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t7 = space();
    			textarea = element("textarea");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Start Date:";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "End Date:";
    			t13 = space();
    			input3 = element("input");
    			t14 = space();
    			label4 = element("label");
    			label4.textContent = "Status:";
    			t16 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Pending";
    			option1 = element("option");
    			option1.textContent = "In Progress";
    			option2 = element("option");
    			option2.textContent = "Completed";
    			t20 = space();
    			label5 = element("label");
    			label5.textContent = "Assign to:";
    			t22 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Select User";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t24 = space();
    			button0 = element("button");
    			button0.textContent = "Save Changes";
    			t26 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(h2, file$3, 428, 10, 12694);
    			attr_dev(input0, "type", "hidden");
    			add_location(input0, file$3, 429, 10, 12724);
    			attr_dev(label0, "for", "editTaskTitle");
    			add_location(label0, file$3, 431, 10, 12792);
    			attr_dev(input1, "id", "editTaskTitle");
    			attr_dev(input1, "type", "text");
    			input1.required = true;
    			add_location(input1, file$3, 432, 10, 12845);
    			attr_dev(label1, "for", "editTaskDescription");
    			add_location(label1, file$3, 439, 10, 13005);
    			attr_dev(textarea, "id", "editTaskDescription");
    			textarea.required = true;
    			add_location(textarea, file$3, 440, 10, 13070);
    			attr_dev(label2, "for", "editTaskStartDate");
    			add_location(label2, file$3, 446, 10, 13230);
    			attr_dev(input2, "id", "editTaskStartDate");
    			attr_dev(input2, "type", "date");
    			input2.required = true;
    			add_location(input2, file$3, 447, 10, 13292);
    			attr_dev(label3, "for", "editTaskEndDate");
    			add_location(label3, file$3, 454, 10, 13460);
    			attr_dev(input3, "id", "editTaskEndDate");
    			attr_dev(input3, "type", "date");
    			input3.required = true;
    			add_location(input3, file$3, 455, 10, 13518);
    			attr_dev(label4, "for", "editTaskStatus");
    			add_location(label4, file$3, 462, 10, 13682);
    			option0.__value = "Pending";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 467, 12, 13850);
    			option1.__value = "In Progress";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 468, 12, 13904);
    			option2.__value = "Completed";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 469, 12, 13966);
    			attr_dev(select0, "id", "editTaskStatus");
    			if (/*editTaskData*/ ctx[6].status === void 0) add_render_callback(() => /*select0_change_handler_1*/ ctx[35].call(select0));
    			add_location(select0, file$3, 463, 10, 13737);
    			attr_dev(label5, "for", "editTaskAssignedTo");
    			add_location(label5, file$3, 472, 10, 14047);
    			option3.__value = "";
    			option3.value = option3.__value;
    			option3.disabled = true;
    			add_location(option3, file$3, 478, 12, 14252);
    			attr_dev(select1, "id", "editTaskAssignedTo");
    			select1.required = true;
    			if (/*editTaskData*/ ctx[6].assignedTo === void 0) add_render_callback(() => /*select1_change_handler_1*/ ctx[36].call(select1));
    			add_location(select1, file$3, 473, 10, 14109);
    			attr_dev(button0, "class", "svelte-erpzvl");
    			add_location(button0, file$3, 484, 10, 14470);
    			attr_dev(button1, "class", "svelte-erpzvl");
    			add_location(button1, file$3, 485, 10, 14533);
    			attr_dev(div0, "class", "modal-content svelte-erpzvl");
    			add_location(div0, file$3, 427, 8, 12655);
    			attr_dev(div1, "class", "modal svelte-erpzvl");
    			add_location(div1, file$3, 426, 6, 12626);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*editTaskData*/ ctx[6].id);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(div0, t4);
    			append_dev(div0, input1);
    			set_input_value(input1, /*editTaskData*/ ctx[6].title);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(div0, t7);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*editTaskData*/ ctx[6].description);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(div0, t10);
    			append_dev(div0, input2);
    			set_input_value(input2, /*editTaskData*/ ctx[6].startDate);
    			append_dev(div0, t11);
    			append_dev(div0, label3);
    			append_dev(div0, t13);
    			append_dev(div0, input3);
    			set_input_value(input3, /*editTaskData*/ ctx[6].endDate);
    			append_dev(div0, t14);
    			append_dev(div0, label4);
    			append_dev(div0, t16);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*editTaskData*/ ctx[6].status, true);
    			append_dev(div0, t20);
    			append_dev(div0, label5);
    			append_dev(div0, t22);
    			append_dev(div0, select1);
    			append_dev(select1, option3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*editTaskData*/ ctx[6].assignedTo, true);
    			append_dev(div0, t24);
    			append_dev(div0, button0);
    			append_dev(div0, t26);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_2*/ ctx[30]),
    					listen_dev(input1, "input", /*input1_input_handler_2*/ ctx[31]),
    					listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[32]),
    					listen_dev(input2, "input", /*input2_input_handler_1*/ ctx[33]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[34]),
    					listen_dev(select0, "change", /*select0_change_handler_1*/ ctx[35]),
    					listen_dev(select1, "change", /*select1_change_handler_1*/ ctx[36]),
    					listen_dev(button0, "click", /*updateTask*/ ctx[13], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[37], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*editTaskData*/ 64) {
    				set_input_value(input0, /*editTaskData*/ ctx[6].id);
    			}

    			if (dirty[0] & /*editTaskData*/ 64 && input1.value !== /*editTaskData*/ ctx[6].title) {
    				set_input_value(input1, /*editTaskData*/ ctx[6].title);
    			}

    			if (dirty[0] & /*editTaskData*/ 64) {
    				set_input_value(textarea, /*editTaskData*/ ctx[6].description);
    			}

    			if (dirty[0] & /*editTaskData*/ 64) {
    				set_input_value(input2, /*editTaskData*/ ctx[6].startDate);
    			}

    			if (dirty[0] & /*editTaskData*/ 64) {
    				set_input_value(input3, /*editTaskData*/ ctx[6].endDate);
    			}

    			if (dirty[0] & /*editTaskData*/ 64) {
    				select_option(select0, /*editTaskData*/ ctx[6].status);
    			}

    			if (dirty[0] & /*employees*/ 4) {
    				each_value = /*employees*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*editTaskData*/ 64) {
    				select_option(select1, /*editTaskData*/ ctx[6].assignedTo);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(426:4) {#if showEditTaskModal}",
    		ctx
    	});

    	return block;
    }

    // (480:12) {#each employees as emp}
    function create_each_block$1(ctx) {
    	let option;
    	let t0_value = /*emp*/ ctx[41].firstName + "";
    	let t0;
    	let t1;
    	let t2_value = /*emp*/ ctx[41].role + "";
    	let t2;
    	let t3;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			option.__value = option_value_value = /*emp*/ ctx[41].id;
    			option.value = option.__value;
    			add_location(option, file$3, 480, 14, 14352);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*employees*/ 4 && t0_value !== (t0_value = /*emp*/ ctx[41].firstName + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*employees*/ 4 && t2_value !== (t2_value = /*emp*/ ctx[41].role + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*employees*/ 4 && option_value_value !== (option_value_value = /*emp*/ ctx[41].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(480:12) {#each employees as emp}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let header;
    	let h1;
    	let t1;
    	let button0;
    	let t3;
    	let main;
    	let h20;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let h21;
    	let t9;
    	let button1;
    	let t11;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t13;
    	let th1;
    	let t15;
    	let th2;
    	let t17;
    	let th3;
    	let t19;
    	let th4;
    	let t21;
    	let th5;
    	let t23;
    	let th6;
    	let t25;
    	let th7;
    	let t27;
    	let tbody;
    	let t28;
    	let h22;
    	let t30;
    	let label0;
    	let t32;
    	let select;
    	let option;
    	let t34;
    	let label1;
    	let t36;
    	let input0;
    	let t37;
    	let label2;
    	let t39;
    	let input1;
    	let t40;
    	let button2;
    	let t42;
    	let t43;
    	let t44;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*tasks*/ ctx[1].length === 0) return create_if_block_3$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let each_value_2 = /*employees*/ ctx[2];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block1 = /*reportPreviewHtml*/ ctx[7] && create_if_block_2$1(ctx);
    	let if_block2 = /*showAssignTaskModal*/ ctx[3] && create_if_block_1$1(ctx);
    	let if_block3 = /*showEditTaskModal*/ ctx[4] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Manager Dashboard";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Logout";
    			t3 = space();
    			main = element("main");
    			h20 = element("h2");
    			t4 = text("Welcome, ");
    			t5 = text(/*managerName*/ ctx[0]);
    			t6 = text("!");
    			t7 = space();
    			h21 = element("h2");
    			h21.textContent = "My Tasks";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "➕ Add Task";
    			t11 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Title";
    			t13 = space();
    			th1 = element("th");
    			th1.textContent = "Description";
    			t15 = space();
    			th2 = element("th");
    			th2.textContent = "Start Date";
    			t17 = space();
    			th3 = element("th");
    			th3.textContent = "End Date";
    			t19 = space();
    			th4 = element("th");
    			th4.textContent = "Status";
    			t21 = space();
    			th5 = element("th");
    			th5.textContent = "Assigned by";
    			t23 = space();
    			th6 = element("th");
    			th6.textContent = "Assigned To";
    			t25 = space();
    			th7 = element("th");
    			th7.textContent = "Actions";
    			t27 = space();
    			tbody = element("tbody");
    			if_block0.c();
    			t28 = space();
    			h22 = element("h2");
    			h22.textContent = "Task Report";
    			t30 = space();
    			label0 = element("label");
    			label0.textContent = "Select User:";
    			t32 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Select a user";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t34 = space();
    			label1 = element("label");
    			label1.textContent = "Start Date:";
    			t36 = space();
    			input0 = element("input");
    			t37 = space();
    			label2 = element("label");
    			label2.textContent = "End Date:";
    			t39 = space();
    			input1 = element("input");
    			t40 = space();
    			button2 = element("button");
    			button2.textContent = "Preview Report";
    			t42 = space();
    			if (if_block1) if_block1.c();
    			t43 = space();
    			if (if_block2) if_block2.c();
    			t44 = space();
    			if (if_block3) if_block3.c();
    			add_location(h1, file$3, 290, 6, 8116);
    			attr_dev(button0, "class", "svelte-erpzvl");
    			add_location(button0, file$3, 291, 6, 8150);
    			attr_dev(header, "class", "svelte-erpzvl");
    			add_location(header, file$3, 289, 4, 8100);
    			add_location(h20, file$3, 295, 6, 8230);
    			add_location(h21, file$3, 297, 6, 8274);
    			attr_dev(button1, "class", "svelte-erpzvl");
    			add_location(button1, file$3, 298, 6, 8299);
    			attr_dev(th0, "class", "svelte-erpzvl");
    			add_location(th0, file$3, 303, 12, 8438);
    			attr_dev(th1, "class", "svelte-erpzvl");
    			add_location(th1, file$3, 304, 12, 8466);
    			attr_dev(th2, "class", "svelte-erpzvl");
    			add_location(th2, file$3, 305, 12, 8500);
    			attr_dev(th3, "class", "svelte-erpzvl");
    			add_location(th3, file$3, 306, 12, 8533);
    			attr_dev(th4, "class", "svelte-erpzvl");
    			add_location(th4, file$3, 307, 12, 8564);
    			attr_dev(th5, "class", "svelte-erpzvl");
    			add_location(th5, file$3, 308, 12, 8593);
    			attr_dev(th6, "class", "svelte-erpzvl");
    			add_location(th6, file$3, 309, 12, 8627);
    			attr_dev(th7, "class", "svelte-erpzvl");
    			add_location(th7, file$3, 310, 12, 8661);
    			add_location(tr, file$3, 302, 10, 8420);
    			add_location(thead, file$3, 301, 8, 8401);
    			add_location(tbody, file$3, 313, 8, 8722);
    			attr_dev(table, "class", "svelte-erpzvl");
    			add_location(table, file$3, 300, 6, 8384);
    			add_location(h22, file$3, 337, 6, 9627);
    			attr_dev(label0, "for", "reportUserSelect");
    			add_location(label0, file$3, 338, 6, 9655);
    			option.__value = "";
    			option.value = option.__value;
    			option.disabled = true;
    			add_location(option, file$3, 340, 8, 9779);
    			attr_dev(select, "id", "reportUserSelect");
    			if (/*reportUserId*/ ctx[10] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[20].call(select));
    			add_location(select, file$3, 339, 6, 9713);
    			attr_dev(label1, "for", "reportStartDateInput");
    			add_location(label1, file$3, 346, 6, 9994);
    			attr_dev(input0, "id", "reportStartDateInput");
    			attr_dev(input0, "type", "date");
    			add_location(input0, file$3, 347, 6, 10055);
    			attr_dev(label2, "for", "reportEndDateInput");
    			add_location(label2, file$3, 349, 6, 10143);
    			attr_dev(input1, "id", "reportEndDateInput");
    			attr_dev(input1, "type", "date");
    			add_location(input1, file$3, 350, 6, 10200);
    			attr_dev(button2, "class", "svelte-erpzvl");
    			add_location(button2, file$3, 352, 6, 10284);
    			add_location(main, file$3, 294, 4, 8216);
    			add_location(div, file$3, 288, 2, 8089);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, button0);
    			append_dev(div, t3);
    			append_dev(div, main);
    			append_dev(main, h20);
    			append_dev(h20, t4);
    			append_dev(h20, t5);
    			append_dev(h20, t6);
    			append_dev(main, t7);
    			append_dev(main, h21);
    			append_dev(main, t9);
    			append_dev(main, button1);
    			append_dev(main, t11);
    			append_dev(main, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t13);
    			append_dev(tr, th1);
    			append_dev(tr, t15);
    			append_dev(tr, th2);
    			append_dev(tr, t17);
    			append_dev(tr, th3);
    			append_dev(tr, t19);
    			append_dev(tr, th4);
    			append_dev(tr, t21);
    			append_dev(tr, th5);
    			append_dev(tr, t23);
    			append_dev(tr, th6);
    			append_dev(tr, t25);
    			append_dev(tr, th7);
    			append_dev(table, t27);
    			append_dev(table, tbody);
    			if_block0.m(tbody, null);
    			append_dev(main, t28);
    			append_dev(main, h22);
    			append_dev(main, t30);
    			append_dev(main, label0);
    			append_dev(main, t32);
    			append_dev(main, select);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select, null);
    				}
    			}

    			select_option(select, /*reportUserId*/ ctx[10], true);
    			append_dev(main, t34);
    			append_dev(main, label1);
    			append_dev(main, t36);
    			append_dev(main, input0);
    			set_input_value(input0, /*reportStartDate*/ ctx[8]);
    			append_dev(main, t37);
    			append_dev(main, label2);
    			append_dev(main, t39);
    			append_dev(main, input1);
    			set_input_value(input1, /*reportEndDate*/ ctx[9]);
    			append_dev(main, t40);
    			append_dev(main, button2);
    			append_dev(main, t42);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(div, t43);
    			if (if_block2) if_block2.m(div, null);
    			append_dev(div, t44);
    			if (if_block3) if_block3.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", logout$1, false, false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[17], false, false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[20]),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[21]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[22]),
    					listen_dev(button2, "click", /*previewReport*/ ctx[15], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*managerName*/ 1) set_data_dev(t5, /*managerName*/ ctx[0]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(tbody, null);
    				}
    			}

    			if (dirty[0] & /*employees*/ 4) {
    				each_value_2 = /*employees*/ ctx[2];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (dirty[0] & /*reportUserId, employees*/ 1028) {
    				select_option(select, /*reportUserId*/ ctx[10]);
    			}

    			if (dirty[0] & /*reportStartDate*/ 256) {
    				set_input_value(input0, /*reportStartDate*/ ctx[8]);
    			}

    			if (dirty[0] & /*reportEndDate*/ 512) {
    				set_input_value(input1, /*reportEndDate*/ ctx[9]);
    			}

    			if (/*reportPreviewHtml*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*showAssignTaskModal*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(div, t44);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*showEditTaskModal*/ ctx[4]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					if_block3.m(div, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const API_URL$1 = "http://localhost:3000";

    // Logout
    function logout$1() {
    	localStorage.removeItem("loggedInUser");
    	window.location.href = "/";
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Manager', slots, []);
    	let managerName = "";
    	let tasks = [];
    	let employees = [];
    	let loggedInUser;

    	// Modals
    	let showAssignTaskModal = false;

    	let showEditTaskModal = false;

    	// Form data for new task
    	let newTask = {
    		title: "",
    		description: "",
    		startDate: "",
    		endDate: "",
    		status: "Pending",
    		assignedTo: ""
    	};

    	// Form data for editing a task
    	let editTaskData = {
    		id: null,
    		title: "",
    		description: "",
    		startDate: "",
    		endDate: "",
    		status: "",
    		assignedTo: ""
    	};

    	// Report state
    	let reportPreviewHtml = "";

    	let reportStartDate = "";
    	let reportEndDate = "";
    	let reportUserId = "";

    	onMount(() => {
    		loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    		if (loggedInUser) {
    			$$invalidate(0, managerName = `${loggedInUser.firstName} ${loggedInUser.lastName}`);
    			loadTasks();
    			loadEmployeesForManager();
    		}
    	});

    	// ---------------------
    	// Load tasks & employees
    	// ---------------------
    	async function loadTasks() {
    		try {
    			if (!loggedInUser) return;
    			const url = `${API_URL$1}/tasks?userId=${loggedInUser.id}&role=${loggedInUser.role}&office=${encodeURIComponent(loggedInUser.office)}`;
    			const res = await fetch(url);
    			$$invalidate(1, tasks = await res.json());
    		} catch(error) {
    			console.error("Error loading tasks:", error);
    		}
    	}

    	async function loadEmployeesForManager() {
    		try {
    			if (!loggedInUser) return;
    			const res = await fetch(`${API_URL$1}/users`);
    			const allUsers = await res.json();

    			// Include only employees in the same office as the manager
    			$$invalidate(2, employees = allUsers.filter(u => u.role === "Employee" && u.office.trim().toLowerCase() === loggedInUser.office.trim().toLowerCase()));
    		} catch(error) {
    			console.error("Error loading employees:", error);
    		}
    	}

    	// ---------------------
    	// Task Operations
    	// ---------------------
    	async function assignTask() {
    		if (!loggedInUser) {
    			alert("You must be logged in as a Manager.");
    			return;
    		}

    		const taskToSend = { ...newTask, createdBy: loggedInUser.id };

    		if (!taskToSend.title || !taskToSend.startDate || !taskToSend.endDate || !taskToSend.assignedTo) {
    			alert("Please fill in all required fields.");
    			return;
    		}

    		try {
    			const res = await fetch(`${API_URL$1}/tasks`, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(taskToSend)
    			});

    			const data = await res.json();
    			console.log("Task assigned:", data);
    			await loadTasks();
    			$$invalidate(3, showAssignTaskModal = false);

    			// Reset the form
    			$$invalidate(5, newTask = {
    				title: "",
    				description: "",
    				startDate: "",
    				endDate: "",
    				status: "Pending",
    				assignedTo: ""
    			});
    		} catch(error) {
    			console.error("Error assigning task:", error);
    			alert("Error assigning task.");
    		}
    	}

    	async function editTask(taskId) {
    		try {
    			const res = await fetch(`${API_URL$1}/tasks/${taskId}`);
    			const task = await res.json();

    			$$invalidate(6, editTaskData = {
    				id: task.id,
    				title: task.title,
    				description: task.description,
    				startDate: task.startDate ? task.startDate.split("T")[0] : "",
    				endDate: task.endDate ? task.endDate.split("T")[0] : "",
    				status: task.status,
    				assignedTo: task.assignedTo
    			});

    			$$invalidate(4, showEditTaskModal = true);
    		} catch(error) {
    			console.error("Error fetching task details:", error);
    		}
    	}

    	async function updateTask() {
    		try {
    			const res = await fetch(`${API_URL$1}/tasks/${editTaskData.id}`, {
    				method: "PUT",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(editTaskData)
    			});

    			const data = await res.json();
    			console.log("Task updated:", data);
    			await loadTasks();
    			$$invalidate(4, showEditTaskModal = false);
    		} catch(error) {
    			console.error("Error updating task:", error);
    		}
    	}

    	async function deleteTask(taskId) {
    		try {
    			await fetch(`${API_URL$1}/tasks/${taskId}`, { method: "DELETE" });
    			await loadTasks();
    		} catch(error) {
    			console.error("Error deleting task:", error);
    		}
    	}

    	// ---------------------
    	// Report Generation
    	// ---------------------
    	async function previewReport() {
    		if (!reportUserId || !reportStartDate || !reportEndDate) {
    			alert("Please select a user and a date range.");
    			return;
    		}

    		try {
    			const res = await fetch(`${API_URL$1}/tasks?userId=${reportUserId}`);
    			const allTasks = await res.json();

    			const filtered = allTasks.filter(task => {
    				const taskDate = new Date(task.startDate);
    				return taskDate >= new Date(reportStartDate) && taskDate <= new Date(reportEndDate);
    			});

    			if (filtered.length === 0) {
    				$$invalidate(7, reportPreviewHtml = "<p>No tasks found for the selected criteria.</p>");
    			} else {
    				let html = `<table border='1' style='width:100%; border-collapse: collapse;'>
            <tr>
              <th>ID</th><th>Title</th><th>Description</th>
              <th>Start Date</th><th>End Date</th><th>Status</th>
            </tr>`;

    				filtered.forEach(task => {
    					html += `<tr>
              <td>${task.id}</td>
              <td>${task.title}</td>
              <td>${task.description}</td>
              <td>${new Date(task.startDate).toLocaleDateString()}</td>
              <td>${new Date(task.endDate).toLocaleDateString()}</td>
              <td>${task.status}</td>
            </tr>`;
    				});

    				html += "</table>";
    				$$invalidate(7, reportPreviewHtml = html);
    			}
    		} catch(error) {
    			console.error("Error generating report:", error);
    		}
    	}

    	function downloadReport() {
    		const { jsPDF } = window.jspdf;
    		const doc = new jsPDF();

    		doc.html(reportPreviewHtml, {
    			callback(doc) {
    				doc.save("task_report.pdf");
    			},
    			x: 10,
    			y: 10,
    			html2canvas: { scale: 0.295 }
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Manager> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(3, showAssignTaskModal = true);
    	const click_handler_1 = task => editTask(task.id);
    	const click_handler_2 = task => deleteTask(task.id);

    	function select_change_handler() {
    		reportUserId = select_value(this);
    		$$invalidate(10, reportUserId);
    		$$invalidate(2, employees);
    	}

    	function input0_input_handler() {
    		reportStartDate = this.value;
    		$$invalidate(8, reportStartDate);
    	}

    	function input1_input_handler() {
    		reportEndDate = this.value;
    		$$invalidate(9, reportEndDate);
    	}

    	function input0_input_handler_1() {
    		newTask.title = this.value;
    		$$invalidate(5, newTask);
    	}

    	function textarea_input_handler() {
    		newTask.description = this.value;
    		$$invalidate(5, newTask);
    	}

    	function input1_input_handler_1() {
    		newTask.startDate = this.value;
    		$$invalidate(5, newTask);
    	}

    	function input2_input_handler() {
    		newTask.endDate = this.value;
    		$$invalidate(5, newTask);
    	}

    	function select0_change_handler() {
    		newTask.status = select_value(this);
    		$$invalidate(5, newTask);
    	}

    	function select1_change_handler() {
    		newTask.assignedTo = select_value(this);
    		$$invalidate(5, newTask);
    	}

    	const click_handler_3 = () => $$invalidate(3, showAssignTaskModal = false);

    	function input0_input_handler_2() {
    		editTaskData.id = this.value;
    		$$invalidate(6, editTaskData);
    	}

    	function input1_input_handler_2() {
    		editTaskData.title = this.value;
    		$$invalidate(6, editTaskData);
    	}

    	function textarea_input_handler_1() {
    		editTaskData.description = this.value;
    		$$invalidate(6, editTaskData);
    	}

    	function input2_input_handler_1() {
    		editTaskData.startDate = this.value;
    		$$invalidate(6, editTaskData);
    	}

    	function input3_input_handler() {
    		editTaskData.endDate = this.value;
    		$$invalidate(6, editTaskData);
    	}

    	function select0_change_handler_1() {
    		editTaskData.status = select_value(this);
    		$$invalidate(6, editTaskData);
    	}

    	function select1_change_handler_1() {
    		editTaskData.assignedTo = select_value(this);
    		$$invalidate(6, editTaskData);
    	}

    	const click_handler_4 = () => $$invalidate(4, showEditTaskModal = false);

    	$$self.$capture_state = () => ({
    		onMount,
    		managerName,
    		tasks,
    		employees,
    		loggedInUser,
    		showAssignTaskModal,
    		showEditTaskModal,
    		newTask,
    		editTaskData,
    		reportPreviewHtml,
    		reportStartDate,
    		reportEndDate,
    		reportUserId,
    		API_URL: API_URL$1,
    		loadTasks,
    		loadEmployeesForManager,
    		assignTask,
    		editTask,
    		updateTask,
    		deleteTask,
    		previewReport,
    		downloadReport,
    		logout: logout$1
    	});

    	$$self.$inject_state = $$props => {
    		if ('managerName' in $$props) $$invalidate(0, managerName = $$props.managerName);
    		if ('tasks' in $$props) $$invalidate(1, tasks = $$props.tasks);
    		if ('employees' in $$props) $$invalidate(2, employees = $$props.employees);
    		if ('loggedInUser' in $$props) loggedInUser = $$props.loggedInUser;
    		if ('showAssignTaskModal' in $$props) $$invalidate(3, showAssignTaskModal = $$props.showAssignTaskModal);
    		if ('showEditTaskModal' in $$props) $$invalidate(4, showEditTaskModal = $$props.showEditTaskModal);
    		if ('newTask' in $$props) $$invalidate(5, newTask = $$props.newTask);
    		if ('editTaskData' in $$props) $$invalidate(6, editTaskData = $$props.editTaskData);
    		if ('reportPreviewHtml' in $$props) $$invalidate(7, reportPreviewHtml = $$props.reportPreviewHtml);
    		if ('reportStartDate' in $$props) $$invalidate(8, reportStartDate = $$props.reportStartDate);
    		if ('reportEndDate' in $$props) $$invalidate(9, reportEndDate = $$props.reportEndDate);
    		if ('reportUserId' in $$props) $$invalidate(10, reportUserId = $$props.reportUserId);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		managerName,
    		tasks,
    		employees,
    		showAssignTaskModal,
    		showEditTaskModal,
    		newTask,
    		editTaskData,
    		reportPreviewHtml,
    		reportStartDate,
    		reportEndDate,
    		reportUserId,
    		assignTask,
    		editTask,
    		updateTask,
    		deleteTask,
    		previewReport,
    		downloadReport,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		select_change_handler,
    		input0_input_handler,
    		input1_input_handler,
    		input0_input_handler_1,
    		textarea_input_handler,
    		input1_input_handler_1,
    		input2_input_handler,
    		select0_change_handler,
    		select1_change_handler,
    		click_handler_3,
    		input0_input_handler_2,
    		input1_input_handler_2,
    		textarea_input_handler_1,
    		input2_input_handler_1,
    		input3_input_handler,
    		select0_change_handler_1,
    		select1_change_handler_1,
    		click_handler_4
    	];
    }

    class Manager extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Manager",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Employee.svelte generated by Svelte v3.59.2 */

    const { console: console_1$1 } = globals;
    const file$2 = "src\\Employee.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	return child_ctx;
    }

    // (227:10) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*tasks*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*deleteTask, tasks, editTask*/ 5122) {
    				each_value = /*tasks*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(227:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (223:10) {#if tasks.length === 0}
    function create_if_block_3(ctx) {
    	let tr;
    	let td;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td = element("td");
    			td.textContent = "No tasks found.";
    			attr_dev(td, "colspan", "6");
    			attr_dev(td, "class", "svelte-sr5sld");
    			add_location(td, file$2, 224, 14, 6637);
    			add_location(tr, file$2, 223, 12, 6617);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(223:10) {#if tasks.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (228:12) {#each tasks as task}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*task*/ ctx[35].title + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*task*/ ctx[35].description + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = new Date(/*task*/ ctx[35].startDate).toLocaleDateString() + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = new Date(/*task*/ ctx[35].endDate).toLocaleDateString() + "";
    	let t6;
    	let t7;
    	let td4;
    	let t8_value = /*task*/ ctx[35].status + "";
    	let t8;
    	let t9;
    	let td5;
    	let button0;
    	let t11;
    	let button1;
    	let t13;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[16](/*task*/ ctx[35]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[17](/*task*/ ctx[35]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td5 = element("td");
    			button0 = element("button");
    			button0.textContent = "✏️ Edit";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "🗑 Delete";
    			t13 = space();
    			attr_dev(td0, "class", "svelte-sr5sld");
    			add_location(td0, file$2, 229, 16, 6784);
    			attr_dev(td1, "class", "svelte-sr5sld");
    			add_location(td1, file$2, 230, 16, 6823);
    			attr_dev(td2, "class", "svelte-sr5sld");
    			add_location(td2, file$2, 231, 16, 6868);
    			attr_dev(td3, "class", "svelte-sr5sld");
    			add_location(td3, file$2, 232, 16, 6942);
    			attr_dev(td4, "class", "svelte-sr5sld");
    			add_location(td4, file$2, 233, 16, 7014);
    			attr_dev(button0, "class", "svelte-sr5sld");
    			add_location(button0, file$2, 235, 18, 7078);
    			attr_dev(button1, "class", "svelte-sr5sld");
    			add_location(button1, file$2, 236, 18, 7157);
    			attr_dev(td5, "class", "svelte-sr5sld");
    			add_location(td5, file$2, 234, 16, 7054);
    			add_location(tr, file$2, 228, 14, 6762);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td5);
    			append_dev(td5, button0);
    			append_dev(td5, t11);
    			append_dev(td5, button1);
    			append_dev(tr, t13);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_1, false, false, false, false),
    					listen_dev(button1, "click", click_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*tasks*/ 2 && t0_value !== (t0_value = /*task*/ ctx[35].title + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*tasks*/ 2 && t2_value !== (t2_value = /*task*/ ctx[35].description + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*tasks*/ 2 && t4_value !== (t4_value = new Date(/*task*/ ctx[35].startDate).toLocaleDateString() + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*tasks*/ 2 && t6_value !== (t6_value = new Date(/*task*/ ctx[35].endDate).toLocaleDateString() + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*tasks*/ 2 && t8_value !== (t8_value = /*task*/ ctx[35].status + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(228:12) {#each tasks as task}",
    		ctx
    	});

    	return block;
    }

    // (254:6) {#if reportPreviewHtml}
    function create_if_block_2(ctx) {
    	let div;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Download PDF";
    			attr_dev(div, "class", "report-preview");
    			add_location(div, file$2, 254, 8, 7800);
    			attr_dev(button, "class", "svelte-sr5sld");
    			add_location(button, file$2, 257, 8, 7891);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*reportPreviewHtml*/ ctx[6];
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*downloadReport*/ ctx[14], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*reportPreviewHtml*/ 64) div.innerHTML = /*reportPreviewHtml*/ ctx[6];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(254:6) {#if reportPreviewHtml}",
    		ctx
    	});

    	return block;
    }

    // (263:4) {#if showTaskModal}
    function create_if_block_1(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let t6;
    	let textarea;
    	let t7;
    	let label2;
    	let t9;
    	let input1;
    	let t10;
    	let label3;
    	let t12;
    	let input2;
    	let t13;
    	let label4;
    	let t15;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t19;
    	let button0;
    	let t21;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Add Task";
    			t1 = space();
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t6 = space();
    			textarea = element("textarea");
    			t7 = space();
    			label2 = element("label");
    			label2.textContent = "Start Date:";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			label3 = element("label");
    			label3.textContent = "End Date:";
    			t12 = space();
    			input2 = element("input");
    			t13 = space();
    			label4 = element("label");
    			label4.textContent = "Status:";
    			t15 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Pending";
    			option1 = element("option");
    			option1.textContent = "In Progress";
    			option2 = element("option");
    			option2.textContent = "Completed";
    			t19 = space();
    			button0 = element("button");
    			button0.textContent = "Add Task";
    			t21 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(h2, file$2, 265, 10, 8109);
    			attr_dev(label0, "for", "newTaskTitle");
    			add_location(label0, file$2, 266, 10, 8138);
    			attr_dev(input0, "id", "newTaskTitle");
    			attr_dev(input0, "type", "text");
    			input0.required = true;
    			add_location(input0, file$2, 267, 10, 8190);
    			attr_dev(label1, "for", "newTaskDescription");
    			add_location(label1, file$2, 269, 10, 8289);
    			attr_dev(textarea, "id", "newTaskDescription");
    			textarea.required = true;
    			add_location(textarea, file$2, 270, 10, 8353);
    			attr_dev(label2, "for", "newTaskStart");
    			add_location(label2, file$2, 272, 10, 8464);
    			attr_dev(input1, "id", "newTaskStart");
    			attr_dev(input1, "type", "date");
    			input1.required = true;
    			add_location(input1, file$2, 273, 10, 8521);
    			attr_dev(label3, "for", "newTaskEnd");
    			add_location(label3, file$2, 275, 10, 8624);
    			attr_dev(input2, "id", "newTaskEnd");
    			attr_dev(input2, "type", "date");
    			input2.required = true;
    			add_location(input2, file$2, 276, 10, 8677);
    			attr_dev(label4, "for", "newTaskStatus");
    			add_location(label4, file$2, 278, 10, 8776);
    			option0.__value = "Pending";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 280, 12, 8899);
    			option1.__value = "In Progress";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 281, 12, 8953);
    			option2.__value = "Completed";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 282, 12, 9015);
    			attr_dev(select, "id", "newTaskStatus");
    			if (/*newTask*/ ctx[4].status === void 0) add_render_callback(() => /*select_change_handler*/ ctx[24].call(select));
    			add_location(select, file$2, 279, 10, 8830);
    			attr_dev(button0, "class", "svelte-sr5sld");
    			add_location(button0, file$2, 285, 10, 9104);
    			attr_dev(button1, "class", "svelte-sr5sld");
    			add_location(button1, file$2, 286, 10, 9160);
    			attr_dev(div0, "class", "modal-content svelte-sr5sld");
    			add_location(div0, file$2, 264, 8, 8070);
    			attr_dev(div1, "class", "modal svelte-sr5sld");
    			add_location(div1, file$2, 263, 6, 8041);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*newTask*/ ctx[4].title);
    			append_dev(div0, t4);
    			append_dev(div0, label1);
    			append_dev(div0, t6);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*newTask*/ ctx[4].description);
    			append_dev(div0, t7);
    			append_dev(div0, label2);
    			append_dev(div0, t9);
    			append_dev(div0, input1);
    			set_input_value(input1, /*newTask*/ ctx[4].startDate);
    			append_dev(div0, t10);
    			append_dev(div0, label3);
    			append_dev(div0, t12);
    			append_dev(div0, input2);
    			set_input_value(input2, /*newTask*/ ctx[4].endDate);
    			append_dev(div0, t13);
    			append_dev(div0, label4);
    			append_dev(div0, t15);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*newTask*/ ctx[4].status, true);
    			append_dev(div0, t19);
    			append_dev(div0, button0);
    			append_dev(div0, t21);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[20]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[21]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[22]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[23]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[24]),
    					listen_dev(button0, "click", /*addTask*/ ctx[9], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_3*/ ctx[25], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newTask*/ 16 && input0.value !== /*newTask*/ ctx[4].title) {
    				set_input_value(input0, /*newTask*/ ctx[4].title);
    			}

    			if (dirty[0] & /*newTask*/ 16) {
    				set_input_value(textarea, /*newTask*/ ctx[4].description);
    			}

    			if (dirty[0] & /*newTask*/ 16) {
    				set_input_value(input1, /*newTask*/ ctx[4].startDate);
    			}

    			if (dirty[0] & /*newTask*/ 16) {
    				set_input_value(input2, /*newTask*/ ctx[4].endDate);
    			}

    			if (dirty[0] & /*newTask*/ 16) {
    				select_option(select, /*newTask*/ ctx[4].status);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(263:4) {#if showTaskModal}",
    		ctx
    	});

    	return block;
    }

    // (293:4) {#if showEditTaskModal}
    function create_if_block$1(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let input0;
    	let t2;
    	let label0;
    	let t4;
    	let input1;
    	let t5;
    	let label1;
    	let t7;
    	let textarea;
    	let t8;
    	let label2;
    	let t10;
    	let input2;
    	let t11;
    	let label3;
    	let t13;
    	let input3;
    	let t14;
    	let label4;
    	let t16;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t20;
    	let button0;
    	let t22;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Edit Task";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t7 = space();
    			textarea = element("textarea");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Start Date:";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "End Date:";
    			t13 = space();
    			input3 = element("input");
    			t14 = space();
    			label4 = element("label");
    			label4.textContent = "Status:";
    			t16 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Pending";
    			option1 = element("option");
    			option1.textContent = "In Progress";
    			option2 = element("option");
    			option2.textContent = "Completed";
    			t20 = space();
    			button0 = element("button");
    			button0.textContent = "Save Changes";
    			t22 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(h2, file$2, 295, 10, 9402);
    			attr_dev(input0, "type", "hidden");
    			add_location(input0, file$2, 296, 10, 9432);
    			attr_dev(label0, "for", "editTaskTitle");
    			add_location(label0, file$2, 298, 10, 9508);
    			attr_dev(input1, "id", "editTaskTitle");
    			attr_dev(input1, "type", "text");
    			input1.required = true;
    			add_location(input1, file$2, 299, 10, 9561);
    			attr_dev(label1, "for", "editTaskDescription");
    			add_location(label1, file$2, 301, 10, 9666);
    			attr_dev(textarea, "id", "editTaskDescription");
    			textarea.required = true;
    			add_location(textarea, file$2, 302, 10, 9731);
    			attr_dev(label2, "for", "editTaskStart");
    			add_location(label2, file$2, 304, 10, 9848);
    			attr_dev(input2, "id", "editTaskStart");
    			attr_dev(input2, "type", "date");
    			input2.required = true;
    			add_location(input2, file$2, 305, 10, 9906);
    			attr_dev(label3, "for", "editTaskEnd");
    			add_location(label3, file$2, 307, 10, 10015);
    			attr_dev(input3, "id", "editTaskEnd");
    			attr_dev(input3, "type", "date");
    			input3.required = true;
    			add_location(input3, file$2, 308, 10, 10069);
    			attr_dev(label4, "for", "editTaskStatus");
    			add_location(label4, file$2, 310, 10, 10174);
    			option0.__value = "Pending";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 312, 12, 10304);
    			option1.__value = "In Progress";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 313, 12, 10358);
    			option2.__value = "Completed";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 314, 12, 10420);
    			attr_dev(select, "id", "editTaskStatus");
    			if (/*editTaskData*/ ctx[5].status === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[31].call(select));
    			add_location(select, file$2, 311, 10, 10229);
    			attr_dev(button0, "class", "svelte-sr5sld");
    			add_location(button0, file$2, 317, 10, 10509);
    			attr_dev(button1, "class", "svelte-sr5sld");
    			add_location(button1, file$2, 318, 10, 10572);
    			attr_dev(div0, "class", "modal-content svelte-sr5sld");
    			add_location(div0, file$2, 294, 8, 9363);
    			attr_dev(div1, "class", "modal svelte-sr5sld");
    			add_location(div1, file$2, 293, 6, 9334);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*editTaskData*/ ctx[5].id);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(div0, t4);
    			append_dev(div0, input1);
    			set_input_value(input1, /*editTaskData*/ ctx[5].title);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(div0, t7);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*editTaskData*/ ctx[5].description);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(div0, t10);
    			append_dev(div0, input2);
    			set_input_value(input2, /*editTaskData*/ ctx[5].startDate);
    			append_dev(div0, t11);
    			append_dev(div0, label3);
    			append_dev(div0, t13);
    			append_dev(div0, input3);
    			set_input_value(input3, /*editTaskData*/ ctx[5].endDate);
    			append_dev(div0, t14);
    			append_dev(div0, label4);
    			append_dev(div0, t16);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*editTaskData*/ ctx[5].status, true);
    			append_dev(div0, t20);
    			append_dev(div0, button0);
    			append_dev(div0, t22);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_2*/ ctx[26]),
    					listen_dev(input1, "input", /*input1_input_handler_2*/ ctx[27]),
    					listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[28]),
    					listen_dev(input2, "input", /*input2_input_handler_1*/ ctx[29]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[30]),
    					listen_dev(select, "change", /*select_change_handler_1*/ ctx[31]),
    					listen_dev(button0, "click", /*updateTask*/ ctx[11], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[32], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*editTaskData*/ 32) {
    				set_input_value(input0, /*editTaskData*/ ctx[5].id);
    			}

    			if (dirty[0] & /*editTaskData*/ 32 && input1.value !== /*editTaskData*/ ctx[5].title) {
    				set_input_value(input1, /*editTaskData*/ ctx[5].title);
    			}

    			if (dirty[0] & /*editTaskData*/ 32) {
    				set_input_value(textarea, /*editTaskData*/ ctx[5].description);
    			}

    			if (dirty[0] & /*editTaskData*/ 32) {
    				set_input_value(input2, /*editTaskData*/ ctx[5].startDate);
    			}

    			if (dirty[0] & /*editTaskData*/ 32) {
    				set_input_value(input3, /*editTaskData*/ ctx[5].endDate);
    			}

    			if (dirty[0] & /*editTaskData*/ 32) {
    				select_option(select, /*editTaskData*/ ctx[5].status);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(293:4) {#if showEditTaskModal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t1;
    	let button0;
    	let t3;
    	let h20;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let section0;
    	let button1;
    	let t9;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t11;
    	let th1;
    	let t13;
    	let th2;
    	let t15;
    	let th3;
    	let t17;
    	let th4;
    	let t19;
    	let th5;
    	let t21;
    	let tbody;
    	let t22;
    	let section1;
    	let h21;
    	let t24;
    	let label0;
    	let t26;
    	let input0;
    	let t27;
    	let label1;
    	let t29;
    	let input1;
    	let t30;
    	let button2;
    	let t32;
    	let t33;
    	let t34;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*tasks*/ ctx[1].length === 0) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*reportPreviewHtml*/ ctx[6] && create_if_block_2(ctx);
    	let if_block2 = /*showTaskModal*/ ctx[2] && create_if_block_1(ctx);
    	let if_block3 = /*showEditTaskModal*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Employee Dashboard";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Logout";
    			t3 = space();
    			h20 = element("h2");
    			t4 = text("Welcome, ");
    			t5 = text(/*employeeName*/ ctx[0]);
    			t6 = text("!");
    			t7 = space();
    			section0 = element("section");
    			button1 = element("button");
    			button1.textContent = "➕ Add Task";
    			t9 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Title";
    			t11 = space();
    			th1 = element("th");
    			th1.textContent = "Description";
    			t13 = space();
    			th2 = element("th");
    			th2.textContent = "Start Date";
    			t15 = space();
    			th3 = element("th");
    			th3.textContent = "End Date";
    			t17 = space();
    			th4 = element("th");
    			th4.textContent = "Status";
    			t19 = space();
    			th5 = element("th");
    			th5.textContent = "Actions";
    			t21 = space();
    			tbody = element("tbody");
    			if_block0.c();
    			t22 = space();
    			section1 = element("section");
    			h21 = element("h2");
    			h21.textContent = "Task Report";
    			t24 = space();
    			label0 = element("label");
    			label0.textContent = "Start Date:";
    			t26 = space();
    			input0 = element("input");
    			t27 = space();
    			label1 = element("label");
    			label1.textContent = "End Date:";
    			t29 = space();
    			input1 = element("input");
    			t30 = space();
    			button2 = element("button");
    			button2.textContent = "Preview Report";
    			t32 = space();
    			if (if_block1) if_block1.c();
    			t33 = space();
    			if (if_block2) if_block2.c();
    			t34 = space();
    			if (if_block3) if_block3.c();
    			add_location(h1, file$2, 201, 6, 6032);
    			attr_dev(button0, "class", "svelte-sr5sld");
    			add_location(button0, file$2, 202, 6, 6067);
    			attr_dev(header, "class", "svelte-sr5sld");
    			add_location(header, file$2, 200, 4, 6016);
    			add_location(h20, file$2, 205, 4, 6133);
    			attr_dev(button1, "class", "svelte-sr5sld");
    			add_location(button1, file$2, 209, 6, 6217);
    			attr_dev(th0, "class", "svelte-sr5sld");
    			add_location(th0, file$2, 213, 12, 6344);
    			attr_dev(th1, "class", "svelte-sr5sld");
    			add_location(th1, file$2, 214, 12, 6372);
    			attr_dev(th2, "class", "svelte-sr5sld");
    			add_location(th2, file$2, 215, 12, 6406);
    			attr_dev(th3, "class", "svelte-sr5sld");
    			add_location(th3, file$2, 216, 12, 6439);
    			attr_dev(th4, "class", "svelte-sr5sld");
    			add_location(th4, file$2, 217, 12, 6470);
    			attr_dev(th5, "class", "svelte-sr5sld");
    			add_location(th5, file$2, 218, 12, 6499);
    			add_location(tr, file$2, 212, 10, 6326);
    			add_location(thead, file$2, 211, 8, 6307);
    			add_location(tbody, file$2, 221, 8, 6560);
    			attr_dev(table, "class", "svelte-sr5sld");
    			add_location(table, file$2, 210, 6, 6290);
    			add_location(section0, file$2, 208, 4, 6200);
    			add_location(h21, file$2, 247, 6, 7413);
    			attr_dev(label0, "for", "reportStartDate");
    			add_location(label0, file$2, 248, 6, 7441);
    			attr_dev(input0, "id", "reportStartDate");
    			attr_dev(input0, "type", "date");
    			add_location(input0, file$2, 249, 6, 7497);
    			attr_dev(label1, "for", "reportEndDate");
    			add_location(label1, file$2, 250, 6, 7576);
    			attr_dev(input1, "id", "reportEndDate");
    			attr_dev(input1, "type", "date");
    			add_location(input1, file$2, 251, 6, 7628);
    			attr_dev(button2, "class", "svelte-sr5sld");
    			add_location(button2, file$2, 252, 6, 7703);
    			add_location(section1, file$2, 246, 4, 7396);
    			add_location(main, file$2, 199, 2, 6004);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, button0);
    			append_dev(main, t3);
    			append_dev(main, h20);
    			append_dev(h20, t4);
    			append_dev(h20, t5);
    			append_dev(h20, t6);
    			append_dev(main, t7);
    			append_dev(main, section0);
    			append_dev(section0, button1);
    			append_dev(section0, t9);
    			append_dev(section0, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t11);
    			append_dev(tr, th1);
    			append_dev(tr, t13);
    			append_dev(tr, th2);
    			append_dev(tr, t15);
    			append_dev(tr, th3);
    			append_dev(tr, t17);
    			append_dev(tr, th4);
    			append_dev(tr, t19);
    			append_dev(tr, th5);
    			append_dev(table, t21);
    			append_dev(table, tbody);
    			if_block0.m(tbody, null);
    			append_dev(main, t22);
    			append_dev(main, section1);
    			append_dev(section1, h21);
    			append_dev(section1, t24);
    			append_dev(section1, label0);
    			append_dev(section1, t26);
    			append_dev(section1, input0);
    			set_input_value(input0, /*reportStartDate*/ ctx[7]);
    			append_dev(section1, t27);
    			append_dev(section1, label1);
    			append_dev(section1, t29);
    			append_dev(section1, input1);
    			set_input_value(input1, /*reportEndDate*/ ctx[8]);
    			append_dev(section1, t30);
    			append_dev(section1, button2);
    			append_dev(section1, t32);
    			if (if_block1) if_block1.m(section1, null);
    			append_dev(main, t33);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t34);
    			if (if_block3) if_block3.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", logout, false, false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[15], false, false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[18]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[19]),
    					listen_dev(button2, "click", /*previewReport*/ ctx[13], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*employeeName*/ 1) set_data_dev(t5, /*employeeName*/ ctx[0]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(tbody, null);
    				}
    			}

    			if (dirty[0] & /*reportStartDate*/ 128) {
    				set_input_value(input0, /*reportStartDate*/ ctx[7]);
    			}

    			if (dirty[0] & /*reportEndDate*/ 256) {
    				set_input_value(input1, /*reportEndDate*/ ctx[8]);
    			}

    			if (/*reportPreviewHtml*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(section1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*showTaskModal*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(main, t34);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*showEditTaskModal*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$1(ctx);
    					if_block3.c();
    					if_block3.m(main, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const API_URL = "http://localhost:3000";

    // Log out the user
    function logout() {
    	localStorage.removeItem("loggedInUser");
    	window.location.href = "/";
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Employee', slots, []);
    	let employeeName = "";
    	let tasks = [];
    	let loggedInUser;
    	let showTaskModal = false;
    	let showEditTaskModal = false;

    	// Form data for adding a new task
    	let newTask = {
    		title: "",
    		description: "",
    		startDate: "",
    		endDate: "",
    		status: "Pending"
    	};

    	// Form data for editing an existing task
    	let editTaskData = {
    		id: null,
    		title: "",
    		description: "",
    		startDate: "",
    		endDate: "",
    		status: ""
    	};

    	// Report generation state
    	let reportPreviewHtml = "";

    	let reportStartDate = "";
    	let reportEndDate = "";

    	onMount(() => {
    		loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    		if (loggedInUser) {
    			$$invalidate(0, employeeName = `${loggedInUser.firstName} ${loggedInUser.lastName}`);
    			loadTasks();
    		}
    	});

    	// Load tasks for the logged-in employee
    	async function loadTasks() {
    		try {
    			const res = await fetch(`${API_URL}/tasks?userId=${loggedInUser.id}`);
    			$$invalidate(1, tasks = await res.json());
    		} catch(error) {
    			console.error("Error loading tasks:", error);
    		}
    	}

    	// Add a new task
    	async function addTask() {
    		if (!newTask.title || !newTask.startDate || !newTask.endDate) {
    			alert("Please fill in all required fields.");
    			return;
    		}

    		try {
    			const taskData = {
    				...newTask,
    				// For employees, tasks are self-managed
    				assignedTo: loggedInUser.id,
    				createdBy: loggedInUser.id
    			};

    			const res = await fetch(`${API_URL}/tasks`, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(taskData)
    			});

    			const data = await res.json();
    			console.log("Task added:", data);
    			await loadTasks();
    			$$invalidate(2, showTaskModal = false);

    			// Reset the new task form
    			$$invalidate(4, newTask = {
    				title: "",
    				description: "",
    				startDate: "",
    				endDate: "",
    				status: "Pending"
    			});
    		} catch(error) {
    			console.error("Error adding task:", error);
    		}
    	}

    	// Open task for editing
    	async function editTask(taskId) {
    		try {
    			const res = await fetch(`${API_URL}/tasks/${taskId}`);
    			const task = await res.json();

    			$$invalidate(5, editTaskData = {
    				id: task.id,
    				title: task.title,
    				description: task.description,
    				startDate: task.startDate ? task.startDate.split("T")[0] : "",
    				endDate: task.endDate ? task.endDate.split("T")[0] : "",
    				status: task.status
    			});

    			$$invalidate(3, showEditTaskModal = true);
    		} catch(error) {
    			console.error("Error fetching task details:", error);
    		}
    	}

    	// Update an existing task
    	async function updateTask() {
    		try {
    			const res = await fetch(`${API_URL}/tasks/${editTaskData.id}`, {
    				method: "PUT",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(editTaskData)
    			});

    			const data = await res.json();
    			console.log("Task updated:", data);
    			await loadTasks();
    			$$invalidate(3, showEditTaskModal = false);
    		} catch(error) {
    			console.error("Error updating task:", error);
    		}
    	}

    	// Delete a task
    	async function deleteTask(taskId) {
    		try {
    			await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
    			await loadTasks();
    		} catch(error) {
    			console.error("Error deleting task:", error);
    		}
    	}

    	// Preview report by filtering tasks by date range
    	async function previewReport() {
    		if (!reportStartDate || !reportEndDate) {
    			alert("Please select a date range.");
    			return;
    		}

    		try {
    			const res = await fetch(`${API_URL}/tasks?userId=${loggedInUser.id}`);
    			const allTasks = await res.json();

    			const filtered = allTasks.filter(task => {
    				const taskDate = new Date(task.startDate);
    				return taskDate >= new Date(reportStartDate) && taskDate <= new Date(reportEndDate);
    			});

    			if (filtered.length === 0) {
    				$$invalidate(6, reportPreviewHtml = "<p>No tasks found for the selected criteria.</p>");
    			} else {
    				let html = `<table border='1' style='width:100%; border-collapse: collapse;'>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
            </tr>`;

    				filtered.forEach(task => {
    					html += `<tr>
              <td>${task.id}</td>
              <td>${task.title}</td>
              <td>${task.description}</td>
              <td>${new Date(task.startDate).toLocaleDateString()}</td>
              <td>${new Date(task.endDate).toLocaleDateString()}</td>
              <td>${task.status}</td>
            </tr>`;
    				});

    				html += "</table>";
    				$$invalidate(6, reportPreviewHtml = html);
    			}
    		} catch(error) {
    			console.error("Error generating report:", error);
    		}
    	}

    	// Download the report as a PDF using jsPDF and html2canvas
    	function downloadReport() {
    		const { jsPDF } = window.jspdf;
    		const doc = new jsPDF();

    		doc.html(reportPreviewHtml, {
    			callback(doc) {
    				doc.save("task_report.pdf");
    			},
    			x: 10,
    			y: 10,
    			html2canvas: { scale: 0.295 }
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Employee> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, showTaskModal = true);
    	const click_handler_1 = task => editTask(task.id);
    	const click_handler_2 = task => deleteTask(task.id);

    	function input0_input_handler() {
    		reportStartDate = this.value;
    		$$invalidate(7, reportStartDate);
    	}

    	function input1_input_handler() {
    		reportEndDate = this.value;
    		$$invalidate(8, reportEndDate);
    	}

    	function input0_input_handler_1() {
    		newTask.title = this.value;
    		$$invalidate(4, newTask);
    	}

    	function textarea_input_handler() {
    		newTask.description = this.value;
    		$$invalidate(4, newTask);
    	}

    	function input1_input_handler_1() {
    		newTask.startDate = this.value;
    		$$invalidate(4, newTask);
    	}

    	function input2_input_handler() {
    		newTask.endDate = this.value;
    		$$invalidate(4, newTask);
    	}

    	function select_change_handler() {
    		newTask.status = select_value(this);
    		$$invalidate(4, newTask);
    	}

    	const click_handler_3 = () => $$invalidate(2, showTaskModal = false);

    	function input0_input_handler_2() {
    		editTaskData.id = this.value;
    		$$invalidate(5, editTaskData);
    	}

    	function input1_input_handler_2() {
    		editTaskData.title = this.value;
    		$$invalidate(5, editTaskData);
    	}

    	function textarea_input_handler_1() {
    		editTaskData.description = this.value;
    		$$invalidate(5, editTaskData);
    	}

    	function input2_input_handler_1() {
    		editTaskData.startDate = this.value;
    		$$invalidate(5, editTaskData);
    	}

    	function input3_input_handler() {
    		editTaskData.endDate = this.value;
    		$$invalidate(5, editTaskData);
    	}

    	function select_change_handler_1() {
    		editTaskData.status = select_value(this);
    		$$invalidate(5, editTaskData);
    	}

    	const click_handler_4 = () => $$invalidate(3, showEditTaskModal = false);

    	$$self.$capture_state = () => ({
    		onMount,
    		employeeName,
    		tasks,
    		loggedInUser,
    		showTaskModal,
    		showEditTaskModal,
    		newTask,
    		editTaskData,
    		reportPreviewHtml,
    		reportStartDate,
    		reportEndDate,
    		API_URL,
    		loadTasks,
    		addTask,
    		editTask,
    		updateTask,
    		deleteTask,
    		previewReport,
    		downloadReport,
    		logout
    	});

    	$$self.$inject_state = $$props => {
    		if ('employeeName' in $$props) $$invalidate(0, employeeName = $$props.employeeName);
    		if ('tasks' in $$props) $$invalidate(1, tasks = $$props.tasks);
    		if ('loggedInUser' in $$props) loggedInUser = $$props.loggedInUser;
    		if ('showTaskModal' in $$props) $$invalidate(2, showTaskModal = $$props.showTaskModal);
    		if ('showEditTaskModal' in $$props) $$invalidate(3, showEditTaskModal = $$props.showEditTaskModal);
    		if ('newTask' in $$props) $$invalidate(4, newTask = $$props.newTask);
    		if ('editTaskData' in $$props) $$invalidate(5, editTaskData = $$props.editTaskData);
    		if ('reportPreviewHtml' in $$props) $$invalidate(6, reportPreviewHtml = $$props.reportPreviewHtml);
    		if ('reportStartDate' in $$props) $$invalidate(7, reportStartDate = $$props.reportStartDate);
    		if ('reportEndDate' in $$props) $$invalidate(8, reportEndDate = $$props.reportEndDate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		employeeName,
    		tasks,
    		showTaskModal,
    		showEditTaskModal,
    		newTask,
    		editTaskData,
    		reportPreviewHtml,
    		reportStartDate,
    		reportEndDate,
    		addTask,
    		editTask,
    		updateTask,
    		deleteTask,
    		previewReport,
    		downloadReport,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_input_handler,
    		input1_input_handler,
    		input0_input_handler_1,
    		textarea_input_handler,
    		input1_input_handler_1,
    		input2_input_handler,
    		select_change_handler,
    		click_handler_3,
    		input0_input_handler_2,
    		input1_input_handler_2,
    		textarea_input_handler_1,
    		input2_input_handler_1,
    		input3_input_handler,
    		select_change_handler_1,
    		click_handler_4
    	];
    }

    class Employee extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Employee",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\ChangePassword.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$1 = "src\\ChangePassword.svelte";

    // (88:4) {#if errorMessage}
    function create_if_block(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*errorMessage*/ ctx[2]);
    			attr_dev(p, "class", "error-message svelte-edoppx");
    			add_location(p, file$1, 88, 6, 2701);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errorMessage*/ 4) set_data_dev(t, /*errorMessage*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(88:4) {#if errorMessage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let button;
    	let t5;
    	let mounted;
    	let dispose;
    	let if_block = /*errorMessage*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Change Your Password";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Update Password";
    			t5 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "svelte-edoppx");
    			add_location(h2, file$1, 83, 4, 2402);
    			attr_dev(input0, "type", "password");
    			attr_dev(input0, "placeholder", "New Password");
    			attr_dev(input0, "class", "svelte-edoppx");
    			add_location(input0, file$1, 84, 4, 2437);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Confirm Password");
    			attr_dev(input1, "class", "svelte-edoppx");
    			add_location(input1, file$1, 85, 4, 2520);
    			attr_dev(button, "class", "svelte-edoppx");
    			add_location(button, file$1, 86, 4, 2611);
    			attr_dev(div, "class", "password-container svelte-edoppx");
    			add_location(div, file$1, 82, 2, 2364);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, input0);
    			set_input_value(input0, /*newPassword*/ ctx[0]);
    			append_dev(div, t2);
    			append_dev(div, input1);
    			set_input_value(input1, /*confirmPassword*/ ctx[1]);
    			append_dev(div, t3);
    			append_dev(div, button);
    			append_dev(div, t5);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(button, "click", /*updatePassword*/ ctx[3], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*newPassword*/ 1 && input0.value !== /*newPassword*/ ctx[0]) {
    				set_input_value(input0, /*newPassword*/ ctx[0]);
    			}

    			if (dirty & /*confirmPassword*/ 2 && input1.value !== /*confirmPassword*/ ctx[1]) {
    				set_input_value(input1, /*confirmPassword*/ ctx[1]);
    			}

    			if (/*errorMessage*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ChangePassword', slots, []);
    	let newPassword = "";
    	let confirmPassword = "";
    	let errorMessage = "";

    	async function updatePassword() {
    		$$invalidate(2, errorMessage = "");

    		if (!newPassword || !confirmPassword) {
    			$$invalidate(2, errorMessage = "Please enter a new password.");
    			return;
    		}

    		if (newPassword !== confirmPassword) {
    			$$invalidate(2, errorMessage = "Passwords do not match.");
    			return;
    		}

    		const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    		if (!loggedInUser) {
    			$$invalidate(2, errorMessage = "Session expired. Please log in again.");
    			setTimeout(() => window.location.href = "/", 2000);
    			return;
    		}

    		try {
    			const response = await fetch("http://localhost:3000/users/update-password", {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify({
    					username: loggedInUser.username,
    					newPassword
    				})
    			});

    			const data = await response.json();

    			if (response.ok) {
    				alert("Password updated successfully! Redirecting to login...");
    				localStorage.removeItem("loggedInUser");
    				setTimeout(() => window.location.href = "/", 1500);
    			} else {
    				$$invalidate(2, errorMessage = data.message);
    			}
    		} catch(error) {
    			console.error("Password update error:", error);
    			$$invalidate(2, errorMessage = "Error updating password.");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ChangePassword> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		newPassword = this.value;
    		$$invalidate(0, newPassword);
    	}

    	function input1_input_handler() {
    		confirmPassword = this.value;
    		$$invalidate(1, confirmPassword);
    	}

    	$$self.$capture_state = () => ({
    		newPassword,
    		confirmPassword,
    		errorMessage,
    		updatePassword
    	});

    	$$self.$inject_state = $$props => {
    		if ('newPassword' in $$props) $$invalidate(0, newPassword = $$props.newPassword);
    		if ('confirmPassword' in $$props) $$invalidate(1, confirmPassword = $$props.confirmPassword);
    		if ('errorMessage' in $$props) $$invalidate(2, errorMessage = $$props.errorMessage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		newPassword,
    		confirmPassword,
    		errorMessage,
    		updatePassword,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class ChangePassword extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChangePassword",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(router.$$.fragment);
    			attr_dev(main, "class", "svelte-19xdjg8");
    			add_location(main, file, 22, 2, 541);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(router, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;

    	// Define route-to-component mappings
    	const routes = {
    		"/": Login,
    		"/login": Login,
    		"/admin": Admin,
    		"/manager": Manager,
    		"/employee": Employee,
    		"/change-password": ChangePassword
    	};

    	$$self.$$.on_mount.push(function () {
    		if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	});

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		Router,
    		Login,
    		Admin,
    		Manager,
    		Employee,
    		ChangePassword,
    		routes
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [routes, name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
